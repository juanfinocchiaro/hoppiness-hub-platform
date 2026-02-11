import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function usePreparaciones() {
  return useQuery({
    queryKey: ['preparaciones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('preparaciones')
        .select('*')
        .eq('activo', true)
        .is('deleted_at', null)
        .order('nombre');
      if (error) throw error;
      return data;
    },
  });
}

export function usePreparacionIngredientes(preparacionId: string | undefined) {
  return useQuery({
    queryKey: ['preparacion-ingredientes', preparacionId],
    queryFn: async () => {
      if (!preparacionId) return [];
      const { data, error } = await supabase
        .from('preparacion_ingredientes')
        .select(`*, insumos(id, nombre, unidad_base, costo_por_unidad_base), preparaciones!preparacion_ingredientes_sub_preparacion_id_fkey(id, nombre, costo_calculado)`)
        .eq('preparacion_id', preparacionId)
        .order('orden');
      if (error) throw error;
      return data;
    },
    enabled: !!preparacionId,
  });
}

export function usePreparacionOpciones(preparacionId: string | undefined) {
  return useQuery({
    queryKey: ['preparacion-opciones', preparacionId],
    queryFn: async () => {
      if (!preparacionId) return [];
      const { data, error } = await supabase
        .from('preparacion_opciones')
        .select(`*, insumos(id, nombre, costo_por_unidad_base)`)
        .eq('preparacion_id', preparacionId)
        .order('orden');
      if (error) throw error;
      return data;
    },
    enabled: !!preparacionId,
  });
}

export function usePreparacionMutations() {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: async (data: {
      nombre: string;
      descripcion?: string;
      tipo: string;
      es_intercambiable?: boolean;
      metodo_costeo?: string;
    }) => {
      const { data: prep, error } = await supabase
        .from('preparaciones')
        .insert(data as any)
        .select()
        .single();
      if (error) throw error;
      return prep;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['preparaciones'] });
      toast.success('Preparación creada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from('preparaciones')
        .update({ ...data, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['preparaciones'] });
      toast.success('Preparación actualizada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('preparaciones')
        .update({ activo: false, deleted_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['preparaciones'] });
      toast.success('Preparación eliminada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const saveIngredientes = useMutation({
    mutationFn: async ({ preparacion_id, items }: { preparacion_id: string; items: any[] }) => {
      // Delete existing
      await supabase.from('preparacion_ingredientes').delete().eq('preparacion_id', preparacion_id);

      if (items.length > 0) {
        const { error } = await supabase
          .from('preparacion_ingredientes')
          .insert(items.map((item, index) => ({
            preparacion_id,
            insumo_id: item.insumo_id || null,
            sub_preparacion_id: item.sub_preparacion_id || null,
            cantidad: item.cantidad,
            unidad: item.unidad,
            orden: index,
          })) as any);
        if (error) throw error;
      }

      // Recalculate cost
      await supabase.rpc('recalcular_costo_preparacion', { _prep_id: preparacion_id });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['preparacion-ingredientes', vars.preparacion_id] });
      qc.invalidateQueries({ queryKey: ['preparaciones'] });
      toast.success('Ficha técnica guardada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const saveOpciones = useMutation({
    mutationFn: async ({ preparacion_id, insumo_ids }: { preparacion_id: string; insumo_ids: string[] }) => {
      await supabase.from('preparacion_opciones').delete().eq('preparacion_id', preparacion_id);

      if (insumo_ids.length > 0) {
        const { error } = await supabase
          .from('preparacion_opciones')
          .insert(insumo_ids.map((insumo_id, index) => ({
            preparacion_id,
            insumo_id,
            orden: index,
          })) as any);
        if (error) throw error;
      }

      await supabase.rpc('recalcular_costo_preparacion', { _prep_id: preparacion_id });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['preparacion-opciones', vars.preparacion_id] });
      qc.invalidateQueries({ queryKey: ['preparaciones'] });
      toast.success('Opciones guardadas');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create, update, softDelete, saveIngredientes, saveOpciones };
}
