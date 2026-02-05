/**
 * SelectionToolbar - Floating action bar when cells are selected
 * 
 * Shows:
 * - Selection count
 * - Copy/Paste/Clear buttons
 * - Quick schedule presets
 * - Keyboard shortcut hints
 */
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Copy, 
  ClipboardPaste, 
  Trash2, 
  X,
  Calendar,
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
  onClearClipboard: () => void;
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
  onClearClipboard,
  className,
}: SelectionToolbarProps) {
  if (selectionCount === 0) return null;

  return (
    <div className={cn(
      'fixed bottom-4 left-1/2 -translate-x-1/2 z-50',
      className
    )}>
      <Card className="shadow-xl border-primary/30 bg-background/95 backdrop-blur-sm">
        <CardContent className="py-3 px-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Selection count */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1.5 py-1">
                <Calendar className="w-3.5 h-3.5" />
                {selectionCount} celda{selectionCount !== 1 ? 's' : ''}
              </Badge>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-6 bg-border" />

            {/* Main actions */}
            <div className="flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onCopy}
                    className="gap-1.5"
                  >
                    <Copy className="w-4 h-4" />
                    <span className="hidden sm:inline">Copiar</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Ctrl+C</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onPaste}
                    disabled={!clipboard}
                    className={cn(
                      'gap-1.5',
                      clipboard && 'text-primary border-primary/50'
                    )}
                  >
                    <ClipboardPaste className="w-4 h-4" />
                    <span className="hidden sm:inline">Pegar</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {clipboard 
                    ? `Ctrl+V • ${clipboard.sourceInfo}` 
                    : 'Nada copiado'
                  }
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onClear}
                    className="gap-1.5 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Limpiar</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete</TooltipContent>
              </Tooltip>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-6 bg-border" />

            {/* Quick schedules */}
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={onApplyDayOff}
                    className="gap-1 text-xs px-2"
                  >
                    Franco
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Tecla F</TooltipContent>
              </Tooltip>

              {QUICK_SCHEDULES.slice(0, 3).map((qs) => (
                <Button
                  key={qs.label}
                  variant="ghost"
                  size="sm"
                  onClick={() => onApplyQuickSchedule(qs.start, qs.end)}
                  className="text-xs px-2 h-8"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  {qs.label}
                </Button>
              ))}
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-6 bg-border" />

            {/* Deselect */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onDeselect}
                  className="h-8 w-8 text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Escape</TooltipContent>
            </Tooltip>
          </div>

          {/* Clipboard indicator */}
          {clipboard && (
            <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t text-xs text-muted-foreground">
              <Copy className="w-3 h-3" />
              <span>{clipboard.sourceInfo} en portapapeles</span>
              <button 
                onClick={onClearClipboard}
                className="text-primary hover:underline"
              >
                limpiar
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
