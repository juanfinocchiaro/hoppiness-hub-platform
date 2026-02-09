import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { DataToolbar } from '@/components/ui/data-table-pro';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, ShoppingCart, ChevronDown, ChevronUp } from 'lucide-react';
import { useFacturas, useFacturaMutations } from '@/hooks/useCompras';
import { CompraFormModal } from '@/components/finanzas/CompraFormModal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/states';
import type { FacturaProveedor } from '@/types/compra';

/** Parse YYYY-MM-DD as local date to avoid UTC→local shift */
function formatLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-AR');
}

export default function ComprasPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: facturas, isLoading } = useFacturas(branchId!);
  const { softDelete } = useFacturaMutations();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<FacturaProveedor | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = facturas?.filter((f: any) =>
    f.proveedores?.razon_social?.toLowerCase().includes(search.toLowerCase()) ||
    f.factura_numero?.includes(search)
  );

  const estadoBadge = (estado: string | null) => {
    if (estado === 'pagado') return <Badge variant="default">Pagado</Badge>;
    if (estado === 'vencido') return <Badge variant="destructive">Vencido</Badge>;
    return <Badge variant="secondary">Pendiente</Badge>;
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Compras y Servicios"
        subtitle="Facturas de proveedores: insumos y servicios"
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Nueva Factura
          </Button>
        }
      />

      <DataToolbar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Buscar por proveedor o nº factura..." />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Fecha</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Nº Factura</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead className="w-[80px]" />
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
            ) : !filtered?.length ? (
              <TableRow>
                <TableCell colSpan={8} className="h-40">
                  <EmptyState icon={ShoppingCart} title="Sin facturas" description="Registrá tu primera factura de proveedor" />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row: any) => {
                const isCanon = row.factura_numero?.startsWith('CANON-');
                return (
                  <>
                    <TableRow key={row.id} className="cursor-pointer" onClick={() => setExpanded(expanded === row.id ? null : row.id)}>
                      <TableCell>
                        {expanded === row.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{formatLocalDate(row.factura_fecha)}</TableCell>
                      <TableCell className="font-medium">
                        <Link
                          to={`/milocal/${branchId}/finanzas/proveedores/${row.proveedor_id}`}
                          className="text-primary hover:underline whitespace-nowrap"
                          onClick={e => e.stopPropagation()}
                        >
                          {row.proveedores?.razon_social}
                        </Link>
                        {isCanon && <Badge variant="outline" className="ml-2 text-xs">Automática</Badge>}
                      </TableCell>
                      <TableCell className="text-sm font-mono whitespace-nowrap">{row.factura_tipo ? `${row.factura_tipo}-` : ''}{row.factura_numero}</TableCell>
                      <TableCell className="text-right font-mono whitespace-nowrap">$ {Number(row.total).toLocaleString('es-AR')}</TableCell>
                      <TableCell>{estadoBadge(row.estado_pago)}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {row.fecha_vencimiento ? formatLocalDate(row.fecha_vencimiento) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
                          {!isCanon && (
                            <Button variant="ghost" size="icon" onClick={() => setDeleting(row)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {expanded === row.id && row.items_factura?.length > 0 && (
                      <TableRow key={`${row.id}-items`}>
                        <TableCell colSpan={8} className="bg-muted/30 p-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Concepto</TableHead>
                                <TableHead className="text-right">Cant.</TableHead>
                                <TableHead>Ud.</TableHead>
                                <TableHead className="text-right">P.Unit</TableHead>
                                <TableHead className="text-right">Subtotal</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {row.items_factura.map((item: any) => (
                                <TableRow key={item.id}>
                                  <TableCell className="text-sm">{item.insumos?.nombre || item.conceptos_servicio?.nombre || '-'}</TableCell>
                                  <TableCell className="text-right font-mono">{Number(item.cantidad)}</TableCell>
                                  <TableCell className="text-sm">{item.unidad || '-'}</TableCell>
                                  <TableCell className="text-right font-mono">$ {Number(item.precio_unitario).toLocaleString('es-AR')}</TableCell>
                                  <TableCell className="text-right font-mono">$ {Number(item.subtotal).toLocaleString('es-AR')}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CompraFormModal open={modalOpen} onOpenChange={setModalOpen} branchId={branchId!} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={() => setDeleting(null)}
        title="Eliminar factura"
        description="¿Estás seguro de eliminar esta factura?"
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
