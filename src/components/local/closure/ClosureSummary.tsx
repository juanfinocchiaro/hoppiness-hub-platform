/**
 * ClosureSummary - Real-time summary of closure data
 */
import { Card, CardContent } from '@/components/ui/card';
import { UtensilsCrossed, DollarSign, Banknote, CreditCard } from 'lucide-react';

interface ClosureSummaryProps {
  totalHamburguesas: number;
  totalVendido: number;
  totalEfectivo: number;
  totalDigital: number;
  totalFacturado: number;
}

export function ClosureSummary({
  totalHamburguesas,
  totalVendido,
  totalEfectivo,
  totalDigital,
  totalFacturado,
}: ClosureSummaryProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(value);

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {/* Hamburguesas */}
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <UtensilsCrossed className="w-4 h-4" />
              <span className="text-xs">Hamburguesas</span>
            </div>
            <p className="text-xl font-bold">{totalHamburguesas}</p>
          </div>
          
          {/* Total vendido */}
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs">Vendido</span>
            </div>
            <p className="text-xl font-bold text-primary">{formatCurrency(totalVendido)}</p>
          </div>
          
          {/* Efectivo */}
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Banknote className="w-4 h-4" />
              <span className="text-xs">Efectivo</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(totalEfectivo)}</p>
          </div>
          
          {/* Digital */}
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <CreditCard className="w-4 h-4" />
              <span className="text-xs">Digital</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(totalDigital)}</p>
          </div>
        </div>
        
        {/* Facturado */}
        {totalFacturado > 0 && (
          <div className="mt-4 pt-3 border-t text-center">
            <span className="text-sm text-muted-foreground">Facturado: </span>
            <span className="font-bold">{formatCurrency(totalFacturado)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
