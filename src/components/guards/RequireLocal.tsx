import { Navigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { RequireAuth } from './RequireAuth';

interface RequireLocalProps {
  children: React.ReactNode;
}

export function RequireLocal({ children }: RequireLocalProps) {
  const { isAdmin, isCoordinador, isFranquiciado, isEncargado, isCajero, isKds, roles, loading } = useUserRole();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Todos los roles de franquicia pueden acceder a /local
  const hasLocalAccess = isAdmin || isCoordinador || isFranquiciado || isEncargado || isCajero || isKds;

  if (!hasLocalAccess) {
    return <Navigate to="/" replace />;
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
