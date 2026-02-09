import { useParams, useOutletContext } from 'react-router-dom';
import { CargadorRdoUnificado } from '@/components/rdo/CargadorRdoUnificado';
import type { Tables } from '@/integrations/supabase/types';

export default function RdoLoaderPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const context = useOutletContext<{ branch?: Tables<'branches'> }>();

  return (
    <div className="p-6">
      <CargadorRdoUnificado branchId={branchId!} branchName={context?.branch?.name} />
    </div>
  );
}
