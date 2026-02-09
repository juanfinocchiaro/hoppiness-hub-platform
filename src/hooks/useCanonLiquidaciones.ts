import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { CanonLiquidacionFormData, PagoCanonFormData } from '@/types/ventas';

export function useCanonLiquidaciones(branchId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['canon-liquidaciones', branchId],
    queryFn: async () => {
      let q = supabase
        .from('canon_liquidaciones')
        .select('*, branches!canon_liquidaciones_branch_id_fkey(name)')
        .is('deleted_at', null)
        .order('periodo', { ascending: false });

      if (branchId) q = q.eq('branch_id', branchId);

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCanonMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const create = useMutation({
    mutationFn: async (data: CanonLiquidacionFormData) => {
      const { data: result, error } = await supabase
        .from('canon_liquidaciones')
        .insert({
          branch_id: data.branch_id,
          periodo: data.periodo,
          ventas_id: data.ventas_id,
          fc_total: data.fc_total,
          ft_total: data.ft_total,
          canon_porcentaje: data.canon_porcentaje ?? 4.5,
          canon_monto: data.canon_monto,
          marketing_porcentaje: data.marketing_porcentaje ?? 0.5,
          marketing_monto: data.marketing_monto,
          total_canon: data.total_canon,
          fecha_vencimiento: data.fecha_vencimiento,
          observaciones: data.observaciones,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canon-liquidaciones'] });
      toast.success('Liquidación de canon creada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create };
}

export function usePagosCanon(canonId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pagos-canon', canonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pagos_canon')
        .select('*')
        .eq('canon_liquidacion_id', canonId)
        .is('deleted_at', null)
        .order('fecha_pago', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!canonId,
  });
}

/**
 * Fetch pagos_proveedores for a Hoppiness Club canon invoice
 * identified by branch_id + periodo
 */
export function usePagosCanonFromProveedores(branchId: string, periodo: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pagos-canon-prov', branchId, periodo],
    queryFn: async () => {
      // Find the Hoppiness Club factura for this branch+periodo
      const { data: factura } = await supabase
        .from('facturas_proveedores')
        .select('id')
        .eq('branch_id', branchId)
        .eq('periodo', periodo)
        .eq('proveedor_id', '00000000-0000-0000-0000-000000000001')
        .is('deleted_at', null)
        .maybeSingle();

      if (!factura) return [];

      const { data: pagos, error } = await supabase
        .from('pagos_proveedores')
        .select('id, fecha_pago, monto, medio_pago, referencia, observaciones, verificado, verificado_por, verificado_at, verificado_notas, created_at')
        .eq('factura_id', factura.id)
        .is('deleted_at', null)
        .order('fecha_pago', { ascending: false });
      if (error) throw error;
      return pagos ?? [];
    },
    enabled: !!user && !!branchId && !!periodo,
  });
}

export function usePagoCanonMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const create = useMutation({
    mutationFn: async (data: PagoCanonFormData) => {
      const { data: result, error } = await supabase
        .from('pagos_canon')
        .insert({
          canon_liquidacion_id: data.canon_liquidacion_id,
          branch_id: data.branch_id,
          monto: data.monto,
          fecha_pago: data.fecha_pago,
          medio_pago: data.medio_pago,
          referencia: data.referencia,
          observaciones: data.observaciones,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['pagos-canon', vars.canon_liquidacion_id] });
      qc.invalidateQueries({ queryKey: ['canon-liquidaciones'] });
      toast.success('Pago de canon registrado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create };
}
