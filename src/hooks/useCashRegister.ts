import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Types
export interface CashRegister {
  id: string;
  branch_id: string;
  name: string;
  display_order: number;
  is_active: boolean;
}

export interface CashRegisterShift {
  id: string;
  cash_register_id: string;
  branch_id: string;
  opened_by: string;
  closed_by: string | null;
  opened_at: string;
  closed_at: string | null;
  opening_amount: number;
  closing_amount: number | null;
  expected_amount: number | null;
  difference: number | null;
  notes: string | null;
  status: 'open' | 'closed';
}

export interface CashRegisterMovement {
  id: string;
  shift_id: string;
  branch_id: string;
  type: 'income' | 'expense' | 'withdrawal' | 'deposit';
  payment_method: string;
  amount: number;
  concept: string;
  order_id: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface PaymentMethod {
  id: string;
  branch_id: string;
  name: string;
  code: string;
  is_cash: boolean;
  is_active: boolean;
  display_order: number;
}

// Query keys factory
export const cashRegisterKeys = {
  all: ['cash-registers'] as const,
  registers: (branchId: string) => [...cashRegisterKeys.all, 'registers', branchId] as const,
  shifts: (branchId: string) => [...cashRegisterKeys.all, 'shifts', branchId] as const,
  movements: (shiftId: string) => [...cashRegisterKeys.all, 'movements', shiftId] as const,
  paymentMethods: (branchId: string) => [...cashRegisterKeys.all, 'payment-methods', branchId] as const,
};

// Fetch all registers for a branch
export function useCashRegisters(branchId: string | undefined) {
  return useQuery({
    queryKey: cashRegisterKeys.registers(branchId || ''),
    queryFn: async () => {
      if (!branchId) return { active: [], all: [] };
      
      const { data, error } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('branch_id', branchId)
        .order('display_order');
      
      if (error) throw error;
      
      const all = (data || []) as CashRegister[];
      const active = all.filter(r => r.is_active);
      
      return { active, all };
    },
    enabled: !!branchId,
    staleTime: 30000, // Consider fresh for 30 seconds
  });
}

// Fetch open shifts for registers
export function useCashShifts(branchId: string | undefined, registerIds: string[]) {
  return useQuery({
    queryKey: cashRegisterKeys.shifts(branchId || ''),
    queryFn: async () => {
      if (!branchId || registerIds.length === 0) return {};
      
      const shiftsMap: Record<string, CashRegisterShift | null> = {};
      
      // Fetch all open shifts in parallel
      const promises = registerIds.map(async (registerId) => {
        const { data } = await supabase
          .from('cash_register_shifts')
          .select('*')
          .eq('cash_register_id', registerId)
          .eq('status', 'open')
          .limit(1)
          .maybeSingle();
        
        return { registerId, shift: data as CashRegisterShift | null };
      });
      
      const results = await Promise.all(promises);
      results.forEach(({ registerId, shift }) => {
        shiftsMap[registerId] = shift;
      });
      
      return shiftsMap;
    },
    enabled: !!branchId && registerIds.length > 0,
    staleTime: 10000,
  });
}

// Fetch movements for a specific shift
export function useCashMovements(shiftId: string | undefined) {
  return useQuery({
    queryKey: cashRegisterKeys.movements(shiftId || ''),
    queryFn: async () => {
      if (!shiftId) return [];
      
      const { data, error } = await supabase
        .from('cash_register_movements')
        .select('*')
        .eq('shift_id', shiftId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as CashRegisterMovement[];
    },
    enabled: !!shiftId,
    staleTime: 5000,
  });
}

// Fetch all movements for multiple shifts
export function useAllCashMovements(branchId: string | undefined, shifts: Record<string, CashRegisterShift | null>) {
  const shiftIds = Object.values(shifts).filter(Boolean).map(s => s!.id);
  
  return useQuery({
    queryKey: [...cashRegisterKeys.all, 'all-movements', branchId, shiftIds.join(',')],
    queryFn: async () => {
      if (shiftIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from('cash_register_movements')
        .select('*')
        .in('shift_id', shiftIds)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Group by register (via shift)
      const movementsMap: Record<string, CashRegisterMovement[]> = {};
      
      Object.entries(shifts).forEach(([registerId, shift]) => {
        if (shift) {
          movementsMap[registerId] = (data || [])
            .filter(m => m.shift_id === shift.id) as CashRegisterMovement[];
        } else {
          movementsMap[registerId] = [];
        }
      });
      
      return movementsMap;
    },
    enabled: shiftIds.length > 0,
    staleTime: 5000,
  });
}

// Fetch payment methods
export function usePaymentMethods(branchId: string | undefined) {
  return useQuery({
    queryKey: cashRegisterKeys.paymentMethods(branchId || ''),
    queryFn: async () => {
      if (!branchId) return [];
      
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('branch_id', branchId)
        .order('display_order');
      
      if (error) throw error;
      return (data || []) as PaymentMethod[];
    },
    enabled: !!branchId,
    staleTime: 60000, // Payment methods change rarely
  });
}

// Mutation hooks
export function useOpenShift(branchId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ registerId, userId, openingAmount }: { 
      registerId: string; 
      userId: string; 
      openingAmount: number 
    }) => {
      const { data, error } = await supabase
        .from('cash_register_shifts')
        .insert({
          cash_register_id: registerId,
          branch_id: branchId,
          opened_by: userId,
          opening_amount: openingAmount,
          status: 'open'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cashRegisterKeys.shifts(branchId) });
      toast({ title: 'Caja abierta', description: 'La caja se abrió correctamente' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCloseShift(branchId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ 
      shiftId, 
      userId, 
      closingAmount, 
      expectedAmount, 
      notes 
    }: { 
      shiftId: string;
      userId: string;
      closingAmount: number;
      expectedAmount: number;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('cash_register_shifts')
        .update({
          closed_by: userId,
          closed_at: new Date().toISOString(),
          closing_amount: closingAmount,
          expected_amount: expectedAmount,
          difference: closingAmount - expectedAmount,
          notes: notes || null,
          status: 'closed'
        })
        .eq('id', shiftId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cashRegisterKeys.shifts(branchId) });
      queryClient.invalidateQueries({ queryKey: cashRegisterKeys.all });
      toast({ title: 'Caja cerrada', description: 'El arqueo se completó correctamente' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useAddMovement(branchId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ 
      shiftId,
      type,
      amount,
      concept,
      paymentMethod,
      userId,
      transactionId,
    }: { 
      shiftId: string;
      type: 'income' | 'expense' | 'withdrawal' | 'deposit';
      amount: number;
      concept: string;
      paymentMethod: string;
      userId: string;
      transactionId?: string;
    }) => {
      const { data, error } = await supabase
        .from('cash_register_movements')
        .insert({
          shift_id: shiftId,
          branch_id: branchId,
          type,
          payment_method: paymentMethod,
          amount,
          concept,
          recorded_by: userId,
          transaction_id: transactionId,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as CashRegisterMovement;
    },
    onSuccess: (_, variables) => {
      // Invalidate only the specific shift's movements
      queryClient.invalidateQueries({ 
        queryKey: cashRegisterKeys.movements(variables.shiftId) 
      });
      // Also invalidate the aggregated movements
      queryClient.invalidateQueries({ 
        queryKey: [...cashRegisterKeys.all, 'all-movements'] 
      });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useVoidMovement(branchId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ movementId, transactionId }: { 
      movementId: string;
      transactionId?: string | null;
    }) => {
      // Delete movement
      const { error: movError } = await supabase
        .from('cash_register_movements')
        .delete()
        .eq('id', movementId);
      
      if (movError) throw movError;
      
      // Delete associated transaction if exists
      if (transactionId) {
        await supabase
          .from('transactions')
          .delete()
          .eq('id', transactionId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cashRegisterKeys.all });
      toast({ title: 'Movimiento anulado', description: 'El movimiento fue eliminado' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Calculate expected cash for a register
export function calculateExpectedCash(
  shift: CashRegisterShift | null | undefined,
  movements: CashRegisterMovement[]
): number {
  if (!shift) return 0;
  
  let amount = shift.opening_amount;
  
  movements.forEach(mov => {
    if (mov.payment_method?.toLowerCase() === 'efectivo' || mov.payment_method?.toLowerCase() === 'cash') {
      if (mov.type === 'income' || mov.type === 'deposit') {
        amount += mov.amount;
      } else {
        amount -= mov.amount;
      }
    }
  });
  
  return amount;
}

// Calculate totals for a register
export function calculateTotals(movements: CashRegisterMovement[]) {
  let income = 0;
  let expense = 0;
  
  movements.forEach(mov => {
    if (mov.payment_method?.toLowerCase() === 'efectivo' || mov.payment_method?.toLowerCase() === 'cash') {
      if (mov.type === 'income' || mov.type === 'deposit') {
        income += mov.amount;
      } else {
        expense += mov.amount;
      }
    }
  });
  
  return { income, expense };
}
