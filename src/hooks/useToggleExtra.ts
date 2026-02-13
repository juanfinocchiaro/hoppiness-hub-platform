import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

async function getExtrasCategoryId(): Promise<string | null> {
  const { data } = await supabase
    .from('menu_categorias' as any)
    .select('id')
    .ilike('nombre', '%extras%')
    .limit(1)
    .maybeSingle();
  return (data as any)?.id || null;
}

interface ExistingExtra {
  id: string;
  activo: boolean;
  deleted_at: string | null;
}

async function findExistingExtra(
  tipo: 'preparacion' | 'insumo',
  refId: string
): Promise<ExistingExtra | null> {
  const field = tipo === 'preparacion'
    ? 'composicion_ref_preparacion_id'
    : 'composicion_ref_insumo_id';
  const { data } = await supabase
    .from('items_carta')
    .select('id, activo, deleted_at')
    .eq('tipo', 'extra')
    .eq(field, refId)
    .maybeSingle();
  if (!data) return null;
  return { id: data.id, activo: data.activo ?? true, deleted_at: data.deleted_at ?? null };
}

export function useToggleExtra() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      item_carta_id,
      tipo,
      ref_id,
      nombre,
      costo,
      activo,
    }: {
      item_carta_id: string;
      tipo: 'preparacion' | 'insumo';
      ref_id: string;
      nombre: string;
      costo: number;
      activo: boolean;
    }) => {
      if (activo) {
        // 1. Find or create the extra item
        let existing = await findExistingExtra(tipo, ref_id);
        let extraId: string;

        if (!existing) {
          const catId = await getExtrasCategoryId();
          const { data, error } = await supabase
            .from('items_carta')
            .insert({
              nombre: `Extra ${nombre}`,
              tipo: 'extra',
              categoria_carta_id: catId,
              precio_base: 0,
              costo_total: costo,
              fc_objetivo: 30,
              composicion_ref_preparacion_id: tipo === 'preparacion' ? ref_id : null,
              composicion_ref_insumo_id: tipo === 'insumo' ? ref_id : null,
            } as any)
            .select()
            .single();
          if (error) throw error;
          extraId = data.id;
        } else {
          extraId = existing.id;
          // Always update cost + reactivate if needed
          const { error } = await supabase
            .from('items_carta')
            .update({ activo: true, deleted_at: null, costo_total: costo } as any)
            .eq('id', extraId);
          if (error) throw error;
        }

        // 2. Create assignment
        const { error: asigError } = await supabase
          .from('item_extra_asignaciones' as any)
          .upsert(
            { item_carta_id, extra_id: extraId },
            { onConflict: 'item_carta_id,extra_id' }
          );
        if (asigError) throw asigError;

      } else {
        // Deactivate: remove assignment and soft-delete if orphaned
        const existing = await findExistingExtra(tipo, ref_id);
        if (existing) {
          await supabase
            .from('item_extra_asignaciones' as any)
            .delete()
            .eq('item_carta_id', item_carta_id)
            .eq('extra_id', existing.id);

          // Check if extra has any remaining assignments
          const { count } = await supabase
            .from('item_extra_asignaciones' as any)
            .select('id', { count: 'exact', head: true })
            .eq('extra_id', existing.id);

          // Soft-delete the extra item if no other product uses it
          if ((count ?? 0) === 0) {
            await supabase
              .from('items_carta')
              .update({ activo: false, deleted_at: new Date().toISOString() } as any)
              .eq('id', existing.id);
          }
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['item-extra-asignaciones'] });
      qc.invalidateQueries({ queryKey: ['items-carta'] });
      toast.success('Extra actualizado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });
}

/**
 * Toggle assignment from the extra's side (Asignados tab)
 */
export function useToggleExtraAssignment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      item_carta_id,
      extra_id,
      activo,
    }: {
      item_carta_id: string;
      extra_id: string;
      activo: boolean;
    }) => {
      if (activo) {
        const { error } = await supabase
          .from('item_extra_asignaciones' as any)
          .upsert(
            { item_carta_id, extra_id },
            { onConflict: 'item_carta_id,extra_id' }
          );
        if (error) throw error;
      } else {
        await supabase
          .from('item_extra_asignaciones' as any)
          .delete()
          .eq('item_carta_id', item_carta_id)
          .eq('extra_id', extra_id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['item-extra-asignaciones'] });
      qc.invalidateQueries({ queryKey: ['items-carta'] });
      toast.success('Asignación actualizada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });
}
