import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { GastoFormData } from '@/types/compra';

/** Gastos above this threshold require franquiciado/superadmin approval */
export const GASTO_APPROVAL_THRESHOLD = 50_000;

export function useGastos(branchId: string, periodo?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['gastos', branchId, periodo],
    queryFn: async () => {
      let q = supabase
        .from('gastos')
        .select('*')
        .eq('branch_id', branchId)
        .is('deleted_at', null)
        .order('fecha', { ascending: false });

      if (periodo) q = q.eq('periodo', periodo);

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!branchId,
  });
}

export function useGastoMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const create = useMutation({
    mutationFn: async (data: GastoFormData & { skipApproval?: boolean }) => {
      const { skipApproval, ...gastoData } = data;
      const needsApproval = !skipApproval && gastoData.monto >= GASTO_APPROVAL_THRESHOLD;
      
      const { data: result, error } = await supabase
        .from('gastos')
        .insert({
          ...gastoData,
          estado: needsApproval ? 'pendiente_aprobacion' : (gastoData.estado || 'pendiente'),
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return { ...result, needsApproval };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['gastos'] });
      if (result.needsApproval) {
        toast.info('Gasto enviado para aprobación del franquiciado');
      } else {
        toast.success('Gasto registrado');
      }
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<GastoFormData> }) => {
      const { error } = await supabase.from('gastos').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gastos'] });
      toast.success('Gasto actualizado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gastos')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gastos'] });
      toast.success('Gasto eliminado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gastos')
        .update({ estado: 'pendiente', observaciones: `Aprobado por ${user?.email} el ${new Date().toLocaleDateString('es-AR')}` })
        .eq('id', id)
        .eq('estado', 'pendiente_aprobacion');
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gastos'] });
      toast.success('Gasto aprobado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const reject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gastos')
        .update({ deleted_at: new Date().toISOString(), observaciones: `Rechazado por ${user?.email}` })
        .eq('id', id)
        .eq('estado', 'pendiente_aprobacion');
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gastos'] });
      toast.success('Gasto rechazado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create, update, softDelete, approve, reject };
}
