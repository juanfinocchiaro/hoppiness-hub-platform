/**
 * Types for schedule multi-selection system
 */
import type { ScheduleValue } from '../ScheduleCellPopover';

export interface CellKey {
  userId: string;
  date: string; // yyyy-MM-dd
}

export type SelectionMode = 'single' | 'range' | 'multi';

export interface ClipboardDataV2 {
  type: 'cells';
  cells: Array<{
    dayOffset: number; // Relative to first copied cell
    schedule: ScheduleValue;
  }>;
  sourceInfo: string; // Human readable e.g. "3 celdas de Juan"
}

export interface ScheduleSelectionState {
  selectedCells: Set<string>; // "userId:date" format
  lastClickedCell: CellKey | null;
  clipboard: ClipboardDataV2 | null;
}

// Helper to create cell key string
export const cellKeyString = (userId: string, date: string) => `${userId}:${date}`;

// Helper to parse cell key string
export const parseCellKey = (key: string): CellKey => {
  const [userId, date] = key.split(':');
  return { userId, date };
};
