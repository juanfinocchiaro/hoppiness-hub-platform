import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { DataToolbar } from '@/components/ui/data-table-pro';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, MapPin, Package, Plus, Pencil } from 'lucide-react';
import { useProveedores } from '@/hooks/useProveedores';
import { ProveedorFormModal } from '@/components/finanzas/ProveedorFormModal';
import { EmptyState } from '@/components/ui/states';

export default function ProveedoresLocalPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const { data: proveedores, isLoading } = useProveedores(branchId);
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const filtered = proveedores?.filter((p) =>
    p.razon_social.toLowerCase().includes(search.toLowerCase()) ||
    p.cuit?.includes(search)
  );

  // Only allow editing local providers (not marca-level ones)
  const isLocalProvider = (p: any) => p.ambito === 'local' && p.branch_id === branchId;

  return (
    <div className="p-6">
      <PageHeader title="Proveedores" subtitle="Proveedores disponibles para tu local" />
      <div className="flex items-center justify-between gap-4 mb-4">
        <DataToolbar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Buscar proveedor..." />
        <Button size="sm" onClick={() => setShowNew(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nuevo Proveedor
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proveedor</TableHead>
              <TableHead>Ámbito</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Cta. Cte.</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : !filtered?.length ? (
              <TableRow><TableCell colSpan={5} className="h-40">
                <EmptyState icon={Package} title="Sin proveedores" description="No hay proveedores disponibles" />
              </TableCell></TableRow>
            ) : filtered.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/milocal/${branchId}/finanzas/proveedores/${row.id}`)}
              >
                <TableCell>
                  <p className="font-medium">{row.razon_social}</p>
                  {row.cuit && <p className="text-xs text-muted-foreground">{row.cuit}</p>}
                </TableCell>
                <TableCell>
                  <Badge variant={row.ambito === 'marca' ? 'default' : 'secondary'} className="gap-1">
                    {row.ambito === 'marca' ? <Building2 className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                    {row.ambito === 'marca' ? 'Marca' : 'Local'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {row.contacto && <p>{row.contacto}</p>}
                    {row.telefono && <p className="text-muted-foreground">{row.telefono}</p>}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={row.permite_cuenta_corriente ? 'default' : 'outline'}>
                    {row.permite_cuenta_corriente ? 'Sí' : 'No'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {isLocalProvider(row) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); setEditing(row); }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* New local provider - pre-set ambito=local and branch_id */}
      <ProveedorFormModal
        open={showNew}
        onOpenChange={setShowNew}
        defaultBranchId={branchId}
      />

      {/* Edit existing local provider */}
      {editing && (
        <ProveedorFormModal
          open={!!editing}
          onOpenChange={() => setEditing(null)}
          proveedor={editing}
        />
      )}
    </div>
  );
}
