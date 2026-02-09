import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function usePeriodos(branchId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['periodos', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('periodos')
        .select('*')
        .eq('branch_id', branchId)
        .order('periodo', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!branchId,
  });
}

export function usePeriodoMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const create = useMutation({
    mutationFn: async ({ branchId, periodo }: { branchId: string; periodo: string }) => {
      const { data, error } = await supabase
        .from('periodos')
        .insert({ branch_id: branchId, periodo, estado: 'abierto' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['periodos'] });
      toast.success('Período creado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const cerrar = useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo?: string }) => {
      const { error } = await supabase
        .from('periodos')
        .update({
          estado: 'cerrado',
          fecha_cierre: new Date().toISOString(),
          cerrado_por: user?.id,
          motivo_cierre: motivo || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['periodos'] });
      toast.success('Período cerrado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const reabrir = useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { error } = await supabase
        .from('periodos')
        .update({
          estado: 'abierto',
          fecha_reapertura: new Date().toISOString(),
          reabierto_por: user?.id,
          motivo_reapertura: motivo,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['periodos'] });
      toast.success('Período reabierto');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create, cerrar, reabrir };
}
