import { Wallet } from 'lucide-react';
import { useShiftStatus } from '@/hooks/useShiftStatus';

interface CashStatusIndicatorProps {
  branchId: string;
}

/**
 * Simple cash status indicator for the header.
 * Only shows when cash register is open, with current balance.
 * Returns null when cash is closed (no visual).
 */
export function CashStatusIndicator({ branchId }: CashStatusIndicatorProps) {
  const shiftStatus = useShiftStatus(branchId);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Don't show anything while loading or when cash is closed
  if (shiftStatus.loading || !shiftStatus.hasCashOpen) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm bg-muted/50 px-3 py-1.5 rounded-lg">
      <Wallet className="h-4 w-4 text-muted-foreground" />
      <span className="text-muted-foreground">Caja:</span>
      <span className="font-semibold text-primary">
        {formatCurrency(shiftStatus.activeCashShift?.current_balance || 0)}
      </span>
    </div>
  );
}
