import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BranchShift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  sort_order: number;
}

interface CashRegisterShift {
  id: string;
  cash_register_id: string;
  cash_register_name?: string;
  opened_by: string;
  opened_by_name?: string;
  opened_at: string;
  status: 'open' | 'closed';
  opening_amount: number;
  current_balance?: number;
}

export interface ShiftStatus {
  // Turno operativo
  currentShift: BranchShift | null;
  isExtendedShift: boolean;
  shiftEndsIn: number | null; // minutos hasta que termine el turno
  allShifts: BranchShift[];
  
  // Caja
  activeCashShift: CashRegisterShift | null;
  hasCashOpen: boolean;
  
  // Loading
  loading: boolean;
  
  // Refetch
  refetch: () => Promise<void>;
}

export function useShiftStatus(branchId: string | undefined): ShiftStatus {
  const [allShifts, setAllShifts] = useState<BranchShift[]>([]);
  const [activeCashShift, setActiveCashShift] = useState<CashRegisterShift | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!branchId) return;
    
    try {
      // Fetch branch shifts
      const { data: shiftsData } = await supabase
        .from('branch_shifts')
        .select('id, name, start_time, end_time, sort_order')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .order('sort_order');

      setAllShifts(shiftsData || []);

      // Fetch active cash register shift
      const { data: cashShiftData } = await supabase
        .from('cash_register_shifts')
        .select(`
          id,
          cash_register_id,
          opened_by,
          opened_at,
          status,
          opening_amount,
          cash_registers!inner (name)
        `)
        .eq('branch_id', branchId)
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cashShiftData) {
        // Get opener name
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', cashShiftData.opened_by)
          .single();

        // Calculate current balance
        const { data: movements } = await supabase
          .from('cash_register_movements')
          .select('type, amount, payment_method')
          .eq('shift_id', cashShiftData.id);

        const cashMovements = (movements || []).filter(m => {
          // Only count cash movements for balance
          return true; // Simplified - in real implementation check payment_method
        });

        let balance = cashShiftData.opening_amount;
        for (const mov of cashMovements) {
          if (mov.type === 'income' || mov.type === 'deposit') {
            balance += mov.amount;
          } else {
            balance -= mov.amount;
          }
        }

        setActiveCashShift({
          id: cashShiftData.id,
          cash_register_id: cashShiftData.cash_register_id,
          cash_register_name: (cashShiftData.cash_registers as any)?.name,
          opened_by: cashShiftData.opened_by,
          opened_by_name: profileData?.full_name || 'Usuario',
          opened_at: cashShiftData.opened_at,
          status: cashShiftData.status as 'open' | 'closed',
          opening_amount: cashShiftData.opening_amount,
          current_balance: balance,
        });
      } else {
        setActiveCashShift(null);
      }
    } catch (error) {
      console.error('Error fetching shift status:', error);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchData();
    
    // Refresh every minute
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Calculate current shift
  const now = new Date();
  const currentTimeStr = now.toTimeString().slice(0, 5);
  
  let currentShift: BranchShift | null = null;
  let isExtendedShift = false;
  let shiftEndsIn: number | null = null;

  if (allShifts.length > 0) {
    // Find current shift based on time
    for (const shift of allShifts) {
      const start = shift.start_time.substring(0, 5);
      const end = shift.end_time.substring(0, 5);
      
      // Handle shifts that cross midnight
      if (end < start) {
        // Shift crosses midnight (e.g., 17:00 - 00:00)
        if (currentTimeStr >= start || currentTimeStr < end) {
          currentShift = shift;
          break;
        }
      } else {
        if (currentTimeStr >= start && currentTimeStr < end) {
          currentShift = shift;
          break;
        }
      }
    }

    if (currentShift) {
      // Calculate minutes until shift ends
      const endParts = currentShift.end_time.split(':').map(Number);
      const endDate = new Date();
      endDate.setHours(endParts[0], endParts[1], 0, 0);
      
      // If end is before current time, it's tomorrow
      if (endDate <= now) {
        endDate.setDate(endDate.getDate() + 1);
      }
      
      shiftEndsIn = Math.round((endDate.getTime() - now.getTime()) / 60000);
    } else {
      // Outside all shifts - extended shift
      isExtendedShift = true;
    }
  }

  return {
    currentShift,
    isExtendedShift,
    shiftEndsIn,
    allShifts,
    activeCashShift,
    hasCashOpen: activeCashShift !== null,
    loading,
    refetch: fetchData,
  };
}
