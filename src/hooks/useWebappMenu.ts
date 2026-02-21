import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WebappConfig, WebappMenuItem } from '@/types/webapp';

export function useWebappConfig(branchSlug: string | undefined) {
  return useQuery({
    queryKey: ['webapp-config', branchSlug],
    queryFn: async () => {
      // Get branch by slug
      const { data: branch, error: branchErr } = await supabase
        .from('branches')
        .select('id, name, address, city, slug, opening_time, closing_time, public_hours, latitude, longitude')
        .eq('slug', branchSlug!)
        .eq('is_active', true)
        .single();
      if (branchErr) throw branchErr;

      // Get webapp config
      const { data: config, error: configErr } = await supabase
        .from('webapp_config' as any)
        .select('*, webapp_activa')
        .eq('branch_id', branch.id)
        .single();
      if (configErr) throw configErr;

      return { branch, config: config as unknown as WebappConfig };
    },
    enabled: !!branchSlug,
  });
}

export function useWebappMenuItems(branchId: string | undefined) {
  return useQuery({
    queryKey: ['webapp-menu-items', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items_carta')
        .select(`
          id, nombre, nombre_corto, descripcion, imagen_url,
          precio_base, precio_promo, promo_etiqueta,
          categoria_carta_id, orden, disponible_delivery,
          disponible_webapp, tipo,
          menu_categorias:categoria_carta_id(id, nombre, orden)
        `)
        .eq('activo', true)
        .is('deleted_at', null)
        .eq('disponible_webapp', true)
        .order('orden');
      if (error) throw error;

      return (data || []).map((item: any) => ({
        ...item,
        categoria_nombre: item.menu_categorias?.nombre ?? null,
        categoria_orden: item.menu_categorias?.orden ?? 999,
      })) as WebappMenuItem[];
    },
    enabled: !!branchId,
  });
}

export function useWebappItemExtras(itemId: string | undefined) {
  return useQuery({
    queryKey: ['webapp-item-extras', itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('item_carta_grupo_opcional' as any)
        .select(`
          id, nombre, orden, es_obligatorio, max_selecciones,
          items:item_carta_grupo_opcional_items(
            id, cantidad, costo_unitario,
            insumos(id, nombre, costo_por_unidad_base),
            preparaciones(id, nombre, costo_calculado)
          )
        `)
        .eq('item_carta_id', itemId!)
        .order('orden');
      if (error) throw error;
      return data as any[];
    },
    enabled: !!itemId,
  });
}

export function useWebappItemRemovables(itemId: string | undefined) {
  return useQuery({
    queryKey: ['webapp-item-removables', itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('item_carta_composicion' as any)
        .select(`
          id, cantidad, orden, es_removible,
          insumos:insumo_id(id, nombre),
          preparaciones:preparacion_id(id, nombre)
        `)
        .eq('item_carta_id', itemId!)
        .eq('es_removible', true)
        .order('orden');
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!itemId,
  });
}
