/**
 * RequireQRAccess - Guard para el QR de fichaje
 * Solo permite acceso a superadmin, franquiciado y encargado
 */
import { Navigate, useParams } from 'react-router-dom';
import { usePermissionsWithImpersonation } from '@/hooks/usePermissionsWithImpersonation';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';

interface RequireQRAccessProps {
  children: React.ReactNode;
}

export function RequireQRAccess({ children }: RequireQRAccessProps) {
  const { branchId } = useParams();
  const { 
    loading, 
    isSuperadmin, 
    isFranquiciado,
    isEncargado,
    hasAccessToBranch
  } = usePermissionsWithImpersonation(branchId);

  if (loading) {
    return <HoppinessLoader fullScreen size="lg" />;
  }

  // Solo superadmin, franquiciado y encargado pueden ver el QR
  const canViewQR = isSuperadmin || isFranquiciado || isEncargado;

  if (!canViewQR) {
    return <Navigate to="/cuenta" replace />;
  }

  // Verificar acceso a esta branch específica
  if (!isSuperadmin && branchId && !hasAccessToBranch(branchId)) {
    return <Navigate to="/cuenta" replace />;
  }

  return <>{children}</>;
}
