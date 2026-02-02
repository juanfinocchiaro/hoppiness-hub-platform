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
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 px-4 py-2 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Eye className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium hidden sm:inline">Modo Vista Previa:</span>
          <div className="flex items-center gap-2 min-w-0">
            {targetUser.avatar_url ? (
              <img 
                src={targetUser.avatar_url} 
                alt="" 
                className="w-6 h-6 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <User className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="font-semibold truncate">{targetUser.full_name}</span>
            <span className="text-amber-800 hidden md:inline">({getRoleLabel()})</span>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={stopImpersonating}
          className="flex-shrink-0 text-amber-950 hover:bg-amber-600/20 hover:text-amber-950"
        >
          <X className="w-4 h-4 mr-1" />
          <span className="hidden sm:inline">Salir del modo</span>
          <span className="sm:hidden">Salir</span>
        </Button>
      </div>
    </div>
  );
}
