import { useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import KDSView from '@/components/pos/KDSView';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';

export default function LocalKDS() {
  const { branchId } = useParams<{ branchId: string }>();

  const { data: branch, isLoading, error } = useQuery({
    queryKey: ['branch', branchId],
    queryFn: async () => {
      if (!branchId) return null;
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('id', branchId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!branchId,
  });

  if (isLoading) {
    return <HoppinessLoader fullScreen size="lg" text="Cargando cocina" />;
  }

  if (error || !branch) {
    return <Navigate to="/local" replace />;
  }

  return <KDSView branch={branch} />;
}
