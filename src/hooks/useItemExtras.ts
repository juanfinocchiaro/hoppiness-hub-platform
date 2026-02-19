import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ItemExtra {
  id: string;
  item_carta_id: string;
  preparacion_id: string | null;
  insumo_id: string | null;
  orden: number;
  // Joined fields
  preparaciones?: { id: string; nombre: string; costo_calculado: number; precio_extra: number | null; puede_ser_extra: boolean } | null;
  insumos?: { id: string; nombre: string; costo_por_unidad_base: number; precio_extra: number | null; puede_ser_extra: boolean } | null;
}

export function useItemExtras(itemId: string | undefined) {
  return useQuery({
    queryKey: ['item-carta-extras', itemId],
    queryFn: async () => {
      if (!itemId) return [];

      // Primary source: item_extra_asignaciones (new system)
      const { data: asignaciones, error: errAsig } = await supabase
        .from('item_extra_asignaciones' as any)
        .select('extra_id')
        .eq('item_carta_id', itemId);

      if (errAsig) throw errAsig;

      if (asignaciones && asignaciones.length > 0) {
        const extraIds = (asignaciones as any[]).map((a: any) => a.extra_id);
        const { data: extras, error: errExtras } = await supabase
          .from('items_carta')
          .select('id, nombre, precio_base, activo')
          .in('id', extraIds)
          .eq('activo', true)
          .is('deleted_at', null);
        if (errExtras) throw errExtras;
        // Map to ItemExtra-compatible shape for ModifiersModal
        return (extras || []).map((e: any, i: number) => ({
          id: e.id,
          item_carta_id: itemId,
          preparacion_id: null,
          insumo_id: null,
          orden: i,
          preparaciones: { id: e.id, nombre: e.nombre, costo_calculado: 0, precio_extra: e.precio_base, puede_ser_extra: true },
          insumos: null,
        })) as ItemExtra[];
      }

      // Fallback: old item_carta_extras table
      const { data, error } = await supabase
        .from('item_carta_extras')
        .select(`
          *,
          preparaciones(id, nombre, costo_calculado, precio_extra, puede_ser_extra),
          insumos(id, nombre, costo_por_unidad_base, precio_extra, puede_ser_extra)
        `)
        .eq('item_carta_id', itemId)
        .order('orden');
      if (error) throw error;
      return data as ItemExtra[];
    },
    enabled: !!itemId,
  });
}

export function useItemExtrasMutations() {
  const qc = useQueryClient();

  const saveExtras = useMutation({
    mutationFn: async ({ item_carta_id, extras }: {
      item_carta_id: string;
      extras: { preparacion_id?: string | null; insumo_id?: string | null }[];
    }) => {
      // Delete all existing extras for this item
      await supabase.from('item_carta_extras').delete().eq('item_carta_id', item_carta_id);

      if (extras.length > 0) {
        const { error } = await supabase
          .from('item_carta_extras')
          .insert(extras.map((e, index) => ({
            item_carta_id,
            preparacion_id: e.preparacion_id || null,
            insumo_id: e.insumo_id || null,
            orden: index,
          })) as any);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['item-carta-extras', vars.item_carta_id] });
      toast.success('Extras guardados');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const updatePrecioExtra = useMutation({
    mutationFn: async ({ tipo, id, precio_extra }: {
      tipo: 'preparacion' | 'insumo';
      id: string;
      precio_extra: number | null;
    }) => {
      const table = tipo === 'preparacion' ? 'preparaciones' : 'insumos';
      const { error } = await supabase
        .from(table)
        .update({ precio_extra } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all extras queries since price is centralized
      qc.invalidateQueries({ queryKey: ['item-carta-extras'] });
      qc.invalidateQueries({ queryKey: ['preparaciones'] });
      qc.invalidateQueries({ queryKey: ['insumos'] });
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { saveExtras, updatePrecioExtra };
}
