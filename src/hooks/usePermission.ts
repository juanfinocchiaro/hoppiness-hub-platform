import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook to check if the current user has a specific permission for a branch.
 * Uses the has_branch_permission database function.
 * 
 * @param permissionKey - The permission key to check (e.g., 'orders.manage', 'hr.employees_private')
 * @param branchId - The branch ID to check the permission for
 * @returns { hasPermission, isLoading, error }
 */
export function usePermission(permissionKey: string | null, branchId: string | null) {
  const { user } = useAuth();

  const { data: hasPermission = false, isLoading, error } = useQuery({
    queryKey: ['permission', permissionKey, branchId, user?.id],
    queryFn: async () => {
      if (!user?.id || !permissionKey || !branchId) return false;

      const { data, error } = await supabase.rpc('has_branch_permission', {
        _branch_id: branchId,
        _permission: permissionKey,
        _user_id: user.id,
      });

      if (error) throw error;
      return data ?? false;
    },
    enabled: !!user?.id && !!permissionKey && !!branchId,
    staleTime: 30 * 1000, // Cache for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  return { hasPermission, isLoading, error };
}

/**
 * Hook to check multiple permissions at once.
 * Returns an object with each permission key mapped to its boolean value.
 * 
 * @param permissionKeys - Array of permission keys to check
 * @param branchId - The branch ID to check permissions for
 * @returns { permissions, isLoading, error }
 */
export function usePermissions(permissionKeys: string[], branchId: string | null) {
  const { user } = useAuth();

  const { data: permissions = {}, isLoading, error } = useQuery({
    queryKey: ['permissions', permissionKeys, branchId, user?.id],
    queryFn: async () => {
      if (!user?.id || !branchId || permissionKeys.length === 0) {
        return Object.fromEntries(permissionKeys.map(k => [k, false]));
      }

      const results = await Promise.all(
        permissionKeys.map(async (key) => {
          const { data } = await supabase.rpc('has_branch_permission', {
            _branch_id: branchId,
            _permission: key,
            _user_id: user.id,
          });
          return [key, data ?? false] as const;
        })
      );

      return Object.fromEntries(results);
    },
    enabled: !!user?.id && !!branchId && permissionKeys.length > 0,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  return { 
    permissions: permissions as Record<string, boolean>, 
    isLoading, 
    error 
  };
}
