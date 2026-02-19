/**
 * useRegister - Turnos de caja
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRegister(branchId: string) {
  return useQuery({
    queryKey: ['pos-register', branchId],
    queryFn: async () => {
      const { data } = await supabase
        .from('turnos_caja')
        .select('*')
        .eq('branch_id', branchId)
        .eq('estado', 'abierto')
        .maybeSingle();
      return data;
    },
    enabled: !!branchId,
  });
}
