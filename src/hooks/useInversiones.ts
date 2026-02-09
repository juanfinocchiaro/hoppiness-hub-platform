import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface InversionFormData {
  branch_id: string;
  descripcion: string;
  tipo_inversion: string;
  monto_total: number;
  fecha: string;
  periodo: string;
  vida_util_meses?: number | null;
  estado: string;
  cuotas_total?: number | null;
  cuotas_pagadas?: number;
  observaciones?: string;
}

export const TIPO_INVERSION_OPTIONS = [
  { value: 'equipamiento', label: 'Equipamiento' },
  { value: 'mobiliario', label: 'Mobiliario' },
  { value: 'obra_civil', label: 'Obra Civil' },
  { value: 'tecnologia', label: 'Tecnología' },
  { value: 'vehiculo', label: 'Vehículo' },
  { value: 'franquicia', label: 'Franquicia' },
  { value: 'garantia', label: 'Garantía' },
  { value: 'otro', label: 'Otro' },
] as const;

export const ESTADO_INVERSION_OPTIONS = [
  { value: 'pagado', label: 'Pagado' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'financiado', label: 'Financiado' },
] as const;

export function useInversiones(branchId: string, periodo?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inversiones', branchId, periodo],
    queryFn: async () => {
      let q = supabase
        .from('inversiones')
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

export function useInversionMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const create = useMutation({
    mutationFn: async (data: InversionFormData) => {
      const { data: result, error } = await supabase
        .from('inversiones')
        .insert({ ...data, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inversiones'] });
      toast.success('Inversión registrada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InversionFormData> }) => {
      const { error } = await supabase.from('inversiones').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inversiones'] });
      toast.success('Inversión actualizada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('inversiones')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inversiones'] });
      toast.success('Inversión eliminada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create, update, softDelete };
}
