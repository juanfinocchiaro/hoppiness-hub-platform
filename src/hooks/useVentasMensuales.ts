import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface VentaMensualPayload {
  branch_id?: string;
  periodo?: string;
  venta_total?: number;
  efectivo?: number;
  observaciones?: string;
}

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
    mutationFn: async (data: VentaMensualPayload) => {
      const vt = data.venta_total ?? 0;
      const ef = data.efectivo ?? 0;
      const fc = vt - ef; // FC = Venta Total - Efectivo
      const { data: result, error } = await supabase
        .from('ventas_mensuales_local')
        .insert({
          branch_id: data.branch_id!,
          periodo: data.periodo!,
          venta_total: vt,
          efectivo: ef,
          fc_total: fc,
          ft_total: ef, // legacy column
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
      qc.invalidateQueries({ queryKey: ['ventas-mensuales-marca'] });
      qc.invalidateQueries({ queryKey: ['canon-liquidaciones'] });
      toast.success('Ventas del período registradas');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: VentaMensualPayload }) => {
      const vt = data.venta_total ?? 0;
      const ef = data.efectivo ?? 0;
      const fc = vt - ef;
      const { error } = await supabase
        .from('ventas_mensuales_local')
        .update({
          venta_total: vt,
          efectivo: ef,
          fc_total: fc,
          ft_total: ef,
          observaciones: data.observaciones,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ventas-mensuales'] });
      qc.invalidateQueries({ queryKey: ['ventas-mensuales-marca'] });
      qc.invalidateQueries({ queryKey: ['canon-liquidaciones'] });
      toast.success('Ventas actualizadas');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create, update };
}
