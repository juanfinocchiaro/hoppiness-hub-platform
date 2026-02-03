/**
 * ScheduleCopyPasteControls - Week copy/paste UI controls
 * 
 * Provides controls for copying and pasting schedule weeks:
 * - Copy button with week selector dropdown
 * - Paste button (visible when clipboard has data)
 * - Banner showing what's copied
 */
import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, addDays, startOfWeek, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Copy, ClipboardPaste, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScheduleValue } from './ScheduleCellPopover';

export interface ClipboardData {
  sourceUserId: string;
  sourceUserName: string;
  weekStartDate: string;
  weekData: Map<number, ScheduleValue>; // dayOfWeek (0-6) -> schedule
}

interface WeekOption {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  label: string;
}

interface ScheduleCopyButtonProps {
  userId: string;
  userName: string;
  month: number;
  year: number;
  onCopyWeek: (userId: string, userName: string, weekStart: Date) => void;
}

interface SchedulePasteButtonProps {
  clipboard: ClipboardData | null;
  month: number;
  year: number;
  onPasteWeek: (weekStart: Date) => void;
}

interface ClipboardBannerProps {
  clipboard: ClipboardData | null;
  onClear: () => void;
}

// Get weeks for a month
function getWeeksInMonth(month: number, year: number): WeekOption[] {
  const firstDay = startOfMonth(new Date(year, month - 1));
  const lastDay = endOfMonth(firstDay);
  
  const weeks: WeekOption[] = [];
  let currentWeekStart = startOfWeek(firstDay, { weekStartsOn: 1 }); // Start on Monday
  let weekNumber = 1;
  
  while (currentWeekStart <= lastDay) {
    const weekEnd = addDays(currentWeekStart, 6);
    
    // Only include if at least part of the week is in the month
    if (weekEnd >= firstDay) {
      weeks.push({
        weekNumber,
        startDate: currentWeekStart,
        endDate: weekEnd,
        label: `Semana ${weekNumber}: ${format(currentWeekStart, 'd MMM', { locale: es })} - ${format(weekEnd, 'd MMM', { locale: es })}`,
      });
      weekNumber++;
    }
    
    currentWeekStart = addDays(currentWeekStart, 7);
  }
  
  return weeks;
}

export function ScheduleCopyButton({ 
  userId, 
  userName, 
  month, 
  year, 
  onCopyWeek 
}: ScheduleCopyButtonProps) {
  const weeks = useMemo(() => getWeeksInMonth(month, year), [month, year]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 opacity-50 hover:opacity-100"
        >
          <Copy className="w-3.5 h-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Copiar semana de {userName.split(' ')[0]}
        </div>
        {weeks.map((week) => (
          <DropdownMenuItem
            key={week.weekNumber}
            onClick={() => onCopyWeek(userId, userName, week.startDate)}
          >
            {week.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SchedulePasteButton({ 
  clipboard, 
  month, 
  year, 
  onPasteWeek 
}: SchedulePasteButtonProps) {
  const weeks = useMemo(() => getWeeksInMonth(month, year), [month, year]);

  if (!clipboard) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-primary hover:text-primary"
        >
          <ClipboardPaste className="w-3.5 h-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Pegar en semana
        </div>
        {weeks.map((week) => (
          <DropdownMenuItem
            key={week.weekNumber}
            onClick={() => onPasteWeek(week.startDate)}
          >
            {week.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ClipboardBanner({ clipboard, onClear }: ClipboardBannerProps) {
  if (!clipboard) return null;

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-2 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-sm">
        <Copy className="w-4 h-4 text-primary" />
        <span>
          Semana de <strong>{clipboard.sourceUserName}</strong> copiada
          <span className="text-muted-foreground ml-1">
            ({format(new Date(clipboard.weekStartDate), "d MMM", { locale: es })})
          </span>
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-muted-foreground hover:text-foreground"
        onClick={onClear}
      >
        <X className="w-4 h-4 mr-1" />
        Cancelar
      </Button>
    </div>
  );
}

// Helper to format week data for display
export function formatWeekDataPreview(weekData: Map<number, ScheduleValue>): string {
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const parts: string[] = [];
  
  // Show Monday to Sunday (1-0)
  [1, 2, 3, 4, 5, 6, 0].forEach(dow => {
    const val = weekData.get(dow);
    if (!val) {
      parts.push('-');
    } else if (val.isDayOff) {
      parts.push('F');
    } else if (val.startTime && val.endTime) {
      parts.push(`${val.startTime.slice(0,2)}-${val.endTime.slice(0,2)}`);
    } else {
      parts.push('-');
    }
  });
  
  return parts.join(' | ');
}
