/**
 * useScheduleSelection - Excel-style multi-cell selection
 * 
 * V2 (Feb 2026) - Excel-style paradigm:
 * - Single click = select (not edit)
 * - Shift+click = range select
 * - Ctrl/Cmd+click = toggle in selection
 * - Click-drag = rectangular range select
 * - Double-click = open edit popover (handled by parent)
 * 
 * Supports:
 * - Keyboard shortcuts: Ctrl+C, Ctrl+V, Delete, Escape, F
 * - Row/column selection
 * - Quick schedule apply from toolbar
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { format, min as dateMin, max as dateMax } from 'date-fns';
import { toast } from 'sonner';
import type { ScheduleValue } from '../ScheduleCellPopover';
import { 
  cellKeyString, 
  parseCellKey, 
  type CellKey, 
  type ClipboardDataV2,
} from './types';

interface UseScheduleSelectionOptions {
  monthDays: Date[];
  teamMemberIds: string[];
  getEffectiveValue: (userId: string, dateStr: string) => ScheduleValue;
  onCellChange: (userId: string, userName: string, dateStr: string, value: ScheduleValue) => void;
  getTeamMemberName: (userId: string) => string;
  enabled?: boolean;
}

interface DragState {
  isDragging: boolean;
  startCell: CellKey | null;
  currentCell: CellKey | null;
}

export function useScheduleSelection({
  monthDays,
  teamMemberIds,
  getEffectiveValue,
  onCellChange,
  getTeamMemberName,
  enabled = true,
}: UseScheduleSelectionOptions) {
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [lastClickedCell, setLastClickedCell] = useState<CellKey | null>(null);
  const [clipboard, setClipboard] = useState<ClipboardDataV2 | null>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startCell: null,
    currentCell: null,
  });

  // Ref to track if we just finished a drag (to prevent click from clearing)
  const justFinishedDrag = useRef(false);

  // Calculate rectangular selection between two cells
  const calculateRectSelection = useCallback((start: CellKey, end: CellKey): Set<string> => {
    const selection = new Set<string>();
    
    const startUserIdx = teamMemberIds.indexOf(start.userId);
    const endUserIdx = teamMemberIds.indexOf(end.userId);
    const minUserIdx = Math.min(startUserIdx, endUserIdx);
    const maxUserIdx = Math.max(startUserIdx, endUserIdx);
    
    const startDate = new Date(start.date);
    const endDate = new Date(end.date);
    const minDate = dateMin([startDate, endDate]);
    const maxDate = dateMax([startDate, endDate]);
    
    for (let uIdx = minUserIdx; uIdx <= maxUserIdx; uIdx++) {
      const userId = teamMemberIds[uIdx];
      if (!userId) continue;
      
      for (const day of monthDays) {
        if (day >= minDate && day <= maxDate) {
          selection.add(cellKeyString(userId, format(day, 'yyyy-MM-dd')));
        }
      }
    }
    
    return selection;
  }, [teamMemberIds, monthDays]);

  // Keyboard shortcuts handler
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Escape - deselect all
      if (e.key === 'Escape') {
        if (selectedCells.size > 0) {
          setSelectedCells(new Set());
        }
        return;
      }

      // Only process other shortcuts if we have selection
      if (selectedCells.size === 0) return;

      // Ctrl/Cmd + C - Copy
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        handleCopy();
        return;
      }

      // Ctrl/Cmd + V - Paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        handlePaste();
        return;
      }

      // Delete/Backspace - Clear selection
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleClearCells();
        return;
      }

      // F - Mark as Franco (day off)
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        handleApplyDayOff();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, selectedCells, clipboard]);

  // Handle mouse up globally to end drag
  useEffect(() => {
    if (!enabled) return;

    const handleMouseUp = () => {
      if (dragState.isDragging && dragState.startCell && dragState.currentCell) {
        const selection = calculateRectSelection(dragState.startCell, dragState.currentCell);
        setSelectedCells(selection);
        setLastClickedCell(dragState.currentCell);
        justFinishedDrag.current = true;
        setTimeout(() => { justFinishedDrag.current = false; }, 100);
      }
      setDragState({ isDragging: false, startCell: null, currentCell: null });
    };

    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [enabled, dragState, calculateRectSelection]);

  // Handle cell click - Excel paradigm: click = select
  const handleCellClick = useCallback((
    userId: string, 
    date: string, 
    e: React.MouseEvent
  ) => {
    if (!enabled) return;

    // If we just finished a drag, don't process the click
    if (justFinishedDrag.current) return;

    const cellKey = cellKeyString(userId, date);
    
    // Shift+click: select range from last clicked cell
    if (e.shiftKey && lastClickedCell) {
      const selection = calculateRectSelection(lastClickedCell, { userId, date });
      setSelectedCells(selection);
    }
    // Ctrl/Cmd+click: toggle cell in selection
    else if (e.ctrlKey || e.metaKey) {
      setSelectedCells(prev => {
        const next = new Set(prev);
        if (next.has(cellKey)) {
          next.delete(cellKey);
        } else {
          next.add(cellKey);
        }
        return next;
      });
      setLastClickedCell({ userId, date });
    }
    // Normal click: single selection (Excel behavior)
    else {
      setSelectedCells(new Set([cellKey]));
      setLastClickedCell({ userId, date });
    }
  }, [enabled, lastClickedCell, calculateRectSelection]);

  // Start drag selection
  const handleDragStart = useCallback((userId: string, date: string, e: React.MouseEvent) => {
    if (!enabled) return;
    // Don't start drag on modified clicks
    if (e.shiftKey || e.ctrlKey || e.metaKey) return;
    
    e.preventDefault();
    const cell = { userId, date };
    setDragState({
      isDragging: true,
      startCell: cell,
      currentCell: cell,
    });
    setSelectedCells(new Set([cellKeyString(userId, date)]));
    setLastClickedCell(cell);
  }, [enabled]);

  // Continue drag selection
  const handleDragMove = useCallback((userId: string, date: string) => {
    if (!enabled || !dragState.isDragging || !dragState.startCell) return;
    
    const currentCell = { userId, date };
    setDragState(prev => ({ ...prev, currentCell }));
    
    // Update selection preview
    const selection = calculateRectSelection(dragState.startCell, currentCell);
    setSelectedCells(selection);
  }, [enabled, dragState.isDragging, dragState.startCell, calculateRectSelection]);

  // Select entire column (all employees for a day)
  const handleColumnSelect = useCallback((date: string) => {
    if (!enabled) return;
    
    const newSelection = new Set<string>();
    teamMemberIds.forEach(userId => {
      newSelection.add(cellKeyString(userId, date));
    });
    setSelectedCells(newSelection);
    toast.info(`Columna seleccionada: ${teamMemberIds.length} celdas`);
  }, [enabled, teamMemberIds]);

  // Select entire row (all days for an employee)
  const handleRowSelect = useCallback((userId: string) => {
    if (!enabled) return;
    
    const newSelection = new Set<string>();
    monthDays.forEach(day => {
      newSelection.add(cellKeyString(userId, format(day, 'yyyy-MM-dd')));
    });
    setSelectedCells(newSelection);
    toast.info(`Fila seleccionada: ${monthDays.length} celdas`);
  }, [enabled, monthDays]);

  // Copy selected cells - always copies FIRST cell only
  const handleCopy = useCallback(() => {
    if (selectedCells.size === 0) return;

    const firstCellKey = Array.from(selectedCells)[0];
    const { userId, date } = parseCellKey(firstCellKey);
    const schedule = getEffectiveValue(userId, date);

    let sourceInfo: string;
    if (schedule.isDayOff) {
      if (schedule.position === 'vacaciones') {
        sourceInfo = '🏖️ Vacaciones';
      } else if (schedule.position === 'cumple') {
        sourceInfo = '🎂 Cumple';
      } else {
        sourceInfo = 'Franco';
      }
    } else if (schedule.startTime && schedule.endTime) {
      const start = schedule.startTime.slice(0, 5);
      const end = schedule.endTime.slice(0, 5);
      sourceInfo = `${start}-${end}`;
      if (schedule.position) {
        sourceInfo += ` (${schedule.position})`;
      }
    } else {
      sourceInfo = 'Vacío';
    }

    const clipboardData: ClipboardDataV2 = {
      type: 'cells',
      cells: [{ dayOffset: 0, schedule }],
      sourceInfo,
    };

    setClipboard(clipboardData);
    toast.success(`📋 Copiado: ${sourceInfo}`);
  }, [selectedCells, getEffectiveValue]);

  // Paste clipboard to selection
  const handlePaste = useCallback(() => {
    if (!clipboard || selectedCells.size === 0) {
      if (!clipboard) toast.error('No hay nada en el portapapeles');
      return;
    }

    const schedule = clipboard.cells[0].schedule;
    const targetCells = Array.from(selectedCells).map(parseCellKey);

    targetCells.forEach(cell => {
      const userName = getTeamMemberName(cell.userId);
      onCellChange(cell.userId, userName, cell.date, schedule);
    });

    toast.success(`✓ Pegado en ${targetCells.length} celda${targetCells.length > 1 ? 's' : ''}`);
    setSelectedCells(new Set());
  }, [clipboard, selectedCells, onCellChange, getTeamMemberName]);

  // Clear selected cells (delete)
  const handleClearCells = useCallback(() => {
    const cells = Array.from(selectedCells).map(parseCellKey);
    const emptyValue: ScheduleValue = {
      startTime: null,
      endTime: null,
      isDayOff: false,
      position: null,
      breakStart: null,
      breakEnd: null,
    };

    cells.forEach(cell => {
      const userName = getTeamMemberName(cell.userId);
      onCellChange(cell.userId, userName, cell.date, emptyValue);
    });

    setSelectedCells(new Set());
    toast.info(`🗑️ ${cells.length} celda${cells.length > 1 ? 's' : ''} limpiada${cells.length > 1 ? 's' : ''}`);
  }, [selectedCells, onCellChange, getTeamMemberName]);

  // Apply day off to selection
  const handleApplyDayOff = useCallback(() => {
    const cells = Array.from(selectedCells).map(parseCellKey);
    const dayOffValue: ScheduleValue = {
      startTime: null,
      endTime: null,
      isDayOff: true,
      position: null,
      breakStart: null,
      breakEnd: null,
    };

    cells.forEach(cell => {
      const userName = getTeamMemberName(cell.userId);
      onCellChange(cell.userId, userName, cell.date, dayOffValue);
    });

    toast.success(`✓ Franco aplicado a ${cells.length} celda${cells.length > 1 ? 's' : ''}`);
  }, [selectedCells, onCellChange, getTeamMemberName]);

  // Apply quick schedule to selection (from toolbar)
  const handleApplyQuickSchedule = useCallback((startTime: string, endTime: string) => {
    if (selectedCells.size === 0) return;
    
    const cells = Array.from(selectedCells).map(parseCellKey);
    const scheduleValue: ScheduleValue = {
      startTime,
      endTime,
      isDayOff: false,
      position: null,
      breakStart: null,
      breakEnd: null,
    };

    cells.forEach(cell => {
      const userName = getTeamMemberName(cell.userId);
      onCellChange(cell.userId, userName, cell.date, scheduleValue);
    });

    toast.success(`✓ ${startTime}-${endTime} aplicado a ${cells.length} celda${cells.length > 1 ? 's' : ''}`);
    setSelectedCells(new Set());
  }, [selectedCells, onCellChange, getTeamMemberName]);

  // Check if cell is selected
  const isCellSelected = useCallback((userId: string, date: string) => {
    return selectedCells.has(cellKeyString(userId, date));
  }, [selectedCells]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedCells(new Set());
  }, []);

  // Clear clipboard
  const clearClipboard = useCallback(() => {
    setClipboard(null);
    toast.info('Portapapeles limpiado');
  }, []);

  return {
    // State
    selectedCells,
    selectionCount: selectedCells.size,
    clipboard,
    hasSelection: selectedCells.size > 0,
    hasClipboard: clipboard !== null,
    isDragging: dragState.isDragging,
    
    // Cell operations
    handleCellClick,
    handleDragStart,
    handleDragMove,
    handleColumnSelect,
    handleRowSelect,
    isCellSelected,
    
    // Actions
    handleCopy,
    handlePaste,
    handleClearCells,
    handleApplyDayOff,
    handleApplyQuickSchedule,
    clearSelection,
    clearClipboard,
  };
}
