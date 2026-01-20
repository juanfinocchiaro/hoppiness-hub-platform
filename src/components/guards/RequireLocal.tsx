import { Navigate } from 'react-router-dom';
import { useRoleLanding } from '@/hooks/useRoleLanding';
import { RequireAuth } from './RequireAuth';

interface RequireLocalProps {
  children: React.ReactNode;
}

export function RequireLocal({ children }: RequireLocalProps) {
  const { avatarInfo, loading, canAccessLocal } = useRoleLanding();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Verificar si el usuario puede acceder al panel local
  if (!canAccessLocal) {
    // Redirigir a su landing ideal (ej: socio va a reportes de marca)
    return <Navigate to={avatarInfo.landingPath} replace />;
  }

  return <>{children}</>;
}

export function LocalRoute({ children }: RequireLocalProps) {
  return (
    <RequireAuth>
      <RequireLocal>{children}</RequireLocal>
    </RequireAuth>
  );
}
