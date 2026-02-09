import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { DataToolbar } from '@/components/ui/data-table-pro';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Tag, Package } from 'lucide-react';
import { useInsumos, useInsumoMutations, useCategoriasInsumo, useCategoriaInsumoMutations } from '@/hooks/useInsumos';
import { InsumoFormModal } from '@/components/finanzas/InsumoFormModal';
import { CategoriaFormModal } from '@/components/finanzas/CategoriaFormModal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/states';
import type { Insumo, CategoriaInsumo } from '@/types/financial';

export default function InsumosPage() {
  const { data: insumos, isLoading } = useInsumos();
  const { softDelete: deleteInsumo } = useInsumoMutations();
  const { data: categorias, isLoading: loadingCats } = useCategoriasInsumo();
  const { softDelete: deleteCat } = useCategoriaInsumoMutations();

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('insumos');

  const [insumoModalOpen, setInsumoModalOpen] = useState(false);
  const [editingInsumo, setEditingInsumo] = useState<Insumo | null>(null);
  const [deletingInsumo, setDeletingInsumo] = useState<Insumo | null>(null);

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<CategoriaInsumo | null>(null);
  const [deletingCat, setDeletingCat] = useState<CategoriaInsumo | null>(null);

  const filteredInsumos = insumos?.filter((i: any) =>
    i.nombre.toLowerCase().includes(search.toLowerCase())
  );
  const filteredCats = categorias?.filter((c) =>
    c.nombre.toLowerCase().includes(search.toLowerCase())
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
      <PageHeader title="Insumos" subtitle="Catálogo de insumos y categorías de la marca" />

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="insumos">Insumos</TabsTrigger>
            <TabsTrigger value="categorias">Categorías</TabsTrigger>
          </TabsList>
          {tab === 'insumos' ? (
            <Button onClick={() => { setEditingInsumo(null); setInsumoModalOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Nuevo Insumo
            </Button>
          ) : (
            <Button onClick={() => { setEditingCat(null); setCatModalOpen(true); }}>
              <Tag className="w-4 h-4 mr-2" /> Nueva Categoría
            </Button>
          )}
        </div>

        <DataToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={tab === 'insumos' ? 'Buscar insumo...' : 'Buscar categoría...'}
        />

        <TabsContent value="insumos">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Insumo</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Precio Ref.</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? <SkeletonRows cols={5} /> : !filteredInsumos?.length ? (
                  <TableRow><TableCell colSpan={5} className="h-40">
                    <EmptyState icon={Package} title="Sin insumos" description="Agregá tu primer insumo" />
                  </TableCell></TableRow>
                ) : filteredInsumos.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <p className="font-medium">{row.nombre}</p>
                      {row.descripcion && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{row.descripcion}</p>}
                    </TableCell>
                    <TableCell className="text-sm">{row.categorias_insumo?.nombre || '—'}</TableCell>
                    <TableCell><Badge variant="outline">{row.unidad_base}</Badge></TableCell>
                    <TableCell>{row.precio_referencia ? `$${Number(row.precio_referencia).toLocaleString('es-AR')}` : '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingInsumo(row); setInsumoModalOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeletingInsumo(row)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="categorias">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Orden</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingCats ? <SkeletonRows cols={4} /> : !filteredCats?.length ? (
                  <TableRow><TableCell colSpan={4} className="h-40">
                    <EmptyState icon={Tag} title="Sin categorías" description="Creá categorías para organizar tus insumos" />
                  </TableCell></TableRow>
                ) : filteredCats.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.nombre}</TableCell>
                    <TableCell><Badge variant="secondary">{row.tipo}</Badge></TableCell>
                    <TableCell>{row.orden ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingCat(row); setCatModalOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeletingCat(row)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <InsumoFormModal open={insumoModalOpen} onOpenChange={(open) => { setInsumoModalOpen(open); if (!open) setEditingInsumo(null); }} insumo={editingInsumo} />
      <CategoriaFormModal open={catModalOpen} onOpenChange={(open) => { setCatModalOpen(open); if (!open) setEditingCat(null); }} categoria={editingCat} />

      <ConfirmDialog open={!!deletingInsumo} onOpenChange={() => setDeletingInsumo(null)} title="Eliminar insumo" description={`¿Eliminar "${deletingInsumo?.nombre}"?`} confirmLabel="Eliminar" variant="destructive" onConfirm={async () => { if (deletingInsumo) await deleteInsumo.mutateAsync(deletingInsumo.id); setDeletingInsumo(null); }} />
      <ConfirmDialog open={!!deletingCat} onOpenChange={() => setDeletingCat(null)} title="Eliminar categoría" description={`¿Eliminar "${deletingCat?.nombre}"?`} confirmLabel="Eliminar" variant="destructive" onConfirm={async () => { if (deletingCat) await deleteCat.mutateAsync(deletingCat.id); setDeletingCat(null); }} />
    </div>
  );
}
