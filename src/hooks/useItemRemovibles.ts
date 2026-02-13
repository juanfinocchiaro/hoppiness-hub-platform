import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useItemRemovibles(itemId: string | undefined) {
  return useQuery({
    queryKey: ['item-removibles', itemId],
    queryFn: async () => {
      if (!itemId) return [];
      const { data, error } = await supabase
        .from('item_removibles' as any)
        .select('*, insumos(id, nombre), preparaciones(id, nombre)')
        .eq('item_carta_id', itemId)
        .eq('activo', true);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!itemId,
  });
}

export function useItemRemoviblesMutations() {
  const qc = useQueryClient();

  const toggleInsumo = useMutation({
    mutationFn: async ({ item_carta_id, insumo_id, activo, nombre_display }: {
      item_carta_id: string; insumo_id: string; activo: boolean; nombre_display?: string;
    }) => {
      if (activo) {
        const { error } = await supabase
          .from('item_removibles' as any)
          .upsert(
            { item_carta_id, insumo_id, preparacion_id: null, activo: true, nombre_display: nombre_display || null },
            { onConflict: 'item_carta_id,insumo_id' }
          );
        if (error) throw error;
      } else {
        await supabase
          .from('item_removibles' as any)
          .delete()
          .eq('item_carta_id', item_carta_id)
          .eq('insumo_id', insumo_id);
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['item-removibles', vars.item_carta_id] });
    },
  });

  const togglePreparacion = useMutation({
    mutationFn: async ({ item_carta_id, preparacion_id, activo, nombre_display }: {
      item_carta_id: string; preparacion_id: string; activo: boolean; nombre_display?: string;
    }) => {
      if (activo) {
        const { error } = await supabase
          .from('item_removibles' as any)
          .upsert(
            { item_carta_id, preparacion_id, insumo_id: null, activo: true, nombre_display: nombre_display || null },
            { onConflict: 'item_carta_id,preparacion_id' }
          );
        if (error) throw error;
      } else {
        await supabase
          .from('item_removibles' as any)
          .delete()
          .eq('item_carta_id', item_carta_id)
          .eq('preparacion_id', preparacion_id);
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['item-removibles', vars.item_carta_id] });
    },
  });

  const updateNombreDisplay = useMutation({
    mutationFn: async ({ id, nombre_display }: { id: string; nombre_display: string }) => {
      const { error } = await supabase
        .from('item_removibles' as any)
        .update({ nombre_display })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['item-removibles'] });
    },
  });

  // Keep backward compat
  const toggle = toggleInsumo;

  return { toggle, toggleInsumo, togglePreparacion, updateNombreDisplay };
}
