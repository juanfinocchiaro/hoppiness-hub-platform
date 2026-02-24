import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WebappConfig, WebappMenuItem } from '@/types/webapp';

export function useWebappConfig(branchSlug: string | undefined) {
  return useQuery({
    queryKey: ['webapp-config', branchSlug],
    queryFn: async () => {
      const { data: branch, error: branchErr } = await supabase
        .from('branches')
        .select('id, name, address, city, slug, opening_time, closing_time, public_hours, latitude, longitude, google_place_id')
        .eq('slug', branchSlug!)
        .eq('is_active', true)
        .single();
      if (branchErr) throw branchErr;

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

// ── PARTE 6A: Filtrado por disponibilidad de local ──────────
export function useWebappMenuItems(branchId: string | undefined) {
  return useQuery({
    queryKey: ['webapp-menu-items', branchId],
    queryFn: async () => {
      // 1. Check if branch_item_availability has rows for this branch
      const { data: availability, error: avErr } = await supabase
        .from('branch_item_availability' as any)
        .select('item_carta_id')
        .eq('branch_id', branchId!)
        .eq('available', true)
        .eq('available_webapp', true)
        .eq('out_of_stock', false);

      if (avErr) throw avErr;

      const hasAvailabilityRows = availability && availability.length > 0;
      const availableIds = hasAvailabilityRows
        ? (availability as any[]).map((a: any) => a.item_carta_id)
        : null;

      // 2. Get hidden category IDs (visible_en_carta = false)
      const { data: hiddenCats } = await supabase
        .from('menu_categorias' as any)
        .select('id')
        .eq('visible_en_carta', false);

      const hiddenCatIds = (hiddenCats || []).map((c: any) => c.id);

      // 3. Query items_carta, filtered by availability if rows exist
      let query = supabase
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

      if (availableIds) {
        query = query.in('id', availableIds);
      }

      // Exclude items from hidden categories
      if (hiddenCatIds.length > 0) {
        query = query.not('categoria_carta_id', 'in', `(${hiddenCatIds.join(',')})`);
      }

      const { data, error } = await query;
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

// ── Grupos opcionales (bebidas en combos, etc.) ──────────
export interface OptionalGroupOption {
  id: string;
  nombre: string;
  precio_extra: number;
}

export interface OptionalGroup {
  id: string;
  nombre: string;
  es_obligatorio: boolean;
  max_selecciones: number | null;
  opciones: OptionalGroupOption[];
}

export function useWebappItemOptionalGroups(itemId: string | undefined) {
  return useQuery({
    queryKey: ['webapp-item-optional-groups', itemId],
    queryFn: async () => {
      // 1. Get groups for this item
      const { data: groups, error: gErr } = await supabase
        .from('item_carta_grupo_opcional' as any)
        .select('id, nombre, es_obligatorio, max_selecciones, orden')
        .eq('item_carta_id', itemId!)
        .order('orden');
      if (gErr) throw gErr;
      if (!groups || groups.length === 0) return [];

      // 2. Get options for all groups
      const groupIds = (groups as any[]).map((g: any) => g.id);
      const { data: options, error: oErr } = await supabase
        .from('item_carta_grupo_opcional_items' as any)
        .select('id, grupo_id, insumo_id, preparacion_id, costo_unitario, insumos(id, nombre), preparaciones(id, nombre)')
        .in('grupo_id', groupIds);
      if (oErr) throw oErr;

      return (groups as any[]).map((g: any) => ({
        id: g.id,
        nombre: g.nombre,
        es_obligatorio: g.es_obligatorio ?? false,
        max_selecciones: g.max_selecciones,
        opciones: ((options || []) as any[])
          .filter((o: any) => o.grupo_id === g.id)
          .map((o: any) => ({
            id: o.id,
            nombre: o.insumos?.nombre || o.preparaciones?.nombre || 'Opción',
            precio_extra: o.costo_unitario ?? 0,
          })),
      })) as OptionalGroup[];
    },
    enabled: !!itemId,
  });
}

// ── PARTE 5A: Extras desde item_extra_asignaciones → items_carta ──
export function useWebappItemExtras(itemId: string | undefined) {
  return useQuery({
    queryKey: ['webapp-item-extras', itemId],
    queryFn: async () => {
      // Get extra assignments from correct table
      const { data: asignaciones, error: errAsig } = await supabase
        .from('item_extra_asignaciones' as any)
        .select('extra_id')
        .eq('item_carta_id', itemId!);
      if (errAsig) throw errAsig;

      const extraIds = (asignaciones || []).map((a: any) => a.extra_id);
      if (extraIds.length === 0) return [];

      // Get the actual items_carta (tipo='extra') with real sale prices
      const { data: extras, error } = await supabase
        .from('items_carta')
        .select('id, nombre, precio_base, imagen_url')
        .in('id', extraIds)
        .eq('activo', true)
        .is('deleted_at', null);
      if (error) throw error;

      return (extras || []).map((e: any) => ({
        id: e.id,
        nombre: e.nombre,
        precio: e.precio_base, // Precio REAL de venta
        imagen_url: e.imagen_url,
      }));
    },
    enabled: !!itemId,
  });
}

// ── PARTE 5A: Removibles desde item_removibles ──────────────
export function useWebappItemRemovables(itemId: string | undefined) {
  return useQuery({
    queryKey: ['webapp-item-removables', itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('item_removibles' as any)
        .select('id, nombre_display, activo, insumo_id, preparacion_id, insumos(id, nombre), preparaciones(id, nombre)')
        .eq('item_carta_id', itemId!)
        .eq('activo', true);
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        nombre: r.nombre_display || r.insumos?.nombre || r.preparaciones?.nombre || 'Ingrediente',
      }));
    },
    enabled: !!itemId,
  });
}
