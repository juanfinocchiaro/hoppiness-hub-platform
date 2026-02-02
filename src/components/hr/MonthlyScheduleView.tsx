/**
 * MonthlyScheduleView - Team calendar view with all employee schedules
 * 
 * Features:
 * - View all employees' schedules for the month
 * - Filter by employee
 * - Click to edit individual days (uses EditScheduleDayModal)
 * - Holiday indicators
 * - Quick access to create new schedule
 */
import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Plus, User, Clock, Pencil } from 'lucide-react';
import { useTeamData } from '@/components/local/team/useTeamData';
import { useHolidays } from '@/hooks/useHolidays';
import { useMonthlySchedules, type ScheduleEntry } from '@/hooks/useSchedules';
import { usePermissionsV2 } from '@/hooks/usePermissionsV2';
import CreateScheduleWizard from './CreateScheduleWizard';
import EditScheduleDayModal from './EditScheduleDayModal';

interface MonthlyScheduleViewProps {
  branchId: string;
}

interface EditModalState {
  open: boolean;
  schedule: ScheduleEntry | null;
  employeeName: string;
}

export default function MonthlyScheduleView({ branchId }: MonthlyScheduleViewProps) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editModal, setEditModal] = useState<EditModalState>({
    open: false,
    schedule: null,
    employeeName: '',
  });
  
  const { isSuperadmin, isFranquiciado, isEncargado, local } = usePermissionsV2(branchId);
  const canManageSchedules = isSuperadmin || isFranquiciado || isEncargado || local.canEditSchedules;
  
  // Fetch data
  const { team, loading: loadingTeam } = useTeamData(branchId);
  const { data: holidays = [] } = useHolidays(month, year);
  const { data: schedules = [], isLoading: loadingSchedules, refetch } = useMonthlySchedules(branchId, month, year);
  
  // Generate days of the month
  const monthDays = useMemo(() => {
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(start);
    return eachDayOfInterval({ start, end });
  }, [month, year]);
  
  // Holiday dates set for quick lookup
  const holidayDates = useMemo(() => {
    const map = new Map<string, string>();
    holidays.forEach(h => map.set(h.day_date, h.description));
    return map;
  }, [holidays]);
  
  // Group schedules by user
  const schedulesByUser = useMemo(() => {
    const map = new Map<string, Map<string, ScheduleEntry>>();
    
    schedules.forEach(s => {
      if (!s.user_id || !s.schedule_date) return;
      
      if (!map.has(s.user_id)) {
        map.set(s.user_id, new Map());
      }
      map.get(s.user_id)!.set(s.schedule_date, s);
    });
    
    return map;
  }, [schedules]);
  
  // Filtered team
  const filteredTeam = useMemo(() => {
    if (selectedEmployeeId === 'all') return team;
    return team.filter(m => m.id === selectedEmployeeId);
  }, [team, selectedEmployeeId]);
  
  // Month navigation
  const goToPrevMonth = () => {
    const prev = subMonths(new Date(year, month - 1), 1);
    setMonth(prev.getMonth() + 1);
    setYear(prev.getFullYear());
  };
  
  const goToNextMonth = () => {
    const next = addMonths(new Date(year, month - 1), 1);
    setMonth(next.getMonth() + 1);
    setYear(next.getFullYear());
  };
  
  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  
  // Format time display
  const formatScheduleTime = (schedule: ScheduleEntry) => {
    if (schedule.is_day_off) return 'L';
    if (schedule.start_time && schedule.end_time) {
      return schedule.start_time.slice(0, 5);
    }
    return '-';
  };
  
  // Handle cell click for editing
  const handleCellClick = (schedule: ScheduleEntry | undefined, member: { id: string; full_name: string }, dateStr: string) => {
    if (!canManageSchedules || !schedule) return;
    
    // Don't allow editing holidays
    if (holidayDates.has(dateStr)) return;
    
    setEditModal({
      open: true,
      schedule,
      employeeName: member.full_name,
    });
  };
  
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const firstDayOfMonth = getDay(monthDays[0]);
  
  // Pad start with empty cells
  const paddedDays = [
    ...Array(firstDayOfMonth).fill(null),
    ...monthDays,
  ];
  
  // Split into weeks
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < paddedDays.length; i += 7) {
    weeks.push(paddedDays.slice(i, i + 7));
  }
  
  const loading = loadingTeam || loadingSchedules;
  
  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Month navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPrevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-medium capitalize min-w-[150px] text-center">
              {format(new Date(year, month - 1), 'MMMM yyyy', { locale: es })}
            </span>
            <Button variant="outline" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Filters and actions */}
          <div className="flex items-center gap-2">
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger className="w-[200px]">
                <User className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Todos los empleados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los empleados</SelectItem>
                {team.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {canManageSchedules && (
              <Button onClick={() => setWizardOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Crear Horario
              </Button>
            )}
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-orange-100 dark:bg-orange-950 border border-orange-300" />
            Feriado
          </span>
          <span className="flex items-center gap-1">
            <span className="font-medium">L</span> = Franco
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Hora de entrada
          </span>
          {canManageSchedules && (
            <span className="flex items-center gap-1">
              <Pencil className="w-3 h-3" />
              Clic para editar
            </span>
          )}
        </div>
        
        {/* Calendar */}
        {loading ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            </CardContent>
          </Card>
        ) : filteredTeam.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay empleados para mostrar</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <ScrollArea className="w-full">
              <div className="min-w-[800px]">
                {/* Header row with day names */}
                <div className="grid grid-cols-[150px_repeat(7,1fr)] border-b bg-muted/50">
                  <div className="p-2 font-medium text-sm">Empleado</div>
                  {dayNames.map((day) => (
                    <div key={day} className="p-2 text-center text-sm font-medium">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Calendar weeks */}
                {weeks.map((week, weekIdx) => (
                  <div key={weekIdx}>
                    {/* Date row */}
                    <div className="grid grid-cols-[150px_repeat(7,1fr)] border-b bg-muted/30">
                      <div className="p-1"></div>
                      {week.map((day, dayIdx) => {
                        if (!day) return <div key={dayIdx} className="p-1" />;
                        
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const isHoliday = holidayDates.has(dateStr);
                        const holidayName = holidayDates.get(dateStr);
                        
                        return (
                          <div
                            key={dayIdx}
                            className={cn(
                              'p-1 text-center text-xs',
                              isHoliday && 'bg-orange-100 dark:bg-orange-950/50'
                            )}
                          >
                            <span className={cn(
                              'font-medium',
                              isHoliday && 'text-orange-600 dark:text-orange-400'
                            )}>
                              {format(day, 'd')}
                            </span>
                            {isHoliday && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="ml-1">🎉</span>
                                </TooltipTrigger>
                                <TooltipContent>{holidayName}</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Employee rows */}
                    {filteredTeam.map((member) => {
                      const userSchedules = schedulesByUser.get(member.id);
                      
                      return (
                        <div
                          key={`${weekIdx}-${member.id}`}
                          className="grid grid-cols-[150px_repeat(7,1fr)] border-b hover:bg-muted/20"
                        >
                          {/* Employee name (only show on first week) */}
                          <div className="p-2 flex items-center gap-2">
                            {weekIdx === 0 && (
                              <>
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                                  {getInitials(member.full_name)}
                                </div>
                                <span className="text-sm truncate">{member.full_name}</span>
                              </>
                            )}
                          </div>
                          
                          {/* Schedule cells */}
                          {week.map((day, dayIdx) => {
                            if (!day) return <div key={dayIdx} className="p-1 border-r" />;
                            
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const isHoliday = holidayDates.has(dateStr);
                            const schedule = userSchedules?.get(dateStr);
                            const isSunday = day.getDay() === 0;
                            const isEditable = canManageSchedules && schedule && !isHoliday;
                            
                            return (
                              <div
                                key={dayIdx}
                                onClick={() => handleCellClick(schedule, member, dateStr)}
                                className={cn(
                                  'p-1 text-center border-r last:border-r-0 min-h-[32px] flex items-center justify-center group',
                                  isHoliday && 'bg-orange-50 dark:bg-orange-950/30',
                                  isSunday && 'bg-muted/30',
                                  isEditable && 'cursor-pointer hover:bg-primary/5 transition-colors'
                                )}
                              >
                                {schedule ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="relative">
                                        <Badge
                                          variant={schedule.is_day_off ? 'secondary' : 'default'}
                                          className={cn(
                                            'text-xs',
                                            schedule.is_day_off && 'bg-muted text-muted-foreground',
                                            isEditable && 'group-hover:ring-2 group-hover:ring-primary/30'
                                          )}
                                        >
                                          {formatScheduleTime(schedule)}
                                        </Badge>
                                        {isEditable && (
                                          <Pencil className="w-3 h-3 absolute -top-1 -right-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {schedule.is_day_off ? (
                                        'Franco'
                                      ) : (
                                        `${schedule.start_time?.slice(0, 5)} - ${schedule.end_time?.slice(0, 5)}`
                                      )}
                                      {isEditable && <span className="block text-xs opacity-70">Clic para editar</span>}
                                    </TooltipContent>
                                  </Tooltip>
                                ) : isHoliday ? (
                                  <span className="text-xs text-orange-500">-</span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </Card>
        )}
        
        {/* Wizard dialog */}
        <CreateScheduleWizard
          branchId={branchId}
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          initialMonth={month}
          initialYear={year}
          onSuccess={() => refetch()}
        />
        
        {/* Edit modal */}
        {editModal.schedule && (
          <EditScheduleDayModal
            open={editModal.open}
            onOpenChange={(open) => setEditModal(prev => ({ ...prev, open }))}
            schedule={editModal.schedule}
            employeeName={editModal.employeeName}
            onSuccess={() => refetch()}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
