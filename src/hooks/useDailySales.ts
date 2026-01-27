import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, format } from 'date-fns';

interface DailySale {
  id: string;
  branch_id: string;
  sale_date: string;
  shift: 'morning' | 'afternoon' | 'night';
  sales_counter: number;
  sales_rappi: number;
  sales_pedidosya: number;
  sales_mp_delivery: number;
  sales_other: number;
  sales_total: number;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_by: string | null;
  updated_at: string | null;
}

export function useDailySales(branchId: string | undefined) {
  return useQuery({
    queryKey: ['daily-sales', branchId],
    queryFn: async () => {
      if (!branchId) return [];
      
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
      
      const { data, error } = await supabase
        .from('daily_sales')
        .select('*')
        .eq('branch_id', branchId)
        .gte('sale_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('sale_date', format(weekEnd, 'yyyy-MM-dd'))
        .order('sale_date', { ascending: false })
        .order('shift', { ascending: true });
      
      if (error) throw error;
      return (data || []) as DailySale[];
    },
    enabled: !!branchId,
    staleTime: 30000,
  });
}

export function useTodaySales(branchId: string | undefined) {
  return useQuery({
    queryKey: ['daily-sales-today', branchId],
    queryFn: async () => {
      if (!branchId) return [];
      
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('daily_sales')
        .select('*')
        .eq('branch_id', branchId)
        .eq('sale_date', today)
        .order('shift', { ascending: true });
      
      if (error) throw error;
      return (data || []) as DailySale[];
    },
    enabled: !!branchId,
    staleTime: 30000,
  });
}

export function useRecentSalesEntries(branchId: string | undefined, limit = 5) {
  return useQuery({
    queryKey: ['daily-sales-recent', branchId, limit],
    queryFn: async () => {
      if (!branchId) return [];
      
      const { data, error } = await supabase
        .from('daily_sales')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return (data || []) as DailySale[];
    },
    enabled: !!branchId,
    staleTime: 30000,
  });
}

export function useBrandDailySalesSummary() {
  return useQuery({
    queryKey: ['daily-sales-summary'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // First get all today's sales
      const { data: salesData, error: salesError } = await supabase
        .from('daily_sales')
        .select('branch_id, shift, sales_total')
        .eq('sale_date', today);
      
      if (salesError) throw salesError;
      
      // Then get all branches
      const { data: branchesData, error: branchesError } = await supabase
        .from('branches')
        .select('id, name')
        .eq('is_active', true);
      
      if (branchesError) throw branchesError;
      
      // Merge data
      const branchMap = new Map(branchesData?.map(b => [b.id, b.name]) || []);
      
      return (salesData || []).map(sale => ({
        ...sale,
        branch_name: branchMap.get(sale.branch_id) || 'Unknown',
      }));
    },
    staleTime: 30000,
  });
}

export function getShiftLabel(shift: string): string {
  switch (shift) {
    case 'midday': return 'Mediodía';
    case 'night': return 'Noche';
    // Legacy support
    case 'morning': return 'Mañana';
    case 'afternoon': return 'Tarde';
    default: return shift;
  }
}

export function getMissingShifts(todaySales: DailySale[]): string[] {
  const allShifts = ['midday', 'night'];
  const loadedShifts = todaySales.map(s => s.shift);
  return allShifts.filter(s => !loadedShifts.includes(s as any));
}

export function getAllShifts(): Array<{ value: string; label: string }> {
  return [
    { value: 'midday', label: 'Mediodía' },
    { value: 'night', label: 'Noche' },
  ];
}

export type { DailySale };
