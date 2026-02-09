import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { VentaMensualFormData } from '@/types/ventas';

export function useVentasMensuales(branchId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['ventas-mensuales', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ventas_mensuales_local')
        .select('*')
        .eq('branch_id', branchId)
        .is('deleted_at', null)
        .order('periodo', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!branchId,
  });
}

export function useVentaMensualMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const create = useMutation({
    mutationFn: async (data: VentaMensualFormData) => {
      const { data: result, error } = await supabase
        .from('ventas_mensuales_local')
        .insert({
          branch_id: data.branch_id,
          periodo: data.periodo,
          fc_total: data.fc_total,
          ft_total: data.ft_total,
          observaciones: data.observaciones,
          cargado_por: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ventas-mensuales'] });
      toast.success('Ventas del período registradas');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VentaMensualFormData> }) => {
      const { error } = await supabase
        .from('ventas_mensuales_local')
        .update({
          fc_total: data.fc_total,
          ft_total: data.ft_total,
          observaciones: data.observaciones,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ventas-mensuales'] });
      toast.success('Ventas actualizadas');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create, update };
}
