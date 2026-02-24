/**
 * usePosClosureData - Datos para generar shift_closure desde POS
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePosClosureData(
  branchId: string,
  fecha: string,
  turno: string
) {
  return useQuery({
    queryKey: ['pos-closure-data', branchId, fecha, turno],
    queryFn: async () => {
      let query = supabase
        .from('pedidos')
        .select('*, pedido_items(*), pedido_pagos(*)')
        .eq('branch_id', branchId)
        .in('estado', ['entregado', 'completado', 'listo'])
        .gte('created_at', `${fecha}T00:00:00`)
        .lt('created_at', `${fecha}T23:59:59`);

      if (turno === 'noche') {
        query = query.gte('created_at', `${fecha}T18:00:00`);
      } else if (turno === 'mediodia') {
        query = query.lt('created_at', `${fecha}T18:00:00`);
      }

      const { data } = await query;
      return data ?? [];
    },
    enabled: !!branchId && !!fecha && !!turno,
  });
}
