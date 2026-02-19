/**
 * useDelivery - Cadetes y asignación
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useDelivery(branchId: string) {
  return useQuery({
    queryKey: ['pos-delivery', branchId],
    queryFn: async () => {
      const { data } = await supabase
        .from('cadetes')
        .select('*')
        .eq('branch_id', branchId)
        .eq('activo', true);
      return data ?? [];
    },
    enabled: !!branchId,
  });
}
