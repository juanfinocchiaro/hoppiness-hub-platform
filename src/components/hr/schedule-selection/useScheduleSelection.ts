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
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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

interface FillDragState {
  isFilling: boolean;
  originCell: CellKey | null;
  currentCell: CellKey | null;
  direction: 'horizontal' | 'vertical' | null;
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
  const [fillDragState, setFillDragState] = useState<FillDragState>({
    isFilling: false,
    originCell: null,
    currentCell: null,
    direction: null,
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
  // NOTE: This is called AFTER mouseup completes (not during drag)
  const handleCellClick = useCallback((
    userId: string, 
    date: string, 
    e: React.MouseEvent
  ) => {
    if (!enabled) return;

    // If we just finished a drag, don't process the click
    if (justFinishedDrag.current) return;
    
    // If currently dragging, don't process click (will be handled by mouseup)
    if (dragState.isDragging) return;

    const cellKey = cellKeyString(userId, date);
    
    // Shift+click: select range from last clicked cell
    if (e.shiftKey && lastClickedCell) {
      e.preventDefault();
      const selection = calculateRectSelection(lastClickedCell, { userId, date });
      setSelectedCells(selection);
    }
    // Ctrl/Cmd+click: toggle cell in selection
    else if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
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
    // Normal click without drag: single selection (Excel behavior)
    // Note: We only do this if we didn't start a drag
    else if (!dragState.startCell) {
      setSelectedCells(new Set([cellKey]));
      setLastClickedCell({ userId, date });
    }
  }, [enabled, lastClickedCell, calculateRectSelection, dragState.isDragging, dragState.startCell]);

  // Start drag selection on mousedown
  const handleDragStart = useCallback((userId: string, date: string, e: React.MouseEvent) => {
    if (!enabled) return;
    // Don't start drag on modified clicks (shift/ctrl handle their own logic)
    if (e.shiftKey || e.ctrlKey || e.metaKey) return;
    // Only left mouse button
    if (e.button !== 0) return;
    
    e.preventDefault();
    const cell = { userId, date };
    const cellKey = cellKeyString(userId, date);
    
    setDragState({
      isDragging: true,
      startCell: cell,
      currentCell: cell,
    });
    // Select immediately on mousedown
    setSelectedCells(new Set([cellKey]));
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

  // ========== PHASE 4: FILL DRAG (Excel fill handle) ==========
  
  // Check if single cell with content is selected (show fill handle)
  const canShowFillHandle = useMemo(() => {
    if (selectedCells.size !== 1) return false;
    const cellKey = Array.from(selectedCells)[0];
    const { userId, date } = parseCellKey(cellKey);
    const value = getEffectiveValue(userId, date);
    // Has content if has time OR is day off
    return !!(value.startTime && value.endTime) || value.isDayOff;
  }, [selectedCells, getEffectiveValue]);

  // Get the selected cell for fill handle
  const fillHandleCell = useMemo(() => {
    if (!canShowFillHandle) return null;
    return parseCellKey(Array.from(selectedCells)[0]);
  }, [canShowFillHandle, selectedCells]);

  // Start fill drag (from the corner handle)
  const handleFillDragStart = useCallback((e: React.MouseEvent) => {
    if (!enabled || !fillHandleCell) return;
    e.preventDefault();
    e.stopPropagation();
    
    setFillDragState({
      isFilling: true,
      originCell: fillHandleCell,
      currentCell: fillHandleCell,
      direction: null,
    });
  }, [enabled, fillHandleCell]);

  // Handle fill drag move
  const handleFillDragMove = useCallback((userId: string, date: string) => {
    if (!enabled || !fillDragState.isFilling || !fillDragState.originCell) return;
    
    const origin = fillDragState.originCell;
    const current = { userId, date };
    
    // Determine direction based on movement
    let direction = fillDragState.direction;
    if (!direction) {
      if (userId !== origin.userId) {
        direction = 'vertical';
      } else if (date !== origin.date) {
        direction = 'horizontal';
      }
    }
    
    // Calculate cells in fill range
    const fillCells = new Set<string>();
    fillCells.add(cellKeyString(origin.userId, origin.date));
    
    if (direction === 'horizontal') {
      // Fill horizontal: same employee, different dates
      const originDate = new Date(origin.date);
      const currentDate = new Date(date);
      const minDate = dateMin([originDate, currentDate]);
      const maxDate = dateMax([originDate, currentDate]);
      
      for (const day of monthDays) {
        if (day >= minDate && day <= maxDate) {
          fillCells.add(cellKeyString(origin.userId, format(day, 'yyyy-MM-dd')));
        }
      }
    } else if (direction === 'vertical') {
      // Fill vertical: same date, different employees
      const originUserIdx = teamMemberIds.indexOf(origin.userId);
      const currentUserIdx = teamMemberIds.indexOf(userId);
      const minIdx = Math.min(originUserIdx, currentUserIdx);
      const maxIdx = Math.max(originUserIdx, currentUserIdx);
      
      for (let i = minIdx; i <= maxIdx; i++) {
        const uid = teamMemberIds[i];
        if (uid) {
          fillCells.add(cellKeyString(uid, origin.date));
        }
      }
    }
    
    setFillDragState(prev => ({ ...prev, currentCell: current, direction }));
    setSelectedCells(fillCells);
  }, [enabled, fillDragState.isFilling, fillDragState.originCell, fillDragState.direction, monthDays, teamMemberIds]);

  // End fill drag and apply
  const handleFillDragEnd = useCallback(() => {
    if (!fillDragState.isFilling || !fillDragState.originCell) {
      setFillDragState({ isFilling: false, originCell: null, currentCell: null, direction: null });
      return;
    }
    
    const origin = fillDragState.originCell;
    const sourceValue = getEffectiveValue(origin.userId, origin.date);
    
    // Apply source value to all selected cells (except origin)
    const cells = Array.from(selectedCells).map(parseCellKey);
    let appliedCount = 0;
    
    cells.forEach(cell => {
      if (cell.userId === origin.userId && cell.date === origin.date) return;
      const userName = getTeamMemberName(cell.userId);
      onCellChange(cell.userId, userName, cell.date, sourceValue);
      appliedCount++;
    });
    
    if (appliedCount > 0) {
      toast.success(`✓ Replicado a ${appliedCount} celda${appliedCount > 1 ? 's' : ''}`);
    }
    
    setFillDragState({ isFilling: false, originCell: null, currentCell: null, direction: null });
    setSelectedCells(new Set([cellKeyString(origin.userId, origin.date)]));
  }, [fillDragState, getEffectiveValue, selectedCells, onCellChange, getTeamMemberName]);

  // Global mouseup for fill drag
  useEffect(() => {
    if (!enabled) return;

    const handleMouseUp = () => {
      if (fillDragState.isFilling) {
        handleFillDragEnd();
      }
    };

    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [enabled, fillDragState.isFilling, handleFillDragEnd]);

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
    
    // Fill drag (Phase 4)
    canShowFillHandle,
    fillHandleCell,
    isFilling: fillDragState.isFilling,
    handleFillDragStart,
    handleFillDragMove,
  };
}
