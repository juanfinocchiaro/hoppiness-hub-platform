import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fromUntyped } from '@/lib/supabase-helpers';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Promocion {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: 'descuento_porcentaje' | 'descuento_fijo' | '2x1' | 'combo' | 'precio_especial';
  valor: number;
  restriccion_pago: 'cualquiera' | 'solo_efectivo' | 'solo_digital';
  dias_semana: number[];
  hora_inicio: string;
  hora_fin: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  aplica_a: 'producto' | 'categoria' | 'todo';
  producto_ids: string[];
  categoria_ids: string[];
  tipo_usuario: 'todos' | 'nuevo' | 'recurrente' | 'staff' | 'custom_segment';
  activa: boolean;
  branch_ids: string[];
  canales: string[];
  created_at: string;
}

export interface PromocionItemExtra {
  extra_item_carta_id: string;
  cantidad: number;
  nombre?: string;
  precio?: number;
}

export interface PromocionItem {
  id: string;
  promocion_id: string;
  item_carta_id: string;
  precio_promo: number;
  created_at: string;
  item_nombre?: string;
  item_imagen?: string | null;
  precio_base?: number;
  preconfigExtras?: PromocionItemExtra[];
  /** Restricción de pago heredada de la promoción (para enforcement en POS/WebApp) */
  restriccion_pago?: Promocion['restriccion_pago'];
  promocion_nombre?: string;
}

export type PromocionFormData = Omit<Promocion, 'id' | 'created_at'>;

export function usePromociones() {
  return useQuery({
    queryKey: ['promociones'],
    queryFn: async () => {
      const { data, error } = await fromUntyped('promociones')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as Promocion[]).map((p) => ({
        ...p,
        canales: p.canales ?? ['webapp', 'salon', 'rappi', 'pedidos_ya'],
      }));
    },
  });
}

/** Fetch items attached to a promotion, with carta info + preconfig extras */
export function usePromocionItems(promoId: string | undefined) {
  return useQuery({
    queryKey: ['promocion-items', promoId],
    queryFn: async () => {
      const { data, error } = await fromUntyped('promocion_items')
        .select('*, items_carta!inner(nombre, imagen_url, precio_base)')
        .eq('promocion_id', promoId!);
      if (error) throw error;

      const items = (data || []).map((d: any) => ({
        id: d.id,
        promocion_id: d.promocion_id,
        item_carta_id: d.item_carta_id,
        precio_promo: Number(d.precio_promo),
        created_at: d.created_at,
        item_nombre: d.items_carta?.nombre,
        item_imagen: d.items_carta?.imagen_url,
        precio_base: d.items_carta?.precio_base ? Number(d.items_carta.precio_base) : undefined,
      })) as PromocionItem[];

      const itemIds = items.map((i) => i.id);
      if (itemIds.length > 0) {
        const { data: extrasData } = await supabase
          .from('promocion_item_extras' as any)
          .select('promocion_item_id, extra_item_carta_id, cantidad')
          .in('promocion_item_id', itemIds);
        if (extrasData && (extrasData as any[]).length > 0) {
          const extraCartaIds = [
            ...new Set((extrasData as any[]).map((e: any) => e.extra_item_carta_id)),
          ];
          const { data: extraInfo } = await supabase
            .from('items_carta')
            .select('id, nombre, precio_base')
            .in('id', extraCartaIds);
          const nameMap = new Map((extraInfo || []).map((n: any) => [n.id, n.nombre]));
          const priceMap = new Map(
            (extraInfo || []).map((n: any) => [n.id, Number(n.precio_base ?? 0)]),
          );
          const byItem = new Map<string, PromocionItemExtra[]>();
          for (const e of extrasData as any[]) {
            const list = byItem.get(e.promocion_item_id) || [];
            list.push({
              extra_item_carta_id: e.extra_item_carta_id,
              cantidad: e.cantidad,
              nombre: nameMap.get(e.extra_item_carta_id) || '',
              precio: priceMap.get(e.extra_item_carta_id) ?? 0,
            });
            byItem.set(e.promocion_item_id, list);
          }
          for (const item of items) {
            item.preconfigExtras = byItem.get(item.id);
          }
        }
      }

      return items;
    },
    enabled: !!promoId,
  });
}

