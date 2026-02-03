/**
 * ShiftCoverageBar - Shows employee count per shift/day
 * 
 * Color-coded indicators for understaffing detection
 */
import { useMemo } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Users } from 'lucide-react';
import type { ScheduleEntry } from '@/hooks/useSchedules';

interface BranchShift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
}

interface ShiftCoverageBarProps {
  schedules: ScheduleEntry[];
  branchShifts: BranchShift[];
  monthDays: Date[];
  className?: string;
}

// Classify schedule start time to a shift
function getShiftForTime(startTime: string, branchShifts: BranchShift[]): string | null {
  const [hours] = startTime.split(':').map(Number);

  for (const shift of branchShifts) {
    const [shiftStart] = shift.start_time.split(':').map(Number);
    const [shiftEnd] = shift.end_time.split(':').map(Number);

    // Handle midnight crossing
    if (shiftEnd < shiftStart) {
      if (hours >= shiftStart || hours < shiftEnd) return shift.name;
    } else {
      if (hours >= shiftStart && hours < shiftEnd) return shift.name;
    }
  }

  // Default classification by time of day
  if (hours < 14) return 'Mediodía';
  return 'Noche';
}

// Get color class based on count
function getCoverageColor(count: number): string {
  if (count === 0) return 'bg-muted text-muted-foreground';
  if (count < 2) return 'bg-destructive/20 text-destructive';
  if (count < 4) return 'bg-warning/20 text-warning-foreground';
  return 'bg-primary/20 text-primary';
}

export function ShiftCoverageBar({
  schedules,
  branchShifts,
  monthDays,
  className,
}: ShiftCoverageBarProps) {
  // Calculate coverage per day
  const coverageByDay = useMemo(() => {
    const coverage = new Map<string, { total: number; byShift: Record<string, number> }>();

    // Initialize all days
    monthDays.forEach((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      coverage.set(dateStr, { total: 0, byShift: {} });
    });

    // Count schedules
    schedules.forEach((schedule) => {
      if (!schedule.schedule_date || schedule.is_day_off) return;

      const dateStr = schedule.schedule_date;
      const entry = coverage.get(dateStr);
      if (!entry) return;

      entry.total += 1;

      if (schedule.start_time) {
        const shiftName = getShiftForTime(schedule.start_time, branchShifts);
        if (shiftName) {
          entry.byShift[shiftName] = (entry.byShift[shiftName] || 0) + 1;
        }
      }
    });

    return coverage;
  }, [schedules, monthDays, branchShifts]);

  // Get unique shift names for rows
  const shiftNames = useMemo(() => {
    const names = new Set<string>();
    branchShifts.forEach((s) => names.add(s.name));
    if (names.size === 0) {
      names.add('Mediodía');
      names.add('Noche');
    }
    return Array.from(names);
  }, [branchShifts]);

  // Group days by week
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    let currentWeek: Date[] = [];

    monthDays.forEach((day, i) => {
      currentWeek.push(day);
      if (day.getDay() === 6 || i === monthDays.length - 1) {
        result.push(currentWeek);
        currentWeek = [];
      }
    });

    return result;
  }, [monthDays]);

  return (
    <div className={cn('mt-4 pt-4 border-t', className)}>
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Cobertura por turno</span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-3 text-xs">
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-destructive/20" />
          &lt; 2
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-warning/20" />
          2-3
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-primary/20" />
          4+
        </span>
      </div>

      {/* Coverage grid - simplified horizontal scroll */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="flex gap-1 mb-1">
              <div className="w-16 text-xs text-muted-foreground flex items-center">
                {weekIdx === 0 ? 'Total' : ''}
              </div>
              {week.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const data = coverageByDay.get(dateStr);
                const count = data?.total || 0;

                return (
                  <Tooltip key={dateStr}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'flex-1 min-w-[40px] h-7 rounded flex items-center justify-center text-xs font-medium',
                          getCoverageColor(count)
                        )}
                      >
                        {count}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{format(day, 'd MMM')}</p>
                      <p className="text-xs">{count} empleados</p>
                      {Object.entries(data?.byShift || {}).map(([shift, c]) => (
                        <p key={shift} className="text-xs text-muted-foreground">
                          {shift}: {c}
                        </p>
                      ))}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
