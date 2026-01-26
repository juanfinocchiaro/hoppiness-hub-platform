import { useParams } from 'react-router-dom';
import { usePermissionsV2 } from '@/hooks/usePermissionsV2';
import OperationalStaffManager from '@/components/hr/OperationalStaffManager';
import EmployeeDetailManager from '@/components/hr/EmployeeDetailManager';

export default function LocalRRHHFichajes() {
  const { branchId } = useParams<{ branchId: string }>();
  const { isSuperadmin, local } = usePermissionsV2();
  
  const canManageStaff = isSuperadmin || local.canViewTeam;

  if (!branchId) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Fichajes</h1>
        <p className="text-muted-foreground">Registro de entradas y salidas del personal operativo</p>
      </div>

      {/* Employee Management with full data */}
      <EmployeeDetailManager branchId={branchId} canManage={canManageStaff} />

      {/* Today's attendance logs */}
      <OperationalStaffManager branchId={branchId} canManage={canManageStaff} />
    </div>
  );
}
