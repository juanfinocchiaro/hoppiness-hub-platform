/**
 * ScheduleCellPopover - Quick edit popover for schedule cells
 * 
 * Allows custom time selection and Franco/day off marking.
 * Break is automatically applied for shifts over 6 hours.
 */
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Coffee, X, Check, Info } from 'lucide-react';
import { useWorkPositions } from '@/hooks/useWorkPositions';
import type { WorkPositionType } from '@/types/workPosition';

export interface ScheduleValue {
  startTime: string | null;
  endTime: string | null;
  isDayOff: boolean;
  position: WorkPositionType | null;
  breakStart?: string | null;
  breakEnd?: string | null;
}

interface ScheduleCellPopoverProps {
  children: React.ReactNode;
  value: ScheduleValue;
  onChange: (value: ScheduleValue) => void;
  disabled?: boolean;
  employeeName?: string;
  dateLabel?: string;
}

// Helper to calculate shift duration in hours
function calculateShiftHours(start: string, end: string): number {
  if (!start || !end) return 0;
  
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  
  let startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;
  
  // Handle overnight shifts (e.g., 19:00 - 02:00)
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }
  
  return (endMinutes - startMinutes) / 60;
}

// Calculate default break time (1 hour, starting halfway through the shift)
function calculateDefaultBreak(start: string, end: string): { breakStart: string; breakEnd: string } {
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  
  let startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;
  
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }
  
  // Break starts at the middle of the shift
  const midpoint = startMinutes + (endMinutes - startMinutes) / 2;
  const breakStartMinutes = Math.floor(midpoint / 30) * 30; // Round to nearest 30 min
  const breakEndMinutes = breakStartMinutes + 60; // 1 hour break
  
  const formatTime = (minutes: number) => {
    const normalizedMinutes = minutes % (24 * 60);
    const h = Math.floor(normalizedMinutes / 60);
    const m = normalizedMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };
  
  return {
    breakStart: formatTime(breakStartMinutes),
    breakEnd: formatTime(breakEndMinutes),
  };
}

export function ScheduleCellPopover({
  children,
  value,
  onChange,
  disabled = false,
  employeeName,
  dateLabel,
}: ScheduleCellPopoverProps) {
  const [open, setOpen] = useState(false);
  const [customStart, setCustomStart] = useState(value.startTime || '19:30');
  const [customEnd, setCustomEnd] = useState(value.endTime || '23:30');
  const [position, setPosition] = useState<string>(value.position || '');
  const [breakStart, setBreakStart] = useState(value.breakStart || '');
  const [breakEnd, setBreakEnd] = useState(value.breakEnd || '');
  
  // Fetch work positions dynamically
  const { data: workPositions = [] } = useWorkPositions();

  // Calculate if break is required (shift > 6 hours)
  const shiftHours = useMemo(() => calculateShiftHours(customStart, customEnd), [customStart, customEnd]);
  const requiresBreak = shiftHours > 6;

  // Update break times when shift times change and break is required
  useEffect(() => {
    if (requiresBreak && customStart && customEnd) {
      const defaultBreak = calculateDefaultBreak(customStart, customEnd);
      // Only set default if no break is currently set
      if (!breakStart || !breakEnd) {
        setBreakStart(defaultBreak.breakStart);
        setBreakEnd(defaultBreak.breakEnd);
      }
    }
  }, [requiresBreak, customStart, customEnd]);

  // Reset state when popover opens
  useEffect(() => {
    if (open) {
      setCustomStart(value.startTime || '19:30');
      setCustomEnd(value.endTime || '23:30');
      setPosition(value.position || '');
      setBreakStart(value.breakStart || '');
      setBreakEnd(value.breakEnd || '');
    }
  }, [open, value]);

  const handleDayOff = () => {
    onChange({
      startTime: null,
      endTime: null,
      isDayOff: true,
      position: null,
      breakStart: null,
      breakEnd: null,
    });
    setOpen(false);
  };

  const handleClear = () => {
    onChange({
      startTime: null,
      endTime: null,
      isDayOff: false,
      position: null,
      breakStart: null,
      breakEnd: null,
    });
    setOpen(false);
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onChange({
        startTime: customStart,
        endTime: customEnd,
        isDayOff: false,
        position: (position || null) as WorkPositionType | null,
        breakStart: requiresBreak ? breakStart : null,
        breakEnd: requiresBreak ? breakEnd : null,
      });
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="center">
        {/* Header */}
        {(employeeName || dateLabel) && (
          <div className="mb-3 pb-2 border-b">
            <p className="text-sm font-medium">{employeeName}</p>
            <p className="text-xs text-muted-foreground">{dateLabel}</p>
          </div>
        )}

        {/* Day off and clear */}
        <div className="flex gap-2 mb-3">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={handleDayOff}
          >
            Franco
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={handleClear}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Custom time */}
        <div className="space-y-3 pt-2 border-t">
          <Label className="text-xs font-medium">Horario personalizado</Label>
          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Entrada</Label>
              <Input
                type="time"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <span className="text-muted-foreground mt-5">→</span>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Salida</Label>
              <Input
                type="time"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Shift duration info */}
          <div className="text-xs text-muted-foreground">
            Duración: {shiftHours.toFixed(1)} horas
            {requiresBreak && (
              <span className="text-primary ml-1">(incluye break obligatorio)</span>
            )}
          </div>

          {/* Break times - only shown when required (>6h) */}
          {requiresBreak && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium">
                <Coffee className="w-4 h-4 text-primary" />
                <span>Break obligatorio (1h)</span>
              </div>
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Inicio</Label>
                  <Input
                    type="time"
                    value={breakStart}
                    onChange={(e) => setBreakStart(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <span className="text-muted-foreground mt-5">→</span>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Fin</Label>
                  <Input
                    type="time"
                    value={breakEnd}
                    onChange={(e) => setBreakEnd(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Position selector */}
          <Select 
            value={position || 'none'} 
            onValueChange={(v) => setPosition(v === 'none' ? '' : v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Posición (opcional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin posición</SelectItem>
              {workPositions.map((pos) => (
                <SelectItem key={pos.key} value={pos.key}>
                  {pos.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button size="sm" className="w-full" onClick={handleCustomApply}>
            <Check className="w-4 h-4 mr-1" />
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
