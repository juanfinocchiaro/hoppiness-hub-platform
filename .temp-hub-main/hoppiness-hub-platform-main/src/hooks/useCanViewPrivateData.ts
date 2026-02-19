import { useUserRole } from './useUserRole';

/**
 * Hook to determine if the current user can view sensitive employee data
 * Only admins and users with can_manage_staff permission for a branch can see private data
 */
export function useCanViewPrivateData(branchId?: string) {
  const { isAdmin, branchPermissions, loading } = useUserRole();
  
  // Admins always can view private data
  if (isAdmin) {
    return { canViewPrivateData: true, loading };
  }
  
  // Check if user has can_manage_staff permission for this branch
  if (branchId) {
    const branchPerm = branchPermissions.find(p => p.branch_id === branchId);
    const canManageStaff = branchPerm?.can_manage_staff ?? false;
    return { canViewPrivateData: canManageStaff, loading };
  }
  
  return { canViewPrivateData: false, loading };
}
