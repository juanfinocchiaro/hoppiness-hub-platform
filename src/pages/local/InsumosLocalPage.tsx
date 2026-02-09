import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { DataToolbar } from '@/components/ui/data-table-pro';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Package } from 'lucide-react';
import { useInsumos } from '@/hooks/useInsumos';
import { EmptyState } from '@/components/ui/states';

export default function InsumosLocalPage() {
  const { data: insumos, isLoading } = useInsumos();
  const [search, setSearch] = useState('');

  const filtered = insumos?.filter((i: any) =>
    i.nombre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <PageHeader title="Insumos" subtitle="Catálogo de insumos disponibles" />
      <DataToolbar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Buscar insumo..." />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Insumo</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Precio Ref.</TableHead>
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
                <EmptyState icon={Package} title="Sin insumos" description="No hay insumos en el catálogo" />
              </TableCell></TableRow>
            ) : filtered.map((row: any) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p className="font-medium">{row.nombre}</p>
                  {row.descripcion && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{row.descripcion}</p>}
                </TableCell>
                <TableCell className="text-sm">{row.categorias_insumo?.nombre || '—'}</TableCell>
                <TableCell><Badge variant="outline">{row.unidad_base}</Badge></TableCell>
                <TableCell>{row.precio_referencia ? `$${Number(row.precio_referencia).toLocaleString('es-AR')}` : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
