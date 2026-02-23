import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export interface PromocionItem {
  id: string;
  promocion_id: string;
  item_carta_id: string;
  precio_promo: number;
  created_at: string;
  item_nombre?: string;
  item_imagen?: string | null;
  precio_base?: number;
}

export type PromocionFormData = Omit<Promocion, 'id' | 'created_at'>;

export function usePromociones() {
  return useQuery({
    queryKey: ['promociones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promociones')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as unknown as Promocion[]).map(p => ({
        ...p,
        canales: p.canales ?? ['webapp', 'salon', 'rappi', 'pedidos_ya'],
      }));
    },
  });
}

/** Fetch items attached to a promotion, with carta info */
export function usePromocionItems(promoId: string | undefined) {
  return useQuery({
    queryKey: ['promocion-items', promoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promocion_items')
        .select('*, items_carta!inner(nombre, imagen_url, precio_base)')
        .eq('promocion_id', promoId!);
      if (error) throw error;
      return (data || []).map((d: any) => ({
        id: d.id,
        promocion_id: d.promocion_id,
        item_carta_id: d.item_carta_id,
        precio_promo: Number(d.precio_promo),
        created_at: d.created_at,
        item_nombre: d.items_carta?.nombre,
        item_imagen: d.items_carta?.imagen_url,
        precio_base: d.items_carta?.precio_base ? Number(d.items_carta.precio_base) : undefined,
      })) as PromocionItem[];
    },
    enabled: !!promoId,
  });
}

/** Get active promos for a specific branch + channel, evaluated by current day/time */
export function useActivePromos(branchId: string | undefined, canal?: string) {
  return useQuery({
    queryKey: ['active-promos', branchId, canal],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promociones')
        .select('*')
        .eq('activa', true)
        .is('deleted_at', null);
      if (error) throw error;

      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const today = now.toISOString().slice(0, 10);

      return (data as unknown as Promocion[]).filter((p) => {
        if (p.branch_ids.length > 0 && (!branchId || !p.branch_ids.includes(branchId))) return false;
        if (canal && p.canales && !p.canales.includes(canal)) return false;
        if (!p.dias_semana.includes(currentDay)) return false;
        if (p.hora_inicio && currentTime < p.hora_inicio) return false;
        if (p.hora_fin && currentTime > p.hora_fin) return false;
        if (p.fecha_inicio && today < p.fecha_inicio) return false;
        if (p.fecha_fin && today > p.fecha_fin) return false;
        return true;
      }).map(p => ({
        ...p,
        canales: p.canales ?? ['webapp', 'salon', 'rappi', 'pedidos_ya'],
      }));
    },
    enabled: !!branchId,
    refetchInterval: 5 * 60 * 1000,
  });
}

/** Get active promo items (with prices) for a channel + branch */
export function useActivePromoItems(branchId: string | undefined, canal?: string) {
  const { data: promos = [] } = useActivePromos(branchId, canal);
  const promoIds = promos.map(p => p.id);

  return useQuery({
    queryKey: ['active-promo-items', promoIds],
    queryFn: async () => {
      if (promoIds.length === 0) return [];
      const { data, error } = await supabase
        .from('promocion_items')
        .select('*, items_carta!inner(nombre, imagen_url, precio_base)')
        .in('promocion_id', promoIds);
      if (error) throw error;
      return (data || []).map((d: any) => ({
        id: d.id,
        promocion_id: d.promocion_id,
        item_carta_id: d.item_carta_id,
        precio_promo: Number(d.precio_promo),
        created_at: d.created_at,
        item_nombre: d.items_carta?.nombre,
        item_imagen: d.items_carta?.imagen_url,
        precio_base: d.items_carta?.precio_base ? Number(d.items_carta.precio_base) : undefined,
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

  const create = useMutation({
    mutationFn: async (data: PromocionFormData & { items?: Array<{ item_carta_id: string; precio_promo: number }> }) => {
      const { items, ...promoData } = data;
      const { data: result, error } = await supabase
        .from('promociones')
        .insert({ ...promoData, created_by: user?.id } as any)
        .select()
        .single();
      if (error) throw error;

      if (items && items.length > 0) {
        const { error: itemsErr } = await supabase
          .from('promocion_items')
          .insert(items.map(i => ({ ...i, promocion_id: result.id })) as any);
        if (itemsErr) throw itemsErr;
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
    mutationFn: async ({ id, data, items }: {
      id: string;
      data: Partial<PromocionFormData>;
      items?: Array<{ item_carta_id: string; precio_promo: number }>;
    }) => {
      const { error } = await supabase
        .from('promociones')
        .update({ ...data, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;

      if (items !== undefined) {
        await supabase.from('promocion_items').delete().eq('promocion_id', id);
        if (items.length > 0) {
          const { error: itemsErr } = await supabase
            .from('promocion_items')
            .insert(items.map(i => ({ ...i, promocion_id: id })) as any);
          if (itemsErr) throw itemsErr;
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
      const { error } = await supabase
        .from('promociones')
        .update({ activa, updated_at: new Date().toISOString() } as any)
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
      const { error } = await supabase
        .from('promociones')
        .update({ deleted_at: new Date().toISOString() } as any)
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
