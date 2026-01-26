import { usePermissionsV2 } from './usePermissionsV2';

/**
 * Hook to determine if the current user can view sensitive employee data
 * Only superadmins and users with canManageTeam permission can see private data
 */
export function useCanViewPrivateData(branchId?: string) {
  const { isSuperadmin, local, loading } = usePermissionsV2();
  
  // Superadmins always can view private data
  if (isSuperadmin) {
    return { canViewPrivateData: true, loading };
  }
  
  // Local users with team view permission can view private data
  if (local.canViewTeam) {
    return { canViewPrivateData: true, loading };
  }
  
  return { canViewPrivateData: false, loading };
}
