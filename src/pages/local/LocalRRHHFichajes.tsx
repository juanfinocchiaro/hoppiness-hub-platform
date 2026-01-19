import { useParams } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import OperationalStaffManager from '@/components/hr/OperationalStaffManager';

export default function LocalRRHHFichajes() {
  const { branchId } = useParams<{ branchId: string }>();
  const { isAdmin, isFranquiciado, isGerente } = useUserRole();
  
  const canManageStaff = isAdmin || isFranquiciado || isGerente;

  if (!branchId) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fichajes</h1>
        <p className="text-muted-foreground">Registro de entradas y salidas del personal operativo</p>
      </div>

      <OperationalStaffManager branchId={branchId} canManage={canManageStaff} />
    </div>
  );
}
