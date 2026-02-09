import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ConsumoManualFormData {
  branch_id: string;
  periodo: string;
  categoria_pl: string;
  monto_consumido: number;
  tipo?: string;
  observaciones?: string;
}

export const CATEGORIA_PL_OPTIONS = [
  { value: 'materia_prima', label: 'Materia Prima' },
  { value: 'descartables', label: 'Descartables' },
  { value: 'limpieza', label: 'Limpieza' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'varios', label: 'Varios' },
] as const;

export const TIPO_CONSUMO_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'ajuste', label: 'Ajuste' },
  { value: 'merma', label: 'Merma' },
] as const;

export function useConsumosManuales(branchId: string, periodo?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['consumos_manuales', branchId, periodo],
    queryFn: async () => {
      let q = supabase
        .from('consumos_manuales')
        .select('*')
        .eq('branch_id', branchId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (periodo) q = q.eq('periodo', periodo);

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!branchId,
  });
}

export function useConsumoManualMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const create = useMutation({
    mutationFn: async (data: ConsumoManualFormData) => {
      const { data: result, error } = await supabase
        .from('consumos_manuales')
        .insert({ ...data, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consumos_manuales'] });
      toast.success('Consumo registrado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ConsumoManualFormData> }) => {
      const { error } = await supabase.from('consumos_manuales').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consumos_manuales'] });
      toast.success('Consumo actualizado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('consumos_manuales')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consumos_manuales'] });
      toast.success('Consumo eliminado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create, update, softDelete };
}
