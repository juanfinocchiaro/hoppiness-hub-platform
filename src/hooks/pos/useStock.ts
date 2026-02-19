/**
 * useStock - Stock en tiempo real + stock inicial y ajuste
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useStock(branchId: string) {
  return useQuery({
    queryKey: ['pos-stock', branchId],
    queryFn: async () => {
      const { data } = await supabase
        .from('stock_actual')
        .select('*, insumos(nombre, unidad_base)')
        .eq('branch_id', branchId);
      return data ?? [];
    },
    enabled: !!branchId,
  });
}

export type StockInicialItem = { insumo_id: string; cantidad: number };

export function useStockInicialMutation(branchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: StockInicialItem[]) => {
      if (!branchId || items.length === 0) return;
      for (const it of items) {
        const { data: insumo } = await supabase
          .from('insumos')
          .select('unidad_base')
          .eq('id', it.insumo_id)
          .single();
        const unidad = (insumo?.unidad_base as string) ?? 'un';
        const { data: existing } = await supabase
          .from('stock_actual')
          .select('cantidad')
          .eq('branch_id', branchId)
          .eq('insumo_id', it.insumo_id)
          .maybeSingle();
        const cantidadAnterior = Number(existing?.cantidad ?? 0);
        const cantidadNueva = cantidadAnterior + it.cantidad;
        const { error: errUpsert } = await supabase
          .from('stock_actual')
          .upsert(
            {
              branch_id: branchId,
              insumo_id: it.insumo_id,
              cantidad: cantidadNueva,
              unidad,
            },
            { onConflict: 'branch_id,insumo_id' }
          );
        if (errUpsert) throw errUpsert;
        const { error: errMov } = await supabase.from('stock_movimientos').insert({
          branch_id: branchId,
          insumo_id: it.insumo_id,
          tipo: 'ajuste',
          cantidad: it.cantidad,
          cantidad_anterior: cantidadAnterior,
          cantidad_nueva: cantidadNueva,
          motivo: 'Stock inicial',
        });
        if (errMov) throw errMov;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-stock', branchId] });
      toast.success('Stock inicial cargado');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAjusteStockMutation(branchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { insumo_id: string; cantidad_nueva: number; motivo: string }) => {
      const { data: insumo } = await supabase
        .from('insumos')
        .select('unidad_base')
        .eq('id', p.insumo_id)
        .single();
      const unidad = (insumo?.unidad_base as string) ?? 'un';
      const { data: row } = await supabase
        .from('stock_actual')
        .select('cantidad')
        .eq('branch_id', branchId)
        .eq('insumo_id', p.insumo_id)
        .maybeSingle();
      const cantidadAnterior = Number(row?.cantidad ?? 0);
      const { error: errUpsert } = await supabase.from('stock_actual').upsert(
        {
          branch_id: branchId,
          insumo_id: p.insumo_id,
          cantidad: p.cantidad_nueva,
          unidad,
        },
        { onConflict: 'branch_id,insumo_id' }
      );
      if (errUpsert) throw errUpsert;
      const { error: errMov } = await supabase.from('stock_movimientos').insert({
        branch_id: branchId,
        insumo_id: p.insumo_id,
        tipo: 'ajuste',
        cantidad: Math.abs(p.cantidad_nueva - cantidadAnterior),
        cantidad_anterior: cantidadAnterior,
        cantidad_nueva: p.cantidad_nueva,
        motivo: p.motivo || 'Ajuste de stock',
      });
      if (errMov) throw errMov;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-stock', branchId] });
      toast.success('Stock ajustado');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
