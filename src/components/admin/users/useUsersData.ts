import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { UserWithStats, Branch, NoteEntry } from './types';
import type { BrandRole, LocalRole } from '@/hooks/usePermissionsV2';

export function useUsersData() {
  // Fetch all users with their roles and order stats
  const { data: users = [], isLoading: loadingUsers, refetch } = useQuery({
    queryKey: ['admin-users-full'],
    queryFn: async () => {
      // 1. Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, email, phone, created_at, loyalty_points, internal_notes')
        .order('created_at', { ascending: false });
      
      if (profilesError) throw profilesError;
      if (!profiles?.length) return [];

      // 2. Fetch roles for all users - need to get user_id from profiles to match
      const profileUserIds = profiles.map(p => p.user_id).filter(Boolean);
      
      const { data: roles } = await supabase
        .from('user_roles_v2')
        .select('id, user_id, brand_role, local_role, branch_ids, is_active')
        .eq('is_active', true)
        .in('user_id', profileUserIds);

      // 3. Fetch order aggregates (count and sum per customer)
      const { data: orderStats } = await supabase
        .from('orders')
        .select('customer_id, id, total, created_at');

      // Build order aggregates map
      const orderAggregates: Record<string, { count: number; total: number; lastDate: string | null }> = {};
      orderStats?.forEach(order => {
        if (!order.customer_id) return;
        if (!orderAggregates[order.customer_id]) {
          orderAggregates[order.customer_id] = { count: 0, total: 0, lastDate: null };
        }
        orderAggregates[order.customer_id].count++;
        orderAggregates[order.customer_id].total += order.total || 0;
        if (!orderAggregates[order.customer_id].lastDate || 
            order.created_at > orderAggregates[order.customer_id].lastDate!) {
          orderAggregates[order.customer_id].lastDate = order.created_at;
        }
      });

      // Build roles map
      const rolesMap = new Map(roles?.map(r => [r.user_id, r]));

      // Merge data - use user_id for role lookup, profile.id for orders
      return profiles.map(p => {
        const role = rolesMap.get(p.user_id);
        const orders = orderAggregates[p.id] || { count: 0, total: 0, lastDate: null };
        
        return {
          id: p.id,
          full_name: p.full_name || '',
          email: p.email || '',
          phone: p.phone,
          created_at: p.created_at,
          loyalty_points: p.loyalty_points || 0,
          internal_notes: (p.internal_notes as unknown as NoteEntry[]) || [],
          brand_role: (role?.brand_role as BrandRole) || null,
          local_role: (role?.local_role as LocalRole) || null,
          branch_ids: role?.branch_ids || [],
          role_id: role?.id || null,
          total_orders: orders.count,
          total_spent: orders.total,
          last_order_date: orders.lastDate,
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
