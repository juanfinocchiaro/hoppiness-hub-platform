import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CoachingStats {
  totalEmployees: number;
  coachingsThisMonth: number;
  pendingCoachings: number;
  pendingAcknowledgments: number;
  completionRate: number;
  averageScore: number | null;
  employeesWithoutCoaching: string[];
}

/**
 * Hook para obtener estadísticas de coachings de una sucursal
 */
export function useCoachingStats(branchId: string | null) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  return useQuery({
    queryKey: ['coaching-stats', branchId, currentMonth, currentYear],
    queryFn: async (): Promise<CoachingStats> => {
      if (!branchId) {
        return {
          totalEmployees: 0,
          coachingsThisMonth: 0,
          pendingCoachings: 0,
          pendingAcknowledgments: 0,
          completionRate: 0,
          averageScore: null,
          employeesWithoutCoaching: [],
        };
      }

      // 1. Obtener empleados activos del local
      const { data: branchRoles, error: rolesError } = await supabase
        .from('user_branch_roles')
        .select('user_id')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .in('local_role', ['empleado', 'cajero']);

      if (rolesError) throw rolesError;

      const employeeIds = branchRoles?.map(r => r.user_id) ?? [];
      const totalEmployees = employeeIds.length;

      if (totalEmployees === 0) {
        return {
          totalEmployees: 0,
          coachingsThisMonth: 0,
          pendingCoachings: 0,
          pendingAcknowledgments: 0,
          completionRate: 0,
          averageScore: null,
          employeesWithoutCoaching: [],
        };
      }

      // 2. Obtener coachings de este mes
      const { data: coachings, error: coachingsError } = await supabase
        .from('coachings')
        .select('user_id, overall_score, acknowledged_at')
        .eq('branch_id', branchId)
        .eq('coaching_month', currentMonth)
        .eq('coaching_year', currentYear);

      if (coachingsError) throw coachingsError;

      const coachingsThisMonth = coachings?.length ?? 0;
      const employeesWithCoaching = new Set(coachings?.map(c => c.user_id) ?? []);
      const employeesWithoutCoaching = employeeIds.filter(id => !employeesWithCoaching.has(id));
      const pendingCoachings = employeesWithoutCoaching.length;
      const pendingAcknowledgments = coachings?.filter(c => !c.acknowledged_at).length ?? 0;

      // Calcular promedio de scores
      const scoresWithValues = coachings?.filter(c => c.overall_score !== null) ?? [];
      const averageScore = scoresWithValues.length > 0
        ? scoresWithValues.reduce((sum, c) => sum + (c.overall_score || 0), 0) / scoresWithValues.length
        : null;

      const completionRate = totalEmployees > 0 
        ? Math.round((coachingsThisMonth / totalEmployees) * 100) 
        : 0;

      return {
        totalEmployees,
        coachingsThisMonth,
        pendingCoachings,
        pendingAcknowledgments,
        completionRate,
        averageScore: averageScore ? Number(averageScore.toFixed(2)) : null,
        employeesWithoutCoaching,
      };
    },
    enabled: !!branchId,
    refetchInterval: 1000 * 60 * 5, // Refrescar cada 5 minutos
  });
}

/**
 * Hook para verificar si un empleado tiene coaching este mes
 */
export function useHasCoachingThisMonth(userId: string | null, branchId: string | null) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  return useQuery({
    queryKey: ['has-coaching-this-month', userId, branchId, currentMonth, currentYear],
    queryFn: async (): Promise<boolean> => {
      if (!userId || !branchId) return false;

      const { count, error } = await supabase
        .from('coachings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('branch_id', branchId)
        .eq('coaching_month', currentMonth)
        .eq('coaching_year', currentYear);

      if (error) throw error;
      return (count ?? 0) > 0;
    },
    enabled: !!userId && !!branchId,
  });
}

/**
 * Hook para obtener coachings pendientes de confirmación del empleado actual
 */
export function useMyPendingCoachings() {
  return useQuery({
    queryKey: ['my-pending-coachings'],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return [];

      const { data, error } = await supabase
        .from('coachings')
        .select(`
          id,
          coaching_date,
          coaching_month,
          coaching_year,
          overall_score,
          strengths,
          areas_to_improve
        `)
        .eq('user_id', session.session.user.id)
        .is('acknowledged_at', null)
        .order('coaching_date', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

/**
 * Hook para obtener historial de scores de un empleado
 */
export function useEmployeeScoreHistory(userId: string | null, branchId: string | null, months: number = 6) {
  return useQuery({
    queryKey: ['employee-score-history', userId, branchId, months],
    queryFn: async () => {
      if (!userId || !branchId) return [];

      const { data, error } = await supabase
        .from('coachings')
        .select('coaching_month, coaching_year, overall_score, station_score, general_score')
        .eq('user_id', userId)
        .eq('branch_id', branchId)
        .not('overall_score', 'is', null)
        .order('coaching_year', { ascending: false })
        .order('coaching_month', { ascending: false })
        .limit(months);

      if (error) throw error;
      return data.reverse(); // Orden cronológico para gráficos
    },
    enabled: !!userId && !!branchId,
  });
}
