import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const salaryAdvanceKeys = {
  all: ['salary-advances'] as const,
  list: (branchId: string) => [...salaryAdvanceKeys.all, 'list', branchId] as const,
  employee: (employeeId: string) => [...salaryAdvanceKeys.all, 'employee', employeeId] as const,
  shift: (shiftId: string) => [...salaryAdvanceKeys.all, 'shift', shiftId] as const,
  pendingTransfers: (branchId: string) => [...salaryAdvanceKeys.all, 'pending-transfers', branchId] as const,
};

export interface SalaryAdvance {
  id: string;
  branch_id: string;
  employee_id: string;
  amount: number;
  reason: string | null;
  payment_method: 'cash' | 'transfer';
  status: 'pending' | 'paid' | 'pending_transfer' | 'transferred' | 'deducted' | 'cancelled';
  authorized_by: string | null;
  authorized_at: string | null;
  paid_by: string | null;
  paid_at: string | null;
  shift_id: string | null;
  transferred_by: string | null;
  transferred_at: string | null;
  transfer_reference: string | null;
  created_by: string | null;
  created_at: string;
  notes: string | null;
  employee?: { full_name: string };
  authorizer?: { full_name: string };
}

export function useSalaryAdvances(branchId: string | undefined) {
  return useQuery({
    queryKey: salaryAdvanceKeys.list(branchId || ''),
    queryFn: async () => {
      if (!branchId) return [];
      
      const { data, error } = await supabase
        .from('salary_advances')
        .select(`
          *,
          employee:employees(full_name)
        `)
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as unknown as SalaryAdvance[];
    },
    enabled: !!branchId,
  });
}

export function useShiftAdvances(shiftId: string | undefined) {
  return useQuery({
    queryKey: salaryAdvanceKeys.shift(shiftId || ''),
    queryFn: async () => {
      if (!shiftId) return [];
      
      const { data, error } = await supabase.rpc('get_shift_advances', {
        _shift_id: shiftId
      });
      
      if (error) throw error;
      return data;
    },
    enabled: !!shiftId,
  });
}

export function usePendingTransferAdvances(branchId: string | undefined) {
  return useQuery({
    queryKey: salaryAdvanceKeys.pendingTransfers(branchId || ''),
    queryFn: async () => {
      if (!branchId) return [];
      
      const { data, error } = await supabase
        .from('salary_advances')
        .select(`
          *,
          employee:employees(full_name)
        `)
        .eq('branch_id', branchId)
        .eq('status', 'pending_transfer')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!branchId,
  });
}

interface CreateAdvanceParams {
  branchId: string;
  employeeId: string;
  amount: number;
  reason?: string;
  paymentMethod: 'cash' | 'transfer';
  authorizedBy: string;
  shiftId?: string;
}

export function useCreateAdvance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: CreateAdvanceParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');
      
      const isCash = params.paymentMethod === 'cash';
      const status = isCash ? 'paid' : 'pending_transfer';
      
      // Crear el adelanto
      const { data: advance, error: advanceError } = await supabase
        .from('salary_advances')
        .insert({
          branch_id: params.branchId,
          employee_id: params.employeeId,
          amount: params.amount,
          reason: params.reason || null,
          payment_method: params.paymentMethod,
          status,
          authorized_by: params.authorizedBy,
          authorized_at: new Date().toISOString(),
          paid_by: isCash ? user.id : null,
          paid_at: isCash ? new Date().toISOString() : null,
          shift_id: isCash ? params.shiftId : null,
          created_by: user.id,
        })
        .select()
        .single();
      
      if (advanceError) throw advanceError;
      
      // Si es efectivo, crear movimiento de caja
      if (isCash && params.shiftId) {
        const { data: employee } = await supabase
          .from('employees')
          .select('full_name')
          .eq('id', params.employeeId)
          .single();
        
        const { error: movementError } = await supabase
          .from('cash_register_movements')
          .insert({
            branch_id: params.branchId,
            shift_id: params.shiftId,
            type: 'egreso',
            amount: params.amount,
            concept: `Adelanto de sueldo - ${employee?.full_name || 'Empleado'}`,
            payment_method: 'efectivo',
            recorded_by: user.id,
            operated_by: user.id,
            authorized_by: params.authorizedBy,
            salary_advance_id: advance.id,
            requires_authorization: true,
          });
        
        if (movementError) throw movementError;
      }
      
      return advance;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: salaryAdvanceKeys.list(variables.branchId) });
      if (variables.shiftId) {
        queryClient.invalidateQueries({ queryKey: salaryAdvanceKeys.shift(variables.shiftId) });
        queryClient.invalidateQueries({ queryKey: ['cash-registers', 'movements', variables.shiftId] });
      }
      toast.success('Adelanto registrado correctamente');
    },
    onError: (error) => {
      console.error('Error al crear adelanto:', error);
      toast.error('Error al registrar el adelanto');
    },
  });
}

export function useMarkAdvanceTransferred() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ advanceId, reference }: { advanceId: string; reference?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');
      
      const { data, error } = await supabase
        .from('salary_advances')
        .update({
          status: 'transferred',
          transferred_by: user.id,
          transferred_at: new Date().toISOString(),
          transfer_reference: reference || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', advanceId)
        .select('branch_id')
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: salaryAdvanceKeys.all });
      toast.success('Transferencia marcada como ejecutada');
    },
    onError: (error) => {
      console.error('Error:', error);
      toast.error('Error al marcar transferencia');
    },
  });
}

export function useCancelAdvance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (advanceId: string) => {
      const { data, error } = await supabase
        .from('salary_advances')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', advanceId)
        .select('branch_id, shift_id, salary_advance_id:id')
        .single();
      
      if (error) throw error;
      
      // Si había movimiento de caja, anularlo
      if (data.shift_id) {
        await supabase
          .from('cash_register_movements')
          .delete()
          .eq('salary_advance_id', advanceId);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salaryAdvanceKeys.all });
      toast.success('Adelanto cancelado');
    },
    onError: (error) => {
      console.error('Error:', error);
      toast.error('Error al cancelar adelanto');
    },
  });
}
