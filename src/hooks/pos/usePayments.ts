/**
 * usePayments - Pagos de pedidos
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePayments(pedidoId: string | undefined) {
  return useQuery({
    queryKey: ['pos-payments', pedidoId],
    queryFn: async () => {
      const { data } = await supabase
        .from('pedido_pagos')
        .select('*')
        .eq('pedido_id', pedidoId!);
      return data ?? [];
    },
    enabled: !!pedidoId,
  });
}
