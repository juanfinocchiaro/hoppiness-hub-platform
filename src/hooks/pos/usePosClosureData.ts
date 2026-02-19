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
      const { data } = await supabase
        .from('pedidos')
        .select('*, pedido_items(*), pedido_pagos(*)')
        .eq('branch_id', branchId)
        .eq('estado', 'entregado');
      return data ?? [];
    },
    enabled: !!branchId && !!fecha && !!turno,
  });
}
