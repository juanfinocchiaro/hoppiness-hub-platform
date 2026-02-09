import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { DataToolbar } from '@/components/ui/data-table-pro';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Receipt } from 'lucide-react';
import { useGastos, useGastoMutations } from '@/hooks/useGastos';
import { GastoFormModal } from '@/components/finanzas/GastoFormModal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/states';
import { CATEGORIA_GASTO_OPTIONS } from '@/types/compra';
import type { Gasto } from '@/types/compra';

export default function GastosPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: gastos, isLoading } = useGastos(branchId!);
  const { softDelete } = useGastoMutations();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Gasto | null>(null);
  const [deleting, setDeleting] = useState<Gasto | null>(null);

  const filtered = gastos?.filter((g) =>
    g.concepto.toLowerCase().includes(search.toLowerCase()) ||
    g.categoria_principal.toLowerCase().includes(search.toLowerCase())
  );

  const getCategoriaLabel = (key: string) =>
    CATEGORIA_GASTO_OPTIONS.find(c => c.value === key)?.label || key;

  const estadoBadge = (estado: string | null) => {
    if (estado === 'pagado') return <Badge variant="default">Pagado</Badge>;
    if (estado === 'parcial') return <Badge variant="secondary">Parcial</Badge>;
    return <Badge variant="destructive">Pendiente</Badge>;
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Gastos"
        subtitle="Gastos operativos del local"
        actions={
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Nuevo Gasto
          </Button>
        }
      />

      <DataToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por concepto o categoría..."
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
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : !filtered?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40">
                  <EmptyState icon={Receipt} title="Sin gastos" description="Registrá el primer gasto del local" />
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
                  <TableCell>{estadoBadge(row.estado)}</TableCell>
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
