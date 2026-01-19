import { useParams } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import EmployeeScheduleEditor from '@/components/hr/EmployeeScheduleEditor';

export default function LocalRRHHHorarios() {
  const { branchId } = useParams<{ branchId: string }>();
  const { isAdmin, isFranquiciado, isGerente } = useUserRole();
  
  const canManageStaff = isAdmin || isFranquiciado || isGerente;

  if (!branchId) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Horarios</h1>
        <p className="text-muted-foreground">Programación mensual del personal</p>
      </div>

      <EmployeeScheduleEditor branchId={branchId} canManage={canManageStaff} />
    </div>
  );
}
