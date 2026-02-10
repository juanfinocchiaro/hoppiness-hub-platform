import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { DataToolbar } from '@/components/ui/data-table-pro';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';
import { useInsumos, useInsumoMutations } from '@/hooks/useInsumos';
import { InsumoFormModal } from '@/components/finanzas/InsumoFormModal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/states';
import type { Insumo } from '@/types/financial';

export default function InsumosPage() {
  const { data: insumos, isLoading } = useInsumos();
  const { softDelete: deleteInsumo } = useInsumoMutations();

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('ingredientes');
  const [fixedType, setFixedType] = useState<'ingrediente' | 'insumo'>('ingrediente');

  const [insumoModalOpen, setInsumoModalOpen] = useState(false);
  const [editingInsumo, setEditingInsumo] = useState<Insumo | null>(null);
  const [deletingInsumo, setDeletingInsumo] = useState<Insumo | null>(null);

  const filteredIngredientes = insumos?.filter((i: any) =>
    (i.tipo_item === 'ingrediente') && i.nombre.toLowerCase().includes(search.toLowerCase())
  );
  const filteredInsumos = insumos?.filter((i: any) =>
    (i.tipo_item === 'insumo' || !i.tipo_item) && i.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const SkeletonRows = ({ cols }: { cols: number }) => (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );

  return (
    <div className="p-6">
      <PageHeader title="Ingredientes e Insumos" subtitle="Catálogo obligatorio de la marca" />

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="ingredientes">Ingredientes</TabsTrigger>
            <TabsTrigger value="insumos">Insumos</TabsTrigger>
          </TabsList>
          {tab === 'ingredientes' ? (
            <Button onClick={() => { setFixedType('ingrediente'); setEditingInsumo(null); setInsumoModalOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Nuevo Ingrediente
            </Button>
          ) : (
            <Button onClick={() => { setFixedType('insumo'); setEditingInsumo(null); setInsumoModalOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Nuevo Insumo
            </Button>
          )}
        </div>

        <DataToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={tab === 'ingredientes' ? 'Buscar ingrediente...' : 'Buscar insumo...'}
        />

        <TabsContent value="ingredientes">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingrediente</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Presentación</TableHead>
                  <TableHead>Costo / u.base</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? <SkeletonRows cols={6} /> : !filteredIngredientes?.length ? (
                  <TableRow><TableCell colSpan={6} className="h-40">
                    <EmptyState icon={Package} title="Sin ingredientes" description="Agregá tu primer ingrediente obligatorio" />
                  </TableCell></TableRow>
                ) : filteredIngredientes.map((row: any) => {
                  const isSemiLibre = row.nivel_control === 'semi_libre';
                  const provName = row.proveedor_obligatorio?.razon_social || row.proveedor_sugerido?.razon_social;
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <p className="font-medium">{row.nombre}</p>
                        {row.descripcion && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{row.descripcion}</p>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {isSemiLibre ? (
                          <span className="flex items-center gap-1.5">
                            {provName || <span className="text-muted-foreground italic">Sin sugerido</span>}
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700 text-[10px]">Sugerido</Badge>
                          </span>
                        ) : (provName || '—')}
                      </TableCell>
                      <TableCell className="text-sm">{row.rdo_categories?.name || row.categorias_insumo?.nombre || '—'}</TableCell>
                      <TableCell>
                        {row.unidad_compra ? (
                          <span className="text-sm">
                            <Badge variant="outline">{row.unidad_compra}</Badge>
                            {row.unidad_compra_contenido && <span className="text-muted-foreground ml-1 text-xs">({row.unidad_compra_contenido} {row.unidad_base})</span>}
                          </span>
                        ) : <Badge variant="outline">{row.unidad_base}</Badge>}
                      </TableCell>
                      <TableCell>
                        {row.costo_por_unidad_base
                          ? <span className="font-medium">${Number(row.costo_por_unidad_base).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}<span className="text-muted-foreground text-xs">/{row.unidad_base}</span></span>
                          : row.precio_referencia ? `$${Number(row.precio_referencia).toLocaleString('es-AR')}` : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => { setFixedType('ingrediente'); setEditingInsumo(row); setInsumoModalOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeletingInsumo(row)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="insumos">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Insumo</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Presentación</TableHead>
                  <TableHead>Costo / u.base</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? <SkeletonRows cols={6} /> : !filteredInsumos?.length ? (
                  <TableRow><TableCell colSpan={6} className="h-40">
                    <EmptyState icon={Package} title="Sin insumos" description="Agregá tu primer insumo obligatorio" />
                  </TableCell></TableRow>
                ) : filteredInsumos.map((row: any) => {
                  const isSemiLibre = row.nivel_control === 'semi_libre';
                  const provName = row.proveedor_obligatorio?.razon_social || row.proveedor_sugerido?.razon_social;
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <p className="font-medium">{row.nombre}</p>
                        {row.descripcion && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{row.descripcion}</p>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {isSemiLibre ? (
                          <span className="flex items-center gap-1.5">
                            {provName || <span className="text-muted-foreground italic">Sin sugerido</span>}
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700 text-[10px]">Sugerido</Badge>
                          </span>
                        ) : (provName || '—')}
                      </TableCell>
                      <TableCell className="text-sm">{row.rdo_categories?.name || row.categorias_insumo?.nombre || '—'}</TableCell>
                      <TableCell>
                        {row.unidad_compra ? (
                          <span className="text-sm">
                            <Badge variant="outline">{row.unidad_compra}</Badge>
                            {row.unidad_compra_contenido && <span className="text-muted-foreground ml-1 text-xs">({row.unidad_compra_contenido} {row.unidad_base})</span>}
                          </span>
                        ) : <Badge variant="outline">{row.unidad_base}</Badge>}
                      </TableCell>
                      <TableCell>
                        {row.costo_por_unidad_base
                          ? <span className="font-medium">${Number(row.costo_por_unidad_base).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}<span className="text-muted-foreground text-xs">/{row.unidad_base}</span></span>
                          : row.precio_referencia ? `$${Number(row.precio_referencia).toLocaleString('es-AR')}` : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => { setFixedType('insumo'); setEditingInsumo(row); setInsumoModalOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeletingInsumo(row)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

      </Tabs>

      <InsumoFormModal open={insumoModalOpen} onOpenChange={(open) => { setInsumoModalOpen(open); if (!open) setEditingInsumo(null); }} insumo={editingInsumo} context="brand" fixedType={fixedType} />

      <ConfirmDialog open={!!deletingInsumo} onOpenChange={() => setDeletingInsumo(null)} title="Eliminar insumo" description={`¿Eliminar "${deletingInsumo?.nombre}"?`} confirmLabel="Eliminar" variant="destructive" onConfirm={async () => { if (deletingInsumo) await deleteInsumo.mutateAsync(deletingInsumo.id); setDeletingInsumo(null); }} />
    </div>
  );
}
