/**
 * ImpersonationBanner - Banner que indica modo "Ver como..."
 * 
 * Aparece en la parte superior cuando el superadmin está impersonando a otro usuario.
 */
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { Button } from '@/components/ui/button';
import { Eye, X, User, Building2 } from 'lucide-react';
import { LOCAL_ROLE_LABELS, BRAND_ROLE_LABELS } from '@/hooks/usePermissionsV2';

export default function ImpersonationBanner() {
  const { isImpersonating, targetUser, stopImpersonating } = useImpersonation();

  if (!isImpersonating || !targetUser) return null;

  // Determine the main role to display
  const getRoleLabel = () => {
    if (targetUser.brandRole) {
      return BRAND_ROLE_LABELS[targetUser.brandRole] || targetUser.brandRole;
    }
    if (targetUser.branchRoles.length > 0) {
      const firstRole = targetUser.branchRoles[0];
      const roleLabel = LOCAL_ROLE_LABELS[firstRole.local_role || ''] || firstRole.local_role;
      const branch = targetUser.accessibleBranches.find(b => b.id === firstRole.branch_id);
      return `${roleLabel}${branch ? ` - ${branch.name}` : ''}`;
    }
    return 'Sin rol asignado';
  };

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[100]">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 border border-amber-300 rounded-full shadow-sm text-sm">
        <Eye className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
        <span className="text-amber-800 font-medium">Viendo como</span>
        <div className="flex items-center gap-1.5">
          {targetUser.avatar_url ? (
            <img 
              src={targetUser.avatar_url} 
              alt="" 
              className="w-5 h-5 rounded-full object-cover"
            />
          ) : (
            <User className="w-4 h-4 text-amber-700" />
          )}
          <span className="font-semibold text-amber-900 max-w-[120px] truncate">
            {targetUser.full_name.split(' ')[0]}
          </span>
        </div>
        <button
          onClick={stopImpersonating}
          className="ml-1 p-1 rounded-full hover:bg-amber-200 text-amber-700 hover:text-amber-900 transition-colors"
          aria-label="Salir del modo vista previa"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
