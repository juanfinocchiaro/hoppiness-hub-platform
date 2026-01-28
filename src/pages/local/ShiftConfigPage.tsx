import { useParams } from 'react-router-dom';
import { ShiftConfigCard } from '@/components/local/ShiftConfigCard';

export default function ShiftConfigPage() {
  const { branchId } = useParams<{ branchId: string }>();

  if (!branchId) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuración de Turnos</h1>
        <p className="text-muted-foreground">Habilita o deshabilita turnos para la carga de ventas</p>
      </div>

      <ShiftConfigCard branchId={branchId} />
    </div>
  );
}
