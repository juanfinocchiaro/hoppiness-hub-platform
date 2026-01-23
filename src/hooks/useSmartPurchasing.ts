import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SupplierWithSchedule {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  order_days: number[];
  delivery_days: number[];
  lead_time_hours: number;
  preferred_order_time: string | null;
  category: string | null;
}

interface IngredientStock {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  avg_daily_consumption: number;
  days_until_stockout: number;
  suggested_quantity: number;
  supplier_id: string | null;
  supplier_name: string | null;
}

interface TodayOrder {
  supplier: SupplierWithSchedule;
  ingredients: IngredientStock[];
  urgency: 'critical' | 'warning' | 'normal';
  delivery_date: string;
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/**
 * Calculate the next delivery date for a supplier based on today
 */
function getNextDeliveryDate(supplier: SupplierWithSchedule, fromDate: Date = new Date()): Date | null {
  if (!supplier.delivery_days?.length) return null;
  
  const today = fromDate.getDay();
  
  // Find the next delivery day
  for (let i = 1; i <= 7; i++) {
    const checkDay = (today + i) % 7;
    if (supplier.delivery_days.includes(checkDay)) {
      const nextDate = new Date(fromDate);
      nextDate.setDate(nextDate.getDate() + i);
      return nextDate;
    }
  }
  
  return null;
}

/**
 * Check if today is an order day for a supplier
 */
function isTodayOrderDay(supplier: SupplierWithSchedule): boolean {
  if (!supplier.order_days?.length) return true; // If no specific days, any day is OK
  const today = new Date().getDay();
  return supplier.order_days.includes(today);
}

/**
 * Get suppliers that need to be ordered from today
 */
export function useTodayOrders(branchId: string) {
  return useQuery({
    queryKey: ['today-orders', branchId],
    queryFn: async (): Promise<TodayOrder[]> => {
      // 1. Get all active suppliers with schedule info
      const { data: suppliers, error: suppliersError } = await supabase
        .from('suppliers')
        .select('id, name, phone, whatsapp, order_days, delivery_days, lead_time_hours, preferred_order_time, category')
        .eq('is_active', true);
      
      if (suppliersError) throw suppliersError;
      
      // Cast to proper types
      const typedSuppliers: SupplierWithSchedule[] = (suppliers || []).map(s => ({
        ...s,
        order_days: (s.order_days as number[]) || [],
        delivery_days: (s.delivery_days as number[]) || [],
        lead_time_hours: s.lead_time_hours || 24,
      }));
      
      // 2. Get ingredient-supplier assignments
      const { data: ingredientSuppliers } = await supabase
        .from('ingredient_suppliers')
        .select('ingredient_id, supplier_id, is_primary')
        .eq('is_primary', true);
      
      const supplierByIngredient = new Map<string, string>();
      (ingredientSuppliers || []).forEach(is => {
        supplierByIngredient.set(is.ingredient_id, is.supplier_id);
      });
      
      // 3. Get all ingredients with branch stock
      const { data: ingredients } = await supabase
        .from('ingredients')
        .select('id, name, unit, min_stock')
        .eq('is_active', true);
      
      const { data: branchStock } = await supabase
        .from('branch_ingredients')
        .select('ingredient_id, current_stock, min_stock_override')
        .eq('branch_id', branchId);
      
      const stockMap = new Map((branchStock || []).map(bs => [bs.ingredient_id, bs]));
      
      // 4. Calculate daily consumption from recent sales (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('id, created_at')
        .eq('branch_id', branchId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .in('status', ['delivered', 'ready']);
      
      const orderIds = (recentOrders || []).map(o => o.id);
      
      // Get order items
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('quantity, product_id')
        .in('order_id', orderIds.length > 0 ? orderIds : ['00000000-0000-0000-0000-000000000000']);
      
      // For consumption estimation, use min_stock as a proxy for weekly consumption
      const consumption = new Map<string, number>();
      (ingredients || []).forEach(ing => {
        const bs = stockMap.get(ing.id);
        const minStock = bs?.min_stock_override ?? ing.min_stock ?? 0;
        // Assume min_stock represents roughly 1 week of consumption
        consumption.set(ing.id, minStock);
      });
      
      // 5. Build ingredient stock list with consumption data
      const ingredientStocks: IngredientStock[] = (ingredients || []).map(ing => {
        const bs = stockMap.get(ing.id);
        const currentStock = bs?.current_stock || 0;
        const minStock = bs?.min_stock_override ?? ing.min_stock ?? 0;
        const totalConsumed = consumption.get(ing.id) || 0;
        const avgDaily = totalConsumed / 7; // 7 days
        const daysUntilStockout = avgDaily > 0 ? Math.floor(currentStock / avgDaily) : 999;
        const supplierId = supplierByIngredient.get(ing.id) || null;
        const supplier = typedSuppliers.find(s => s.id === supplierId);
        
        // Calculate suggested quantity: reach 2 weeks of stock
        const targetStock = Math.max(minStock, avgDaily * 14);
        const suggested = Math.max(0, Math.ceil(targetStock - currentStock));
        
        return {
          id: ing.id,
          name: ing.name,
          unit: ing.unit || 'un',
          current_stock: currentStock,
          min_stock: minStock,
          avg_daily_consumption: Math.round(avgDaily * 100) / 100,
          days_until_stockout: daysUntilStockout,
          suggested_quantity: suggested,
          supplier_id: supplierId,
          supplier_name: supplier?.name || null,
        };
      });
      
      // 6. Group by supplier and filter for today's orders
      const todayOrders: TodayOrder[] = [];
      
      typedSuppliers.forEach(supplier => {
        if (!isTodayOrderDay(supplier)) return;
        
        const supplierIngredients = ingredientStocks.filter(ing => 
          ing.supplier_id === supplier.id && 
          (ing.current_stock <= ing.min_stock || ing.days_until_stockout <= 7)
        );
        
        if (supplierIngredients.length === 0) return;
        
        const nextDelivery = getNextDeliveryDate(supplier);
        const hasCritical = supplierIngredients.some(ing => ing.days_until_stockout <= 2);
        const hasWarning = supplierIngredients.some(ing => ing.days_until_stockout <= 5);
        
        todayOrders.push({
          supplier,
          ingredients: supplierIngredients,
          urgency: hasCritical ? 'critical' : hasWarning ? 'warning' : 'normal',
          delivery_date: nextDelivery?.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' }) || 'Sin fecha',
        });
      });
      
      // Sort by urgency
      return todayOrders.sort((a, b) => {
        const urgencyOrder = { critical: 0, warning: 1, normal: 2 };
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!branchId,
  });
}

/**
 * Get all low stock ingredients with smart suggestions
 */
export function useLowStockIngredients(branchId: string) {
  return useQuery({
    queryKey: ['low-stock-ingredients', branchId],
    queryFn: async () => {
      const { data: ingredients } = await supabase
        .from('ingredients')
        .select('id, name, unit, min_stock')
        .eq('is_active', true);
      
      const { data: branchStock } = await supabase
        .from('branch_ingredients')
        .select('ingredient_id, current_stock, min_stock_override')
        .eq('branch_id', branchId);
      
      const stockMap = new Map((branchStock || []).map(bs => [bs.ingredient_id, bs]));
      
      return (ingredients || [])
        .map(ing => {
          const bs = stockMap.get(ing.id);
          const currentStock = bs?.current_stock || 0;
          const minStock = bs?.min_stock_override ?? ing.min_stock ?? 0;
          return {
            id: ing.id,
            name: ing.name,
            unit: ing.unit || 'un',
            current_stock: currentStock,
            min_stock: minStock,
            is_low: currentStock <= minStock,
          };
        })
        .filter(ing => ing.is_low);
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!branchId,
  });
}

export function formatDaysList(days: number[]): string {
  if (!days?.length) return 'Cualquier día';
  return days.map(d => DAY_NAMES[d]?.slice(0, 3)).join(', ');
}
