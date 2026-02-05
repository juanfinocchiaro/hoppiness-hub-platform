/**
 * RequireBranchAccess - Guard que valida acceso a una sucursal específica
 * 
 * Usa usePermissionsWithImpersonation para considerar impersonación.
 * Muestra NoAccessState si el usuario no tiene acceso a la sucursal.
 */
import { ReactNode } from 'react';
import { usePermissionsWithImpersonation } from '@/hooks/usePermissionsWithImpersonation';
import { NoAccessState } from '@/components/ui/states/no-access-state';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';

interface RequireBranchAccessProps {
  branchId: string;
  children: ReactNode;
  fallbackPath?: string;
}

export function RequireBranchAccess({
  branchId,
  children,
  fallbackPath = '/cuenta',
}: RequireBranchAccessProps) {
  const { loading, hasAccessToBranch, isSuperadmin, canAccessLocalPanel } = 
    usePermissionsWithImpersonation(branchId);

  if (loading) {
    return <HoppinessLoader fullScreen size="lg" />;
  }

  // Superadmins siempre tienen acceso
  if (isSuperadmin) {
    return <>{children}</>;
  }

  // Verificar acceso específico a la sucursal
  const hasAccess = hasAccessToBranch(branchId);

  if (!hasAccess) {
    return (
      <NoAccessState
        title="Sin acceso a esta sucursal"
        description={
          canAccessLocalPanel
            ? 'No tenés permisos para acceder a esta sucursal. Verificá con tu encargado.'
            : 'No tenés permisos para acceder al panel de sucursales.'
        }
        backPath={fallbackPath}
      />
    );
  }

  return <>{children}</>;
}

export default RequireBranchAccess;
