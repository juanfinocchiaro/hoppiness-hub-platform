import { Navigate } from 'react-router-dom';
import { useRoleLanding } from '@/hooks/useRoleLanding';
import { RequireAuth } from './RequireAuth';

interface RequireAdminProps {
  children: React.ReactNode;
}

export function RequireAdmin({ children }: RequireAdminProps) {
  const { avatarInfo, loading, canAccessAdmin } = useRoleLanding();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Verificar si el usuario puede acceder al panel de admin
  if (!canAccessAdmin) {
    // Redirigir a su landing ideal
    return <Navigate to={avatarInfo.landingPath} replace />;
  }

  return <>{children}</>;
}

export function AdminRoute({ children }: RequireAdminProps) {
  return (
    <RequireAuth>
      <RequireAdmin>{children}</RequireAdmin>
    </RequireAuth>
  );
}
