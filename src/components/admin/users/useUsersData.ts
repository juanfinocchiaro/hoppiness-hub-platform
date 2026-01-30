import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { UserWithStats, Branch } from './types';
import type { BrandRole, LocalRole } from '@/hooks/usePermissionsV2';

export function useUsersData() {
  // Fetch all users with their roles (no order stats - orders table eliminated)
  const { data: users = [], isLoading: loadingUsers, refetch } = useQuery({
    queryKey: ['admin-users-v2'],
    queryFn: async () => {
      // 1. Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, email, phone, created_at')
        .order('created_at', { ascending: false });
      
      if (profilesError) throw profilesError;
      if (!profiles?.length) return [];

      // 2. Fetch roles for all users
      const profileUserIds = profiles.map(p => p.user_id).filter(Boolean);
      
      const { data: roles } = await supabase
        .from('user_roles_v2')
        .select('id, user_id, brand_role, local_role, branch_ids, is_active')
        .eq('is_active', true)
        .in('user_id', profileUserIds);

      // Build roles map
      const rolesMap = new Map(roles?.map(r => [r.user_id, r]));

      // Merge data
      return profiles.map(p => {
        const role = rolesMap.get(p.user_id);
        
        return {
          id: p.id,
          user_id: p.user_id,
          full_name: p.full_name || '',
          email: p.email || '',
          phone: p.phone,
          created_at: p.created_at,
          loyalty_points: 0, // Removed - no loyalty system
          internal_notes: [], // Removed - use communications
          brand_role: (role?.brand_role as BrandRole) || null,
          local_role: (role?.local_role as LocalRole) || null,
          branch_ids: role?.branch_ids || [],
          role_id: role?.id || null,
          total_orders: 0, // Removed - no orders system
          total_spent: 0, // Removed - no orders system
          last_order_date: null, // Removed - no orders system
        } as UserWithStats;
      });
    },
    staleTime: 30 * 1000,
  });

  // Fetch branches for reference
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

  return { users, branches, loading: loadingUsers, refetch };
}
