/**
 * useIsClockedInAtBranch - Indica si el usuario está fichado (clock_in sin clock_out) en el branch.
 * Usado para restringir acceso al panel Local a cajeros que deben fichar primero.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useIsClockedInAtBranch(branchId: string | undefined) {
  const { user } = useAuth();

  const { data: isClockedIn, isLoading } = useQuery({
    queryKey: ['clocked-in-at-branch', user?.id, branchId],
    queryFn: async (): Promise<boolean> => {
      if (!user?.id || !branchId) return false;
      const { data, error } = await supabase
        .from('clock_entries')
        .select('entry_type')
        .eq('user_id', user.id)
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.entry_type === 'clock_in';
    },
    enabled: !!user?.id && !!branchId,
    staleTime: 30 * 1000,
  });

  return { isClockedIn: isClockedIn ?? false, isLoading };
}
