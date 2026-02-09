import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCard, Landmark, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useCanonLiquidaciones, usePagosCanon } from '@/hooks/useCanonLiquidaciones';
import { PagoCanonModal } from '@/components/finanzas/PagoCanonModal';
import { EmptyState } from '@/components/ui/states';
import { VerificarPagoModal } from '@/components/finanzas/VerificarPagoModal';
import type { CanonLiquidacion } from '@/types/ventas';

function PagosDetalleRow({ canonId }: { canonId: string }) {
  const { data: pagos, isLoading } = usePagosCanon(canonId);
  const [verificando, setVerificando] = useState<any>(null);

  if (isLoading) return <div className="p-2"><Skeleton className="h-5 w-full" /></div>;
  if (!pagos?.length) return <p className="text-sm text-muted-foreground p-2">Sin pagos registrados</p>;

  return (
    <div className="space-y-2">
      {pagos.map((p: any) => (
        <div key={p.id} className="flex items-center justify-between text-sm border rounded p-2">
          <div className="flex items-center gap-3">
            <span className="font-mono">$ {Number(p.monto).toLocaleString('es-AR')}</span>
            <span className="text-muted-foreground">{new Date(p.fecha_pago).toLocaleDateString('es-AR')}</span>
            <span className="text-muted-foreground">{p.medio_pago}</span>
            {p.referencia && <span className="text-xs text-muted-foreground">Ref: {p.referencia}</span>}
          </div>
          <div className="flex items-center gap-2">
            {p.verificado ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="w-3 h-3" /> Verificado
              </Badge>
            ) : (
              <>
                <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                  Pendiente verificación
                </Badge>
                <Button variant="outline" size="sm" onClick={() => setVerificando(p)}>
                  Verificar
                </Button>
              </>
            )}
          </div>
        </div>
      ))}
      {verificando && (
        <VerificarPagoModal
          open={!!verificando}
          onOpenChange={() => setVerificando(null)}
          pago={verificando}
        />
      )}
    </div>
  );
}

export default function CanonPage() {
  const { data: liquidaciones, isLoading } = useCanonLiquidaciones();
  const [payingCanon, setPayingCanon] = useState<CanonLiquidacion | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

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
        subtitle="Control de liquidaciones de canon por sucursal y período — Los pagos del local requieren verificación"
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
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
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : !liquidaciones?.length ? (
              <TableRow>
                <TableCell colSpan={9} className="h-40">
                  <EmptyState icon={Landmark} title="Sin liquidaciones" description="Las liquidaciones se generan al cargar ventas mensuales" />
                </TableCell>
              </TableRow>
            ) : (
              liquidaciones.map((row: any) => (
                <>
                  <TableRow key={row.id}>
                    <TableCell>
                      <button onClick={() => setExpanded(expanded === row.id ? null : row.id)}>
                        {expanded === row.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </TableCell>
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
                  {expanded === row.id && (
                    <TableRow key={`${row.id}-pagos`}>
                      <TableCell colSpan={9} className="bg-muted/30 p-4">
                        <p className="text-sm font-medium mb-2">Pagos registrados:</p>
                        <PagosDetalleRow canonId={row.id} />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PagoCanonModal open={!!payingCanon} onOpenChange={() => setPayingCanon(null)} canon={payingCanon} />
    </div>
  );
}
