/**
 * useManagersCoachingList - Hook para obtener lista de encargados con estado de coaching
 * 
 * Usado en Mi Marca > Coaching > Encargados para ver todos los encargados de la red
 * y su estado de coaching del mes actual.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ManagerCoachingStatus {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  branchId: string;
  branchName: string;
  hasCoachingThisMonth: boolean;
  latestCoaching: {
    id: string;
    date: string;
    overallScore: number | null;
    acknowledgedAt: string | null;
    evaluatorName: string | null;
  } | null;
  previousScore: number | null;
}

interface UseManagersCoachingListOptions {
  branchId?: string; // Filtro opcional por sucursal
}

export function useManagersCoachingList(options: UseManagersCoachingListOptions = {}) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  return useQuery({
    queryKey: ['managers-coaching-list', options.branchId, currentMonth, currentYear],
    queryFn: async (): Promise<ManagerCoachingStatus[]> => {
      // 1. Obtener todos los encargados de la red
      let rolesQuery = supabase
        .from('user_branch_roles')
        .select('user_id, branch_id')
        .eq('local_role', 'encargado')
        .eq('is_active', true);

      if (options.branchId) {
        rolesQuery = rolesQuery.eq('branch_id', options.branchId);
      }

      const { data: roles, error: rolesError } = await rolesQuery;
      if (rolesError) throw rolesError;
      if (!roles?.length) return [];

      // 2. Obtener perfiles
      const userIds = [...new Set(roles.map(r => r.user_id))];
      const { data: profiles, error: profilesErr } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profilesErr) throw profilesErr;
      const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? []);

      // 3. Obtener sucursales
      const branchIds = [...new Set(roles.map(r => r.branch_id))];
      const { data: branches, error: branchesErr } = await supabase
        .from('branches')
        .select('id, name')
        .in('id', branchIds);

      if (branchesErr) throw branchesErr;
      const branchMap = new Map(branches?.map(b => [b.id, b]) ?? []);

      // 4. Obtener coachings de este mes para los encargados
      const { data: thisMonthCoachings, error: thisMonthErr } = await supabase
        .from('coachings')
        .select('id, user_id, branch_id, coaching_date, overall_score, acknowledged_at, evaluated_by')
        .in('user_id', userIds)
        .eq('coaching_month', currentMonth)
        .eq('coaching_year', currentYear);

      if (thisMonthErr) throw thisMonthErr;

      // 5. Obtener coachings del mes anterior para comparación
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      
      const { data: prevMonthCoachings, error: prevMonthErr } = await supabase
        .from('coachings')
        .select('user_id, branch_id, overall_score')
        .in('user_id', userIds)
        .eq('coaching_month', prevMonth)
        .eq('coaching_year', prevYear);

      if (prevMonthErr) throw prevMonthErr;

      // 6. Obtener nombres de evaluadores
      const evaluatorIds = [...new Set(thisMonthCoachings?.map(c => c.evaluated_by) ?? [])];
      const { data: evaluators, error: evalErr } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', evaluatorIds);

      if (evalErr) throw evalErr;

      const evaluatorMap = new Map(evaluators?.map(e => [e.id, e.full_name]) ?? []);

      // 7. Construir resultado
      return roles.map(role => {
        const profile = profileMap.get(role.user_id);
        const branch = branchMap.get(role.branch_id);
        const coaching = thisMonthCoachings?.find(c => 
          c.user_id === role.user_id && c.branch_id === role.branch_id
        );
        const prevCoaching = prevMonthCoachings?.find(c => 
          c.user_id === role.user_id && c.branch_id === role.branch_id
        );

        return {
          userId: role.user_id,
          fullName: profile?.full_name || 'Sin nombre',
          avatarUrl: profile?.avatar_url || null,
          branchId: role.branch_id,
          branchName: branch?.name || 'Sin sucursal',
          hasCoachingThisMonth: !!coaching,
          latestCoaching: coaching ? {
            id: coaching.id,
            date: coaching.coaching_date,
            overallScore: coaching.overall_score,
            acknowledgedAt: coaching.acknowledged_at,
            evaluatorName: evaluatorMap.get(coaching.evaluated_by) || null,
          } : null,
          previousScore: prevCoaching?.overall_score || null,
        };
      });
    },
    staleTime: 30 * 1000,
  });
}

export default useManagersCoachingList;
