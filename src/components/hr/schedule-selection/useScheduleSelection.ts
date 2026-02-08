/**
 * useScheduleSelection - Excel-style multi-cell selection
 * 
 * V9 (Feb 2026) - Index-based deterministic selection:
 * - All logic uses dayIdx/userIdx instead of Date objects (no timezone bugs)
 * - Pointer capture for reliable drag tracking
 * - e.buttons validation to detect released mouse
 * - Improved findCellAtPoint with line scanning
 * - Correct top-left anchor for copy/paste
 * 
 * Supports:
 * - Keyboard shortcuts: Ctrl+C, Ctrl+V, Delete, Escape, F, V
 * - Row/column selection
 * - Quick schedule apply from toolbar with position + break
 */
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { ScheduleValue } from '../ScheduleCellPopover';
import { 
  cellKeyString, 
  parseCellKey, 
  type CellKey, 
  type ClipboardDataV2,
} from './types';

// Debug flag - set to true to see drag detection logs
const DEBUG = false;

interface UseScheduleSelectionOptions {
  monthDays: Date[];
  teamMemberIds: string[];
  getEffectiveValue: (userId: string, dateStr: string) => ScheduleValue;
  onCellChange: (userId: string, userName: string, dateStr: string, value: ScheduleValue) => void;
  getTeamMemberName: (userId: string) => string;
  enabled?: boolean;
}

// Internal cell representation using indices (no Date objects)
interface CellIndices {
  userIdx: number;
  dayIdx: number;
}

// Drag state stored in ref for immediate access without re-renders
interface DragState {
  active: boolean;
  startCell: CellIndices | null;
  currentCell: CellIndices | null;
  pointerId: number | null;
}

/**
 * Multi-point sampling to find a cell even when pointer is on border/gap.
 * Uses line scanning for better border detection.
 */
