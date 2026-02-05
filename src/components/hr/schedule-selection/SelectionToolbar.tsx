/**
 * SelectionToolbar - Inline action bar when cells are selected
 * 
 * Shows:
 * - Selection count
 * - Copy/Paste/Clear buttons
 * - Quick schedule presets
 * - Keyboard shortcut hints
 * 
 * Integrated within the editor header, not floating
 */
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { 
  Copy, 
  ClipboardPaste, 
  Trash2, 
  X,
  Clock,
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

// Quick schedule presets
const QUICK_SCHEDULES = [
  { label: '18-00', start: '18:00', end: '00:00' },
  { label: '12-18', start: '12:00', end: '18:00' },
  { label: '12-00', start: '12:00', end: '00:00' },
  { label: '19-23', start: '19:00', end: '23:00' },
];

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
              ? `Ctrl+V • ${clipboard.sourceInfo}` 
              : 'Nada copiado'
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

      {/* Quick schedules */}
      <div className="flex items-center gap-0.5">
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

        {QUICK_SCHEDULES.slice(0, 3).map((qs) => (
          <Button
            key={qs.label}
            variant="ghost"
            size="sm"
            onClick={() => onApplyQuickSchedule(qs.start, qs.end)}
            className="h-7 text-xs px-2"
          >
            <Clock className="w-3 h-3 mr-1" />
            {qs.label}
          </Button>
        ))}
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
