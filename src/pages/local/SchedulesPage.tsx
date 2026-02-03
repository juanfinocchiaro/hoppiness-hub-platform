/**
 * SchedulesPage - Redesigned with 3 tabs
 * 
 * 1. Feriados: Global holidays management
 * 2. Calendario: Team schedule calendar view
 * 3. Solicitudes: Pending time-off requests
 */
import { useParams } from 'react-router-dom';
import { usePermissionsV2 } from '@/hooks/usePermissionsV2';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import HolidaysManager from '@/components/hr/HolidaysManager';
import MonthlyScheduleView from '@/components/hr/MonthlyScheduleView';
import PendingScheduleRequests from '@/components/hr/PendingScheduleRequests';
import { PageHelp } from '@/components/ui/PageHelp';
import { CalendarDays, CalendarCheck, ClipboardList } from 'lucide-react';

export default function SchedulesPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { isSuperadmin, isFranquiciado, isEncargado, isCoordinador, local } = usePermissionsV2(branchId);
  
  const canManageSchedules = isSuperadmin || isFranquiciado || isEncargado || local.canEditSchedules;
  const canManageHolidays = isSuperadmin || isCoordinador;

  if (!branchId) return null;

  return (
    <div className="space-y-6">
      <PageHelp pageId="local-schedules" />
      <div>
        <h1 className="text-2xl font-bold">Horarios</h1>
        <p className="text-muted-foreground">
          Gestión de feriados, horarios del equipo y solicitudes
        </p>
      </div>

      <Tabs defaultValue="calendario" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="feriados" className="gap-2">
            <CalendarCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Feriados</span>
          </TabsTrigger>
          <TabsTrigger value="calendario" className="gap-2">
            <CalendarDays className="w-4 h-4" />
            <span className="hidden sm:inline">Calendario</span>
          </TabsTrigger>
          <TabsTrigger value="solicitudes" className="gap-2">
            <ClipboardList className="w-4 h-4" />
            <span className="hidden sm:inline">Solicitudes</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feriados">
          <HolidaysManager />
        </TabsContent>

        <TabsContent value="calendario">
          <MonthlyScheduleView branchId={branchId} />
        </TabsContent>

        <TabsContent value="solicitudes">
          <PendingScheduleRequests branchId={branchId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
