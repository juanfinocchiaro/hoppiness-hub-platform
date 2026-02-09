import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Landmark, CheckCircle, XCircle, ChevronDown, ChevronUp, AlertCircle, Clock } from 'lucide-react';
import { useCanonLiquidaciones, usePagosCanon } from '@/hooks/useCanonLiquidaciones';
import { VerificarPagoModal } from '@/components/finanzas/VerificarPagoModal';
import { EmptyState } from '@/components/ui/states';

function PagosDetalleRow({ canonId }: { canonId: string }) {
  const { data: pagos, isLoading } = usePagosCanon(canonId);
  const [verificando, setVerificando] = useState<any>(null);

  if (isLoading) return <div className="p-2"><Skeleton className="h-5 w-full" /></div>;
  if (!pagos?.length) return (
    <p className="text-sm text-muted-foreground p-3 text-center">
      El local aún no registró pagos para esta liquidación
    </p>
  );

  const pendientes = pagos.filter((p: any) => !p.verificado);
  const verificados = pagos.filter((p: any) => p.verificado);

  return (
    <div className="space-y-3">
      {pendientes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-amber-700 uppercase tracking-wide flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Pendientes de verificación ({pendientes.length})
          </p>
          {pendientes.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between text-sm border border-amber-200 bg-amber-50 rounded-lg p-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="font-mono font-semibold">$ {Number(p.monto).toLocaleString('es-AR')}</span>
                <span className="text-muted-foreground">{formatLocalDate(p.fecha_pago)}</span>
                <Badge variant="outline" className="w-fit">{p.medio_pago}</Badge>
                {p.referencia && <span className="text-xs text-muted-foreground">Ref: {p.referencia}</span>}
                {p.observaciones && <span className="text-xs text-muted-foreground italic">{p.observaciones}</span>}
              </div>
              <Button size="sm" onClick={() => setVerificando(p)} className="shrink-0">
                Verificar
              </Button>
            </div>
          ))}
        </div>
      )}

      {verificados.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-green-700 uppercase tracking-wide flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Verificados ({verificados.length})
          </p>
          {verificados.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between text-sm border rounded p-2 opacity-70">
              <div className="flex items-center gap-3">
                <span className="font-mono">$ {Number(p.monto).toLocaleString('es-AR')}</span>
                <span className="text-muted-foreground">{formatLocalDate(p.fecha_pago)}</span>
                <span className="text-muted-foreground">{p.medio_pago}</span>
              </div>
              <Badge variant="default" className="gap-1">
                <CheckCircle className="w-3 h-3" /> Verificado
              </Badge>
            </div>
          ))}
        </div>
      )}

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

function formatLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-AR');
}

export default function CanonPage() {
  const { data: liquidaciones, isLoading } = useCanonLiquidaciones();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');

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

  const filtered = liquidaciones?.filter((row: any) => {
    if (filtroEstado === 'todos') return true;
    return row.estado === filtroEstado;
  }) ?? [];

  // Count pending payments across all liquidaciones (for alert)
  const totalPendientes = liquidaciones?.filter((r: any) => r.estado !== 'pagado').length ?? 0;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Canon y Liquidaciones"
        subtitle="Verificá los pagos registrados por cada local antes de dar por cancelada la liquidación"
      />

      {totalPendientes > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <Clock className="w-4 h-4 shrink-0" />
          <span><strong>{totalPendientes}</strong> liquidaciones con saldo pendiente</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="parcial">Parcial</SelectItem>
            <SelectItem value="pagado">Pagado</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filtered.length} liquidaciones
        </span>
      </div>

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
            ) : !filtered.length ? (
              <TableRow>
                <TableCell colSpan={8} className="h-40">
                  <EmptyState icon={Landmark} title="Sin liquidaciones" description="Las liquidaciones se generan automáticamente al cargar ventas mensuales" />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row: any) => (
                <>
                  <TableRow key={row.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setExpanded(expanded === row.id ? null : row.id)}>
                    <TableCell>
                      {expanded === row.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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
                  </TableRow>
                  {expanded === row.id && (
                    <TableRow key={`${row.id}-pagos`}>
                      <TableCell colSpan={8} className="bg-muted/30 p-4">
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
    </div>
  );
}
