/**
 * useOrderItems - Items de un pedido
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useOrderItems(pedidoId: string | undefined) {
  return useQuery({
    queryKey: ['pos-order-items', pedidoId],
    queryFn: async () => {
      const { data } = await supabase.from('pedido_items').select('*').eq('pedido_id', pedidoId!);
      return data ?? [];
    },
    enabled: !!pedidoId,
  });
}
