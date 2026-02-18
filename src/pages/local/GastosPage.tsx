import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { DataToolbar } from '@/components/ui/data-table-pro';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Receipt, Download, Clock, Check, X } from 'lucide-react';
import { exportToExcel } from '@/lib/exportExcel';
import { useGastos, useGastoMutations, GASTO_APPROVAL_THRESHOLD } from '@/hooks/useGastos';
import { useDynamicPermissions } from '@/hooks/useDynamicPermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { GastoFormModal } from '@/components/finanzas/GastoFormModal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/states';
import { CATEGORIA_GASTO_OPTIONS } from '@/types/compra';
import type { Gasto } from '@/types/compra';

export default function GastosPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: gastos, isLoading } = useGastos(branchId!);
  const { softDelete, approve, reject } = useGastoMutations();
  const { isFranquiciado, isSuperadmin } = useDynamicPermissions(branchId);
  const canApproveGastos = isFranquiciado || isSuperadmin;
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Gasto | null>(null);
  const [deleting, setDeleting] = useState<Gasto | null>(null);

  const filtered = gastos?.filter((g) => {
    const matchesSearch = g.concepto.toLowerCase().includes(search.toLowerCase()) ||
      g.categoria_principal.toLowerCase().includes(search.toLowerCase());
    const matchesFrom = !dateFrom || (g.fecha && g.fecha >= dateFrom);
    const matchesTo = !dateTo || (g.fecha && g.fecha <= dateTo);
    return matchesSearch && matchesFrom && matchesTo;
  });

  const getCategoriaLabel = (key: string) =>
    CATEGORIA_GASTO_OPTIONS.find(c => c.value === key)?.label || key;

  const pendingApproval = gastos?.filter(g => g.estado === 'pendiente_aprobacion' && !g.deleted_at) || [];
  const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n);

  const estadoBadge = (row: any) => {
    const estado = row.estado;
    if (estado === 'pendiente_aprobacion') return <Badge variant="outline" className="gap-1 border-amber-300 text-amber-700 bg-amber-50"><Clock className="w-3 h-3" />Esperando aprobación</Badge>;
    if (estado === 'pagado') return <Badge variant="default">Pagado</Badge>;
    if (estado === 'pendiente' && row.fecha_vencimiento && new Date(row.fecha_vencimiento) < new Date()) {
      return <Badge variant="destructive">Vencido</Badge>;
    }
    if (estado === 'pendiente') return <Badge variant="secondary">Pendiente</Badge>;
    if (estado === 'parcial') return <Badge variant="secondary">Parcial</Badge>;
    return <Badge variant="secondary">Pendiente</Badge>;
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Caja Chica"
        subtitle="Desembolsos pequeños sin factura: propinas, viáticos, imprevistos"
        actions={
          <div className="flex gap-2">
            {filtered && filtered.length > 0 && (
              <Button variant="outline" onClick={() => exportToExcel(
                filtered.map(g => ({
                  fecha: g.fecha ? new Date(g.fecha + 'T12:00:00').toLocaleDateString('es-AR') : '-',
                  categoria: getCategoriaLabel(g.categoria_principal),
                  concepto: g.concepto,
                  monto: g.monto,
                  estado: g.estado || '-',
                  vencimiento: g.fecha_vencimiento ? new Date(g.fecha_vencimiento + 'T12:00:00').toLocaleDateString('es-AR') : '-',
                })),
                { fecha: 'Fecha', categoria: 'Categoría', concepto: 'Concepto', monto: 'Monto', estado: 'Estado', vencimiento: 'Vencimiento' },
                { filename: 'gastos' }
              )}>
                <Download className="w-4 h-4 mr-2" /> Excel
              </Button>
            )}
            <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Nuevo Gasto
            </Button>
          </div>
        }
      />

      {/* Pending approval section */}
      {canApproveGastos && pendingApproval.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700">
              <Clock className="w-4 h-4" />
              Gastos pendientes de aprobación ({pendingApproval.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingApproval.map(g => (
              <div key={g.id} className="flex items-center justify-between p-3 bg-white rounded-lg border gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{g.concepto}</p>
                  <p className="text-sm text-muted-foreground">
                    {getCategoriaLabel(g.categoria_principal)} · {g.fecha} · <span className="font-semibold text-amber-700">{fmt(g.monto)}</span>
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="default" className="gap-1" onClick={() => approve.mutate(g.id)} disabled={approve.isPending}>
                    <Check className="w-3.5 h-3.5" />Aprobar
                  </Button>
                  <Button size="sm" variant="destructive" className="gap-1" onClick={() => reject.mutate(g.id)} disabled={reject.isPending}>
                    <X className="w-3.5 h-3.5" />Rechazar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <DataToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por concepto o categoría..."
        filters={<DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />}
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : !filtered?.length ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40">
                  <EmptyState icon={Receipt} title="Sin gastos de caja chica" description="Registrá el primer gasto de caja chica del local" />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-sm">{new Date(row.fecha).toLocaleDateString('es-AR')}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getCategoriaLabel(row.categoria_principal)}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{row.concepto}</TableCell>
                  <TableCell className="text-right font-mono">$ {Number(row.monto).toLocaleString('es-AR')}</TableCell>
                  <TableCell>{estadoBadge(row)}</TableCell>
                  <TableCell className="text-sm">
                    {row.fecha_vencimiento ? (
                      <span className={new Date(row.fecha_vencimiento) < new Date() && row.estado !== 'pagado' ? 'text-destructive font-medium' : ''}>
                        {new Date(row.fecha_vencimiento).toLocaleDateString('es-AR')}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(row); setModalOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleting(row)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <GastoFormModal
        open={modalOpen}
        onOpenChange={(open) => { setModalOpen(open); if (!open) setEditing(null); }}
        branchId={branchId!}
        gasto={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={() => setDeleting(null)}
        title="Eliminar gasto"
        description={`¿Eliminar "${deleting?.concepto}"?`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={async () => {
          if (deleting) await softDelete.mutateAsync(deleting.id);
          setDeleting(null);
        }}
      />
    </div>
  );
}
