import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { DataToolbar } from '@/components/ui/data-table-pro';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, CreditCard, Trash2, ShoppingCart } from 'lucide-react';
import { useCompras, useCompraMutations } from '@/hooks/useCompras';
import { CompraFormModal } from '@/components/finanzas/CompraFormModal';
import { PagoProveedorModal } from '@/components/finanzas/PagoProveedorModal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/states';
import type { Compra } from '@/types/compra';

export default function ComprasPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: compras, isLoading } = useCompras(branchId!);
  const { softDelete } = useCompraMutations();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [payingCompra, setPayingCompra] = useState<Compra | null>(null);
  const [deleting, setDeleting] = useState<Compra | null>(null);

  const filtered = compras?.filter((c: any) =>
    c.proveedores?.razon_social?.toLowerCase().includes(search.toLowerCase()) ||
    c.insumos?.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    c.factura_numero?.includes(search)
  );

  const estadoBadge = (estado: string | null) => {
    if (estado === 'pagado') return <Badge variant="default">Pagado</Badge>;
    if (estado === 'parcial') return <Badge variant="secondary">Parcial</Badge>;
    return <Badge variant="destructive">Pendiente</Badge>;
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Compras"
        subtitle="Registro de compras a proveedores"
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Nueva Compra
          </Button>
        }
      />

      <DataToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por proveedor, insumo o factura..."
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Insumo</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="w-[100px]" />
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
                  <EmptyState icon={ShoppingCart} title="Sin compras" description="Registrá tu primera compra" />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row: any) => (
                <TableRow key={row.id}>
                  <TableCell className="text-sm">{new Date(row.fecha).toLocaleDateString('es-AR')}</TableCell>
                  <TableCell className="font-medium">{row.proveedores?.razon_social}</TableCell>
                  <TableCell>
                    <p className="text-sm">{row.insumos?.nombre}</p>
                    <p className="text-xs text-muted-foreground">{row.cantidad} {row.unidad}</p>
                  </TableCell>
                  <TableCell className="text-right font-mono">$ {Number(row.subtotal).toLocaleString('es-AR')}</TableCell>
                  <TableCell>{estadoBadge(row.estado_pago)}</TableCell>
                  <TableCell className="text-right font-mono text-destructive">
                    {Number(row.saldo_pendiente) > 0 ? `$ ${Number(row.saldo_pendiente).toLocaleString('es-AR')}` : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      {Number(row.saldo_pendiente) > 0 && (
                        <Button variant="ghost" size="icon" title="Registrar pago" onClick={() => setPayingCompra(row)}>
                          <CreditCard className="w-4 h-4" />
                        </Button>
                      )}
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

      <CompraFormModal open={modalOpen} onOpenChange={setModalOpen} branchId={branchId!} />
      <PagoProveedorModal open={!!payingCompra} onOpenChange={() => setPayingCompra(null)} compra={payingCompra} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={() => setDeleting(null)}
        title="Eliminar compra"
        description="¿Estás seguro de eliminar esta compra?"
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
