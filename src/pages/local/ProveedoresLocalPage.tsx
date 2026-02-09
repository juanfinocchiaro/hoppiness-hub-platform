import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { DataToolbar } from '@/components/ui/data-table-pro';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, MapPin, Package } from 'lucide-react';
import { useProveedores } from '@/hooks/useProveedores';
import { EmptyState } from '@/components/ui/states';
import type { Proveedor } from '@/types/financial';

export default function ProveedoresLocalPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: proveedores, isLoading } = useProveedores(branchId);
  const [search, setSearch] = useState('');

  const filtered = proveedores?.filter((p) =>
    p.razon_social.toLowerCase().includes(search.toLowerCase()) ||
    p.cuit?.includes(search)
  );

  return (
    <div className="p-6">
      <PageHeader title="Proveedores" subtitle="Proveedores disponibles para tu local" />
      <DataToolbar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Buscar proveedor..." />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proveedor</TableHead>
              <TableHead>Ámbito</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Cta. Cte.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : !filtered?.length ? (
              <TableRow><TableCell colSpan={4} className="h-40">
                <EmptyState icon={Package} title="Sin proveedores" description="No hay proveedores disponibles" />
              </TableCell></TableRow>
            ) : filtered.map((row) => (
              <TableRow key={row.id}>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
