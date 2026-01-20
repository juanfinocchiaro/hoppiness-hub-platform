import { useOutletContext } from 'react-router-dom';
import StockMovementHistory from '@/components/stock/StockMovementHistory';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface ContextType {
  branch: Branch;
}

export default function LocalStockHistorial() {
  const { branch } = useOutletContext<ContextType>();

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Historial de Stock</h1>
        <p className="text-muted-foreground">
          Movimientos de inventario de {branch.name}
        </p>
      </div>

      <StockMovementHistory branchId={branch.id} limit={100} />
    </div>
  );
}
