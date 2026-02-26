import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DeepIngredient {
  insumo_id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  costo_por_unidad_base: number;
  receta_origen: string; // name of parent recipe
  receta_origen_id: string;
}

export interface DeepSubPrep {
  preparacion_id: string;
  nombre: string;
  receta_origen: string;
  receta_origen_id: string;
}

export interface DeepIngredientGroup {
  receta_id: string;
  receta_nombre: string;
  ingredientes: DeepIngredient[];
  sub_preparaciones: DeepSubPrep[];
}

/**
 * For a given item_carta, fetches composition → for each preparacion,
 * fetches its preparacion_ingredientes (insumos AND sub-preparations) recursively.
 * Returns ingredients and sub-preparations grouped by recipe of origin.
 */
export function useItemIngredientesDeepList(itemId: string | undefined) {
  return useQuery({
    queryKey: ['item-ingredientes-deep', itemId],
    queryFn: async (): Promise<DeepIngredientGroup[]> => {
      if (!itemId) return [];

      // 1. Get item composition
      const { data: composicion, error: compError } = await supabase
        .from('item_carta_composicion')
        .select(
          `
          *,
          preparaciones(id, nombre, costo_calculado, tipo),
          insumos(id, nombre, costo_por_unidad_base, unidad_base)
        `,
        )
        .eq('item_carta_id', itemId)
        .order('orden');
      if (compError) throw compError;

      const groups: DeepIngredientGroup[] = [];

      // Recursive function to fetch ingredients of a preparation
      async function fetchPrepIngredients(prepId: string, prepNombre: string, depth: number) {
        if (depth > 3) return; // safety limit

        const { data: ingredientes, error: ingError } = await supabase
          .from('preparacion_ingredientes')
          .select(
            `
            *,
            insumos(id, nombre, costo_por_unidad_base, unidad_base),
            sub_prep:preparaciones!preparacion_ingredientes_sub_preparacion_id_fkey(id, nombre)
          `,
          )
          .eq('preparacion_id', prepId)
          .order('orden');
        if (ingError) throw ingError;

        const insumoItems: DeepIngredient[] = [];
        const subPrepItems: DeepSubPrep[] = [];

        for (const ing of ingredientes || []) {
          if (ing.insumo_id && (ing as any).insumos) {
            insumoItems.push({
              insumo_id: (ing as any).insumos.id || ing.insumo_id,
              nombre: (ing as any).insumos.nombre || 'Desconocido',
              cantidad: ing.cantidad,
              unidad: ing.unidad || (ing as any).insumos.unidad_base || 'un',
              costo_por_unidad_base: (ing as any).insumos.costo_por_unidad_base || 0,
              receta_origen: prepNombre,
              receta_origen_id: prepId,
            });
          }
          if (ing.sub_preparacion_id && (ing as any).sub_prep) {
            const subPrep = (ing as any).sub_prep;
            subPrepItems.push({
              preparacion_id: subPrep.id || ing.sub_preparacion_id,
              nombre: subPrep.nombre || 'Desconocido',
              receta_origen: prepNombre,
              receta_origen_id: prepId,
            });
            // RECURSE into sub-preparation
            await fetchPrepIngredients(
              subPrep.id || ing.sub_preparacion_id,
              subPrep.nombre || 'Desconocido',
              depth + 1,
            );
          }
        }

        if (insumoItems.length > 0 || subPrepItems.length > 0) {
          groups.push({
            receta_id: prepId,
            receta_nombre: prepNombre,
            ingredientes: insumoItems,
            sub_preparaciones: subPrepItems,
          });
        }
      }

      // 2. For each preparacion in composition, fetch its ingredients recursively
      for (const comp of composicion || []) {
        if (comp.preparacion_id && (comp as any).preparaciones) {
          const prep = (comp as any).preparaciones;
          await fetchPrepIngredients(prep.id, prep.nombre, 0);
        }

        // Direct insumos at composition level
        if (comp.insumo_id && (comp as any).insumos) {
          const ins = (comp as any).insumos;
          const directGroup = groups.find((g) => g.receta_id === '__direct__');
          const ingredient: DeepIngredient = {
            insumo_id: ins.id,
            nombre: ins.nombre,
            cantidad: comp.cantidad,
            unidad: ins.unidad_base || 'un',
            costo_por_unidad_base: ins.costo_por_unidad_base || 0,
            receta_origen: 'Directo',
            receta_origen_id: '__direct__',
          };
          if (directGroup) {
            directGroup.ingredientes.push(ingredient);
          } else {
            groups.push({
              receta_id: '__direct__',
              receta_nombre: 'Insumos directos',
              ingredientes: [ingredient],
              sub_preparaciones: [],
            });
          }
        }
      }

      return groups;
    },
    enabled: !!itemId,
  });
}
