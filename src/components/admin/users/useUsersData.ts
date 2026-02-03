import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { UserWithStats, Branch, BranchRoleInfo } from './types';
import type { BrandRole, LocalRole } from '@/hooks/usePermissionsV2';
import type { WorkPositionType } from '@/types/workPosition';
import { ROLE_PRIORITY } from './types';

export function useUsersData() {
  // Fetch branches first (needed for mapping)
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('branches')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      return (data || []) as Branch[];
    },
    staleTime: 60 * 1000,
  });

  // Fetch all users with consolidated roles
  const { data: users = [], isLoading: loadingUsers, refetch } = useQuery({
    queryKey: ['admin-users-consolidated', branches],
    queryFn: async () => {
      // 1. Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, created_at')
        .order('created_at', { ascending: false });
      
      if (profilesError) throw profilesError;
      if (!profiles?.length) return [];

      const profileIds = profiles.map(p => p.id).filter(Boolean);

      // 2. Fetch brand roles from user_roles_v2 (only brand_role)
      const { data: brandRoles } = await supabase
        .from('user_roles_v2')
        .select('id, user_id, brand_role')
        .eq('is_active', true)
        .in('user_id', profileIds);

      // 3. Fetch local roles from user_branch_roles (NEW: única fuente de verdad)
      const { data: branchRoles } = await supabase
        .from('user_branch_roles')
        .select('id, user_id, branch_id, local_role, default_position, clock_pin, is_active')
        .eq('is_active', true)
        .in('user_id', profileIds);

      // Build maps
      const brandRolesMap = new Map(brandRoles?.map(r => [r.user_id, r]));
      const branchRolesMap = new Map<string, BranchRoleInfo[]>();
      
      // Group branch roles by user
      for (const br of branchRoles || []) {
        const branchName = branches.find(b => b.id === br.branch_id)?.name || 'Sucursal';
        const roleInfo: BranchRoleInfo = {
          branch_id: br.branch_id,
          branch_name: branchName,
          local_role: br.local_role as LocalRole,
          default_position: br.default_position as WorkPositionType | null,
          clock_pin: br.clock_pin,
          is_active: br.is_active ?? true,
          role_record_id: br.id,
        };
        
        const existing = branchRolesMap.get(br.user_id) || [];
        existing.push(roleInfo);
        branchRolesMap.set(br.user_id, existing);
      }

      // Merge data
      return profiles.map(p => {
        const brandRole = brandRolesMap.get(p.id);
        const userBranchRoles = branchRolesMap.get(p.id) || [];
        
        // Calcular rol local principal (el de mayor prioridad)
        let primaryLocalRole: LocalRole = null;
        let maxPriority = 0;
        for (const br of userBranchRoles) {
          const priority = ROLE_PRIORITY[br.local_role] || 0;
          if (priority > maxPriority) {
            maxPriority = priority;
            primaryLocalRole = br.local_role;
          }
        }
        
        return {
          id: p.id,
          user_id: p.id,
          full_name: p.full_name || '',
          email: p.email || '',
          phone: p.phone,
          created_at: p.created_at,
          brand_role: (brandRole?.brand_role as BrandRole) || null,
          brand_role_id: brandRole?.id || null,
          branch_roles: userBranchRoles,
          hasLocalAccess: userBranchRoles.length > 0,
          primaryLocalRole,
        } as UserWithStats;
      });
    },
    staleTime: 30 * 1000,
    enabled: branches.length > 0,
  });

  return { users, branches, loading: loadingUsers, refetch };
}
