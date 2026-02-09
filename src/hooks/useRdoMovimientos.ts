import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface RdoMovimientoFormData {
  branch_id: string;
  periodo: string;
  rdo_category_code: string;
  origen: string;
  monto: number;
  descripcion?: string;
  datos_extra?: Record<string, unknown>;
}

export function useRdoMovimientos(branchId: string, periodo: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['rdo-movimientos', branchId, periodo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rdo_movimientos')
        .select('*')
        .eq('branch_id', branchId)
        .eq('periodo', periodo)
        .is('deleted_at', null)
        .order('rdo_category_code');
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!branchId && !!periodo,
  });
}

export function useRdoMovimientosByCategory(branchId: string, periodo: string, categoryCode: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['rdo-movimientos', branchId, periodo, categoryCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rdo_movimientos')
        .select('*')
        .eq('branch_id', branchId)
        .eq('periodo', periodo)
        .eq('rdo_category_code', categoryCode)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!branchId && !!periodo && !!categoryCode,
  });
}

export function useRdoMovimientoMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const upsertManual = useMutation({
    mutationFn: async (data: RdoMovimientoFormData) => {
      // For manual entries, delete existing manual entry for same category/period
      await supabase
        .from('rdo_movimientos')
        .update({ deleted_at: new Date().toISOString() })
        .eq('branch_id', data.branch_id)
        .eq('periodo', data.periodo)
        .eq('rdo_category_code', data.rdo_category_code)
        .eq('origen', data.origen)
        .is('source_id', null)
        .is('deleted_at', null);

      if (data.monto === 0) return null; // Just delete if 0

      const { data: result, error } = await supabase
        .from('rdo_movimientos')
        .insert([{
          branch_id: data.branch_id,
          periodo: data.periodo,
          rdo_category_code: data.rdo_category_code,
          origen: data.origen,
          monto: data.monto,
          descripcion: data.descripcion,
          datos_extra: data.datos_extra as any,
          created_by: user?.id,
        }])
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rdo-movimientos'] });
      qc.invalidateQueries({ queryKey: ['rdo-report'] });
      toast.success('Movimiento guardado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { upsertManual };
}
