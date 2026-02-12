import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Get extras assigned to an item
export function useExtraAsignaciones(itemId: string | undefined) {
  return useQuery({
    queryKey: ['extra-asignaciones', itemId],
    queryFn: async () => {
      if (!itemId) return [];
      const { data, error } = await supabase
        .from('item_extra_asignaciones' as any)
        .select(`
          *,
          extra:extra_id(id, nombre, costo_total, precio_base, fc_actual, fc_objetivo, tipo)
        `)
        .eq('item_carta_id', itemId)
        .order('orden');
      if (error) throw error;
      return data as any[];
    },
    enabled: !!itemId,
  });
}

// Get which items an extra is assigned to
export function useExtraEnItems(extraId: string | undefined) {
  return useQuery({
    queryKey: ['extra-en-items', extraId],
    queryFn: async () => {
      if (!extraId) return [];
      const { data, error } = await supabase
        .from('item_extra_asignaciones' as any)
        .select(`
          *,
          item:item_carta_id(id, nombre, categoria_carta_id)
        `)
        .eq('extra_id', extraId);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!extraId,
  });
}

export function useExtraAsignacionesMutations() {
  const qc = useQueryClient();

  const saveAsignaciones = useMutation({
    mutationFn: async ({ item_carta_id, extra_ids }: {
      item_carta_id: string;
      extra_ids: string[];
    }) => {
      // Delete all existing assignments for this item
      await supabase.from('item_extra_asignaciones' as any).delete().eq('item_carta_id', item_carta_id);

      if (extra_ids.length > 0) {
        const { error } = await supabase
          .from('item_extra_asignaciones' as any)
          .insert(extra_ids.map((extra_id, index) => ({
            item_carta_id,
            extra_id,
            orden: index,
          })));
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['extra-asignaciones', vars.item_carta_id] });
      toast.success('Extras asignados guardados');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const saveExtraEnItems = useMutation({
    mutationFn: async ({ extra_id, item_ids }: {
      extra_id: string;
      item_ids: string[];
    }) => {
      // Delete all existing assignments for this extra
      await supabase.from('item_extra_asignaciones' as any).delete().eq('extra_id', extra_id);

      if (item_ids.length > 0) {
        const { error } = await supabase
          .from('item_extra_asignaciones' as any)
          .insert(item_ids.map((item_carta_id, index) => ({
            item_carta_id,
            extra_id,
            orden: index,
          })));
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['extra-en-items', vars.extra_id] });
      qc.invalidateQueries({ queryKey: ['extra-asignaciones'] });
      toast.success('Asignaciones guardadas');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { saveAsignaciones, saveExtraEnItems };
}
