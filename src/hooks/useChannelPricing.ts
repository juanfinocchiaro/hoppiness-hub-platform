import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type Channel = 'mostrador' | 'webapp' | 'rappi' | 'pedidos_ya' | 'mp_delivery';
export type PricingMode = 'base' | 'percentage' | 'fixed_amount' | 'mirror' | 'manual';

export const CHANNELS: { value: Channel; label: string }[] = [
  { value: 'mostrador', label: 'Mostrador' },
  { value: 'webapp', label: 'WebApp' },
  { value: 'rappi', label: 'Rappi' },
  { value: 'pedidos_ya', label: 'Pedidos Ya' },
  { value: 'mp_delivery', label: 'MercadoPago Delivery' },
];

export const APP_CHANNELS: Channel[] = ['rappi', 'pedidos_ya', 'mp_delivery'];

export const PRICING_MODES: { value: PricingMode; label: string; description: string }[] = [
  { value: 'base', label: 'Precio base', description: 'Usa el precio de la carta' },
  { value: 'percentage', label: '% comisión', description: 'Precio base + porcentaje' },
  { value: 'fixed_amount', label: 'Monto fijo', description: 'Precio base + monto fijo' },
  { value: 'mirror', label: 'Mismo que…', description: 'Copia los precios de otro canal' },
  { value: 'manual', label: 'Manual', description: 'Precio individual por producto' },
];

export interface PriceList {
  id: string;
  name: string;
  channel: Channel;
  is_default: boolean;
  is_active: boolean;
  pricing_mode: PricingMode;
  pricing_value: number;
  mirror_channel: Channel | null;
  created_at: string;
}

export interface PriceListItem {
  id: string;
  price_list_id: string;
  item_carta_id: string;
  precio: number;
}

export function computeChannelPrice(
  basePrice: number,
  mode: PricingMode,
  value: number,
  override?: number,
): number {
  if (override !== undefined) return override;
  switch (mode) {
    case 'base':
      return basePrice;
    case 'percentage':
      return Math.round(basePrice * (1 + value / 100));
    case 'fixed_amount':
      return Math.round(basePrice + value);
    case 'manual':
      return basePrice;
    default:
      return basePrice;
  }
}

export function resolveChannelMode(
  channel: Channel,
  priceLists: PriceList[],
): { mode: PricingMode; value: number; resolvedChannel: Channel } {
  const list = priceLists.find(l => l.channel === channel);
  if (!list) return { mode: 'base', value: 0, resolvedChannel: channel };

  if (list.pricing_mode === 'mirror' && list.mirror_channel) {
    const mirrorList = priceLists.find(l => l.channel === list.mirror_channel);
    if (mirrorList && mirrorList.pricing_mode !== 'mirror') {
      return {
        mode: mirrorList.pricing_mode,
        value: mirrorList.pricing_value,
        resolvedChannel: mirrorList.channel,
      };
    }
  }

  return { mode: list.pricing_mode, value: list.pricing_value, resolvedChannel: channel };
}

export function usePriceLists() {
  return useQuery({
    queryKey: ['price-lists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('price_lists' as any)
        .select('*')
        .order('channel');
      if (error) throw error;
      return (data || []) as unknown as PriceList[];
    },
  });
}

export function usePriceListItems(priceListId: string | undefined) {
  return useQuery({
    queryKey: ['price-list-items', priceListId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('price_list_items' as any)
        .select('*')
        .eq('price_list_id', priceListId!);
      if (error) throw error;
      return (data || []) as unknown as PriceListItem[];
    },
    enabled: !!priceListId,
  });
}

export function useAllPriceListItems(priceListIds: string[]) {
  return useQuery({
    queryKey: ['all-price-list-items', priceListIds],
    queryFn: async () => {
      if (priceListIds.length === 0) return {};
      const { data, error } = await supabase
        .from('price_list_items' as any)
        .select('*')
        .in('price_list_id', priceListIds);
      if (error) throw error;

      const map: Record<string, Record<string, number>> = {};
      for (const row of (data || []) as unknown as PriceListItem[]) {
        if (!map[row.price_list_id]) map[row.price_list_id] = {};
        map[row.price_list_id][row.item_carta_id] = row.precio;
      }
      return map;
    },
    enabled: priceListIds.length > 0,
  });
}

