import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ConceptoServicioFormData {
  nombre: string;
  descripcion?: string;
  categoria_gasto?: string;
  subcategoria?: string;
  tipo: string;
  es_calculado?: boolean;
  formula_calculo?: Record<string, unknown>;
  proveedor_id?: string;
  periodicidad?: string;
  rdo_category_code?: string;
  visible_local?: boolean;
}

export function useConceptosServicio() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['conceptos-servicio'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conceptos_servicio')
        .select('*')
        .is('deleted_at', null)
        .order('tipo')
        .order('nombre');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useConceptoServicioMutations() {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: async (data: ConceptoServicioFormData) => {
      const { data: result, error } = await supabase
        .from('conceptos_servicio')
        .insert(data as any)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conceptos-servicio'] });
      toast.success('Concepto creado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ConceptoServicioFormData> }) => {
      const { error } = await supabase
        .from('conceptos_servicio')
        .update(data as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conceptos-servicio'] });
      toast.success('Concepto actualizado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('conceptos_servicio')
        .update({ deleted_at: new Date().toISOString(), activo: false } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conceptos-servicio'] });
      toast.success('Concepto eliminado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create, update, softDelete };
}
