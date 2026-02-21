import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type Channel = 'mostrador' | 'webapp' | 'rappi' | 'pedidos_ya' | 'mp_delivery';

export const CHANNELS: { value: Channel; label: string }[] = [
  { value: 'mostrador', label: 'Mostrador' },
  { value: 'webapp', label: 'WebApp' },
  { value: 'rappi', label: 'Rappi' },
  { value: 'pedidos_ya', label: 'Pedidos Ya' },
  { value: 'mp_delivery', label: 'MercadoPago Delivery' },
];

export interface PriceList {
  id: string;
  name: string;
  channel: Channel;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

export interface PriceListItem {
  id: string;
  price_list_id: string;
  item_carta_id: string;
  precio: number;
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

export function useCreatePriceList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { name: string; channel: Channel }) => {
      const { data, error } = await supabase
        .from('price_lists' as any)
        .insert({ name: params.name, channel: params.channel })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PriceList;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['price-lists'] });
      toast.success('Lista de precios creada');
    },
  });
}

export function useUpdatePriceListItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { price_list_id: string; item_carta_id: string; precio: number }) => {
      const { data, error } = await supabase
        .from('price_list_items' as any)
        .upsert({
          price_list_id: params.price_list_id,
          item_carta_id: params.item_carta_id,
          precio: params.precio,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'price_list_id,item_carta_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['price-list-items', vars.price_list_id] });
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
      toast.success('Precios actualizados');
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
