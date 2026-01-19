import { Navigate, useParams } from 'react-router-dom';

// Legacy redirect - availability is now split into /productos and /extras
export default function LocalDisponibilidad() {
  const { branchId } = useParams<{ branchId: string }>();
  return <Navigate to={`/local/${branchId}/productos`} replace />;
}
