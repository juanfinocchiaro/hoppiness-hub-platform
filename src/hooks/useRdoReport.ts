import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { RdoReportLine } from '@/types/rdo';

export function useRdoReport(branchId: string, periodo: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['rdo-report', branchId, periodo],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_rdo_report', {
          _branch_id: branchId,
          _periodo: periodo,
        });

      if (error) throw error;
      return (data || []) as RdoReportLine[];
    },
    enabled: !!user && !!branchId && !!periodo,
  });
}
