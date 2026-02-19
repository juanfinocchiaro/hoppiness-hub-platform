import { useOutletContext } from 'react-router-dom';
import type { Tables } from '@/integrations/supabase/types';
import RegulationSignaturesPanel from '@/components/local/RegulationSignaturesPanel';

interface OutletContext {
  branch: Tables<'branches'>;
}

export default function RegulationsPage() {
  const { branch } = useOutletContext<OutletContext>();

  if (!branch?.id) return null;

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Firmas de Reglamento</h1>
        <p className="text-muted-foreground">
          Gestión de firmas del reglamento interno para el equipo
        </p>
      </div>

      <RegulationSignaturesPanel branchId={branch.id} />
    </div>
  );
}
