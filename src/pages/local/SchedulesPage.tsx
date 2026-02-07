/**
 * SchedulesPage - Simplified schedule editor
 * 
 * Solo contiene:
 * - Navegador de mes
 * - Grilla de horarios (InlineScheduleEditor)
 * - Banner de solo lectura para franquiciados
 * 
 * Feriados movidos a Mi Marca (/mimarca/configuracion/calendario)
 * Solicitudes movidas a /milocal/:branchId/tiempo/solicitudes
 */
import { useParams } from 'react-router-dom';
import { usePermissionsWithImpersonation } from '@/hooks/usePermissionsWithImpersonation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import InlineScheduleEditor from '@/components/hr/InlineScheduleEditor';
import { PageHelp } from '@/components/ui/PageHelp';
import { Eye } from 'lucide-react';

export default function SchedulesPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { isFranquiciado, local, loading } = usePermissionsWithImpersonation(branchId);
  
  // Wait for permissions to load to avoid flash
  if (loading) return null;
  
  const canManageSchedules = local.canEditSchedules;
  const isReadOnly = isFranquiciado || !canManageSchedules;

  if (!branchId) return null;

  return (
    <div className="space-y-6">
      <PageHelp pageId="local-schedules" />
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Horarios</h1>
        <p className="text-muted-foreground">
          Planificación de turnos del equipo
        </p>
      </div>

      {/* Read-only banner for Franquiciado */}
      {isReadOnly && (
        <Alert>
          <Eye className="h-4 w-4" />
          <AlertTitle>Modo lectura</AlertTitle>
          <AlertDescription>
            Estás viendo los horarios en modo lectura. Solo el encargado puede modificarlos.
          </AlertDescription>
        </Alert>
      )}

      {/* Schedule Editor */}
      <InlineScheduleEditor branchId={branchId} readOnly={isReadOnly} />
    </div>
  );
}
