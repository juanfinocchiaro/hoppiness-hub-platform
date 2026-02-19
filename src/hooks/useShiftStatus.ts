/**
 * useShiftStatus - Estado del turno de caja para POS (Fase 2)
 * Indica si hay caja abierta y opcionalmente turno operativo (branch_shifts)
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CashRegisterShift } from './useCashRegister';

export interface ShiftStatus {
  activeCashShift: CashRegisterShift | null;
  hasCashOpen: boolean;
  loading: boolean;
  hasChecked: boolean;
  refetch: () => Promise<void>;
}

export function useShiftStatus(branchId: string | undefined): ShiftStatus {
  const [activeCashShift, setActiveCashShift] = useState<CashRegisterShift | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);

  const fetchData = useCallback(async () => {
    if (!branchId) {
      setLoading(false);
      setHasChecked(true);
      setActiveCashShift(null);
      return;
    }
    try {
      const { data } = await supabase
        .from('cash_register_shifts')
        .select('*')
        .eq('branch_id', branchId)
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setActiveCashShift(data as CashRegisterShift | null);
    } catch (e) {
      console.error('useShiftStatus:', e);
      setActiveCashShift(null);
    } finally {
      setLoading(false);
      setHasChecked(true);
    }
  }, [branchId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return {
    activeCashShift,
    hasCashOpen: activeCashShift !== null,
    loading,
    hasChecked,
    refetch: fetchData,
  };
}
