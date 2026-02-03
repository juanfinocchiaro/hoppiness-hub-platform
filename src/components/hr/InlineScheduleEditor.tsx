/**
 * InlineScheduleEditor - Excel-like schedule editing
 * 
 * Features:
 * - Horizontal grid with sticky employee names
 * - Direct cell editing with popovers
 * - Pending changes tracking
 * - Batch save with confirmation
 * - Hourly coverage visualization (hour by hour)
 */
import { useState, useMemo, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, User, Save, Undo2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTeamData } from '@/components/local/team/useTeamData';
import { useHolidays } from '@/hooks/useHolidays';
import { useMonthlySchedules, type ScheduleEntry, type DaySchedule } from '@/hooks/useSchedules';
import { usePermissionsV2 } from '@/hooks/usePermissionsV2';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { ScheduleCellPopover, type ScheduleValue } from './ScheduleCellPopover';
import { SaveScheduleDialog } from './SaveScheduleDialog';
import type { WorkPositionType } from '@/types/workPosition';

interface InlineScheduleEditorProps {
  branchId: string;
}

interface PendingChange {
  userId: string;
  userName: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  isDayOff: boolean;
  position: WorkPositionType | null;
  breakStart?: string | null;
  breakEnd?: string | null;
  originalValue: ScheduleEntry | null;
}

// Key for pending changes map
const changeKey = (userId: string, date: string) => `${userId}:${date}`;

