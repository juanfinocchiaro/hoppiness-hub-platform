import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { DataToolbar } from '@/components/ui/data-table-pro';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, FileText, ChefHat } from 'lucide-react';
import { useMenuProductos, useMenuCategorias, useMenuProductoMutations } from '@/hooks/useMenu';
import { MenuProductoFormModal } from '@/components/menu/MenuProductoFormModal';
import { FichaTecnicaModal } from '@/components/menu/FichaTecnicaModal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/states';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);

export default function MenuCartaPage() {
  const { data: productos, isLoading } = useMenuProductos();
  const { data: categorias } = useMenuCategorias();
  const { softDelete } = useMenuProductoMutations();

  const [search, setSearch] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('all');
  const [productoModalOpen, setProductoModalOpen] = useState(false);
  const [editingProducto, setEditingProducto] = useState<any>(null);
  const [fichaTecnicaModalOpen, setFichaTecnicaModalOpen] = useState(false);
  const [selectedProductoFicha, setSelectedProductoFicha] = useState<any>(null);
  const [deletingProducto, setDeletingProducto] = useState<any>(null);

  const filteredProductos = useMemo(() => {
    return productos?.filter((p: any) => {
      const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase());
      const matchCategoria = categoriaFilter === 'all' || p.categoria_id === categoriaFilter;
      return matchSearch && matchCategoria && p.tipo !== 'combo';
    }) || [];
  }, [productos, search, categoriaFilter]);

  return (
    <div className="space-y-6">
      <PageHeader title="Carta" subtitle="Productos que se venden en los locales" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <DataToolbar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Buscar producto..." />
        <div className="flex items-center gap-2 flex-wrap">
          <Tabs value={categoriaFilter} onValueChange={setCategoriaFilter}>
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              {categorias?.map((cat: any) => (
                <TabsTrigger key={cat.id} value={cat.id}>{cat.nombre}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button onClick={() => { setEditingProducto(null); setProductoModalOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Nuevo Producto
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Producto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Precio Base</TableHead>
              <TableHead className="w-[120px]">Ficha Técnica</TableHead>
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
            ) : !filteredProductos.length ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40">
                  <EmptyState icon={ChefHat} title="Sin productos" description="Agregá productos a la carta" />
                </TableCell>
              </TableRow>
            ) : filteredProductos.map((producto: any) => (
              <TableRow key={producto.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{producto.nombre}</p>
                    {producto.descripcion && <p className="text-xs text-muted-foreground truncate max-w-[280px]">{producto.descripcion}</p>}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={producto.tipo === 'elaborado' ? 'default' : 'secondary'}>
                    {producto.tipo === 'elaborado' ? 'Elaborado' : 'Terminado'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{producto.menu_categorias?.nombre || '—'}</TableCell>
                <TableCell className="text-right font-mono font-medium">
                  {producto.menu_precios?.precio_base ? formatCurrency(producto.menu_precios.precio_base) : '—'}
                </TableCell>
                <TableCell>
                  {producto.tipo === 'elaborado' ? (
                    <Button variant="outline" size="sm" onClick={() => { setSelectedProductoFicha(producto); setFichaTecnicaModalOpen(true); }}>
                      <FileText className="w-4 h-4 mr-1" /> Ver
                    </Button>
                  ) : <span className="text-xs text-muted-foreground">N/A</span>}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingProducto(producto); setProductoModalOpen(true); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeletingProducto(producto)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <MenuProductoFormModal open={productoModalOpen} onOpenChange={setProductoModalOpen} producto={editingProducto} />
      <FichaTecnicaModal open={fichaTecnicaModalOpen} onOpenChange={setFichaTecnicaModalOpen} producto={selectedProductoFicha} />
      <ConfirmDialog
        open={!!deletingProducto}
        onOpenChange={() => setDeletingProducto(null)}
        title="Eliminar producto"
        description={`¿Eliminar "${deletingProducto?.nombre}" de la carta?`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={async () => {
          await softDelete.mutateAsync(deletingProducto.id);
          setDeletingProducto(null);
        }}
      />
    </div>
  );
}
