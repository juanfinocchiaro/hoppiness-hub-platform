import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePosEnabled(branchId: string | undefined) {
  const { data } = useQuery({
    queryKey: ['pos-config', branchId],
    queryFn: async () => {
      if (!branchId) return null;
      try {
        const { data: row } = await supabase
          .from('pos_config')
          .select('pos_enabled')
          .eq('branch_id', branchId)
          .maybeSingle();
        return row;
      } catch {
        return null;
      }
    },
    enabled: !!branchId,
  });

  return data?.pos_enabled ?? false;
}
