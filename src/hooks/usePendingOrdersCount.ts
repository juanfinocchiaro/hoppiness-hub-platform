import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function usePendingOrdersCount(branchId: string | undefined) {
  const db = supabase as any;
  
  const { data: count = 0, refetch } = useQuery({
    queryKey: ['pending-orders-count', branchId],
    queryFn: async (): Promise<number> => {
      if (!branchId) return 0;
      
      const { count } = await db
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('branch_id', branchId)
        .eq('integration_status', 'pending');
      
      return count || 0;
    },
    enabled: !!branchId,
    refetchInterval: 15000,
  });

  // Realtime subscription for updates
  useEffect(() => {
    if (!branchId) return;

    const channel = supabase
      .channel(`pending-count-${branchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `branch_id=eq.${branchId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [branchId, refetch]);

  return count;
}
