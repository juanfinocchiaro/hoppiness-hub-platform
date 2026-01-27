import { useParams } from 'react-router-dom';
import { usePermissionsV2 } from '@/hooks/usePermissionsV2';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EmployeeScheduleEditor from '@/components/hr/EmployeeScheduleEditor';
import MonthlyScheduleCalendar from '@/components/hr/MonthlyScheduleCalendar';
import PendingScheduleRequests from '@/components/hr/PendingScheduleRequests';
import { CalendarDays, Clock } from 'lucide-react';

export default function LocalRRHHHorarios() {
  const { branchId } = useParams<{ branchId: string }>();
  const { isSuperadmin, isFranquiciado, isEncargado, local } = usePermissionsV2(branchId);
  
  const canManageStaff = isSuperadmin || isFranquiciado || isEncargado || local.canEditSchedules;

  if (!branchId) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Horarios</h1>
        <p className="text-muted-foreground">Programación mensual del personal</p>
      </div>

      {/* Pending Requests - Show at top if any */}
      {canManageStaff && <PendingScheduleRequests branchId={branchId} />}

      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarDays className="w-4 h-4" />
            Calendario Mensual
          </TabsTrigger>
          <TabsTrigger value="weekly" className="gap-2">
            <Clock className="w-4 h-4" />
            Horario Semanal Base
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <MonthlyScheduleCalendar branchId={branchId} />
        </TabsContent>

        <TabsContent value="weekly">
          <EmployeeScheduleEditor branchId={branchId} canManage={canManageStaff} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
