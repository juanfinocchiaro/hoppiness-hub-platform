/**
 * HourlyCoverageRow - Shows employee count per hour slot for a specific day
 * 
 * Displays coverage in hourly slots (e.g., 11-14, 14-17, 17-20, 20-23)
 * Color-coded for understaffing detection
 */
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ScheduleEntry } from '@/hooks/useSchedules';

interface HourlyCoverageRowProps {
  schedules: ScheduleEntry[];
  day: Date | null;
  dateStr: string;
}

// Time slots to show (in 24h format)
const TIME_SLOTS = [
  { label: '11-14', start: 11, end: 14 },
  { label: '14-17', start: 14, end: 17 },
  { label: '17-20', start: 17, end: 20 },
  { label: '20-23', start: 20, end: 23 },
];

// Check if a schedule overlaps with a time slot
function countEmployeesInSlot(schedules: ScheduleEntry[], dateStr: string, slotStart: number, slotEnd: number): number {
  if (!dateStr) return 0;
  
  return schedules.filter(s => {
    if (!s.schedule_date || s.schedule_date !== dateStr) return false;
    if (s.is_day_off) return false;
    if (!s.start_time || !s.end_time) return false;
    
    const [startH] = s.start_time.split(':').map(Number);
    const [endH] = s.end_time.split(':').map(Number);
    
    // Handle overnight shifts
    const adjustedEnd = endH < startH ? endH + 24 : endH;
    
    // Check if schedule overlaps with slot
    // Employee is counted if they work during ANY part of the slot
    return startH < slotEnd && adjustedEnd > slotStart;
  }).length;
}

// Get color class based on count
function getCoverageColor(count: number): string {
  if (count === 0) return 'bg-muted text-muted-foreground';
  if (count < 2) return 'bg-destructive/20 text-destructive';
  if (count < 4) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
  return 'bg-primary/20 text-primary';
}

export function HourlyCoverageRow({ schedules, day, dateStr }: HourlyCoverageRowProps) {
  const slotCounts = useMemo(() => {
    if (!day) return TIME_SLOTS.map(() => 0);
    return TIME_SLOTS.map(slot => countEmployeesInSlot(schedules, dateStr, slot.start, slot.end));
  }, [schedules, day, dateStr]);

  if (!day) {
    return (
      <div className="flex flex-col gap-0.5">
        {TIME_SLOTS.map((slot) => (
          <div key={slot.label} className="h-5 w-8 rounded text-[10px] flex items-center justify-center bg-muted/50 text-muted-foreground">
            -
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {TIME_SLOTS.map((slot, idx) => (
        <Tooltip key={slot.label}>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'h-5 w-8 rounded text-[10px] font-medium flex items-center justify-center',
                getCoverageColor(slotCounts[idx])
              )}
            >
              {slotCounts[idx]}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{slot.label}h: {slotCounts[idx]} empleado{slotCounts[idx] !== 1 ? 's' : ''}</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

export { TIME_SLOTS };
