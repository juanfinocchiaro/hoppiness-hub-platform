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
  preparaciones?: {
    id: string;
    nombre: string;
    costo_calculado: number;
    precio_extra: number | null;
    puede_ser_extra: boolean;
  } | null;
  insumos?: {
    id: string;
    nombre: string;
    costo_por_unidad_base: number;
    precio_extra: number | null;
    puede_ser_extra: boolean;
  } | null;
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

      const extraIds = ((asignaciones as any[]) || []).map((a: any) => a.extra_id);

      if (extraIds.length === 0) return [];

      const { data: extras, error: errExtras } = await supabase
        .from('items_carta')
        .select('id, nombre, precio_base, activo')
        .in('id', extraIds)
        .eq('activo', true)
        .is('deleted_at', null);
      if (errExtras) throw errExtras;

      return (extras || []).map((e: any, i: number) => ({
        id: e.id,
        item_carta_id: itemId,
        preparacion_id: null,
        insumo_id: null,
        orden: i,
        preparaciones: {
          id: e.id,
          nombre: e.nombre,
          costo_calculado: 0,
          precio_extra: e.precio_base,
          puede_ser_extra: true,
        },
        insumos: null,
      })) as ItemExtra[];
    },
    enabled: !!itemId,
  });
}

export function useItemExtrasMutations() {
  const qc = useQueryClient();

  const saveExtras = useMutation({
    mutationFn: async ({
      item_carta_id,
      extra_ids,
    }: {
      item_carta_id: string;
      extra_ids: string[];
    }) => {
      const { error: delErr } = await supabase
        .from('item_extra_asignaciones' as any)
        .delete()
        .eq('item_carta_id', item_carta_id);
      if (delErr) throw delErr;

      if (extra_ids.length > 0) {
        const { error } = await supabase.from('item_extra_asignaciones' as any).insert(
          extra_ids.map((extra_id) => ({
            item_carta_id,
            extra_id,
          })),
        );
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
    mutationFn: async ({
      tipo,
      id,
      precio_extra,
    }: {
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
