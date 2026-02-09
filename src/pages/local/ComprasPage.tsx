import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { DataToolbar } from '@/components/ui/data-table-pro';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, CreditCard, Trash2, ShoppingCart, ChevronDown, ChevronUp } from 'lucide-react';
import { useFacturas, useFacturaMutations } from '@/hooks/useCompras';
import { CompraFormModal } from '@/components/finanzas/CompraFormModal';
import { PagoProveedorModal } from '@/components/finanzas/PagoProveedorModal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/states';
import type { FacturaProveedor } from '@/types/compra';

export default function ComprasPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: facturas, isLoading } = useFacturas(branchId!);
  const { softDelete } = useFacturaMutations();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [paying, setPaying] = useState<FacturaProveedor | null>(null);
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
        title="Facturas de Proveedores"
        subtitle="Registro de compras con detalle de items"
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
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="w-[100px]" />
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
              filtered.map((row: any) => (
                <>
                  <TableRow key={row.id} className="cursor-pointer" onClick={() => setExpanded(expanded === row.id ? null : row.id)}>
                    <TableCell>
                      {expanded === row.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </TableCell>
                    <TableCell className="text-sm">{new Date(row.factura_fecha).toLocaleDateString('es-AR')}</TableCell>
                    <TableCell className="font-medium">{row.proveedores?.razon_social}</TableCell>
                    <TableCell className="text-sm font-mono">{row.factura_tipo ? `${row.factura_tipo}-` : ''}{row.factura_numero}</TableCell>
                    <TableCell className="text-right font-mono">$ {Number(row.total).toLocaleString('es-AR')}</TableCell>
                    <TableCell>{estadoBadge(row.estado_pago)}</TableCell>
                    <TableCell className="text-right font-mono text-destructive">
                      {Number(row.saldo_pendiente) > 0 ? `$ ${Number(row.saldo_pendiente).toLocaleString('es-AR')}` : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
                        {Number(row.saldo_pendiente) > 0 && (
                          <Button variant="ghost" size="icon" title="Registrar pago" onClick={() => setPaying(row)}>
                            <CreditCard className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => setDeleting(row)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expanded === row.id && row.items_factura?.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="bg-muted/30 p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Insumo</TableHead>
                              <TableHead className="text-right">Cant.</TableHead>
                              <TableHead>Ud.</TableHead>
                              <TableHead className="text-right">P.Unit</TableHead>
                              <TableHead className="text-right">Subtotal</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {row.items_factura.map((item: any) => (
                              <TableRow key={item.id}>
                                <TableCell className="text-sm">{item.insumo_id?.slice(0, 8)}...</TableCell>
                                <TableCell className="text-right font-mono">{Number(item.cantidad)}</TableCell>
                                <TableCell className="text-sm">{item.unidad}</TableCell>
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
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CompraFormModal open={modalOpen} onOpenChange={setModalOpen} branchId={branchId!} />
      <PagoProveedorModal open={!!paying} onOpenChange={() => setPaying(null)} factura={paying} />

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
