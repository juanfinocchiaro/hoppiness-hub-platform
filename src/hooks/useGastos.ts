import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { GastoFormData } from '@/types/compra';

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
    mutationFn: async (data: GastoFormData) => {
      const { data: result, error } = await supabase
        .from('gastos')
        .insert({
          ...data,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gastos'] });
      toast.success('Gasto registrado');
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

  return { create, update, softDelete };
}
