/**
 * ScheduleCellPopover - Quick edit popover for schedule cells
 * 
 * Allows selecting presets or custom times directly in the cell
 * Now supports break times within the schedule
 */
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Clock, Sun, Moon, Coffee, X, Check } from 'lucide-react';
import { WORK_POSITION_LABELS, WORK_POSITIONS, type WorkPositionType } from '@/types/workPosition';

// Shift presets
const SHIFT_PRESETS = [
  { id: 'morning', label: 'Mañana', start: '09:00', end: '17:00', icon: Sun },
  { id: 'afternoon', label: 'Tarde', start: '14:00', end: '22:00', icon: Coffee },
  { id: 'night', label: 'Noche', start: '18:00', end: '02:00', icon: Moon },
  { id: 'midday', label: 'Mediodía', start: '11:00', end: '15:00', icon: Clock },
] as const;

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
  const [position, setPosition] = useState<WorkPositionType | ''>(value.position || '');
  const [hasBreak, setHasBreak] = useState(!!value.breakStart);
  const [breakStart, setBreakStart] = useState(value.breakStart || '15:00');
  const [breakEnd, setBreakEnd] = useState(value.breakEnd || '16:00');

  // Reset state when popover opens
  useEffect(() => {
    if (open) {
      setCustomStart(value.startTime || '19:30');
      setCustomEnd(value.endTime || '23:30');
      setPosition(value.position || '');
      setHasBreak(!!value.breakStart);
      setBreakStart(value.breakStart || '15:00');
      setBreakEnd(value.breakEnd || '16:00');
    }
  }, [open, value]);

  const handlePresetSelect = (preset: typeof SHIFT_PRESETS[number]) => {
    onChange({
      startTime: preset.start,
      endTime: preset.end,
      isDayOff: false,
      position: (position || null) as WorkPositionType | null,
      breakStart: null,
      breakEnd: null,
    });
    setOpen(false);
  };

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
        breakStart: hasBreak ? breakStart : null,
        breakEnd: hasBreak ? breakEnd : null,
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

        {/* Quick presets */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {SHIFT_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              variant="outline"
              size="sm"
              className="justify-start gap-2 h-9"
              onClick={() => handlePresetSelect(preset)}
            >
              <preset.icon className="w-3.5 h-3.5" />
              <span className="text-xs">{preset.label}</span>
            </Button>
          ))}
        </div>

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

          {/* Break toggle */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <Coffee className="w-4 h-4 text-muted-foreground" />
              <Label className="text-xs">Incluir break/descanso</Label>
            </div>
            <Switch
              checked={hasBreak}
              onCheckedChange={setHasBreak}
            />
          </div>

          {/* Break times */}
          {hasBreak && (
            <div className="flex gap-2 items-center pl-6 pb-2">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Inicio break</Label>
                <Input
                  type="time"
                  value={breakStart}
                  onChange={(e) => setBreakStart(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <span className="text-muted-foreground mt-5">→</span>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Fin break</Label>
                <Input
                  type="time"
                  value={breakEnd}
                  onChange={(e) => setBreakEnd(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          )}

          {/* Position selector */}
          <Select value={position} onValueChange={(v) => setPosition(v as WorkPositionType)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Posición (opcional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Sin posición</SelectItem>
              {WORK_POSITIONS.map((pos) => (
                <SelectItem key={pos.value} value={pos.value}>
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
