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
              ? `Pegar: ${clipboard.sourceInfo}` 
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
