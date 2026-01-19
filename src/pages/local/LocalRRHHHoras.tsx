import { useParams } from 'react-router-dom';
import MonthlyHoursStats from '@/components/hr/MonthlyHoursStats';

export default function LocalRRHHHoras() {
  const { branchId } = useParams<{ branchId: string }>();

  if (!branchId) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Horas del Mes</h1>
        <p className="text-muted-foreground">Control de horas trabajadas por empleado</p>
      </div>

      <MonthlyHoursStats branchId={branchId} />
    </div>
  );
}