/** Get active promos for a specific branch + channel, evaluated by current day/time */
export function useActivePromos(branchId: string | undefined, canal?: string) {
  return useQuery({
    queryKey: ['active-promos', branchId, canal],
    queryFn: async () => {
      const { data, error } = await fromUntyped('promociones')
        .select('*')
        .eq('activa', true)
        .is('deleted_at', null);
      if (error) throw error;

      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const today = now.toISOString().slice(0, 10);

      return (data as unknown as Promocion[])
        .filter((p) => {
          const bids = p.branch_ids ?? [];
          if (bids.length > 0 && (!branchId || !bids.includes(branchId))) return false;
          const ch = p.canales ?? [];
          if (canal && ch.length > 0 && !ch.includes(canal)) return false;
          const dias = p.dias_semana ?? [];
          if (dias.length > 0 && !dias.includes(currentDay)) return false;
          const hi = (p.hora_inicio ?? '').slice(0, 5);
          const hf = (p.hora_fin ?? '').slice(0, 5);
          if (hi && currentTime < hi) return false;
          if (hf && hf !== '00:00' && currentTime > hf) return false;
          if (p.fecha_inicio && today < p.fecha_inicio) return false;
          if (p.fecha_fin && today > p.fecha_fin) return false;
          return true;
        })
        .map((p) => ({
          ...p,
          canales: p.canales ?? ['webapp', 'salon', 'rappi', 'pedidos_ya'],
        }));
    },
    enabled: !!branchId,
    refetchInterval: 5 * 60 * 1000,
  });
}

/** Get active promo items (with prices + preconfig extras) for a channel + branch */
export function useActivePromoItems(branchId: string | undefined, canal?: string) {
  const { data: promos = [] } = useActivePromos(branchId, canal);
  const promoIds = promos.map((p) => p.id);
  const payRestrictionByPromoId = useMemo(
    () => new Map(promos.map((p) => [p.id, p.restriccion_pago] as const)),
    [promos],
  );
  const promoNameById = useMemo(
    () => new Map(promos.map((p) => [p.id, p.nombre] as const)),
    [promos],
  );

  return useQuery({
    queryKey: ['active-promo-items', promoIds],
    queryFn: async () => {
      if (promoIds.length === 0) return [];
      const { data, error } = await fromUntyped('promocion_items')
        .select('*, items_carta!inner(nombre, imagen_url, precio_base)')
        .in('promocion_id', promoIds);
      if (error) throw error;

      const promoItemIds = (data || []).map((d: any) => d.id);

      let extrasMap = new Map<string, PromocionItemExtra[]>();
      if (promoItemIds.length > 0) {
        const { data: extrasData } = await supabase
          .from('promocion_item_extras' as any)
          .select('promocion_item_id, extra_item_carta_id, cantidad')
          .in('promocion_item_id', promoItemIds);

        if (extrasData && extrasData.length > 0) {
          const extraItemIds = [
            ...new Set((extrasData as any[]).map((e: any) => e.extra_item_carta_id)),
          ];
          const { data: extraInfo } = await supabase
            .from('items_carta')
            .select('id, nombre, precio_base')
            .in('id', extraItemIds);
          const nameMap = new Map((extraInfo || []).map((n: any) => [n.id, n.nombre]));
          const priceMap = new Map(
            (extraInfo || []).map((n: any) => [n.id, Number(n.precio_base ?? 0)]),
          );

          for (const e of extrasData as any[]) {
            const list = extrasMap.get(e.promocion_item_id) || [];
            list.push({
              extra_item_carta_id: e.extra_item_carta_id,
              cantidad: e.cantidad,
              nombre: nameMap.get(e.extra_item_carta_id) || '',
              precio: priceMap.get(e.extra_item_carta_id) ?? 0,
            });
            extrasMap.set(e.promocion_item_id, list);
          }
        }
      }

      return (data || []).map((d: any) => ({
        id: d.id,
        promocion_id: d.promocion_id,
        item_carta_id: d.item_carta_id,
        precio_promo: Number(d.precio_promo),
        created_at: d.created_at,
        item_nombre: d.items_carta?.nombre,
        item_imagen: d.items_carta?.imagen_url,
        precio_base: d.items_carta?.precio_base ? Number(d.items_carta.precio_base) : undefined,
        preconfigExtras: extrasMap.get(d.id) || undefined,
        restriccion_pago: payRestrictionByPromoId.get(d.promocion_id) ?? 'cualquiera',
        promocion_nombre: promoNameById.get(d.promocion_id) ?? undefined,
      })) as PromocionItem[];
    },
    enabled: promoIds.length > 0,
  });
}

