/**
 * useCashierDiscrepancies - Hooks para discrepancias de cajero (Fase 7)
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const discrepancyKeys = {
  all: ['cashier-discrepancies'] as const,
  stats: (userId: string, branchId?: string) =>
    [...discrepancyKeys.all, 'stats', userId, branchId] as const,
  history: (userId: string, branchId?: string) =>
    [...discrepancyKeys.all, 'history', userId, branchId] as const,
  branchReport: (branchId: string, startDate?: string, endDate?: string) =>
    [...discrepancyKeys.all, 'branch-report', branchId, startDate, endDate] as const,
};

export interface CashierStats {
  total_shifts: number;
  perfect_shifts: number;
  precision_pct: number;
  discrepancy_this_month: number;
  discrepancy_total: number;
  last_discrepancy_date: string | null;
  last_discrepancy_amount: number;
}

export interface DiscrepancyEntry {
  id: string;
  shift_id: string;
  branch_id: string;
  user_id: string;
  cash_register_id: string | null;
  expected_amount: number;
  actual_amount: number;
  discrepancy: number;
  shift_date: string;
  notes: string | null;
  created_at: string;
}

export function useCashierStats(userId: string | undefined, branchId?: string) {
  return useQuery({
    queryKey: discrepancyKeys.stats(userId || '', branchId),
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase.rpc('get_cashier_discrepancy_stats', {
        _user_id: userId,
        _branch_id: branchId || null,
      });

      if (error) throw error;

      const stats = data?.[0];
      if (!stats) {
        return {
          total_shifts: 0,
          perfect_shifts: 0,
          precision_pct: 100,
          discrepancy_this_month: 0,
          discrepancy_total: 0,
          last_discrepancy_date: null,
          last_discrepancy_amount: 0,
        } as CashierStats;
      }

      return stats as CashierStats;
    },
    enabled: !!userId,
  });
}

export function useCashierHistory(userId: string | undefined, branchId?: string, limit = 20) {
  return useQuery({
    queryKey: discrepancyKeys.history(userId || '', branchId),
    queryFn: async () => {
      if (!userId) return [];

      let query = supabase
        .from('cashier_discrepancy_history')
        .select('*')
        .eq('user_id', userId)
        .order('shift_date', { ascending: false })
        .limit(limit);

      if (branchId) {
        query = query.eq('branch_id', branchId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as DiscrepancyEntry[];
    },
    enabled: !!userId,
  });
}

export interface CashierReportEntry {
  user_id: string;
  full_name: string;
  total_shifts: number;
  perfect_shifts: number;
  total_discrepancy: number;
  precision_pct: number;
}

export function useBranchDiscrepancyReport(
  branchId: string | undefined,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: discrepancyKeys.branchReport(branchId || '', startDate, endDate),
    queryFn: async () => {
      if (!branchId) return [];

      let query = supabase
        .from('cashier_discrepancy_history')
        .select('user_id, discrepancy, shift_date')
        .eq('branch_id', branchId);

      if (startDate) {
        query = query.gte('shift_date', startDate);
      }
      if (endDate) {
        query = query.lte('shift_date', endDate);
      }

      const { data: discrepancies, error } = await query;
      if (error) throw error;

      const userMap = new Map<
        string,
        {
          total: number;
          perfect: number;
          sum: number;
        }
      >();

      for (const d of discrepancies || []) {
        const current = userMap.get(d.user_id) || { total: 0, perfect: 0, sum: 0 };
        current.total += 1;
        if (d.discrepancy === 0) current.perfect += 1;
        current.sum += d.discrepancy;
        userMap.set(d.user_id, current);
      }

      const userIds = Array.from(userMap.keys());
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const nameMap = new Map(profiles?.map((p: any) => [p.id, p.full_name]) || []);

      const result: CashierReportEntry[] = [];
      for (const [userId, stats] of userMap.entries()) {
        result.push({
          user_id: userId,
          full_name: nameMap.get(userId) || 'Usuario',
          total_shifts: stats.total,
          perfect_shifts: stats.perfect,
          total_discrepancy: stats.sum,
          precision_pct: Math.round((stats.perfect / stats.total) * 100),
        });
      }

      result.sort((a, b) => a.total_discrepancy - b.total_discrepancy);

      return result;
    },
    enabled: !!branchId,
  });
}
