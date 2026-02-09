import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCard, Landmark } from 'lucide-react';
import { useCanonLiquidaciones } from '@/hooks/useCanonLiquidaciones';
import { PagoCanonModal } from '@/components/finanzas/PagoCanonModal';
import { EmptyState } from '@/components/ui/states';
import type { CanonLiquidacion } from '@/types/ventas';

export default function CanonPage() {
  const { data: liquidaciones, isLoading } = useCanonLiquidaciones();
  const [payingCanon, setPayingCanon] = useState<CanonLiquidacion | null>(null);

  const formatPeriodo = (p: string) => {
    const [y, m] = p.split('-');
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${meses[parseInt(m) - 1]} ${y}`;
  };

  const estadoBadge = (estado: string | null) => {
    if (estado === 'pagado') return <Badge variant="default">Pagado</Badge>;
    if (estado === 'parcial') return <Badge variant="secondary">Parcial</Badge>;
    return <Badge variant="destructive">Pendiente</Badge>;
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Canon y Liquidaciones"
        subtitle="Control de liquidaciones de canon por sucursal y período"
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Período</TableHead>
              <TableHead>Sucursal</TableHead>
              <TableHead className="text-right">Canon</TableHead>
              <TableHead className="text-right">Marketing</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : !liquidaciones?.length ? (
              <TableRow>
                <TableCell colSpan={8} className="h-40">
                  <EmptyState icon={Landmark} title="Sin liquidaciones" description="Las liquidaciones se generan al cargar ventas mensuales" />
                </TableCell>
              </TableRow>
            ) : (
              liquidaciones.map((row: any) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{formatPeriodo(row.periodo)}</TableCell>
                  <TableCell>{row.branches?.name || '-'}</TableCell>
                  <TableCell className="text-right font-mono">
                    $ {Number(row.canon_monto).toLocaleString('es-AR')}
                    <span className="text-xs text-muted-foreground ml-1">({row.canon_porcentaje}%)</span>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    $ {Number(row.marketing_monto).toLocaleString('es-AR')}
                    <span className="text-xs text-muted-foreground ml-1">({row.marketing_porcentaje}%)</span>
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">$ {Number(row.total_canon).toLocaleString('es-AR')}</TableCell>
                  <TableCell>{estadoBadge(row.estado)}</TableCell>
                  <TableCell className="text-right font-mono text-destructive">
                    {Number(row.saldo_pendiente) > 0 ? `$ ${Number(row.saldo_pendiente).toLocaleString('es-AR')}` : '-'}
                  </TableCell>
                  <TableCell>
                    {Number(row.saldo_pendiente) > 0 && (
                      <Button variant="ghost" size="icon" title="Registrar pago" onClick={() => setPayingCanon(row)}>
                        <CreditCard className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PagoCanonModal open={!!payingCanon} onOpenChange={() => setPayingCanon(null)} canon={payingCanon} />
    </div>
  );
}
