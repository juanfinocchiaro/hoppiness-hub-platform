/**
 * useSalaryAdvances - Hook para gestión de adelantos de sueldo
 * V2: Simplificado sin employee_id legacy, sin cash_register_movements
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const salaryAdvanceKeys = {
  all: ['salary-advances'] as const,
  list: (branchId: string) => [...salaryAdvanceKeys.all, 'list', branchId] as const,
  user: (userId: string) => [...salaryAdvanceKeys.all, 'user', userId] as const,
  shift: (shiftId: string) => [...salaryAdvanceKeys.all, 'shift', shiftId] as const,
  pendingTransfers: (branchId: string) => [...salaryAdvanceKeys.all, 'pending-transfers', branchId] as const,
};

export interface SalaryAdvance {
  id: string;
  branch_id: string;
  user_id: string | null;
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
  user_name?: string;
  authorizer_name?: string;
}

export function useSalaryAdvances(branchId: string | undefined, selectedMonth?: Date) {
  return useQuery({
    queryKey: salaryAdvanceKeys.list(branchId || ''),
    queryFn: async () => {
      if (!branchId) return [];
      
      let query = supabase
        .from('salary_advances')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false })
        .limit(100);
      
      // Filter by month if provided
      if (selectedMonth) {
        const startOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
        const endOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59);
        query = query
          .gte('created_at', startOfMonth.toISOString())
          .lte('created_at', endOfMonth.toISOString());
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Get profile names for user_ids
      const userIds = [...new Set([
        ...(data?.map(a => a.user_id).filter(Boolean) || []),
        ...(data?.map(a => a.authorized_by).filter(Boolean) || [])
      ])];
      
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        // profiles.id = user_id after migration
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        
        profiles?.forEach(p => {
          if (p.id) profileMap[p.id] = p.full_name || 'Sin nombre';
        });
      }
      
      return (data || []).map(a => ({
        ...a,
        user_name: a.user_id ? profileMap[a.user_id] : 'N/A',
        authorizer_name: a.authorized_by ? profileMap[a.authorized_by] : null
      })) as SalaryAdvance[];
    },
    enabled: !!branchId,
  });
}

export function useMyAdvances(userId: string | undefined) {
  return useQuery({
    queryKey: salaryAdvanceKeys.user(userId || ''),
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('salary_advances')
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      // Get authorizer names
      const authorizerIds = [...new Set(data?.map(a => a.authorized_by).filter(Boolean) || [])];
      let profileMap: Record<string, string> = {};
      
      if (authorizerIds.length > 0) {
        // profiles.id = user_id after migration
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', authorizerIds);
        
        profiles?.forEach(p => {
          if (p.id) profileMap[p.id] = p.full_name || '';
        });
      }
      
      return (data || []).map(a => ({
        ...a,
        authorizer_name: a.authorized_by ? profileMap[a.authorized_by] : null
      })) as SalaryAdvance[];
    },
    enabled: !!userId,
  });
}

export function useShiftAdvances(shiftId: string | undefined) {
  return useQuery({
    queryKey: salaryAdvanceKeys.shift(shiftId || ''),
    queryFn: async () => {
      if (!shiftId) return [];
      
      // Direct query instead of RPC (RPC references legacy employee table)
      const { data, error } = await supabase
        .from('salary_advances')
        .select('id, amount, paid_at, user_id, authorized_by')
        .eq('shift_id', shiftId)
        .eq('status', 'paid')
        .order('paid_at');
      
      if (error) throw error;
      
      // Get names
      const userIds = [...new Set([
        ...(data?.map(a => a.user_id).filter(Boolean) || []),
        ...(data?.map(a => a.authorized_by).filter(Boolean) || [])
      ])];
      
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        // profiles.id = user_id after migration
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        
        profiles?.forEach(p => {
          if (p.id) profileMap[p.id] = p.full_name || 'Sin nombre';
        });
      }
      
      return (data || []).map(a => ({
        id: a.id,
        employee_name: a.user_id ? profileMap[a.user_id] : 'N/A',
        amount: a.amount,
        authorized_by_name: a.authorized_by ? profileMap[a.authorized_by] : null,
        paid_at: a.paid_at,
      }));
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
        .select('*')
        .eq('branch_id', branchId)
        .eq('status', 'pending_transfer')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Get user names
      const userIds = data?.map(a => a.user_id).filter(Boolean) || [];
      let profileMap: Record<string, string> = {};
      
      if (userIds.length > 0) {
        // profiles.id = user_id after migration
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        
        profiles?.forEach(p => {
          if (p.id) profileMap[p.id] = p.full_name || 'Sin nombre';
        });
      }
      
      return (data || []).map(a => ({
        ...a,
        user_name: a.user_id ? profileMap[a.user_id] : 'N/A'
      })) as SalaryAdvance[];
    },
    enabled: !!branchId,
  });
}

interface CreateAdvanceParams {
  branchId: string;
  userId: string;
  amount: number;
  reason?: string;
  paymentMethod: 'cash' | 'transfer';
  shiftId?: string;
}

export function useCreateAdvance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: CreateAdvanceParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');
      
      const isCash = params.paymentMethod === 'cash';
      // Both cash and transfer are recorded as already completed
      const status = isCash ? 'paid' : 'transferred';
      
      // Create advance - using user_id (V2) + employee_id for DB constraint
      const { data: advance, error: advanceError } = await supabase
        .from('salary_advances')
        .insert({
          branch_id: params.branchId,
          employee_id: params.userId, // Required by DB, using user_id value
          user_id: params.userId,
          amount: params.amount,
          reason: params.reason || null,
          payment_method: params.paymentMethod,
          status,
          authorized_by: user.id,
          authorized_at: new Date().toISOString(),
          paid_by: user.id,
          paid_at: new Date().toISOString(),
          transferred_by: !isCash ? user.id : null,
          transferred_at: !isCash ? new Date().toISOString() : null,
          shift_id: isCash ? params.shiftId : null,
          created_by: user.id,
        })
        .select()
        .single();
      
      if (advanceError) throw advanceError;
      
      return advance;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: salaryAdvanceKeys.list(variables.branchId) });
      if (variables.shiftId) {
        queryClient.invalidateQueries({ queryKey: salaryAdvanceKeys.shift(variables.shiftId) });
      }
      toast.success('Adelanto registrado correctamente');
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Error al crear adelanto:', error);
      toast.error('Error al registrar el adelanto');
    },
  });
}

interface ApproveAdvanceParams {
  advanceId: string;
  paymentMethod: 'cash' | 'transfer';
  shiftId?: string;
}

export function useApproveAdvance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: ApproveAdvanceParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');
      
      const isCash = params.paymentMethod === 'cash';
      const status = isCash ? 'paid' : 'transferred';
      
      const { data, error } = await supabase
        .from('salary_advances')
        .update({
          status,
          payment_method: params.paymentMethod,
          authorized_by: user.id,
          authorized_at: new Date().toISOString(),
          paid_by: user.id,
          paid_at: new Date().toISOString(),
          transferred_by: !isCash ? user.id : null,
          transferred_at: !isCash ? new Date().toISOString() : null,
          shift_id: isCash ? params.shiftId : null,
        })
        .eq('id', params.advanceId)
        .eq('status', 'pending')
        .select('branch_id')
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salaryAdvanceKeys.all });
      toast.success('Adelanto aprobado');
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Error al aprobar adelanto:', error);
      toast.error('Error al aprobar el adelanto');
    },
  });
}

export function useRejectAdvance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (advanceId: string) => {
      const { data, error } = await supabase
        .from('salary_advances')
        .update({ status: 'cancelled' })
        .eq('id', advanceId)
        .eq('status', 'pending')
        .select('branch_id')
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salaryAdvanceKeys.all });
      toast.success('Solicitud rechazada');
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Error al rechazar:', error);
      toast.error('Error al rechazar la solicitud');
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
        })
        .eq('id', advanceId)
        .select('branch_id')
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salaryAdvanceKeys.all });
      toast.success('Transferencia marcada como ejecutada');
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Error:', error);
      toast.error('Error al marcar transferencia');
    },
  });
}

interface RequestAdvanceParams {
  branchId: string;
  amount: number;
  reason?: string;
}

export function useRequestAdvance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: RequestAdvanceParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');
      
      const { data, error } = await supabase
        .from('salary_advances')
        .insert({
          branch_id: params.branchId,
          employee_id: user.id,
          user_id: user.id,
          amount: params.amount,
          reason: params.reason || null,
          payment_method: 'cash',
          status: 'pending',
          created_by: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salaryAdvanceKeys.all });
      toast.success('Solicitud de adelanto enviada');
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Error al solicitar adelanto:', error);
      toast.error('Error al enviar la solicitud');
    },
  });
}

export function useCancelAdvance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (advanceId: string) => {
      const { data, error } = await supabase
        .from('salary_advances')
        .update({ status: 'cancelled' })
        .eq('id', advanceId)
        .select('branch_id')
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salaryAdvanceKeys.all });
      toast.success('Adelanto cancelado');
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Error:', error);
      toast.error('Error al cancelar adelanto');
    },
  });
}