export default function InlineScheduleEditor({ branchId }: InlineScheduleEditorProps) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [pendingChanges, setPendingChanges] = useState<Map<string, PendingChange>>(new Map());
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { id: currentUserId } = useEffectiveUser();

  const { isSuperadmin, isFranquiciado, isEncargado, local } = usePermissionsV2(branchId);
  const canManageSchedules = isSuperadmin || isFranquiciado || isEncargado || local.canEditSchedules;

  // Fetch data
  const { team, loading: loadingTeam } = useTeamData(branchId, { excludeOwners: true });
  const { data: holidays = [] } = useHolidays(month, year);
  const { data: schedules = [], isLoading: loadingSchedules, refetch } = useMonthlySchedules(branchId, month, year);

  // Generate days of the month
  const monthDays = useMemo(() => {
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(start);
    return eachDayOfInterval({ start, end });
  }, [month, year]);

  // Holiday dates set
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

  // Get effective value (pending change or existing schedule)
  const getEffectiveValue = useCallback((userId: string, dateStr: string): ScheduleValue => {
    const key = changeKey(userId, dateStr);
    const pending = pendingChanges.get(key);
    if (pending) {
      return {
        startTime: pending.startTime,
        endTime: pending.endTime,
        isDayOff: pending.isDayOff,
        position: pending.position,
      };
    }

    const schedule = schedulesByUser.get(userId)?.get(dateStr);
    if (schedule) {
      return {
        startTime: schedule.start_time || null,
        endTime: schedule.end_time || null,
        isDayOff: schedule.is_day_off || false,
        position: (schedule as any).work_position || null,
      };
    }

    return { startTime: null, endTime: null, isDayOff: false, position: null };
  }, [pendingChanges, schedulesByUser]);

  // Check if cell has pending changes
  const hasPendingChange = useCallback((userId: string, dateStr: string) => {
    return pendingChanges.has(changeKey(userId, dateStr));
  }, [pendingChanges]);

  // Handle cell change
  const handleCellChange = useCallback((userId: string, userName: string, dateStr: string, value: ScheduleValue) => {
    const key = changeKey(userId, dateStr);
    const originalSchedule = schedulesByUser.get(userId)?.get(dateStr) || null;

    // Check if value is same as original
    const isSameAsOriginal =
      (originalSchedule?.start_time || null) === value.startTime &&
      (originalSchedule?.end_time || null) === value.endTime &&
      (originalSchedule?.is_day_off || false) === value.isDayOff &&
      ((originalSchedule as any)?.work_position || null) === value.position;

    if (isSameAsOriginal) {
      // Remove pending change if it matches original
      setPendingChanges(prev => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
    } else {
      // Add/update pending change
      setPendingChanges(prev => {
        const next = new Map(prev);
        next.set(key, {
          userId,
          userName,
          date: dateStr,
          startTime: value.startTime,
          endTime: value.endTime,
          isDayOff: value.isDayOff,
          position: value.position,
          originalValue: originalSchedule,
        });
        return next;
      });
    }
  }, [schedulesByUser]);

  // Discard all changes
  const handleDiscardChanges = () => {
    setPendingChanges(new Map());
    toast.info('Cambios descartados');
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async ({ notifyEmail, notifyCommunication }: { notifyEmail: boolean; notifyCommunication: boolean }) => {
      // Group changes by user
      const changesByUser = new Map<string, PendingChange[]>();
      pendingChanges.forEach((change) => {
        if (!changesByUser.has(change.userId)) {
          changesByUser.set(change.userId, []);
        }
        changesByUser.get(change.userId)!.push(change);
      });

      // Save each user's changes
      for (const [userId, userChanges] of changesByUser) {
        const days: DaySchedule[] = userChanges.map(change => ({
          date: change.date,
          start_time: change.startTime,
          end_time: change.endTime,
          is_day_off: change.isDayOff,
          work_position: change.position,
        }));

        // Upsert schedules
        for (const day of days) {
          const existingSchedule = schedulesByUser.get(userId)?.get(day.date);
          
          const scheduleData = {
            user_id: userId,
            employee_id: userId,
            branch_id: branchId,
            schedule_date: day.date,
            schedule_month: month,
            schedule_year: year,
            day_of_week: new Date(day.date).getDay(),
            start_time: day.start_time || '00:00',
            end_time: day.end_time || '00:00',
            is_day_off: day.is_day_off,
            work_position: day.work_position,
            published_at: new Date().toISOString(),
            published_by: currentUserId,
          };

          if (existingSchedule?.id) {
            const { error } = await supabase
              .from('employee_schedules')
              .update(scheduleData)
              .eq('id', existingSchedule.id);
            if (error) throw error;
          } else if (day.start_time || day.is_day_off) {
            const { error } = await supabase
              .from('employee_schedules')
              .insert(scheduleData);
            if (error) throw error;
          }
        }
      }
    },
    onSuccess: () => {
      setPendingChanges(new Map());
      setSaveDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['monthly-schedules', branchId, month, year] });
      refetch();
      toast.success('Horarios publicados');
    },
    onError: (error) => {
      toast.error('Error al guardar: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    },
  });

  // Affected employees for save dialog
  const affectedEmployees = useMemo(() => {
    const byUser = new Map<string, { name: string; count: number }>();
    pendingChanges.forEach((change) => {
      const existing = byUser.get(change.userId) || { name: change.userName, count: 0 };
      existing.count += 1;
      byUser.set(change.userId, existing);
    });
    return Array.from(byUser.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      changesCount: data.count,
    }));
  }, [pendingChanges]);

  // Month navigation
  const goToPrevMonth = () => {
    const prev = subMonths(new Date(year, month - 1), 1);
    setMonth(prev.getMonth() + 1);
    setYear(prev.getFullYear());
    setPendingChanges(new Map());
  };

  const goToNextMonth = () => {
    const next = addMonths(new Date(year, month - 1), 1);
    setMonth(next.getMonth() + 1);
    setYear(next.getFullYear());
    setPendingChanges(new Map());
  };

  // Format schedule display
  const formatScheduleDisplay = (value: ScheduleValue) => {
    if (value.isDayOff) return 'F';
    if (value.startTime && value.endTime) {
      const base = `${value.startTime.slice(0, 5)}-${value.endTime.slice(0, 5)}`;
      if (value.breakStart && value.breakEnd) {
        return `${base} ☕`;
      }
      return base;
    }
    if (value.startTime) return value.startTime.slice(0, 5);
    return '-';
  };

  // Get initials
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const loading = loadingTeam || loadingSchedules;

  // Schedules including pending changes for coverage calculation
  const schedulesWithPending = useMemo(() => {
    const result: Array<{ schedule_date: string; start_time: string | null; end_time: string | null; is_day_off: boolean }> = [];
    
    // Add existing schedules
    schedules.forEach(s => {
      const pendingChange = pendingChanges.get(changeKey(s.user_id!, s.schedule_date!));
      if (pendingChange) {
        result.push({
          schedule_date: s.schedule_date!,
          start_time: pendingChange.startTime,
          end_time: pendingChange.endTime,
          is_day_off: pendingChange.isDayOff,
        });
      } else {
        result.push({
          schedule_date: s.schedule_date!,
          start_time: s.start_time,
          end_time: s.end_time,
          is_day_off: s.is_day_off || false,
        });
      }
    });
    
    // Add new pending changes (not in existing schedules)
    pendingChanges.forEach((change, key) => {
      const existing = schedules.find(s => changeKey(s.user_id!, s.schedule_date!) === key);
      if (!existing) {
        result.push({
          schedule_date: change.date,
          start_time: change.startTime,
          end_time: change.endTime,
          is_day_off: change.isDayOff,
        });
      }
    });
    
    return result;
  }, [schedules, pendingChanges]);

  // Calculate hourly range based on all schedules
  const hourlyRange = useMemo(() => {
    let minHour = 24;
    let maxHour = 0;
    
    schedulesWithPending.forEach(s => {
      if (s.is_day_off || !s.start_time || !s.end_time) return;
      
      const [startH] = s.start_time.split(':').map(Number);
      const [endH] = s.end_time.split(':').map(Number);
      
      minHour = Math.min(minHour, startH);
      maxHour = Math.max(maxHour, endH < startH ? 24 : endH);
    });
    
    // Default range if no schedules
    if (minHour > maxHour) {
      minHour = 11;
      maxHour = 23;
    }
    
    // Generate hour slots
    const hours: number[] = [];
    for (let h = minHour; h <= maxHour; h++) {
      hours.push(h);
    }
    
    return hours;
  }, [schedulesWithPending]);

  // Count employees at a specific hour for a specific date
  const countEmployeesAtHour = useCallback((dateStr: string, hour: number) => {
    return schedulesWithPending.filter(s => {
      if (s.schedule_date !== dateStr) return false;
      if (s.is_day_off) return false;
      if (!s.start_time || !s.end_time) return false;
      
      const [startH] = s.start_time.split(':').map(Number);
      const [endH] = s.end_time.split(':').map(Number);
      const adjustedEnd = endH < startH ? endH + 24 : endH;
      
      // Employee is working if hour falls within their shift
      return startH <= hour && hour < adjustedEnd;
    }).length;
  }, [schedulesWithPending]);

  // Get color class based on count
  const getCoverageColor = (count: number): string => {
    if (count === 0) return 'bg-muted text-muted-foreground';
    if (count < 2) return 'bg-destructive/20 text-destructive';
    if (count < 4) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
    return 'bg-primary/20 text-primary';
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-orange-100 dark:bg-orange-950 border border-orange-300" />
              Feriado
            </span>
            <span><strong>F</strong> = Franco</span>
            <span><strong>HH:MM-HH:MM</strong> = Entrada-Salida</span>
            <span>☕ = Con break</span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded border-2 border-primary border-dashed" />
              Modificado
            </span>
          </div>
        </div>

        {/* Calendar Grid */}
        {loading ? (
          <Card>
            <CardContent className="py-12 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </CardContent>
          </Card>
        ) : team.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay empleados para mostrar</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              {/* Main Grid Container */}
              <div className="relative">
                <ScrollArea className="w-full">
                  <div className="flex">
                    {/* Sticky Employee Column */}
                    <div className="sticky left-0 z-20 bg-card border-r shadow-sm">
                      {/* Empty cell for header alignment */}
                      <div className="h-[52px] border-b bg-muted/50 flex items-center px-3">
                        <span className="text-sm font-medium text-muted-foreground">Empleado</span>
                      </div>
                      
                      {/* Employee names */}
                      {team.map((member) => (
                        <div
                          key={member.id}
                          className="h-10 border-b flex items-center gap-2 px-3 hover:bg-muted/20"
                        >
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                            {getInitials(member.full_name)}
                          </div>
                          <span className="text-sm truncate max-w-[120px]">{member.full_name}</span>
                        </div>
                      ))}
                    </div>

                    {/* Scrollable Days Grid */}
                    <div className="flex-1">
                      {/* Header row with days */}
                      <div className="flex border-b bg-muted/50">
                        {monthDays.map((day) => {
                          const dateStr = format(day, 'yyyy-MM-dd');
                          const isHoliday = holidayDates.has(dateStr);
                          const holidayName = holidayDates.get(dateStr);
                          const isSunday = day.getDay() === 0;

                          return (
                            <div
                              key={dateStr}
                              className={cn(
                                'w-24 shrink-0 p-2 text-center border-r',
                                isHoliday && 'bg-warning/20',
                                isSunday && 'bg-muted/50'
                              )}
                            >
                              <div className="text-xs text-muted-foreground">{dayNames[day.getDay()]}</div>
                              <div className={cn('text-sm font-medium', isHoliday && 'text-warning')}>
                                {format(day, 'd')}
                                {isHoliday && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="ml-1">🎉</span>
                                    </TooltipTrigger>
                                    <TooltipContent>{holidayName}</TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Employee schedule rows */}
                      {team.map((member) => (
                        <div key={member.id} className="flex border-b hover:bg-muted/10">
                          {monthDays.map((day) => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const isHoliday = holidayDates.has(dateStr);
                            const isSunday = day.getDay() === 0;
                            const value = getEffectiveValue(member.id, dateStr);
                            const isPending = hasPendingChange(member.id, dateStr);
                            const isEditable = canManageSchedules && !isHoliday;

                            return (
                              <ScheduleCellPopover
                                key={dateStr}
                                value={value}
                                onChange={(newValue) => handleCellChange(member.id, member.full_name, dateStr, newValue)}
                                disabled={!isEditable}
                                employeeName={member.full_name}
                                dateLabel={format(day, "EEEE d 'de' MMMM", { locale: es })}
                              >
                                <div
                                  className={cn(
                                    'w-24 shrink-0 h-10 flex items-center justify-center border-r cursor-pointer transition-colors',
                                    isHoliday && 'bg-warning/10',
                                    isSunday && 'bg-muted/30',
                                    isEditable && 'hover:bg-primary/5'
                                  )}
                                >
                                  {value.startTime || value.isDayOff ? (
                                    <Badge
                                      variant={value.isDayOff ? 'secondary' : 'default'}
                                      className={cn(
                                        'text-xs',
                                        value.isDayOff && 'bg-muted text-muted-foreground',
                                        isPending && 'ring-2 ring-primary ring-offset-1'
                                      )}
                                    >
                                      {formatScheduleDisplay(value)}
                                    </Badge>
                                  ) : isHoliday ? (
                                    <span className="text-xs text-warning">-</span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                  )}
                                </div>
                              </ScheduleCellPopover>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>

              {/* Hourly Coverage Section */}
              <div className="border-t">
                <div className="p-3 border-b bg-muted/30">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-medium text-muted-foreground">📊 Cobertura por hora</span>
                    <div className="flex gap-3 text-xs">
                      <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-destructive/20" /> &lt;2</span>
                      <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/30" /> 2-3</span>
                      <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-primary/20" /> 4+</span>
                    </div>
                  </div>
                </div>
                
                <ScrollArea className="w-full">
                  <div className="flex">
                    {/* Sticky Hour Column */}
                    <div className="sticky left-0 z-20 bg-card border-r shadow-sm">
                      <div className="h-[28px] border-b bg-muted/50 flex items-center px-3">
                        <span className="text-xs font-medium text-muted-foreground">Hora</span>
                      </div>
                      {hourlyRange.map((hour) => (
                        <div key={hour} className="h-6 border-b flex items-center px-3 bg-muted/30">
                          <span className="text-xs font-medium text-muted-foreground">{hour}:00</span>
                        </div>
                      ))}
                    </div>

                    {/* Coverage Grid */}
                    <div className="flex-1">
                      {/* Day headers */}
                      <div className="flex border-b bg-muted/50">
                        {monthDays.map((day) => {
                          const dateStr = format(day, 'yyyy-MM-dd');
                          const isHoliday = holidayDates.has(dateStr);
                          const isSunday = day.getDay() === 0;
                          
                          return (
                            <div
                              key={dateStr}
                              className={cn(
                                'w-24 shrink-0 h-[28px] flex items-center justify-center border-r text-xs',
                                isHoliday && 'bg-warning/20',
                                isSunday && 'bg-muted/50'
                              )}
                            >
                              <span className="text-muted-foreground">{dayNames[day.getDay()].slice(0, 2)}</span>
                              <span className="ml-1 font-medium">{format(day, 'd')}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Hourly coverage rows */}
                      {hourlyRange.map((hour) => (
                        <div key={hour} className="flex border-b">
                          {monthDays.map((day) => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const count = countEmployeesAtHour(dateStr, hour);
                            
                            return (
                              <Tooltip key={dateStr}>
                                <TooltipTrigger asChild>
                                  <div className="w-24 shrink-0 h-6 flex items-center justify-center border-r">
                                    <div className={cn('w-8 h-5 rounded text-xs font-medium flex items-center justify-center', getCoverageColor(count))}>
                                      {count}
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">{format(day, 'd MMM', { locale: es })} a las {hour}:00 - {count} empleado{count !== 1 ? 's' : ''}</p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Changes Bar */}
        {pendingChanges.size > 0 && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
            <Card className="shadow-lg border-primary/30">
              <CardContent className="p-3 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">
                    {pendingChanges.size} {pendingChanges.size === 1 ? 'cambio pendiente' : 'cambios pendientes'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleDiscardChanges}>
                    <Undo2 className="w-4 h-4 mr-1" />
                    Descartar
                  </Button>
                  <Button size="sm" onClick={() => setSaveDialogOpen(true)}>
                    <Save className="w-4 h-4 mr-1" />
                    Guardar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Save Dialog */}
        <SaveScheduleDialog
          open={saveDialogOpen}
          onOpenChange={setSaveDialogOpen}
          affectedEmployees={affectedEmployees}
          totalChanges={pendingChanges.size}
          monthLabel={format(new Date(year, month - 1), 'MMMM yyyy', { locale: es })}
          onConfirm={async (notifyEmail, notifyCommunication) => {
            await saveMutation.mutateAsync({ notifyEmail, notifyCommunication });
          }}
          isPending={saveMutation.isPending}
        />
      </div>
    </TooltipProvider>
  );
}