export function usePromocionMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['promociones'] });
    qc.invalidateQueries({ queryKey: ['active-promos'] });
    qc.invalidateQueries({ queryKey: ['promocion-items'] });
    qc.invalidateQueries({ queryKey: ['active-promo-items'] });
  };

  const savePreconfigExtras = async (
    insertedItems: Array<{ id: string; item_carta_id: string }>,
    sourceItems: Array<{
      item_carta_id: string;
      preconfigExtras?: Array<{ extra_item_carta_id: string; cantidad: number }>;
    }>,
  ) => {
    const rows: Array<{
      promocion_item_id: string;
      extra_item_carta_id: string;
      cantidad: number;
    }> = [];
    for (const inserted of insertedItems) {
      const source = sourceItems.find((s) => s.item_carta_id === inserted.item_carta_id);
      if (source?.preconfigExtras?.length) {
        for (const ex of source.preconfigExtras) {
          rows.push({
            promocion_item_id: inserted.id,
            extra_item_carta_id: ex.extra_item_carta_id,
            cantidad: ex.cantidad,
          });
        }
      }
    }
    if (rows.length > 0) {
      const { error } = await supabase.from('promocion_item_extras' as any).insert(rows);
      if (error) throw error;
    }
  };

  const create = useMutation({
    mutationFn: async (
      data: PromocionFormData & {
        items?: Array<{
          item_carta_id: string;
          precio_promo: number;
          preconfigExtras?: Array<{ extra_item_carta_id: string; cantidad: number }>;
        }>;
      },
    ) => {
      const { items, ...promoData } = data;
      const { data: result, error } = await fromUntyped('promociones')
        .insert({ ...promoData, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;

      if (items && items.length > 0) {
        const { data: insertedItems, error: itemsErr } = await supabase
          .from('promocion_items')
          .insert(
            items.map((i) => ({
              item_carta_id: i.item_carta_id,
              precio_promo: i.precio_promo,
              promocion_id: result.id,
            })) as any,
          )
          .select('id, item_carta_id');
        if (itemsErr) throw itemsErr;

        await savePreconfigExtras(insertedItems as any[], items);
      }

      return result;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Promoción creada');
    },
    onError: (e) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({
      id,
      data,
      items,
    }: {
      id: string;
      data: Partial<PromocionFormData>;
      items?: Array<{
        item_carta_id: string;
        precio_promo: number;
        preconfigExtras?: Array<{ extra_item_carta_id: string; cantidad: number }>;
      }>;
    }) => {
      const { error } = await fromUntyped('promociones')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;

      if (items !== undefined) {
        await fromUntyped('promocion_items').delete().eq('promocion_id', id);
        if (items.length > 0) {
          const { data: insertedItems, error: itemsErr } = await supabase
            .from('promocion_items')
            .insert(
              items.map((i) => ({
                item_carta_id: i.item_carta_id,
                precio_promo: i.precio_promo,
                promocion_id: id,
              })) as any,
            )
            .select('id, item_carta_id');
          if (itemsErr) throw itemsErr;

          await savePreconfigExtras(insertedItems as any[], items);
        }
      }
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Promoción actualizada');
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, activa }: { id: string; activa: boolean }) => {
      const { error } = await fromUntyped('promociones')
        .update({ activa, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await fromUntyped('promociones')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Promoción eliminada');
    },
    onError: (e) => toast.error(e.message),
  });

  return { create, update, toggleActive, remove };
}
