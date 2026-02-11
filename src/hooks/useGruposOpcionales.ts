import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GrupoOpcionalItem {
  id: string;
  grupo_id: string;
  insumo_id: string | null;
  preparacion_id: string | null;
  cantidad: number;
  costo_unitario: number;
  // joined
  insumos?: { id: string; nombre: string; costo_por_unidad_base: number } | null;
  preparaciones?: { id: string; nombre: string; costo_calculado: number } | null;
}

export interface GrupoOpcional {
  id: string;
  item_carta_id: string;
  nombre: string;
  orden: number;
  costo_promedio: number;
  items?: GrupoOpcionalItem[];
}

export function useGruposOpcionales(itemId: string | undefined) {
  return useQuery({
    queryKey: ['grupos-opcionales', itemId],
    queryFn: async () => {
      if (!itemId) return [];
      const { data, error } = await supabase
        .from('item_carta_grupo_opcional' as any)
        .select(`
          *,
          items:item_carta_grupo_opcional_items(
            *,
            insumos(id, nombre, costo_por_unidad_base),
            preparaciones(id, nombre, costo_calculado)
          )
        `)
        .eq('item_carta_id', itemId)
        .order('orden');
      if (error) throw error;
      return (data || []) as unknown as GrupoOpcional[];
    },
    enabled: !!itemId,
  });
}

export function useGruposOpcionalesMutations() {
  const qc = useQueryClient();

  const invalidate = (itemId: string) => {
    qc.invalidateQueries({ queryKey: ['grupos-opcionales', itemId] });
    qc.invalidateQueries({ queryKey: ['items-carta'] });
  };

  const recalcularCosto = async (itemId: string) => {
    await supabase.rpc('recalcular_costo_item_carta', { _item_id: itemId });
  };

  const createGrupo = useMutation({
    mutationFn: async ({ item_carta_id, nombre, orden }: { item_carta_id: string; nombre: string; orden: number }) => {
      const { data, error } = await supabase
        .from('item_carta_grupo_opcional' as any)
        .insert({ item_carta_id, nombre, orden } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      invalidate(vars.item_carta_id);
      toast.success('Grupo creado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const updateGrupo = useMutation({
    mutationFn: async ({ id, item_carta_id, data }: { id: string; item_carta_id: string; data: { nombre?: string } }) => {
      const { error } = await supabase
        .from('item_carta_grupo_opcional' as any)
        .update(data as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => invalidate(vars.item_carta_id),
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const deleteGrupo = useMutation({
    mutationFn: async ({ id, item_carta_id }: { id: string; item_carta_id: string }) => {
      const { error } = await supabase
        .from('item_carta_grupo_opcional' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
      await recalcularCosto(item_carta_id);
    },
    onSuccess: (_, vars) => {
      invalidate(vars.item_carta_id);
      toast.success('Grupo eliminado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const saveGrupoItems = useMutation({
    mutationFn: async ({ grupo_id, item_carta_id, items }: {
      grupo_id: string;
      item_carta_id: string;
      items: { insumo_id?: string | null; preparacion_id?: string | null; cantidad: number; costo_unitario: number }[];
    }) => {
      // Delete existing items
      await supabase
        .from('item_carta_grupo_opcional_items' as any)
        .delete()
        .eq('grupo_id', grupo_id);

      // Insert new items
      if (items.length > 0) {
        const { error } = await supabase
          .from('item_carta_grupo_opcional_items' as any)
          .insert(items.map((item) => ({
            grupo_id,
            insumo_id: item.insumo_id || null,
            preparacion_id: item.preparacion_id || null,
            cantidad: item.cantidad,
            costo_unitario: item.costo_unitario,
          })) as any);
        if (error) throw error;
      }

      // Calculate average cost
      const avg = items.length > 0
        ? items.reduce((sum, i) => sum + i.cantidad * i.costo_unitario, 0) / items.length
        : 0;

      // Update group with average
      const { error: updErr } = await supabase
        .from('item_carta_grupo_opcional' as any)
        .update({ costo_promedio: Math.round(avg * 100) / 100 } as any)
        .eq('id', grupo_id);
      if (updErr) throw updErr;

      // Recalculate item cost
      await recalcularCosto(item_carta_id);
    },
    onSuccess: (_, vars) => {
      invalidate(vars.item_carta_id);
      toast.success('Grupo actualizado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { createGrupo, updateGrupo, deleteGrupo, saveGrupoItems };
}
