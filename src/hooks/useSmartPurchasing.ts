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

interface SupplierOrderRule {
  id: string;
  supplier_id: string;
  order_shift_day: number;
  delivery_day: number;
  delivery_time: string | null;
  is_active: boolean;
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
  delivery_time: string;
  rule: SupplierOrderRule;
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/**
 * Get the current "shift day" based on branch opening time.
 * If current time is before opening time, we're still in yesterday's shift.
 * 
 * Example: 
 * - Branch opens at 11:00
 * - It's Monday 02:00 AM → Still Sunday's shift (returns 0)
 * - It's Monday 14:00 PM → Monday's shift (returns 1)
 */
export function getCurrentShiftDay(openingTime: string = '11:00'): number {
  const now = new Date();
  const [openHour, openMin] = openingTime.split(':').map(Number);
  
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openingMinutes = openHour * 60 + openMin;
  
  // If we're before opening time, we belong to yesterday's shift
  if (currentMinutes < openingMinutes) {
    const yesterday = now.getDay() - 1;
    return yesterday < 0 ? 6 : yesterday; // Sunday is 0, so -1 becomes 6 (Saturday)
  }
  
  return now.getDay();
}

/**
 * Get delivery date based on rule's delivery_day, from the shift day
 */
function getDeliveryDateFromRule(rule: SupplierOrderRule, shiftDay: number): Date {
  const today = new Date();
  const currentCalendarDay = today.getDay();
  
  // Calculate days until delivery
  let daysUntilDelivery = rule.delivery_day - shiftDay;
  if (daysUntilDelivery <= 0) daysUntilDelivery += 7;
  
  // Adjust for calendar day vs shift day
  const shiftOffset = currentCalendarDay - shiftDay;
  
  const deliveryDate = new Date(today);
  deliveryDate.setDate(today.getDate() + daysUntilDelivery + (shiftOffset < 0 ? 1 : 0));
  
  return deliveryDate;
}

/**
 * Check if the current shift matches a supplier's order rule
 */
function findMatchingRule(rules: SupplierOrderRule[], shiftDay: number): SupplierOrderRule | null {
  return rules.find(r => r.order_shift_day === shiftDay && r.is_active) || null;
}

/**
 * Get suppliers that need to be ordered from today based on SHIFT day (not calendar day)
 */
export function useTodayOrders(branchId: string, openingTime: string = '11:00') {
  return useQuery({
    queryKey: ['today-orders', branchId, openingTime],
    queryFn: async (): Promise<TodayOrder[]> => {
      // 0. Get current shift day (accounts for late-night shifts)
      const shiftDay = getCurrentShiftDay(openingTime);
      
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
      
      // 2. Get supplier order rules (new shift-based system)
      const { data: orderRules } = await supabase
        .from('supplier_order_rules')
        .select('*')
        .eq('is_active', true);
      
      const rulesBySupplier = new Map<string, SupplierOrderRule[]>();
      (orderRules || []).forEach(rule => {
        const existing = rulesBySupplier.get(rule.supplier_id) || [];
        existing.push(rule);
        rulesBySupplier.set(rule.supplier_id, existing);
      });
      
      // 3. Get ingredient-supplier assignments
      const { data: ingredientSuppliers } = await supabase
        .from('ingredient_suppliers')
        .select('ingredient_id, supplier_id, is_primary')
        .eq('is_primary', true);
      
      const supplierByIngredient = new Map<string, string>();
      (ingredientSuppliers || []).forEach(is => {
        supplierByIngredient.set(is.ingredient_id, is.supplier_id);
      });
      
      // 4. Get all ingredients with branch stock
      const { data: ingredients } = await supabase
        .from('ingredients')
        .select('id, name, unit, min_stock')
        .eq('is_active', true);
      
      const { data: branchStock } = await supabase
        .from('branch_ingredients')
        .select('ingredient_id, current_stock, min_stock_override')
        .eq('branch_id', branchId);
      
      const stockMap = new Map((branchStock || []).map(bs => [bs.ingredient_id, bs]));
      
      // 5. For consumption estimation, use min_stock as proxy
      const consumption = new Map<string, number>();
      (ingredients || []).forEach(ing => {
        const bs = stockMap.get(ing.id);
        const minStock = bs?.min_stock_override ?? ing.min_stock ?? 0;
        consumption.set(ing.id, minStock);
      });
      
      // 6. Build ingredient stock list
      const ingredientStocks: IngredientStock[] = (ingredients || []).map(ing => {
        const bs = stockMap.get(ing.id);
        const currentStock = bs?.current_stock || 0;
        const minStock = bs?.min_stock_override ?? ing.min_stock ?? 0;
        const totalConsumed = consumption.get(ing.id) || 0;
        const avgDaily = totalConsumed / 7;
        const daysUntilStockout = avgDaily > 0 ? Math.floor(currentStock / avgDaily) : 999;
        const supplierId = supplierByIngredient.get(ing.id) || null;
        const supplier = typedSuppliers.find(s => s.id === supplierId);
        
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
      
      // 7. Group by supplier and filter by shift-based rules
      const todayOrders: TodayOrder[] = [];
      
      typedSuppliers.forEach(supplier => {
        const rules = rulesBySupplier.get(supplier.id) || [];
        const matchingRule = findMatchingRule(rules, shiftDay);
        
        // If no rules defined, fall back to legacy order_days check
        const canOrderToday = matchingRule !== null || 
          (rules.length === 0 && (supplier.order_days.length === 0 || supplier.order_days.includes(shiftDay)));
        
        if (!canOrderToday) return;
        
        const supplierIngredients = ingredientStocks.filter(ing => 
          ing.supplier_id === supplier.id && 
          (ing.current_stock <= ing.min_stock || ing.days_until_stockout <= 7)
        );
        
        if (supplierIngredients.length === 0) return;
        
        const hasCritical = supplierIngredients.some(ing => ing.days_until_stockout <= 2);
        const hasWarning = supplierIngredients.some(ing => ing.days_until_stockout <= 5);
        
        // Calculate delivery date
        let deliveryDate: Date;
        let deliveryTime = '12:00';
        
        if (matchingRule) {
          deliveryDate = getDeliveryDateFromRule(matchingRule, shiftDay);
          deliveryTime = matchingRule.delivery_time || '12:00';
        } else {
          // Fallback to next delivery day from legacy system
          const nextDay = supplier.delivery_days.find(d => d > shiftDay) ?? supplier.delivery_days[0];
          deliveryDate = new Date();
          const daysUntil = nextDay !== undefined ? (nextDay - shiftDay + 7) % 7 || 7 : 1;
          deliveryDate.setDate(deliveryDate.getDate() + daysUntil);
        }
        
        todayOrders.push({
          supplier,
          ingredients: supplierIngredients,
          urgency: hasCritical ? 'critical' : hasWarning ? 'warning' : 'normal',
          delivery_date: deliveryDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' }),
          delivery_time: deliveryTime,
          rule: matchingRule || {
            id: '',
            supplier_id: supplier.id,
            order_shift_day: shiftDay,
            delivery_day: deliveryDate.getDay(),
            delivery_time: '12:00',
            is_active: true,
          },
        });
      });
      
      // Sort by urgency
      return todayOrders.sort((a, b) => {
        const urgencyOrder = { critical: 0, warning: 1, normal: 2 };
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      });
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!branchId,
  });
}

/**
 * Get supplier order rules for configuration
 */
export function useSupplierOrderRules(supplierId: string) {
  return useQuery({
    queryKey: ['supplier-order-rules', supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_order_rules')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('order_shift_day');
      
      if (error) throw error;
      return data as SupplierOrderRule[];
    },
    enabled: !!supplierId,
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
