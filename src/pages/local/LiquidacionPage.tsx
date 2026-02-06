import { useOutletContext } from 'react-router-dom';
import LaborHoursSummary from '@/components/local/LaborHoursSummary';
import { PageHelp } from '@/components/ui/PageHelp';
import type { Tables } from '@/integrations/supabase/types';

interface OutletContext {
  branch: Tables<'branches'>;
}

export default function LiquidacionPage() {
  const { branch } = useOutletContext<OutletContext>();

  return (
    <div className="p-4 md:p-6 space-y-4">
      <PageHelp pageId="local-liquidacion" />
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Liquidación</h1>
        <p className="text-sm text-muted-foreground">
          Resumen mensual de horas trabajadas para liquidación de haberes
        </p>
      </div>
      
      <LaborHoursSummary branchId={branch?.id} />
    </div>
  );
}
