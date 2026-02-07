/**
 * SelectionToolbar - Inline action bar when cells are selected
 * 
 * V3 (Feb 2026) - Complete inline editing:
 * - Day type buttons: Franco, Vacaciones, Cumple
 * - Position selector
 * - Time inputs (Entrada/Salida) + Apply button
 * - Break toggle (auto for >6h shifts)
 * - Copy/Paste/Clear buttons
 * - Keyboard shortcut hints
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Copy, 
  ClipboardPaste, 
  Trash2, 
  X,
  Check,
  Palmtree,
  Cake,
  Coffee,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClipboardDataV2 } from './types';
import type { WorkPosition } from '@/hooks/useWorkPositions';

interface SelectionToolbarProps {
  selectionCount: number;
  clipboard: ClipboardDataV2 | null;
  onCopy: () => void;
  onPaste: () => void;
  onClear: () => void;
  onApplyDayOff: () => void;
  onApplyVacation: () => void;
  onApplyBirthday: () => void;
  onApplyWithOptions: (start: string, end: string, position: string | null, includeBreak: boolean) => void;
  onDeselect: () => void;
  positions?: WorkPosition[];
  showBirthday?: boolean;
  className?: string;
}

export function SelectionToolbar({
  selectionCount,
  clipboard,
  onCopy,
  onPaste,
  onClear,
  onApplyDayOff,
  onApplyVacation,
  onApplyBirthday,
  onApplyWithOptions,
  onDeselect,
  positions = [],
  showBirthday = false,
  className,
}: SelectionToolbarProps) {
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('23:00');
  const [selectedPosition, setSelectedPosition] = useState<string>('');
  const [includeBreak, setIncludeBreak] = useState(true);

  const handleApply = () => {
    if (startTime && endTime) {
      onApplyWithOptions(
        startTime, 
        endTime, 
        selectedPosition || null, 
        includeBreak
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    }
  };

  // Always render, show placeholder when no selection
  const hasSelection = selectionCount > 0;

  return (
    <div className={cn(
      'flex items-center gap-2 flex-wrap min-h-[32px]',
      className
    )}>
      {!hasSelection ? (
        <span className="text-xs text-muted-foreground italic">
          Click para seleccionar · Shift+click para rango · Arrastrar para selección múltiple
        </span>
      ) : (
        <>
          {/* Selection count badge */}
          <Badge variant="secondary" className="gap-1 text-xs h-7 px-2">
            {selectionCount} celda{selectionCount !== 1 ? 's' : ''}
          </Badge>

          <Separator orientation="vertical" className="h-5" />

          {/* Day type buttons */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={onApplyDayOff}
                  className="h-7 text-xs px-2"
                >
                  Franco
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Tecla F</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={onApplyVacation}
                  className="h-7 text-xs px-2 gap-1"
                >
                  <Palmtree className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Vac</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Vacaciones (Tecla V)</TooltipContent>
            </Tooltip>

            {showBirthday && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={onApplyBirthday}
                    className="h-7 text-xs px-2 gap-1"
                  >
                    <Cake className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Cumple</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Día libre por cumpleaños</TooltipContent>
              </Tooltip>
            )}
          </div>

          <Separator orientation="vertical" className="h-5" />

          {/* Position selector */}
          {positions.length > 0 && (
            <Select value={selectedPosition} onValueChange={setSelectedPosition}>
              <SelectTrigger className="h-7 w-[120px] text-xs">
                <SelectValue placeholder="Posición" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sin posición</SelectItem>
                {positions.map(pos => (
                  <SelectItem key={pos.id} value={pos.key}>
                    {pos.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Quick time inputs */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground hidden sm:inline">Entrada</span>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-7 w-[90px] text-xs"
            />
            <span className="text-xs text-muted-foreground hidden sm:inline">Salida</span>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-7 w-[90px] text-xs"
            />
          </div>

          {/* Break toggle */}
          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <Switch
                    id="break-toggle"
                    checked={includeBreak}
                    onCheckedChange={setIncludeBreak}
                    className="scale-75"
                  />
                  <Label 
                    htmlFor="break-toggle" 
                    className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1"
                  >
                    <Coffee className="w-3 h-3" />
                    <span className="hidden sm:inline">Break</span>
                  </Label>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Break automático (30 min) para turnos de +6 horas
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Apply button */}
          <Button 
            size="sm" 
            onClick={handleApply}
            className="h-7 gap-1 px-2 text-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Aplicar</span>
          </Button>

          <Separator orientation="vertical" className="h-5" />

          {/* Main actions */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onCopy}
                  className="h-7 gap-1 px-2 text-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Copiar</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Ctrl+C</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onPaste}
                  disabled={!clipboard}
                  className={cn(
                    'h-7 gap-1 px-2 text-xs',
                    clipboard && 'text-primary'
                  )}
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Pegar</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {clipboard 
                  ? `Pegar: ${clipboard.sourceInfo}` 
                  : 'Nada copiado (Ctrl+V)'
                }
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClear}
                  className="h-7 gap-1 px-2 text-xs text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Limpiar</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Delete</TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="h-5" />

          {/* Deselect */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onDeselect}
                className="h-7 w-7 text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Escape</TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  );
}
