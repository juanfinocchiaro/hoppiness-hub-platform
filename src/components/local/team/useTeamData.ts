import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TeamMember, EmployeeData, Warning, NoteEntry } from './types';
import type { LocalRole } from '@/hooks/usePermissionsV2';

export function useTeamData(branchId: string | undefined) {
  // Fetch team members
  const { data: team = [], isLoading, refetch } = useQuery({
    queryKey: ['branch-team', branchId],
    queryFn: async () => {
      if (!branchId) return [];

      // 1. Get users with local roles for this branch
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles_v2')
        .select('id, user_id, local_role, branch_ids, created_at')
        .not('local_role', 'is', null)
        .eq('is_active', true)
        .contains('branch_ids', [branchId]);

      if (rolesError) throw rolesError;
      if (!roles?.length) return [];

      const userIds = roles.map(r => r.user_id);

      // 2. Get profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .in('id', userIds);

      // 3. Get employee data for hours target
      const { data: employeeData } = await supabase
        .from('employee_data')
        .select('user_id, monthly_hours_target')
        .eq('branch_id', branchId)
        .in('user_id', userIds);

      // 4. Get attendance records for this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: attendance } = await supabase
        .from('attendance_records')
        .select('user_id, check_in, check_out')
        .eq('branch_id', branchId)
        .in('user_id', userIds)
        .gte('check_in', startOfMonth.toISOString());

      // 5. Get active warnings count
      const { data: warnings } = await supabase
        .from('warnings')
        .select('user_id')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .in('user_id', userIds);

      // Build aggregates
      const profilesMap = new Map(profiles?.map(p => [p.id, p]));
      const employeeDataMap = new Map(employeeData?.map(e => [e.user_id, e]));
      
      // Calculate hours per user
      const hoursMap = new Map<string, number>();
      attendance?.forEach(a => {
        if (a.check_in && a.check_out) {
          const hours = (new Date(a.check_out).getTime() - new Date(a.check_in).getTime()) / (1000 * 60 * 60);
          hoursMap.set(a.user_id, (hoursMap.get(a.user_id) || 0) + hours);
        }
      });

      // Get last clock in and check if working
      const lastClockInMap = new Map<string, { time: string; isWorking: boolean }>();
      const sortedAttendance = [...(attendance || [])].sort((a, b) => 
        new Date(b.check_in).getTime() - new Date(a.check_in).getTime()
      );
      sortedAttendance.forEach(a => {
        if (!lastClockInMap.has(a.user_id)) {
          lastClockInMap.set(a.user_id, {
            time: a.check_in,
            isWorking: !a.check_out,
          });
        }
      });

      // Count warnings
      const warningsMap = new Map<string, number>();
      warnings?.forEach(w => {
        warningsMap.set(w.user_id, (warningsMap.get(w.user_id) || 0) + 1);
      });

      // Merge data
      return roles.map(role => {
        const profile = profilesMap.get(role.user_id);
        const empData = employeeDataMap.get(role.user_id);
        const lastClock = lastClockInMap.get(role.user_id);

        return {
          id: role.user_id,
          user_id: role.user_id,
          full_name: profile?.full_name || '',
          email: profile?.email || '',
          phone: profile?.phone || null,
          local_role: role.local_role as LocalRole,
          hire_date: role.created_at,
          hours_this_month: hoursMap.get(role.user_id) || 0,
          monthly_hours_target: empData?.monthly_hours_target || 160,
          last_clock_in: lastClock?.time || null,
          is_working: lastClock?.isWorking || false,
          active_warnings: warningsMap.get(role.user_id) || 0,
          role_id: role.id,
        } as TeamMember;
      }).sort((a, b) => a.full_name.localeCompare(b.full_name));
    },
    enabled: !!branchId,
    staleTime: 30 * 1000,
  });

  return { team, loading: isLoading, refetch };
}

export function useEmployeeDetails(userId: string | undefined, branchId: string | undefined) {
  // Fetch employee data
  const { data: employeeData } = useQuery({
    queryKey: ['employee-data', userId, branchId],
    queryFn: async () => {
      if (!userId || !branchId) return null;
      
      const { data } = await supabase
        .from('employee_data')
        .select('*')
        .eq('user_id', userId)
        .eq('branch_id', branchId)
        .maybeSingle();
      
      if (!data) return null;
      return {
        ...data,
        internal_notes: (data.internal_notes as unknown as NoteEntry[]) || [],
      } as EmployeeData;
    },
    enabled: !!userId && !!branchId,
    staleTime: 30 * 1000,
  });

  // Fetch warnings
  const { data: warnings = [] } = useQuery({
    queryKey: ['employee-warnings', userId, branchId],
    queryFn: async () => {
      if (!userId || !branchId) return [];
      
      const { data } = await supabase
        .from('warnings')
        .select('*')
        .eq('user_id', userId)
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .order('warning_date', { ascending: false })
        .limit(5);
      
      return (data || []) as Warning[];
    },
    enabled: !!userId && !!branchId,
    staleTime: 30 * 1000,
  });

  return { employeeData, warnings };
}
