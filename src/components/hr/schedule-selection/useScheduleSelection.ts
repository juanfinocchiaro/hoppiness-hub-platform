/**
 * useScheduleSelection - Excel-style multi-cell selection
 * 
 * V5 (Feb 2026) - Pointer Capture implementation:
 * - Uses setPointerCapture for reliable drag tracking regardless of gaps/overlays
 * - Unified click/drag model: click handled in pointerUp (not separate onClick)
 * - updateDragCell method for direct cell updates (no elementFromPoint issues)
 * - Robust state cleanup on blur/visibility/escape
 * 
 * Supports:
 * - Keyboard shortcuts: Ctrl+C, Ctrl+V, Delete, Escape, F, V
 * - Row/column selection
 * - Quick schedule apply from toolbar with position + break
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

// Drag state stored in ref for immediate access without re-renders
interface DragState {
  active: boolean;
  startCell: CellKey | null;
  currentCell: CellKey | null;
  didMove: boolean;
  pointerId: number | null;
  captureTarget: HTMLElement | null;
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
  const [isDragging, setIsDragging] = useState(false);
  
  // Drag state ref - mutable for immediate updates
  const dragStateRef = useRef<DragState>({
    active: false,
    startCell: null,
    currentCell: null,
    didMove: false,
    pointerId: null,
    captureTarget: null,
  });

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

  // Release pointer capture safely
  const releaseCapture = useCallback(() => {
    const { captureTarget, pointerId } = dragStateRef.current;
    if (captureTarget && pointerId !== null) {
      try {
        captureTarget.releasePointerCapture(pointerId);
      } catch {
        // Ignore errors if capture was already released
      }
    }
  }, []);

  // Cancel drag - resets everything without committing selection
  const cancelDrag = useCallback(() => {
    if (!dragStateRef.current.active) return;
    
    releaseCapture();
    
    dragStateRef.current = {
      active: false,
      startCell: null,
      currentCell: null,
      didMove: false,
      pointerId: null,
      captureTarget: null,
    };
    setIsDragging(false);
    // Optionally clear selection on cancel
    setSelectedCells(new Set());
  }, [releaseCapture]);

  // End drag - commit the selection
  const endDrag = useCallback(() => {
    if (!dragStateRef.current.active) return;
    
    releaseCapture();
    
    const { startCell, currentCell, didMove } = dragStateRef.current;
    
    // If we moved, the selection is already set during drag
    // If we didn't move, treat as single click
    if (!didMove && startCell) {
      const cellKey = cellKeyString(startCell.userId, startCell.date);
      setSelectedCells(new Set([cellKey]));
      setLastClickedCell(startCell);
    } else if (startCell && currentCell) {
      setLastClickedCell(currentCell);
    }
    
    dragStateRef.current = {
      active: false,
      startCell: null,
      currentCell: null,
      didMove: false,
      pointerId: null,
      captureTarget: null,
    };
    setIsDragging(false);
  }, [releaseCapture]);

  // Handle lost pointer capture (browser took it away)
  const handleLostPointerCapture = useCallback(() => {
    if (dragStateRef.current.active) {
      endDrag();
    }
  }, [endDrag]);

  // Global event listeners for cleanup
  useEffect(() => {
    if (!enabled) return;

    const handleBlur = () => {
      if (dragStateRef.current.active) {
        cancelDrag();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && dragStateRef.current.active) {
        cancelDrag();
      }
    };

    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, cancelDrag]);

  // Keyboard shortcuts handler
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Escape - cancel drag OR deselect all
      if (e.key === 'Escape') {
        if (dragStateRef.current.active) {
          cancelDrag();
        } else if (selectedCells.size > 0) {
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
      
      // V - Mark as Vacaciones (only if not Ctrl+V)
      if ((e.key === 'v' || e.key === 'V') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleApplyVacation();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, selectedCells, cancelDrag]);

  // Start drag - called on pointerDown
  const handleDragStart = useCallback((
    userId: string, 
    date: string, 
    e: React.PointerEvent
  ) => {
    if (!enabled) return;
    // Don't start drag on modified clicks (Ctrl handles toggle in pointerUp)
    if (e.shiftKey) return;
    // Only left mouse button
    if (e.button !== 0) return;
    
    const cell = { userId, date };
    const target = e.currentTarget as HTMLElement;
    
    // Set pointer capture so all move events come to this element
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      // Fallback if capture fails
    }
    
    dragStateRef.current = {
      active: true,
      startCell: cell,
      currentCell: cell,
      didMove: false,
      pointerId: e.pointerId,
      captureTarget: target,
    };
    setIsDragging(true);
    
    // For Ctrl+click, don't pre-select (handled in pointerUp)
    if (!e.ctrlKey && !e.metaKey) {
      const cellKey = cellKeyString(userId, date);
      setSelectedCells(new Set([cellKey]));
    }
  }, [enabled]);

  // Update drag cell - called directly from cell pointerMove
  const updateDragCell = useCallback((userId: string, date: string) => {
    if (!dragStateRef.current.active || !dragStateRef.current.startCell) return;
    
    const currentKey = dragStateRef.current.currentCell 
      ? cellKeyString(dragStateRef.current.currentCell.userId, dragStateRef.current.currentCell.date)
      : null;
    const newKey = cellKeyString(userId, date);
    
    // Skip if same cell
    if (currentKey === newKey) return;
    
    const startKey = cellKeyString(dragStateRef.current.startCell.userId, dragStateRef.current.startCell.date);
    
    // Mark that we moved to a different cell
    if (newKey !== startKey) {
      dragStateRef.current.didMove = true;
    }
    
    dragStateRef.current.currentCell = { userId, date };
    
    // Update selection rectangle
    const selection = calculateRectSelection(dragStateRef.current.startCell, { userId, date });
    setSelectedCells(selection);
  }, [calculateRectSelection]);

  // Handle pointer move on a cell (with capture, this fires even over gaps)
  const handleCellPointerMove = useCallback((
    userId: string, 
    date: string, 
    e: React.PointerEvent
  ) => {
    if (!enabled) return;
    if (!dragStateRef.current.active) return;
    if (e.pointerId !== dragStateRef.current.pointerId) return;
    
    updateDragCell(userId, date);
  }, [enabled, updateDragCell]);

  // Handle pointer up on a cell
  const handleCellPointerUp = useCallback((
    userId: string, 
    date: string, 
    e: React.PointerEvent
  ) => {
    if (!enabled) return;
    
    const wasActive = dragStateRef.current.active;
    const didMove = dragStateRef.current.didMove;
    const startCell = dragStateRef.current.startCell;
    
    // End the drag first
    if (wasActive) {
      endDrag();
    }
    
    // Handle Ctrl+click toggle (only if didn't drag)
    if ((e.ctrlKey || e.metaKey) && !didMove) {
      const cellKey = cellKeyString(userId, date);
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
    // Handle Shift+click range (only if didn't drag)
    else if (e.shiftKey && lastClickedCell && !wasActive) {
      const selection = calculateRectSelection(lastClickedCell, { userId, date });
      setSelectedCells(selection);
      setLastClickedCell({ userId, date });
    }
  }, [enabled, lastClickedCell, calculateRectSelection, endDrag]);

  // Legacy grid move handler (fallback, less reliable)
  const handleGridPointerMove = useCallback((e: React.PointerEvent | React.MouseEvent | PointerEvent | MouseEvent) => {
    if (!enabled || !dragStateRef.current.active || !dragStateRef.current.startCell) return;
    
    // Only use elementFromPoint as fallback if cell's pointerMove didn't fire
    const element = document.elementFromPoint(e.clientX, e.clientY);
    if (!element) return;
    
    const cellElement = element.closest('[data-cell]');
    if (!cellElement) return;
    
    const cellKey = cellElement.getAttribute('data-cell');
    if (!cellKey) return;
    
    const [userId, date] = cellKey.split(':');
    if (!userId || !date) return;
    
    updateDragCell(userId, date);
  }, [enabled, updateDragCell]);

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

  // Apply day off (Franco) to selection
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

  // Apply vacation to selection
  const handleApplyVacation = useCallback(() => {
    const cells = Array.from(selectedCells).map(parseCellKey);
    const vacationValue: ScheduleValue = {
      startTime: null,
      endTime: null,
      isDayOff: true,
      position: 'vacaciones',
      breakStart: null,
      breakEnd: null,
    };

    cells.forEach(cell => {
      const userName = getTeamMemberName(cell.userId);
      onCellChange(cell.userId, userName, cell.date, vacationValue);
    });

    toast.success(`🏖️ Vacaciones aplicadas a ${cells.length} celda${cells.length > 1 ? 's' : ''}`);
  }, [selectedCells, onCellChange, getTeamMemberName]);

  // Apply birthday day off to selection
  const handleApplyBirthday = useCallback(() => {
    const cells = Array.from(selectedCells).map(parseCellKey);
    const birthdayValue: ScheduleValue = {
      startTime: null,
      endTime: null,
      isDayOff: true,
      position: 'cumple',
      isBirthdayOff: true,
      breakStart: null,
      breakEnd: null,
    };

    cells.forEach(cell => {
      const userName = getTeamMemberName(cell.userId);
      onCellChange(cell.userId, userName, cell.date, birthdayValue);
    });

    toast.success(`🎂 Cumple aplicado a ${cells.length} celda${cells.length > 1 ? 's' : ''}`);
  }, [selectedCells, onCellChange, getTeamMemberName]);

  // Apply schedule with all options (time, position, break)
  const handleApplyWithOptions = useCallback((
    startTime: string, 
    endTime: string, 
    position: string | null,
    includeBreak: boolean
  ) => {
    if (selectedCells.size === 0) return;
    
    const cells = Array.from(selectedCells).map(parseCellKey);
    
    // Calculate break times if needed (auto-calculate for shifts >6h)
    let breakStart: string | null = null;
    let breakEnd: string | null = null;
    
    if (includeBreak && startTime && endTime) {
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);
      let durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
      if (durationMinutes < 0) durationMinutes += 24 * 60; // overnight
      
      if (durationMinutes >= 360) {
        const midpoint = startH * 60 + startM + Math.floor(durationMinutes / 2);
        const breakStartMinutes = midpoint - 15;
        const breakEndMinutes = midpoint + 15;
        
        const breakStartH = Math.floor(breakStartMinutes / 60) % 24;
        const breakStartMin = breakStartMinutes % 60;
        const breakEndH = Math.floor(breakEndMinutes / 60) % 24;
        const breakEndMin = breakEndMinutes % 60;
        
        breakStart = `${String(breakStartH).padStart(2, '0')}:${String(breakStartMin).padStart(2, '0')}`;
        breakEnd = `${String(breakEndH).padStart(2, '0')}:${String(breakEndMin).padStart(2, '0')}`;
      }
    }
    
    const scheduleValue: ScheduleValue = {
      startTime,
      endTime,
      isDayOff: false,
      position,
      breakStart,
      breakEnd,
    };

    cells.forEach(cell => {
      const userName = getTeamMemberName(cell.userId);
      onCellChange(cell.userId, userName, cell.date, scheduleValue);
    });

    const posLabel = position ? ` (${position})` : '';
    const breakLabel = breakStart ? ' + break' : '';
    toast.success(`✓ ${startTime}-${endTime}${posLabel}${breakLabel} aplicado a ${cells.length} celda${cells.length > 1 ? 's' : ''}`);
    setSelectedCells(new Set());
  }, [selectedCells, onCellChange, getTeamMemberName]);

  // Simple schedule apply (legacy, kept for compatibility)
  const handleApplyQuickSchedule = useCallback((startTime: string, endTime: string) => {
    handleApplyWithOptions(startTime, endTime, null, false);
  }, [handleApplyWithOptions]);

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

  // Check if single cell with content is selected (show fill handle)
  const canShowFillHandle = useMemo(() => {
    if (selectedCells.size !== 1) return false;
    const cellKey = Array.from(selectedCells)[0];
    const { userId, date } = parseCellKey(cellKey);
    const value = getEffectiveValue(userId, date);
    return !!(value.startTime && value.endTime) || value.isDayOff;
  }, [selectedCells, getEffectiveValue]);

  // Get the selected cell for fill handle
  const fillHandleCell = useMemo(() => {
    if (!canShowFillHandle) return null;
    return parseCellKey(Array.from(selectedCells)[0]);
  }, [canShowFillHandle, selectedCells]);

  // Legacy handleCellClick - now just a wrapper for compatibility
  // Actual click logic is in handleCellPointerUp
  const handleCellClick = useCallback((
    userId: string, 
    date: string, 
    e: React.MouseEvent
  ) => {
    // This is now handled in handleCellPointerUp
    // Kept for potential non-pointer-event fallback scenarios
  }, []);

  return {
    // State
    selectedCells,
    selectionCount: selectedCells.size,
    clipboard,
    hasSelection: selectedCells.size > 0,
    hasClipboard: clipboard !== null,
    isDragging,
    
    // Cell event handlers (new unified model)
    handleDragStart,        // onPointerDown
    handleCellPointerMove,  // onPointerMove (on each cell)
    handleCellPointerUp,    // onPointerUp
    handleLostPointerCapture, // onLostPointerCapture
    
    // Legacy handlers (kept for container fallback)
    handleCellClick,        // Deprecated, use handleCellPointerUp
    handleGridPointerMove,  // Fallback for container-level tracking
    
    // Row/Column selection
    handleColumnSelect,
    handleRowSelect,
    isCellSelected,
    
    // Actions
    handleCopy,
    handlePaste,
    handleClearCells,
    handleApplyDayOff,
    handleApplyVacation,
    handleApplyBirthday,
    handleApplyQuickSchedule,
    handleApplyWithOptions,
    clearSelection,
    clearClipboard,
    cancelDrag,
    
    // Fill drag
    canShowFillHandle,
    fillHandleCell,
  };
}
