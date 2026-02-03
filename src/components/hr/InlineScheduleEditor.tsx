/**
 * InlineScheduleEditor - Unified Excel-like schedule with tabs for Personas/Cobertura
 * 
 * Features:
 * - Two views: Personas (schedule editing) and Cobertura (hourly heatmap)
 * - Single scrollable container shared between tabs (scroll position preserved)
 * - Sticky left column and sticky header in both views
 * - Same day columns width for perfect alignment
 * - Week copy/paste functionality for faster schedule entry
 */
import { useState, useMemo, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, User, Save, Undo2, AlertCircle, Coffee, Utensils, CreditCard, Flame, Package, Users, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { useTeamData } from '@/components/local/team/useTeamData';
import { useHolidays } from '@/hooks/useHolidays';
import { useMonthlySchedules, type ScheduleEntry, type DaySchedule } from '@/hooks/useSchedules';
import { usePermissionsV2 } from '@/hooks/usePermissionsV2';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { ScheduleCellPopover, type ScheduleValue } from './ScheduleCellPopover';
import { SaveScheduleDialog } from './SaveScheduleDialog';
import { ScheduleCopyButton, SchedulePasteButton, ClipboardBanner, type ClipboardData } from './ScheduleCopyPasteControls';
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

// Position icons mapping
const POSITION_ICONS: Record<string, { icon: React.ComponentType<any>; color: string; label: string }> = {
  sandwichero: { icon: Flame, color: 'text-orange-500', label: 'Sandwichero' },
  cajero: { icon: CreditCard, color: 'text-blue-500', label: 'Cajero' },
  delivery: { icon: Package, color: 'text-green-500', label: 'Delivery' },
  limpieza: { icon: Utensils, color: 'text-purple-500', label: 'Limpieza' },
};

const changeKey = (userId: string, date: string) => `${userId}:${date}`;

const DAY_WIDTH = 80;
const EMPLOYEE_COL_WIDTH = 200; // Increased to fit copy/paste buttons
const SCHEDULE_ROW_HEIGHT = 56;
const COVERAGE_ROW_HEIGHT = 32;

type ViewType = 'personas' | 'cobertura';
type HourRangeType = 'all' | '12-00' | '18-00';

export default function InlineScheduleEditor({ branchId }: InlineScheduleEditorProps) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [pendingChanges, setPendingChanges] = useState<Map<string, PendingChange>>(new Map());
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [activeView, setActiveView] = useState<ViewType>('personas');
  const [hourRange, setHourRange] = useState<HourRangeType>('all');
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null);
  const queryClient = useQueryClient();
  const { id: currentUserId } = useEffectiveUser();

  const { isSuperadmin, isFranquiciado, isEncargado, local } = usePermissionsV2(branchId);
  const canManageSchedules = isSuperadmin || isFranquiciado || isEncargado || local.canEditSchedules;

  // Fetch data
  const { team, loading: loadingTeam } = useTeamData(branchId, { excludeOwners: true });
  const { data: holidays = [] } = useHolidays(month, year);
  const { data: schedules = [], isLoading: loadingSchedules, refetch } = useMonthlySchedules(branchId, month, year);

  // Fetch birthdays from employee_data
  const { data: birthdayData = [] } = useQuery({
    queryKey: ['employee-birthdays', branchId],
    queryFn: async () => {
      if (!branchId) return [];
      const { data } = await supabase
        .from('employee_data')
        .select('user_id, birth_date')
        .eq('branch_id', branchId);
      return data || [];
    },
    enabled: !!branchId,
  });

  // Map of user_id -> birth month (1-12)
  const birthdayMonthMap = useMemo(() => {
    const map = new Map<string, number>();
    birthdayData.forEach(e => {
      if (e.birth_date) {
        const birthMonth = new Date(e.birth_date).getMonth() + 1;
        map.set(e.user_id, birthMonth);
      }
    });
    return map;
  }, [birthdayData]);

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

  // Get effective value
  const getEffectiveValue = useCallback((userId: string, dateStr: string): ScheduleValue => {
    const key = changeKey(userId, dateStr);
    const pending = pendingChanges.get(key);
    if (pending) {
      return {
        startTime: pending.startTime,
        endTime: pending.endTime,
        isDayOff: pending.isDayOff,
        position: pending.position,
        breakStart: pending.breakStart,
        breakEnd: pending.breakEnd,
      };
    }

    const schedule = schedulesByUser.get(userId)?.get(dateStr);
    if (schedule) {
      return {
        startTime: schedule.start_time || null,
        endTime: schedule.end_time || null,
        isDayOff: schedule.is_day_off || false,
        position: (schedule as any).work_position || null,
        breakStart: (schedule as any).break_start || null,
        breakEnd: (schedule as any).break_end || null,
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

    const isSameAsOriginal =
      (originalSchedule?.start_time || null) === value.startTime &&
      (originalSchedule?.end_time || null) === value.endTime &&
      (originalSchedule?.is_day_off || false) === value.isDayOff &&
      ((originalSchedule as any)?.work_position || null) === value.position;

    if (isSameAsOriginal) {
      setPendingChanges(prev => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
    } else {
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
          breakStart: value.breakStart,
          breakEnd: value.breakEnd,
          originalValue: originalSchedule,
        });
        return next;
      });
    }
  }, [schedulesByUser]);

  // Discard changes
  const handleDiscardChanges = () => {
    setPendingChanges(new Map());
    toast.info('Cambios descartados');
  };

  // Copy week from an employee
  const handleCopyWeek = useCallback((userId: string, userName: string, weekStart: Date) => {
    const weekData = new Map<number, ScheduleValue>();
    
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      const dateStr = format(day, 'yyyy-MM-dd');
      const value = getEffectiveValue(userId, dateStr);
      weekData.set(day.getDay(), value);
    }
    
    setClipboard({ 
      sourceUserId: userId, 
      sourceUserName: userName, 
      weekStartDate: format(weekStart, 'yyyy-MM-dd'),
      weekData 
    });
    toast.info(`Semana de ${userName.split(' ')[0]} copiada`);
  }, [getEffectiveValue]);

  // Paste week to an employee
  const handlePasteWeek = useCallback((targetUserId: string, targetUserName: string, targetWeekStart: Date) => {
    if (!clipboard) return;
    
    let pastedCount = 0;
    for (let i = 0; i < 7; i++) {
      const day = addDays(targetWeekStart, i);
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayOfWeek = day.getDay();
      const value = clipboard.weekData.get(dayOfWeek);
      
      // Only paste if within the current month
      if (day.getMonth() + 1 === month && day.getFullYear() === year) {
        if (value) {
          handleCellChange(targetUserId, targetUserName, dateStr, value);
          pastedCount++;
        }
      }
    }
    
    toast.success(`Horario pegado para ${targetUserName.split(' ')[0]} (${pastedCount} días)`);
  }, [clipboard, handleCellChange, month, year]);

  // Clear clipboard
  const handleClearClipboard = () => {
    setClipboard(null);
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async ({ notifyEmail, notifyCommunication }: { notifyEmail: boolean; notifyCommunication: boolean }) => {
      const changesByUser = new Map<string, PendingChange[]>();
      pendingChanges.forEach((change) => {
        if (!changesByUser.has(change.userId)) {
          changesByUser.set(change.userId, []);
        }
        changesByUser.get(change.userId)!.push(change);
      });

      for (const [userId, userChanges] of changesByUser) {
        const days: DaySchedule[] = userChanges.map(change => ({
          date: change.date,
          start_time: change.startTime,
          end_time: change.endTime,
          is_day_off: change.isDayOff,
          work_position: change.position,
        }));

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

  // Affected employees
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
    setClipboard(null); // Clear clipboard when changing months
  };

  const goToNextMonth = () => {
    const next = addMonths(new Date(year, month - 1), 1);
    setMonth(next.getMonth() + 1);
    setYear(next.getFullYear());
    setPendingChanges(new Map());
    setClipboard(null); // Clear clipboard when changing months
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const loading = loadingTeam || loadingSchedules;

  // Schedules with pending changes for coverage
  const schedulesWithPending = useMemo(() => {
    const result: Array<{ 
      schedule_date: string; 
      start_time: string | null; 
      end_time: string | null; 
      is_day_off: boolean;
      user_id: string;
      user_name: string;
      work_position?: string | null;
    }> = [];
    
    // Get team member names map
    const teamNameMap = new Map(team.map(t => [t.id, t.full_name]));
    
    schedules.forEach(s => {
      const pendingChange = pendingChanges.get(changeKey(s.user_id!, s.schedule_date!));
      if (pendingChange) {
        result.push({
          schedule_date: s.schedule_date!,
          start_time: pendingChange.startTime,
          end_time: pendingChange.endTime,
          is_day_off: pendingChange.isDayOff,
          user_id: s.user_id!,
          user_name: teamNameMap.get(s.user_id!) || 'Empleado',
          work_position: pendingChange.position,
        });
      } else {
        result.push({
          schedule_date: s.schedule_date!,
          start_time: s.start_time,
          end_time: s.end_time,
          is_day_off: s.is_day_off || false,
          user_id: s.user_id!,
          user_name: teamNameMap.get(s.user_id!) || 'Empleado',
          work_position: (s as any).work_position,
        });
      }
    });
    
    pendingChanges.forEach((change, key) => {
      const existing = schedules.find(s => changeKey(s.user_id!, s.schedule_date!) === key);
      if (!existing) {
        result.push({
          schedule_date: change.date,
          start_time: change.startTime,
          end_time: change.endTime,
          is_day_off: change.isDayOff,
          user_id: change.userId,
          user_name: change.userName,
          work_position: change.position,
        });
      }
    });
    
    return result;
  }, [schedules, pendingChanges, team]);

  // Detect if employee already used birthday day off this month
  const birthdayUsedMap = useMemo(() => {
    const used = new Map<string, boolean>();
    schedulesWithPending.forEach(s => {
      if (s.work_position === 'cumple') {
        used.set(s.user_id, true);
      }
    });
    return used;
  }, [schedulesWithPending]);

  // Validación: máximo 6 días consecutivos sin franco (Ley 11.544 Art 6)
  const consecutiveDaysViolations = useMemo(() => {
    const violations: { userId: string; userName: string; consecutiveDays: number }[] = [];
    
    team.forEach(member => {
      const userScheduleMap = new Map<string, boolean>();
      
      schedulesWithPending.forEach(s => {
        if (s.user_id === member.id) {
          const isDayOff = s.is_day_off || (!s.start_time && !s.end_time);
          userScheduleMap.set(s.schedule_date, isDayOff);
        }
      });
      
      let consecutiveWorking = 0;
      
      monthDays.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const isDayOff = userScheduleMap.get(dateStr);
        const hasSchedule = userScheduleMap.has(dateStr);
        
        if (hasSchedule && !isDayOff) {
          consecutiveWorking++;
        } else {
          if (consecutiveWorking >= 7) {
            violations.push({
              userId: member.id,
              userName: member.full_name || 'Empleado',
              consecutiveDays: consecutiveWorking,
            });
          }
          consecutiveWorking = 0;
        }
      });
      
      if (consecutiveWorking >= 7) {
        violations.push({
          userId: member.id,
          userName: member.full_name || 'Empleado',
          consecutiveDays: consecutiveWorking,
        });
      }
    });
    
    return violations;
  }, [team, schedulesWithPending, monthDays]);

  const hasLaborViolations = consecutiveDaysViolations.length > 0;

  // Calculate all hours with coverage
  const allHoursWithCoverage = useMemo(() => {
    const hourSet = new Set<number>();
    
    schedulesWithPending.forEach(s => {
      if (s.is_day_off || !s.start_time || !s.end_time) return;
      
      const [startH] = s.start_time.split(':').map(Number);
      const [endH] = s.end_time.split(':').map(Number);
      const adjustedEnd = endH < startH ? endH + 24 : endH;
      
      for (let h = startH; h < adjustedEnd; h++) {
        hourSet.add(h % 24);
      }
    });
    
    if (hourSet.size === 0) return [];
    
    const hours = Array.from(hourSet).sort((a, b) => a - b);
    return hours;
  }, [schedulesWithPending]);

  // Filter hours by range
  const filteredHours = useMemo(() => {
    if (hourRange === 'all') return allHoursWithCoverage;
    if (hourRange === '12-00') {
      return allHoursWithCoverage.filter(h => h >= 12 || h < 1);
    }
    if (hourRange === '18-00') {
      return allHoursWithCoverage.filter(h => h >= 18 || h < 1);
    }
    return allHoursWithCoverage;
  }, [allHoursWithCoverage, hourRange]);

  // Get employees at specific hour for a day
  const getEmployeesAtHour = useCallback((dateStr: string, hour: number) => {
    return schedulesWithPending.filter(s => {
      if (s.schedule_date !== dateStr) return false;
      if (s.is_day_off) return false;
      if (!s.start_time || !s.end_time) return false;
      
      const [startH] = s.start_time.split(':').map(Number);
      const [endH] = s.end_time.split(':').map(Number);
      const adjustedEnd = endH < startH ? endH + 24 : endH;
      
      return startH <= hour && hour < adjustedEnd;
    });
  }, [schedulesWithPending]);

  const getCoverageColor = (count: number): string => {
    if (count === 0) return 'bg-muted text-muted-foreground';
    if (count < 2) return 'bg-destructive/20 text-destructive';
    if (count < 4) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
    return 'bg-primary/20 text-primary';
  };

  // Render schedule cell content
  const renderCellContent = (value: ScheduleValue, isPending: boolean, isHoliday: boolean) => {
    // Birthday day off shows with cake emoji
    if (value.isDayOff && (value.isBirthdayOff || value.position === 'cumple')) {
      return (
        <Badge variant="secondary" className={cn('text-[10px] px-1.5 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300', isPending && 'ring-2 ring-primary ring-offset-1')}>
          🎂 Cumple
        </Badge>
      );
    }
    
    if (value.isDayOff) {
      return (
        <Badge variant="secondary" className={cn('text-[10px] px-1.5', isPending && 'ring-2 ring-primary ring-offset-1')}>
          Franco
        </Badge>
      );
    }
    
    // Treat "00:00" as empty (default value when no schedule set)
    const isEmptySchedule = !value.startTime || !value.endTime || 
      (value.startTime === '00:00' && value.endTime === '00:00') ||
      (value.startTime === '00:00:00' && value.endTime === '00:00:00');
    
    if (isEmptySchedule) {
      return <span className="text-xs text-muted-foreground">{isHoliday ? '🎉' : '-'}</span>;
    }

    const positionConfig = value.position ? POSITION_ICONS[value.position] : null;
    const PositionIcon = positionConfig?.icon;
    const hasBreak = value.breakStart && value.breakEnd;

    return (
      <div className={cn(
        'flex flex-col items-center gap-0.5 p-1 rounded text-[10px]',
        isPending && 'ring-2 ring-primary ring-offset-1 bg-primary/5'
      )}>
        <div className="font-medium text-foreground">
          {value.startTime.slice(0, 5)}-{value.endTime.slice(0, 5)}
        </div>
        
        <div className="flex items-center gap-1">
          {PositionIcon && (
            <Tooltip>
              <TooltipTrigger asChild>
                <PositionIcon className={cn('w-3 h-3', positionConfig.color)} />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {positionConfig.label}
              </TooltipContent>
            </Tooltip>
          )}
          {hasBreak && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Coffee className="w-3 h-3 text-amber-600" />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Break: {value.breakStart?.slice(0, 5)}-{value.breakEnd?.slice(0, 5)}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    );
  };

  const gridWidth = monthDays.length * DAY_WIDTH;

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

          {/* Legend - only for Personas view */}
          {activeView === 'personas' && (
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-500" /> Sandwichero
              </span>
              <span className="flex items-center gap-1">
                <CreditCard className="w-3 h-3 text-blue-500" /> Cajero
              </span>
              <span className="flex items-center gap-1">
                <Coffee className="w-3 h-3 text-amber-600" /> Break
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded border-2 border-primary border-dashed" /> Modificado
              </span>
            </div>
          )}

          {/* Legend - for Cobertura view */}
          {activeView === 'cobertura' && (
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-destructive/20" /> &lt;2
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/30" /> 2-3
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-primary/20" /> 4+
              </span>
            </div>
          )}
        </div>

        {/* Clipboard Banner */}
        {clipboard && (
          <ClipboardBanner clipboard={clipboard} onClear={handleClearClipboard} />
        )}

        {/* Main Content */}
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
          <Card className="w-full max-w-full overflow-hidden">
            <CardHeader className="py-3 px-4 border-b bg-muted/30">
              <div className="flex items-center justify-between gap-4">
                {/* Segmented Control */}
                <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                  <button
                    className={cn(
                      'px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2',
                      activeView === 'personas' 
                        ? 'bg-background shadow-sm text-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => setActiveView('personas')}
                  >
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline">Personas</span>
                  </button>
                  <button
                    className={cn(
                      'px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2',
                      activeView === 'cobertura' 
                        ? 'bg-background shadow-sm text-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => setActiveView('cobertura')}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span className="hidden sm:inline">Cobertura</span>
                  </button>
                </div>

                {/* Hour range filter - only for Cobertura view */}
                {activeView === 'cobertura' && (
                  <Select value={hourRange} onValueChange={(v) => setHourRange(v as HourRangeType)}>
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue placeholder="Rango horario" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las horas</SelectItem>
                      <SelectItem value="12-00">12:00 - 00:00</SelectItem>
                      <SelectItem value="18-00">18:00 - 00:00</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardHeader>
            
            {/* CalendarViewport - scroll horizontal solo aquí dentro */}
            <CardContent className="p-0 overflow-hidden">
              <div 
                className="max-h-[calc(100vh-320px)] overflow-auto"
                style={{ maxWidth: '100%' }}
              >
                <div 
                  className="flex"
                  style={{ minWidth: EMPLOYEE_COL_WIDTH + gridWidth }}
                >
                {/* Fixed Left Column - sticky */}
                <div 
                  className="shrink-0 border-r bg-card z-20 sticky left-0" 
                  style={{ width: EMPLOYEE_COL_WIDTH }}
                >
                  {/* Header cell */}
                  <div className="h-12 border-b bg-muted/50 flex items-center px-3 sticky top-0 z-30 bg-card">
                    <span className="text-xs font-medium text-muted-foreground">
                      {activeView === 'personas' ? 'Empleado' : 'Hora'}
                    </span>
                  </div>
                  
                  {/* Left column rows - changes based on active view */}
                  {activeView === 'personas' ? (
                    // Employee rows
                    team.map((member) => (
                      <div 
                        key={member.id} 
                        className="border-b flex items-center gap-1 px-2 bg-card"
                        style={{ height: SCHEDULE_ROW_HEIGHT }}
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary shrink-0">
                          {getInitials(member.full_name)}
                        </div>
                        <span className="text-xs truncate flex-1 min-w-0">{member.full_name.split(' ')[0]}</span>
                        
                        {/* Copy/Paste controls */}
                        {canManageSchedules && (
                          <div className="flex items-center shrink-0">
                            <ScheduleCopyButton
                              userId={member.id}
                              userName={member.full_name}
                              month={month}
                              year={year}
                              onCopyWeek={handleCopyWeek}
                            />
                            {clipboard && (
                              <SchedulePasteButton
                                clipboard={clipboard}
                                month={month}
                                year={year}
                                onPasteWeek={(weekStart) => handlePasteWeek(member.id, member.full_name, weekStart)}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    // Hour rows
                    filteredHours.length === 0 ? (
                      <div className="py-8 px-3 text-center text-sm text-muted-foreground">
                        Sin datos
                      </div>
                    ) : (
                      filteredHours.map((hour) => (
                        <div 
                          key={hour} 
                          className="border-b bg-muted/10 flex items-center px-3"
                          style={{ height: COVERAGE_ROW_HEIGHT }}
                        >
                          <span className="text-xs font-medium text-muted-foreground">
                            {String(hour).padStart(2, '0')}:00
                          </span>
                        </div>
                      ))
                    )
                  )}
                </div>

                {/* Days Grid */}
                <div className="flex-1">
                  <div style={{ width: gridWidth }}>
                    {/* Day headers - sticky top */}
                    <div className="h-12 border-b bg-muted/50 flex sticky top-0 z-10">
                      {monthDays.map((day) => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const isHoliday = holidayDates.has(dateStr);
                        const isSunday = day.getDay() === 0;

                        return (
                          <div
                            key={dateStr}
                            style={{ width: DAY_WIDTH }}
                            className={cn(
                              'shrink-0 flex flex-col items-center justify-center border-r',
                              isHoliday && 'bg-warning/20',
                              isSunday && 'bg-muted/60'
                            )}
                          >
                            <span className="text-[10px] text-muted-foreground">{dayNames[day.getDay()]}</span>
                            <span className={cn('text-sm font-medium', isHoliday && 'text-warning')}>
                              {format(day, 'd')}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Content rows - changes based on active view */}
                    {activeView === 'personas' ? (
                      // Schedule rows
                      team.map((member) => (
                        <div 
                          key={member.id} 
                          className="flex border-b"
                          style={{ height: SCHEDULE_ROW_HEIGHT }}
                        >
                          {monthDays.map((day) => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const isHoliday = holidayDates.has(dateStr);
                            const isSunday = day.getDay() === 0;
                            const value = getEffectiveValue(member.id, dateStr);
                            const isPending = hasPendingChange(member.id, dateStr);
                            const isEditable = canManageSchedules && !isHoliday;

                              const hasBirthdayThisMonth = birthdayMonthMap.get(member.id) === month;
                              const birthdayUsed = birthdayUsedMap.get(member.id) || false;

                              return (
                                <ScheduleCellPopover
                                  key={dateStr}
                                  value={value}
                                  onChange={(newValue) => handleCellChange(member.id, member.full_name, dateStr, newValue)}
                                  disabled={!isEditable}
                                  employeeName={member.full_name}
                                  dateLabel={format(day, "EEEE d 'de' MMMM", { locale: es })}
                                  defaultPosition={member.default_position}
                                  hasBirthdayThisMonth={hasBirthdayThisMonth}
                                  birthdayUsedThisMonth={birthdayUsed}
                                >
                                  <div
                                    style={{ width: DAY_WIDTH, height: SCHEDULE_ROW_HEIGHT }}
                                    className={cn(
                                      'shrink-0 flex items-center justify-center border-r cursor-pointer transition-colors',
                                      isHoliday && 'bg-warning/10',
                                      isSunday && 'bg-muted/30',
                                      isEditable && 'hover:bg-primary/5'
                                    )}
                                  >
                                    {renderCellContent(value, isPending, isHoliday)}
                                  </div>
                                </ScheduleCellPopover>
                              );
                          })}
                        </div>
                      ))
                    ) : (
                      // Coverage rows (hourly heatmap)
                      filteredHours.length === 0 ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">
                          No hay horarios cargados este mes
                        </div>
                      ) : (
                        filteredHours.map((hour) => (
                          <div 
                            key={hour} 
                            className="flex border-b"
                            style={{ height: COVERAGE_ROW_HEIGHT }}
                          >
                            {monthDays.map((day) => {
                              const dateStr = format(day, 'yyyy-MM-dd');
                              const employees = getEmployeesAtHour(dateStr, hour);
                              const count = employees.length;
                              const isSunday = day.getDay() === 0;
                              const isHoliday = holidayDates.has(dateStr);

                              return (
                                <Tooltip key={dateStr}>
                                  <TooltipTrigger asChild>
                                    <div 
                                      style={{ width: DAY_WIDTH, height: COVERAGE_ROW_HEIGHT }}
                                      className={cn(
                                        'shrink-0 flex items-center justify-center border-r',
                                        isSunday && 'bg-muted/20',
                                        isHoliday && 'bg-warning/5'
                                      )}
                                    >
                                      <div className={cn(
                                        'w-10 h-6 rounded text-xs font-medium flex items-center justify-center',
                                        getCoverageColor(count)
                                      )}>
                                        {count}
                                      </div>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs max-w-[200px]">
                                    <p className="font-medium">
                                      {format(day, "EEE d", { locale: es })}, {String(hour).padStart(2, '0')}:00
                                    </p>
                                    {count > 0 ? (
                                      <>
                                        <p className="text-muted-foreground">{count} persona{count !== 1 ? 's' : ''}:</p>
                                        <ul className="mt-1">
                                          {employees.slice(0, 5).map((e, i) => (
                                            <li key={i} className="truncate">{e.user_name}</li>
                                          ))}
                                          {employees.length > 5 && (
                                            <li className="text-muted-foreground">+{employees.length - 5} más</li>
                                          )}
                                        </ul>
                                      </>
                                    ) : (
                                      <p className="text-muted-foreground">Sin cobertura</p>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </div>
                        ))
                      )
                    )}
                  </div>
                </div>
              </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Labor violations warning */}
        {hasLaborViolations && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
            <Card className="shadow-lg border-destructive bg-destructive/10">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    ⚠️ {consecutiveDaysViolations.map(v => v.userName).join(', ')} tiene(n) 7+ días consecutivos sin franco (Ley 11.544)
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
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
                  <Button 
                    size="sm" 
                    onClick={() => setSaveDialogOpen(true)}
                    disabled={hasLaborViolations}
                    title={hasLaborViolations ? 'Corrige las violaciones laborales antes de guardar' : ''}
                  >
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
