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

      // 1. Get users with local roles for this branch from user_branch_roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_branch_roles')
        .select('id, user_id, local_role, is_active, created_at')
        .eq('branch_id', branchId)
        .eq('is_active', true);

      if (rolesError) throw rolesError;
      if (!roles?.length) return [];

      const userIds = roles.map(r => r.user_id);

      // 2. Get profiles (profiles.id = user_id after migration)
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

      // 4. Get clock entries for this month (new system)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: clockEntries } = await supabase
        .from('clock_entries')
        .select('user_id, entry_type, created_at')
        .eq('branch_id', branchId)
        .in('user_id', userIds)
        .gte('created_at', startOfMonth.toISOString())
        .order('created_at', { ascending: true });

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
      
      // Calculate hours per user from clock_entries (clock_in/clock_out pairs)
      const hoursMap = new Map<string, number>();
      const userEntriesMap = new Map<string, Array<{ type: string; time: Date }>>();
      
      // Group entries by user
      clockEntries?.forEach(e => {
        const existing = userEntriesMap.get(e.user_id) || [];
        existing.push({ type: e.entry_type, time: new Date(e.created_at) });
        userEntriesMap.set(e.user_id, existing);
      });
      
      // Calculate hours for each user
      userEntriesMap.forEach((entries, userId) => {
        let totalHours = 0;
        let lastClockIn: Date | null = null;
        
        entries.sort((a, b) => a.time.getTime() - b.time.getTime());
        
        for (const entry of entries) {
          if (entry.type === 'clock_in') {
            lastClockIn = entry.time;
          } else if (entry.type === 'clock_out' && lastClockIn) {
            totalHours += (entry.time.getTime() - lastClockIn.getTime()) / (1000 * 60 * 60);
            lastClockIn = null;
          }
        }
        
        hoursMap.set(userId, totalHours);
      });

      // Get last clock in and check if working
      const lastClockInMap = new Map<string, { time: string; isWorking: boolean }>();
      const sortedEntries = [...(clockEntries || [])].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      // For each user, check their most recent entry
      const processedUsers = new Set<string>();
      sortedEntries.forEach(e => {
        if (!processedUsers.has(e.user_id)) {
          processedUsers.add(e.user_id);
          lastClockInMap.set(e.user_id, {
            time: e.created_at,
            isWorking: e.entry_type === 'clock_in',
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
