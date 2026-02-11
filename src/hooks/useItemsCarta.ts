import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useItemsCarta() {
  return useQuery({
    queryKey: ['items-carta'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items_carta')
        .select(`
          *,
          menu_categorias:categoria_carta_id(id, nombre),
          rdo_categories:rdo_category_code(code, name)
        `)
        .eq('activo', true)
        .is('deleted_at', null)
        .order('orden');
      if (error) throw error;
      return data;
    },
  });
}

export function useItemCartaComposicion(itemId: string | undefined) {
  return useQuery({
    queryKey: ['item-carta-composicion', itemId],
    queryFn: async () => {
      if (!itemId) return [];
      const { data, error } = await supabase
        .from('item_carta_composicion')
        .select(`
          *,
          preparaciones(id, nombre, costo_calculado, tipo),
          insumos(id, nombre, costo_por_unidad_base, unidad_base)
        `)
        .eq('item_carta_id', itemId)
        .order('orden');
      if (error) throw error;
      return data;
    },
    enabled: !!itemId,
  });
}

export function useItemCartaHistorial(itemId: string | undefined) {
  return useQuery({
    queryKey: ['item-carta-historial', itemId],
    queryFn: async () => {
      if (!itemId) return [];
      const { data, error } = await supabase
        .from('item_carta_precios_historial')
        .select('*')
        .eq('item_carta_id', itemId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!itemId,
  });
}

export function useItemCartaMutations() {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: async (data: {
      nombre: string;
      nombre_corto?: string;
      descripcion?: string;
      categoria_carta_id?: string | null;
      rdo_category_code?: string;
      precio_base: number;
      fc_objetivo?: number;
      disponible_delivery?: boolean;
    }) => {
      const { data: item, error } = await supabase
        .from('items_carta')
        .insert(data as any)
        .select()
        .single();
      if (error) throw error;
      return item;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items-carta'] });
      toast.success('Item de carta creado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from('items_carta')
        .update({ ...data } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items-carta'] });
      toast.success('Item actualizado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('items_carta')
        .update({ activo: false, deleted_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items-carta'] });
      toast.success('Item eliminado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const saveComposicion = useMutation({
    mutationFn: async ({ item_carta_id, items }: {
      item_carta_id: string;
      items: { preparacion_id?: string; insumo_id?: string; cantidad: number; es_opcional?: boolean; costo_promedio_override?: number | null }[];
    }) => {
      await supabase.from('item_carta_composicion').delete().eq('item_carta_id', item_carta_id);

      if (items.length > 0) {
        const { error } = await supabase
          .from('item_carta_composicion')
          .insert(items.map((item, index) => ({
            item_carta_id,
            preparacion_id: item.preparacion_id || null,
            insumo_id: item.insumo_id || null,
            cantidad: item.cantidad,
            orden: index,
            es_opcional: item.es_opcional || false,
            costo_promedio_override: item.costo_promedio_override ?? null,
          })) as any);
        if (error) throw error;
      }

      // Recalculate cost
      await supabase.rpc('recalcular_costo_item_carta', { _item_id: item_carta_id });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['item-carta-composicion', vars.item_carta_id] });
      qc.invalidateQueries({ queryKey: ['items-carta'] });
      toast.success('Composición guardada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const cambiarPrecio = useMutation({
    mutationFn: async ({ itemId, precioAnterior, precioNuevo, motivo, userId }: {
      itemId: string;
      precioAnterior: number;
      precioNuevo: number;
      motivo?: string;
      userId?: string;
    }) => {
      const { error: errUpdate } = await supabase
        .from('items_carta')
        .update({ precio_base: precioNuevo } as any)
        .eq('id', itemId);
      if (errUpdate) throw errUpdate;

      const { error: errHist } = await supabase
        .from('item_carta_precios_historial')
        .insert({
          item_carta_id: itemId,
          precio_anterior: precioAnterior,
          precio_nuevo: precioNuevo,
          motivo: motivo || null,
          usuario_id: userId || null,
        } as any);
      if (errHist) throw errHist;

      // Recalculate FC
      await supabase.rpc('recalcular_costo_item_carta', { _item_id: itemId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items-carta'] });
      qc.invalidateQueries({ queryKey: ['item-carta-historial'] });
      toast.success('Precio actualizado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create, update, softDelete, saveComposicion, cambiarPrecio };
}
