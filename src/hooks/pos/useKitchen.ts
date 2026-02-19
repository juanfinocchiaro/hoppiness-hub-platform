/**
 * useKitchen - Pedidos para cocina (realtime)
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useKitchen(branchId: string) {
  return useQuery({
    queryKey: ['pos-kitchen', branchId],
    queryFn: async () => {
      const { data } = await supabase
        .from('pedidos')
        .select('*, pedido_items(*)')
        .eq('branch_id', branchId)
        .in('estado', ['pendiente', 'en_preparacion', 'listo'])
        .order('created_at', { ascending: true });
      return data ?? [];
    },
    enabled: !!branchId,
  });
}
