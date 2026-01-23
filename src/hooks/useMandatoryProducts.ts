/**
 * Hook para validar proveedores obligatorios al cargar compras
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MandatoryProduct {
  id: string;
  ingredient_id: string | null;
  product_name: string;
  primary_supplier_id: string;
  backup_supplier_id: string | null;
  backup_allowed_condition: 'never' | 'stock_emergency' | 'always';
  alert_brand_on_backup: boolean;
  primary_supplier?: { id: string; name: string };
  backup_supplier?: { id: string; name: string } | null;
}

export interface SupplierValidationResult {
  isValid: boolean;
  blockReason?: string;
  requiresAlert?: boolean;
  mandatoryProduct?: MandatoryProduct;
}

export function useMandatoryProducts() {
  return useQuery({
    queryKey: ['mandatory-products-validation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_mandatory_products')
        .select(`
          id,
          ingredient_id,
          product_name,
          primary_supplier_id,
          backup_supplier_id,
          backup_allowed_condition,
          alert_brand_on_backup,
          primary_supplier:suppliers!brand_mandatory_products_primary_supplier_id_fkey(id, name),
          backup_supplier:suppliers!brand_mandatory_products_backup_supplier_id_fkey(id, name)
        `)
        .eq('is_active', true);
      
      if (error) throw error;
      return data as MandatoryProduct[];
    },
    staleTime: 300000, // 5 minutos
  });
}

export async function validateSupplierForIngredient(
  ingredientId: string,
  supplierId: string,
  branchId: string,
  mandatoryProducts: MandatoryProduct[]
): Promise<SupplierValidationResult> {
  // Buscar si este ingrediente tiene producto obligatorio
  const mandatory = mandatoryProducts.find(mp => mp.ingredient_id === ingredientId);
  
  if (!mandatory) {
    // Producto libre, cualquier proveedor está permitido
    return { isValid: true };
  }

  // Es producto obligatorio - verificar proveedor
  if (supplierId === mandatory.primary_supplier_id) {
    // Proveedor principal, todo OK
    return { isValid: true };
  }

  if (supplierId === mandatory.backup_supplier_id) {
    // Es el proveedor backup
    switch (mandatory.backup_allowed_condition) {
      case 'always':
        return { 
          isValid: true, 
          requiresAlert: mandatory.alert_brand_on_backup,
          mandatoryProduct: mandatory
        };
      
      case 'stock_emergency':
        // Verificar si hay emergencia de stock
        const isEmergency = await checkStockEmergency(ingredientId, branchId, mandatory.primary_supplier_id);
        if (isEmergency.isEmergency) {
          return { 
            isValid: true, 
            requiresAlert: mandatory.alert_brand_on_backup,
            mandatoryProduct: mandatory
          };
        }
        return { 
          isValid: false, 
          blockReason: `"${mandatory.product_name}" solo puede comprarse al backup (${mandatory.backup_supplier?.name}) en caso de emergencia de stock. Actualmente tenés stock suficiente hasta la próxima entrega de ${mandatory.primary_supplier?.name}.`,
          mandatoryProduct: mandatory
        };
      
      case 'never':
      default:
        return { 
          isValid: false, 
          blockReason: `"${mandatory.product_name}" es un producto obligatorio de marca. Solo se puede comprar a: ${mandatory.primary_supplier?.name}. Contactá a la marca si hay un problema.`,
          mandatoryProduct: mandatory
        };
    }
  }

  // Proveedor no autorizado
  return { 
    isValid: false, 
    blockReason: `"${mandatory.product_name}" es un producto obligatorio de marca. Solo se puede comprar a: ${mandatory.primary_supplier?.name}${mandatory.backup_supplier ? ` (o backup: ${mandatory.backup_supplier.name})` : ''}. Contactá a la marca si hay un problema.`,
    mandatoryProduct: mandatory
  };
}

async function checkStockEmergency(
  ingredientId: string, 
  branchId: string, 
  primarySupplierId: string
): Promise<{ isEmergency: boolean; details?: Record<string, any> }> {
  try {
    // Obtener stock actual
    const { data: stockData } = await supabase
      .from('branch_ingredients')
      .select('current_stock')
      .eq('branch_id', branchId)
      .eq('ingredient_id', ingredientId)
      .single();

    const currentStock = stockData?.current_stock || 0;

    // Calcular consumo diario promedio (últimos 21 días del mismo día de la semana)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const threWeeksAgo = new Date(today);
    threWeeksAgo.setDate(threWeeksAgo.getDate() - 21);

    const { data: salesData } = await supabase
      .from('stock_movements')
      .select('quantity')
      .eq('branch_id', branchId)
      .eq('ingredient_id', ingredientId)
      .eq('type', 'sale')
      .gte('created_at', threWeeksAgo.toISOString());

    const totalSales = salesData?.reduce((sum, m) => sum + Math.abs(m.quantity), 0) || 0;
    const dailyConsumption = totalSales / 21;

    if (dailyConsumption <= 0) {
      // Sin datos de consumo, no hay emergencia
      return { isEmergency: false };
    }

    const daysOfStock = currentStock / dailyConsumption;

    // Obtener próxima fecha de entrega del proveedor principal
    const { data: orderRules } = await supabase
      .from('supplier_order_rules')
      .select('delivery_day')
      .eq('supplier_id', primarySupplierId)
      .eq('is_active', true);

    if (!orderRules || orderRules.length === 0) {
      // Sin reglas de entrega, asumir emergencia si menos de 2 días de stock
      return { 
        isEmergency: daysOfStock < 2,
        details: { stock_actual: currentStock, consumo_diario: dailyConsumption.toFixed(1), dias_stock: daysOfStock.toFixed(1) }
      };
    }

    // Calcular días hasta próxima entrega
    const deliveryDays = orderRules.map(r => r.delivery_day);
    let daysUntilDelivery = 7;
    for (let i = 1; i <= 7; i++) {
      const checkDay = (dayOfWeek + i) % 7;
      if (deliveryDays.includes(checkDay)) {
        daysUntilDelivery = i;
        break;
      }
    }

    const isEmergency = daysOfStock < daysUntilDelivery;

    return { 
      isEmergency,
      details: {
        stock_actual: currentStock,
        consumo_diario: dailyConsumption.toFixed(1),
        dias_stock: daysOfStock.toFixed(1),
        dias_hasta_entrega: daysUntilDelivery,
        motivo: isEmergency ? 'Stock insuficiente hasta próxima entrega' : 'Stock suficiente'
      }
    };
  } catch {
    // En caso de error, permitir pero alertar
    return { isEmergency: true };
  }
}

export async function createPurchaseAlert(
  branchId: string,
  alertType: 'backup_used' | 'unauthorized_supplier' | 'wrong_supplier',
  mandatoryProductId: string,
  supplierUsedId: string,
  details?: Record<string, any>
) {
  const { error } = await supabase
    .from('brand_purchase_alerts')
    .insert([{
      branch_id: branchId,
      alert_type: alertType,
      mandatory_product_id: mandatoryProductId,
      supplier_used_id: supplierUsedId,
      details
    }]);

  if (error) {
    console.error('Error creating purchase alert:', error);
  }
}