function findCellAtPoint(x: number, y: number): { userId: string; dateStr: string } | null {
  // Sample points: center + line scans in all directions
  const offsets = [
    [0, 0],
    // Horizontal line scan
    [4, 0], [-4, 0], [8, 0], [-8, 0],
    // Vertical line scan  
    [0, 4], [0, -4], [0, 8], [0, -8],
    // Diagonals for corner cases
    [4, 4], [-4, -4], [4, -4], [-4, 4],
  ];
  
  for (const [dx, dy] of offsets) {
    const el = document.elementFromPoint(x + dx, y + dy);
    if (!el) continue;
    
    const cellEl = el.closest('[data-cell]') as HTMLElement | null;
    if (cellEl) {
      const cellData = cellEl.getAttribute('data-cell');
      if (cellData && cellData.includes(':')) {
        const colonIdx = cellData.indexOf(':');
        const userId = cellData.substring(0, colonIdx);
        const dateStr = cellData.substring(colonIdx + 1);
        if (userId && dateStr) {
          return { userId, dateStr };
        }
      }
    }
  }
  
  return null;
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
    pointerId: null,
  });
  
  // Track last detected cell to avoid redundant updates
  const lastDetectedIdxRef = useRef<string | null>(null);
  
  // Reference to the element that has pointer capture
  const captureElementRef = useRef<HTMLElement | null>(null);

  // ========== INDEX-BASED LOOKUP MAPS ==========
  // Pre-compute maps for O(1) lookups - eliminates all Date object comparisons
  
  const dayIndexByDateStr = useMemo(() => {
    const map = new Map<string, number>();
    monthDays.forEach((day, idx) => {
      map.set(format(day, 'yyyy-MM-dd'), idx);
    });
    return map;
  }, [monthDays]);
  
  const dateStrByDayIndex = useMemo(() => {
    return monthDays.map(day => format(day, 'yyyy-MM-dd'));
  }, [monthDays]);
  
  const userIndexById = useMemo(() => {
    const map = new Map<string, number>();
    teamMemberIds.forEach((id, idx) => {
      map.set(id, idx);
    });
    return map;
  }, [teamMemberIds]);

  // Convert CellKey to indices
  const cellToIndices = useCallback((cell: CellKey): CellIndices | null => {
    const userIdx = userIndexById.get(cell.userId);
    const dayIdx = dayIndexByDateStr.get(cell.date);
    if (userIdx === undefined || dayIdx === undefined) return null;
    return { userIdx, dayIdx };
  }, [userIndexById, dayIndexByDateStr]);

  // Convert indices to CellKey
  const indicesToCell = useCallback((indices: CellIndices): CellKey | null => {
    const userId = teamMemberIds[indices.userIdx];
    const dateStr = dateStrByDayIndex[indices.dayIdx];
    if (!userId || !dateStr) return null;
    return { userId, date: dateStr };
  }, [teamMemberIds, dateStrByDayIndex]);

  // ========== RECTANGULAR SELECTION USING INDICES ==========
  const calculateRectSelection = useCallback((start: CellIndices, end: CellIndices): Set<string> => {
    const selection = new Set<string>();
    
    const minUserIdx = Math.min(start.userIdx, end.userIdx);
    const maxUserIdx = Math.max(start.userIdx, end.userIdx);
    const minDayIdx = Math.min(start.dayIdx, end.dayIdx);
    const maxDayIdx = Math.max(start.dayIdx, end.dayIdx);
    
    if (DEBUG) {
      console.log('[Selection] calculateRectSelection:', {
        minUserIdx, maxUserIdx, minDayIdx, maxDayIdx,
        cellCount: (maxUserIdx - minUserIdx + 1) * (maxDayIdx - minDayIdx + 1)
      });
    }
    
    for (let uIdx = minUserIdx; uIdx <= maxUserIdx; uIdx++) {
      const userId = teamMemberIds[uIdx];
      if (!userId) continue;
      
      for (let dIdx = minDayIdx; dIdx <= maxDayIdx; dIdx++) {
        const dateStr = dateStrByDayIndex[dIdx];
        if (!dateStr) continue;
        selection.add(cellKeyString(userId, dateStr));
      }
    }
    
    return selection;
  }, [teamMemberIds, dateStrByDayIndex]);

  // Update selection based on current drag state
  const updateDragSelection = useCallback((endIndices: CellIndices) => {
    const startCell = dragStateRef.current.startCell;
    if (!startCell) return;
    
    const idxKey = `${endIndices.userIdx}:${endIndices.dayIdx}`;
    
    // Skip if same indices as last detected
    if (lastDetectedIdxRef.current === idxKey) return;
    
    if (DEBUG) {
      console.log('[Selection] updateDragSelection:', { 
        start: `${startCell.userIdx}:${startCell.dayIdx}`,
        end: idxKey 
      });
    }
    
    lastDetectedIdxRef.current = idxKey;
    dragStateRef.current.currentCell = endIndices;
    
    // Calculate and update selection using indices
    const selection = calculateRectSelection(startCell, endIndices);
    setSelectedCells(selection);
  }, [calculateRectSelection]);

  // Cancel drag - resets everything without committing selection
  const cancelDrag = useCallback(() => {
    if (!dragStateRef.current.active) return;
    
    if (DEBUG) console.log('[Selection] cancelDrag');
    
    // Release pointer capture if held
    if (captureElementRef.current && dragStateRef.current.pointerId !== null) {
      try {
        captureElementRef.current.releasePointerCapture(dragStateRef.current.pointerId);
      } catch (e) {
        // Ignore - pointer may already be released
      }
    }
    
    dragStateRef.current = {
      active: false,
      startCell: null,
      currentCell: null,
      pointerId: null,
    };
    captureElementRef.current = null;
    lastDetectedIdxRef.current = null;
    setIsDragging(false);
    setSelectedCells(new Set());
  }, []);

  // End drag - commit the selection
  const endDrag = useCallback(() => {
    if (!dragStateRef.current.active) return;
    
    if (DEBUG) console.log('[Selection] endDrag');
    
    // Release pointer capture if held
    if (captureElementRef.current && dragStateRef.current.pointerId !== null) {
      try {
        captureElementRef.current.releasePointerCapture(dragStateRef.current.pointerId);
      } catch (e) {
        // Ignore - pointer may already be released
      }
    }
    
    const { currentCell, startCell } = dragStateRef.current;
    
    // Set last clicked cell (for shift+click range)
    const finalIndices = currentCell || startCell;
    if (finalIndices) {
      const cell = indicesToCell(finalIndices);
      if (cell) setLastClickedCell(cell);
    }
    
    dragStateRef.current = {
      active: false,
      startCell: null,
      currentCell: null,
      pointerId: null,
    };
    captureElementRef.current = null;
    lastDetectedIdxRef.current = null;
    setIsDragging(false);
  }, [indicesToCell]);

  // Global pointermove listener - SINGLE SOURCE OF TRUTH during drag
  useEffect(() => {
    if (!enabled) return;

    const handlePointerMove = (e: PointerEvent) => {
      // Only process if actively dragging
      if (!dragStateRef.current.active) return;
      
      // CRITICAL: Validate mouse button is still pressed
      if ((e.buttons & 1) === 0) {
        if (DEBUG) console.log('[Selection] Button released during drag, ending');
        endDrag();
        return;
      }
      
      // Find cell under pointer using multi-point sampling
      const foundCell = findCellAtPoint(e.clientX, e.clientY);
      
      if (foundCell) {
        const indices = cellToIndices({ userId: foundCell.userId, date: foundCell.dateStr });
        if (indices) {
          updateDragSelection(indices);
        }
      } else if (DEBUG) {
        console.log('[Selection] findCellAtPoint returned null at', e.clientX, e.clientY);
      }
    };

    const handlePointerUp = () => {
      if (dragStateRef.current.active) {
        endDrag();
      }
    };

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

    // Add listeners
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, endDrag, cancelDrag, updateDragSelection, cellToIndices]);

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
    e: React.PointerEvent | React.MouseEvent
  ) => {
    if (!enabled) return;
    // Don't start drag on Shift (handled separately for range)
    if (e.shiftKey) return;
    // Only left mouse button
    if (e.button !== 0) return;
    
    const indices = cellToIndices({ userId, date });
    if (!indices) return;
    
    const cellKey = cellKeyString(userId, date);
    
    if (DEBUG) console.log('[Selection] handleDragStart:', cellKey, 'indices:', indices);
    
    // Set pointer capture for reliable tracking
    const target = e.currentTarget as HTMLElement;
    if ('setPointerCapture' in target && 'pointerId' in e) {
      try {
        target.setPointerCapture((e as React.PointerEvent).pointerId);
        captureElementRef.current = target;
      } catch (err) {
        if (DEBUG) console.log('[Selection] setPointerCapture failed:', err);
      }
    }
    
    dragStateRef.current = {
      active: true,
      startCell: indices,
      currentCell: indices,
      pointerId: 'pointerId' in e ? (e as React.PointerEvent).pointerId : null,
    };
    lastDetectedIdxRef.current = `${indices.userIdx}:${indices.dayIdx}`;
    setIsDragging(true);
    
    // For Ctrl+click, don't pre-select (handled in pointerUp)
    if (!e.ctrlKey && !e.metaKey) {
      setSelectedCells(new Set([cellKey]));
    }
  }, [enabled, cellToIndices]);

  // Called when pointer enters a cell during drag (fallback, pointermove is primary)
  const handleCellEnter = useCallback((userId: string, date: string) => {
    // During active drag, pointermove is authoritative - ignore pointerEnter
    if (!dragStateRef.current.active || !dragStateRef.current.startCell) return;
    
    const indices = cellToIndices({ userId, date });
    if (!indices) return;
    
    updateDragSelection(indices);
  }, [updateDragSelection, cellToIndices]);

  // Handle pointer up on a cell (for click modifiers)
  const handleCellPointerUp = useCallback((
    userId: string, 
    date: string, 
    e: React.PointerEvent | React.MouseEvent
  ) => {
    if (!enabled) return;
    
    const wasActive = dragStateRef.current.active;
    const startCell = dragStateRef.current.startCell;
    const currentCell = dragStateRef.current.currentCell;
    
    // Check if this was just a click (no movement)
    const didMove = startCell && currentCell && 
      (startCell.userIdx !== currentCell.userIdx || startCell.dayIdx !== currentCell.dayIdx);
    
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
      const startIndices = cellToIndices(lastClickedCell);
      const endIndices = cellToIndices({ userId, date });
      if (startIndices && endIndices) {
        const selection = calculateRectSelection(startIndices, endIndices);
        setSelectedCells(selection);
        setLastClickedCell({ userId, date });
      }
    }
  }, [enabled, lastClickedCell, calculateRectSelection, endDrag, cellToIndices]);

  // Lost pointer capture handler
  const handleLostPointerCapture = useCallback(() => {
    if (dragStateRef.current.active) {
      if (DEBUG) console.log('[Selection] lostpointercapture, ending drag');
      endDrag();
    }
  }, [endDrag]);

  // Legacy handlers kept for compatibility
  const handleCellClick = useCallback(() => {}, []);
  const handleGridPointerMove = useCallback(() => {}, []);
  const handleCellPointerMove = useCallback(() => {}, []);

  // Select entire column (all employees for a day)
  const handleColumnSelect = useCallback((date: string) => {
    if (!enabled) return;
    
    const newSelection = new Set<string>();
    teamMemberIds.forEach(userId => {
      newSelection.add(cellKeyString(userId, date));
    });
    setSelectedCells(newSelection);
  }, [enabled, teamMemberIds]);

  // Select entire row (all days for an employee)
  const handleRowSelect = useCallback((userId: string) => {
    if (!enabled) return;
    
    const newSelection = new Set<string>();
    dateStrByDayIndex.forEach(dateStr => {
      newSelection.add(cellKeyString(userId, dateStr));
    });
    setSelectedCells(newSelection);
  }, [enabled, dateStrByDayIndex]);

  // ========== COPY USING INDICES - CORRECT TOP-LEFT ANCHOR ==========
  const handleCopy = useCallback(() => {
    if (selectedCells.size === 0) return;

    const cellsArray = Array.from(selectedCells).map(parseCellKey);
    
    // Convert to indices for sorting
    const cellsWithIndices = cellsArray
      .map(cell => {
        const indices = cellToIndices(cell);
        return indices ? { cell, indices } : null;
      })
      .filter((x): x is { cell: CellKey; indices: CellIndices } => x !== null);
    
    if (cellsWithIndices.length === 0) return;
    
    // Sort by dayIdx FIRST, then userIdx - this gives us true top-left anchor
    cellsWithIndices.sort((a, b) => {
      if (a.indices.dayIdx !== b.indices.dayIdx) return a.indices.dayIdx - b.indices.dayIdx;
      return a.indices.userIdx - b.indices.userIdx;
    });
    
    const anchor = cellsWithIndices[0];
    
    if (DEBUG) {
      console.log('[Copy] anchor:', {
        dayIdx: anchor.indices.dayIdx,
        userIdx: anchor.indices.userIdx,
        date: anchor.cell.date
      });
    }
    
    // Build clipboard with relative positions using indices
    const copiedCells = cellsWithIndices.map(({ cell, indices }) => {
      const dayOffset = indices.dayIdx - anchor.indices.dayIdx;
      const userOffset = indices.userIdx - anchor.indices.userIdx;
      const schedule = getEffectiveValue(cell.userId, cell.date);
      
      return {
        dayOffset,
        userOffset,
        schedule,
      };
    });

    // Build sourceInfo
    let sourceInfo: string;
    if (selectedCells.size === 1) {
      const schedule = copiedCells[0].schedule;
      if (schedule.isDayOff) {
        if (schedule.position === 'vacaciones') {
          sourceInfo = '🏖️ Vacaciones';
        } else if (schedule.position === 'cumple') {
          sourceInfo = '🎂 Cumple';
        } else {
          sourceInfo = 'Franco';
        }
      } else if (schedule.startTime && schedule.endTime) {
        sourceInfo = `${schedule.startTime.slice(0, 5)}-${schedule.endTime.slice(0, 5)}`;
        if (schedule.position) {
          sourceInfo += ` (${schedule.position})`;
        }
      } else {
        sourceInfo = 'Vacío';
      }
    } else {
      sourceInfo = `${selectedCells.size} celdas`;
    }

    const clipboardData: ClipboardDataV2 = {
      type: 'cells',
      cells: copiedCells,
      sourceInfo,
    };

    setClipboard(clipboardData);
    toast.success(`📋 Copiado: ${sourceInfo}`);
  }, [selectedCells, getEffectiveValue, cellToIndices]);

  // ========== PASTE USING INDICES - DETERMINISTIC ==========
  const handlePaste = useCallback(() => {
    if (!clipboard || selectedCells.size === 0) {
      if (!clipboard) toast.error('No hay nada en el portapapeles');
      return;
    }

    // If only 1 cell copied, fill all selected cells with that value
    if (clipboard.cells.length === 1) {
      const schedule = clipboard.cells[0].schedule;
      const targetCells = Array.from(selectedCells).map(parseCellKey);

      targetCells.forEach(cell => {
        const userName = getTeamMemberName(cell.userId);
        onCellChange(cell.userId, userName, cell.date, schedule);
      });

      toast.success(`✓ Pegado en ${targetCells.length} celda${targetCells.length > 1 ? 's' : ''}`);
      setSelectedCells(new Set());
      return;
    }

    // Multi-cell paste: find the TOP-LEFT cell as anchor using indices
    const targetCellsArray = Array.from(selectedCells).map(parseCellKey);
    
    // Convert to indices for proper sorting
    const targetsWithIndices = targetCellsArray
      .map(cell => {
        const indices = cellToIndices(cell);
        return indices ? { cell, indices } : null;
      })
      .filter((x): x is { cell: CellKey; indices: CellIndices } => x !== null);
    
    if (targetsWithIndices.length === 0) return;
    
    // Sort by dayIdx FIRST, then userIdx - true top-left anchor
    targetsWithIndices.sort((a, b) => {
      if (a.indices.dayIdx !== b.indices.dayIdx) return a.indices.dayIdx - b.indices.dayIdx;
      return a.indices.userIdx - b.indices.userIdx;
    });
    
    const anchorTarget = targetsWithIndices[0];

    if (DEBUG) {
      console.log('[Paste] anchor target:', {
        dayIdx: anchorTarget.indices.dayIdx,
        userIdx: anchorTarget.indices.userIdx,
        date: anchorTarget.cell.date
      });
    }

    let pastedCount = 0;

    clipboard.cells.forEach(copiedCell => {
      const dayOffset = copiedCell.dayOffset;
      const userOffset = copiedCell.userOffset ?? 0;
      
      // Calculate target position using indices: anchor + offsets
      const targetDayIdx = anchorTarget.indices.dayIdx + dayOffset;
      const targetUserIdx = anchorTarget.indices.userIdx + userOffset;
      
      // Validate indices are in range
      if (targetUserIdx < 0 || targetUserIdx >= teamMemberIds.length) return;
      if (targetDayIdx < 0 || targetDayIdx >= dateStrByDayIndex.length) return;
      
      const targetUserId = teamMemberIds[targetUserIdx];
      const targetDateStr = dateStrByDayIndex[targetDayIdx];
      
      if (!targetUserId || !targetDateStr) return;
      
      if (DEBUG) {
        console.log('[Paste] applying cell:', {
          dayOffset,
          userOffset,
          targetDayIdx,
          targetUserIdx,
          targetDate: targetDateStr
        });
      }
      
      const userName = getTeamMemberName(targetUserId);
      onCellChange(targetUserId, userName, targetDateStr, copiedCell.schedule);
      pastedCount++;
    });

    toast.success(`✓ Pegado en ${pastedCount} celda${pastedCount > 1 ? 's' : ''}`);
    setSelectedCells(new Set());
  }, [clipboard, selectedCells, onCellChange, getTeamMemberName, teamMemberIds, dateStrByDayIndex, cellToIndices]);

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

  // Apply schedule with all options (time, position, break, split shift)
  const handleApplyWithOptions = useCallback((
    startTime: string, 
    endTime: string, 
    position: string | null,
    includeBreak: boolean,
    startTime2?: string,
    endTime2?: string
  ) => {
    if (selectedCells.size === 0) return;
    
    const cells = Array.from(selectedCells).map(parseCellKey);
    
    // Calculate break times if needed (auto-calculate for shifts >6h)
    // Only if not a split shift
    let breakStart: string | null = null;
    let breakEnd: string | null = null;
    
    const hasSplitShift = startTime2 && endTime2;
    
    if (!hasSplitShift && includeBreak && startTime && endTime) {
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
      breakStart: hasSplitShift ? null : breakStart,
      breakEnd: hasSplitShift ? null : breakEnd,
      startTime2: hasSplitShift ? startTime2 : null,
      endTime2: hasSplitShift ? endTime2 : null,
    };

    cells.forEach(cell => {
      const userName = getTeamMemberName(cell.userId);
      onCellChange(cell.userId, userName, cell.date, scheduleValue);
    });

    const posLabel = position ? ` (${position})` : '';
    const breakLabel = breakStart ? ' + break' : '';
    const splitLabel = hasSplitShift ? ` / ${startTime2}-${endTime2}` : '';
    toast.success(`✓ ${startTime}-${endTime}${splitLabel}${posLabel}${breakLabel} aplicado a ${cells.length} celda${cells.length > 1 ? 's' : ''}`);
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

  return {
    // State
    selectedCells,
    selectionCount: selectedCells.size,
    clipboard,
    hasSelection: selectedCells.size > 0,
    hasClipboard: clipboard !== null,
    isDragging,
    
    // Cell event handlers
    handleDragStart,        // onPointerDown
    handleCellEnter,        // onPointerEnter (fallback)
    handleCellPointerUp,    // onPointerUp
    
    // Legacy handlers (kept for compatibility)
    handleCellClick,
    handleGridPointerMove,
    handleCellPointerMove,
    handleLostPointerCapture,
    
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
