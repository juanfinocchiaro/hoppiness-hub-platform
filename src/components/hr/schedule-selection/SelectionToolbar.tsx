/**
 * SelectionToolbar - Inline action bar when cells are selected
 * 
 * V2 (Feb 2026) - Excel-style with inline time inputs:
 * - Selection count
 * - Time inputs (Entrada/Salida) + Apply button
 * - Franco button
 * - Copy/Paste/Clear buttons
 * - Keyboard shortcut hints
 */
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { 
  Copy, 
  ClipboardPaste, 
  Trash2, 
  X,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClipboardDataV2 } from './types';

interface SelectionToolbarProps {
  selectionCount: number;
  clipboard: ClipboardDataV2 | null;
  onCopy: () => void;
  onPaste: () => void;
  onClear: () => void;
  onApplyDayOff: () => void;
  onApplyQuickSchedule: (start: string, end: string) => void;
  onDeselect: () => void;
  className?: string;
}

export function SelectionToolbar({
  selectionCount,
  clipboard,
  onCopy,
  onPaste,
  onClear,
  onApplyDayOff,
  onApplyQuickSchedule,
  onDeselect,
  className,
}: SelectionToolbarProps) {
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('23:00');
  const startInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus start input when selection appears
  useEffect(() => {
    if (selectionCount > 0 && startInputRef.current) {
      // Small delay to allow DOM to settle
      const timeout = setTimeout(() => {
        startInputRef.current?.focus();
        startInputRef.current?.select();
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [selectionCount > 0]);

  const handleApply = () => {
    if (startTime && endTime) {
      onApplyQuickSchedule(startTime, endTime);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    }
  };

  if (selectionCount === 0) return null;

  return (
    <div className={cn(
      'flex items-center gap-2 flex-wrap',
      className
    )}>
      {/* Selection count badge */}
      <Badge variant="secondary" className="gap-1 text-xs h-7 px-2">
        {selectionCount} celda{selectionCount !== 1 ? 's' : ''}
      </Badge>

      <Separator orientation="vertical" className="h-5" />

      {/* Quick time inputs */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground hidden sm:inline">Entrada</span>
        <Input
          ref={startInputRef}
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
        <Button 
          size="sm" 
          onClick={handleApply}
          className="h-7 gap-1 px-2 text-xs"
        >
          <Check className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Aplicar</span>
        </Button>
      </div>

      <Separator orientation="vertical" className="h-5" />

      {/* Franco button */}
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
    </div>
  );
}
