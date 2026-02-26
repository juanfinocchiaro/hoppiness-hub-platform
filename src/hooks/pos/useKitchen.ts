/**
 * useKitchen - Pedidos para cocina con realtime y modificadores
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface KitchenModificador {
  id: string;
  descripcion: string;
  tipo: string;
  precio_extra: number | null;
}

export interface KitchenItem {
  id: string;
  nombre: string | null;
  cantidad: number;
  notas: string | null;
  estacion: string | null;
  estado: string;
  pedido_item_modificadores: KitchenModificador[];
}

export interface KitchenPedido {
  id: string;
  numero_pedido: number;
  tipo_servicio: string | null;
  numero_llamador: number | null;
  canal_venta: string | null;
  cliente_nombre: string | null;
  cliente_user_id: string | null;
  created_at: string;
  estado: string;
  tiempo_listo: string | null;
  tiempo_inicio_prep: string | null;
  origen: string | null;
  pedido_items: KitchenItem[];
}

export function useKitchen(branchId: string) {
  const qc = useQueryClient();
  const prevIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);

  const query = useQuery({
    queryKey: ['pos-kitchen', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos')
        .select(
          'id, numero_pedido, tipo_servicio, numero_llamador, canal_venta, cliente_nombre, cliente_user_id, created_at, estado, tiempo_listo, tiempo_inicio_prep, origen, pedido_items(id, nombre, cantidad, notas, estacion, estado, pedido_item_modificadores(id, descripcion, tipo, precio_extra))',
        )
        .eq('branch_id', branchId)
        .in('estado', ['pendiente', 'confirmado', 'en_preparacion', 'listo'])
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as KitchenPedido[];
    },
    enabled: !!branchId,
    refetchInterval: 30000, // fallback polling every 30s
  });

  // Detect new orders for sound alert
  const newOrderDetected = useRef(false);
  useEffect(() => {
    if (!query.data) return;
    const currentIds = new Set(query.data.map((p) => p.id));
    if (initialLoadDone.current) {
      for (const id of currentIds) {
        if (!prevIdsRef.current.has(id)) {
          newOrderDetected.current = true;
          break;
        }
      }
    }
    prevIdsRef.current = currentIds;
    initialLoadDone.current = true;
  }, [query.data]);

  // Realtime subscription
  useEffect(() => {
    if (!branchId) return;
    const channel = supabase
      .channel(`kitchen-${branchId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos', filter: `branch_id=eq.${branchId}` },
        () => {
          qc.invalidateQueries({ queryKey: ['pos-kitchen', branchId] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [branchId, qc]);

  return {
    ...query,
    consumeNewOrderAlert: () => {
      if (newOrderDetected.current) {
        newOrderDetected.current = false;
        return true;
      }
      return false;
    },
  };
}