export function useMenuItemsForPricing() {
  return useQuery({
    queryKey: ['menu-items-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items_carta')
        .select('id, nombre, orden, precio_base, activo, categoria_carta_id, menu_categorias(id, nombre, orden)')
        .eq('activo', true)
        .order('orden');
      if (error) throw error;
      return data || [];
    },
  });
}

export function useUpdatePriceListConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      pricing_mode: PricingMode;
      pricing_value: number;
      mirror_channel?: Channel | null;
    }) => {
      const { error } = await supabase
        .from('price_lists' as any)
        .update({
          pricing_mode: params.pricing_mode,
          pricing_value: params.pricing_value,
          mirror_channel: params.mirror_channel ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['price-lists'] });
      toast.success('Configuración de canal actualizada');
    },
    onError: () => {
      toast.error('Error al actualizar configuración');
    },
  });
}

export function useBulkUpdatePriceList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      price_list_id: string;
      items: Array<{ item_carta_id: string; precio: number }>;
    }) => {
      const rows = params.items.map(i => ({
        price_list_id: params.price_list_id,
        item_carta_id: i.item_carta_id,
        precio: i.precio,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from('price_list_items' as any)
        .upsert(rows, { onConflict: 'price_list_id,item_carta_id' });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['price-list-items', vars.price_list_id] });
      qc.invalidateQueries({ queryKey: ['all-price-list-items'] });
      toast.success('Precios actualizados');
    },
  });
}

export function useDeletePriceOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { price_list_id: string; item_carta_id: string }) => {
      const { error } = await supabase
        .from('price_list_items' as any)
        .delete()
        .eq('price_list_id', params.price_list_id)
        .eq('item_carta_id', params.item_carta_id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['price-list-items', vars.price_list_id] });
      qc.invalidateQueries({ queryKey: ['all-price-list-items'] });
    },
  });
}

export function useUnifyPrices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      source: 'default' | string;
      targetChannels: Channel[];
    }) => {
      let sourceItems: Array<{ id: string; precio_base: number }>;

      if (params.source === 'default') {
        const { data, error } = await supabase
          .from('items_carta')
          .select('id, precio_base')
          .eq('activo', true);
        if (error) throw error;
        sourceItems = data || [];
      } else {
        const { data, error } = await supabase
          .from('price_list_items' as any)
          .select('item_carta_id, precio')
          .eq('price_list_id', params.source);
        if (error) throw error;
        sourceItems = ((data || []) as any[]).map(d => ({
          id: d.item_carta_id,
          precio_base: d.precio,
        }));
      }

      const { data: targetLists } = await supabase
        .from('price_lists' as any)
        .select('id, channel')
        .in('channel', params.targetChannels);

      for (const list of (targetLists || []) as unknown as PriceList[]) {
        const rows = sourceItems.map(s => ({
          price_list_id: list.id,
          item_carta_id: s.id,
          precio: s.precio_base,
          updated_at: new Date().toISOString(),
        }));
        if (rows.length) {
          const { error } = await supabase
            .from('price_list_items' as any)
            .upsert(rows, { onConflict: 'price_list_id,item_carta_id' });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['price-list-items'] });
      qc.invalidateQueries({ queryKey: ['all-price-list-items'] });
      qc.invalidateQueries({ queryKey: ['price-lists'] });
      toast.success('Precios unificados exitosamente');
    },
  });
}

export function useChannelPrice(channel: Channel | null | undefined, itemId: string) {
  const { data: lists } = usePriceLists();
  const priceList = lists?.find(l => l.channel === channel && l.is_active);
  const { data: items } = usePriceListItems(priceList?.id);
  const item = items?.find(i => i.item_carta_id === itemId);
  return item?.precio ?? null;
}

export function useInitializePriceLists() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: existing } = await supabase
        .from('price_lists' as any)
        .select('channel');
      const existingChannels = new Set(((existing || []) as any[]).map(e => e.channel));

      const toCreate = CHANNELS.filter(c => !existingChannels.has(c.value));
      if (toCreate.length === 0) return;

      const rows = toCreate.map(c => ({
        name: `Lista ${c.label}`,
        channel: c.value,
        is_default: c.value === 'mostrador' || c.value === 'webapp',
        pricing_mode: (c.value === 'mostrador' || c.value === 'webapp') ? 'base' : 'manual',
        pricing_value: 0,
      }));

      const { error } = await supabase
        .from('price_lists' as any)
        .insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['price-lists'] });
    },
  });
}
