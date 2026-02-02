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

export function useSalaryAdvances(branchId: string | undefined) {
  return useQuery({
    queryKey: salaryAdvanceKeys.list(branchId || ''),
    queryFn: async () => {
      if (!branchId) return [];
      
      const { data, error } = await supabase
        .from('salary_advances')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false });
      
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
      const status = isCash ? 'paid' : 'pending_transfer';
      
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
          paid_by: isCash ? user.id : null,
          paid_at: isCash ? new Date().toISOString() : null,
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
      console.error('Error:', error);
      toast.error('Error al cancelar adelanto');
    },
  });
}
