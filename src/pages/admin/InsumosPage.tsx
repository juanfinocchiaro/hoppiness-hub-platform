import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { DataToolbar } from '@/components/ui/data-table-pro';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Package, ArrowUp, ArrowDown, ArrowUpDown, ShoppingBag } from 'lucide-react';
import { useInsumos, useInsumoMutations } from '@/hooks/useInsumos';
import { InsumoFormModal } from '@/components/finanzas/InsumoFormModal';
import { ProductoFormModal } from '@/components/finanzas/ProductoFormModal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/states';
import type { Insumo } from '@/types/financial';

type SortKey = 'nombre' | 'proveedor' | 'categoria' | 'presentacion' | 'costo' | 'precio_venta' | 'margen';
type SortDir = 'asc' | 'desc';

function SortableHead({ label, sortKey, currentKey, dir, onSort }: { label: string; sortKey: SortKey; currentKey: SortKey | null; dir: SortDir; onSort: (k: SortKey) => void }) {
  const active = currentKey === sortKey;
  return (
    <TableHead className="cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => onSort(sortKey)}>
      <span className="flex items-center gap-1">
        {label}
        {active ? (dir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />) : <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/50" />}
      </span>
    </TableHead>
  );
}

function getSortValue(row: any, key: SortKey): string | number {
  switch (key) {
    case 'nombre': return row.nombre?.toLowerCase() || '';
    case 'proveedor': return (row.proveedor_obligatorio?.razon_social || row.proveedor_sugerido?.razon_social || '').toLowerCase();
    case 'categoria': return (row.rdo_categories?.name || row.categorias_insumo?.nombre || '').toLowerCase();
    case 'presentacion': return row.unidad_compra || row.unidad_base || '';
    case 'costo': return Number(row.costo_por_unidad_base || row.precio_referencia || 0);
    case 'precio_venta': return Number(row.precio_venta || 0);
    case 'margen': return Number(row.margen_porcentaje || 0);
    default: return '';
  }
}

function sortRows(rows: any[], key: SortKey | null, dir: SortDir) {
  if (!key || !rows) return rows;
  return [...rows].sort((a, b) => {
    const va = getSortValue(a, key);
    const vb = getSortValue(b, key);
    if (typeof va === 'number' && typeof vb === 'number') return dir === 'asc' ? va - vb : vb - va;
    return dir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  });
}

export default function InsumosPage() {
  const { data: insumos, isLoading } = useInsumos();
  const { softDelete: deleteInsumo } = useInsumoMutations();

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('ingredientes');
  const [fixedType, setFixedType] = useState<'ingrediente' | 'insumo'>('ingrediente');
  const [proveedorView, setProveedorView] = useState<'obligatorio' | 'sugerido'>('obligatorio');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const [insumoModalOpen, setInsumoModalOpen] = useState(false);
  const [editingInsumo, setEditingInsumo] = useState<Insumo | null>(null);
  const [productoModalOpen, setProductoModalOpen] = useState(false);
  const [editingProducto, setEditingProducto] = useState<any>(null);
  const [deletingInsumo, setDeletingInsumo] = useState<Insumo | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filteredObligatorios = useMemo(() => {
    const filtered = insumos?.filter((i: any) =>
      i.tipo_item === 'ingrediente' && i.nivel_control !== 'semi_libre' && i.nombre.toLowerCase().includes(search.toLowerCase())
    );
    return sortRows(filtered || [], sortKey, sortDir);
  }, [insumos, search, sortKey, sortDir]);

  const filteredSugeridos = useMemo(() => {
    const filtered = insumos?.filter((i: any) =>
      i.tipo_item === 'ingrediente' && i.nivel_control === 'semi_libre' && i.nombre.toLowerCase().includes(search.toLowerCase())
    );
    return sortRows(filtered || [], sortKey, sortDir);
  }, [insumos, search, sortKey, sortDir]);

  const filteredInsumosOblig = useMemo(() => {
    const filtered = insumos?.filter((i: any) =>
      (i.tipo_item === 'insumo' || !i.tipo_item) && i.nivel_control !== 'semi_libre' && i.nombre.toLowerCase().includes(search.toLowerCase())
    );
    return sortRows(filtered || [], sortKey, sortDir);
  }, [insumos, search, sortKey, sortDir]);

  const filteredInsumosSugeridos = useMemo(() => {
    const filtered = insumos?.filter((i: any) =>
      (i.tipo_item === 'insumo' || !i.tipo_item) && i.nivel_control === 'semi_libre' && i.nombre.toLowerCase().includes(search.toLowerCase())
    );
    return sortRows(filtered || [], sortKey, sortDir);
  }, [insumos, search, sortKey, sortDir]);

  const filteredProductosOblig = useMemo(() => {
    const filtered = insumos?.filter((i: any) =>
      i.tipo_item === 'producto' && i.nivel_control !== 'semi_libre' && i.nombre.toLowerCase().includes(search.toLowerCase())
    );
    return sortRows(filtered || [], sortKey, sortDir);
  }, [insumos, search, sortKey, sortDir]);

  const filteredProductosSugeridos = useMemo(() => {
    const filtered = insumos?.filter((i: any) =>
      i.tipo_item === 'producto' && i.nivel_control === 'semi_libre' && i.nombre.toLowerCase().includes(search.toLowerCase())
    );
    return sortRows(filtered || [], sortKey, sortDir);
  }, [insumos, search, sortKey, sortDir]);

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

  const headProps = { currentKey: sortKey, dir: sortDir, onSort: handleSort };

  const renderRow = (row: any, type: 'ingrediente' | 'insumo') => {
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
        {(() => {
          const neto = Number(row.unidad_compra_precio || 0);
          const alicuota = row.default_alicuota_iva != null ? Number(row.default_alicuota_iva) : 0;
          const ivaMonto = neto * (alicuota / 100);
          const final_ = neto * (1 + alicuota / 100);
          const unit = row.unidad_compra || row.unidad_base || 'un';
          if (!neto) return (
            <>
              <TableCell className="text-right"><span className="text-muted-foreground">—</span></TableCell>
              <TableCell className="text-right"><span className="text-muted-foreground">—</span></TableCell>
              <TableCell className="text-right"><span className="text-muted-foreground">—</span></TableCell>
            </>
          );
          return (
            <>
              <TableCell className="text-right">
                <span className="text-sm font-mono">${neto.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </TableCell>
              <TableCell className="text-right">
                <span className="text-sm font-mono">${ivaMonto.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </TableCell>
              <TableCell className="text-right">
                <span className="text-sm font-mono font-semibold">${final_.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<span className="text-muted-foreground text-xs font-normal">/{unit}</span></span>
              </TableCell>
            </>
          );
        })()}
        <TableCell>
          <div className="flex gap-1 justify-end">
            <Button variant="ghost" size="icon" onClick={() => { setFixedType(type); setEditingInsumo(row); setInsumoModalOpen(true); }}><Pencil className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setDeletingInsumo(row)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  const renderProductoRow = (row: any) => {
    const provName = row.proveedor_obligatorio?.razon_social || '—';
    const margen = row.margen_porcentaje != null ? Number(row.margen_porcentaje) : null;
    const margenColor =
      margen != null && margen >= 60 ? 'border-green-500 text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400' :
      margen != null && margen >= 40 ? 'border-yellow-500 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-400' :
      'border-red-500 text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400';

    return (
      <TableRow key={row.id}>
        <TableCell>
          <p className="font-medium">{row.nombre}</p>
          {row.descripcion && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{row.descripcion}</p>}
        </TableCell>
        <TableCell className="text-sm">{provName}</TableCell>
        <TableCell className="text-sm">{row.rdo_categories?.name || '—'}</TableCell>
        <TableCell>
          {row.unidad_compra && (
            <span className="text-sm">
              <Badge variant="outline">{row.unidad_compra}</Badge>
              {row.unidad_compra_contenido && <span className="text-muted-foreground ml-1 text-xs">({row.unidad_compra_contenido} un)</span>}
            </span>
          )}
        </TableCell>
        <TableCell>
          {row.costo_por_unidad_base
            ? <span className="font-mono text-sm">${Number(row.costo_por_unidad_base).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            : '—'}
        </TableCell>
        <TableCell>
          {row.precio_venta
            ? <span className="font-mono font-medium text-sm">${Number(row.precio_venta).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            : '—'}
        </TableCell>
        <TableCell>
          {margen != null && (
            <Badge variant="outline" className={margenColor}>
              {margen.toFixed(0)}%
            </Badge>
          )}
        </TableCell>
        <TableCell>
          <div className="flex gap-1 justify-end">
            <Button variant="ghost" size="icon" onClick={() => { setEditingProducto(row); setProductoModalOpen(true); }}><Pencil className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setDeletingInsumo(row)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="p-6">
      <PageHeader title="Ingredientes, Insumos y Productos" subtitle="Catálogo obligatorio de la marca" />

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="ingredientes">Ingredientes</TabsTrigger>
            <TabsTrigger value="insumos">Insumos</TabsTrigger>
            <TabsTrigger value="productos">Productos</TabsTrigger>
          </TabsList>
          {tab === 'ingredientes' && (
            <Button onClick={() => { setFixedType('ingrediente'); setEditingInsumo(null); setInsumoModalOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Nuevo Ingrediente
            </Button>
          )}
          {tab === 'insumos' && (
            <Button onClick={() => { setFixedType('insumo'); setEditingInsumo(null); setInsumoModalOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Nuevo Insumo
            </Button>
          )}
          {tab === 'productos' && (
            <Button onClick={() => { setEditingProducto(null); setProductoModalOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Nuevo Producto
            </Button>
          )}
        </div>

        <DataToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={
            tab === 'ingredientes' ? 'Buscar ingrediente...' :
            tab === 'insumos' ? 'Buscar insumo...' :
            'Buscar producto...'
          }
        />

        <TabsContent value="ingredientes">
          <div className="flex items-center gap-1 mb-4">
            <Button
              variant={proveedorView === 'obligatorio' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setProveedorView('obligatorio')}
            >
              Obligatorio ({filteredObligatorios?.length || 0})
            </Button>
            <Button
              variant={proveedorView === 'sugerido' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setProveedorView('sugerido')}
            >
              Sugerido ({filteredSugeridos?.length || 0})
            </Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Ingrediente" sortKey="nombre" {...headProps} />
                  <SortableHead label="Proveedor" sortKey="proveedor" {...headProps} />
                  <SortableHead label="Categoría" sortKey="categoria" {...headProps} />
                  <SortableHead label="Presentación" sortKey="presentacion" {...headProps} />
                  <TableHead className="text-right">Neto</TableHead>
                  <TableHead className="text-right">IVA $</TableHead>
                  <TableHead className="text-right">Final</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? <SkeletonRows cols={8} /> : (() => {
                  const rows = proveedorView === 'obligatorio' ? filteredObligatorios : filteredSugeridos;
                  return !rows?.length ? (
                    <TableRow><TableCell colSpan={8} className="h-40">
                      <EmptyState icon={Package} title={proveedorView === 'obligatorio' ? 'Sin ingredientes obligatorios' : 'Sin ingredientes sugeridos'} description={proveedorView === 'obligatorio' ? 'Agregá ingredientes con proveedor obligatorio' : 'Agregá ingredientes con proveedor sugerido'} />
                    </TableCell></TableRow>
                  ) : rows.map((row: any) => renderRow(row, 'ingrediente'));
                })()}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="insumos">
          <div className="flex items-center gap-1 mb-4">
            <Button
              variant={proveedorView === 'obligatorio' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setProveedorView('obligatorio')}
            >
              Obligatorio ({filteredInsumosOblig?.length || 0})
            </Button>
            <Button
              variant={proveedorView === 'sugerido' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setProveedorView('sugerido')}
            >
              Sugerido ({filteredInsumosSugeridos?.length || 0})
            </Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Insumo" sortKey="nombre" {...headProps} />
                  <SortableHead label="Proveedor" sortKey="proveedor" {...headProps} />
                  <SortableHead label="Categoría" sortKey="categoria" {...headProps} />
                  <SortableHead label="Presentación" sortKey="presentacion" {...headProps} />
                  <TableHead className="text-right">Neto</TableHead>
                  <TableHead className="text-right">IVA $</TableHead>
                  <TableHead className="text-right">Final</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? <SkeletonRows cols={8} /> : (() => {
                  const rows = proveedorView === 'obligatorio' ? filteredInsumosOblig : filteredInsumosSugeridos;
                  return !rows?.length ? (
                    <TableRow><TableCell colSpan={8} className="h-40">
                      <EmptyState icon={Package} title={proveedorView === 'obligatorio' ? 'Sin insumos obligatorios' : 'Sin insumos sugeridos'} description={proveedorView === 'obligatorio' ? 'Agregá insumos con proveedor obligatorio' : 'Agregá insumos con proveedor sugerido'} />
                    </TableCell></TableRow>
                  ) : rows.map((row: any) => renderRow(row, 'insumo'));
                })()}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="productos">
          <div className="flex items-center gap-1 mb-4">
            <Button
              variant={proveedorView === 'obligatorio' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setProveedorView('obligatorio')}
            >
              Obligatorio ({filteredProductosOblig?.length || 0})
            </Button>
            <Button
              variant={proveedorView === 'sugerido' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setProveedorView('sugerido')}
            >
              Sugerido ({filteredProductosSugeridos?.length || 0})
            </Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Producto" sortKey="nombre" {...headProps} />
                  <SortableHead label="Proveedor" sortKey="proveedor" {...headProps} />
                  <SortableHead label="Categoría" sortKey="categoria" {...headProps} />
                  <SortableHead label="Presentación" sortKey="presentacion" {...headProps} />
                  <SortableHead label="Costo" sortKey="costo" {...headProps} />
                  <SortableHead label="P. Venta" sortKey="precio_venta" {...headProps} />
                  <SortableHead label="Margen" sortKey="margen" {...headProps} />
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? <SkeletonRows cols={8} /> : (() => {
                  const rows = proveedorView === 'obligatorio' ? filteredProductosOblig : filteredProductosSugeridos;
                  return !rows?.length ? (
                    <TableRow><TableCell colSpan={8} className="h-40">
                      <EmptyState icon={ShoppingBag} title={proveedorView === 'obligatorio' ? 'Sin productos obligatorios' : 'Sin productos sugeridos'} description={proveedorView === 'obligatorio' ? 'Agregá productos con proveedor obligatorio' : 'Agregá productos con proveedor sugerido'} />
                    </TableCell></TableRow>
                  ) : rows.map((row: any) => renderProductoRow(row));
                })()}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <InsumoFormModal open={insumoModalOpen} onOpenChange={(open) => { setInsumoModalOpen(open); if (!open) setEditingInsumo(null); }} insumo={editingInsumo} context="brand" fixedType={fixedType} />

      <ProductoFormModal open={productoModalOpen} onOpenChange={(open) => { setProductoModalOpen(open); if (!open) setEditingProducto(null); }} producto={editingProducto} />

      <ConfirmDialog open={!!deletingInsumo} onOpenChange={() => setDeletingInsumo(null)} title="Eliminar item" description={`¿Eliminar "${deletingInsumo?.nombre}"?`} confirmLabel="Eliminar" variant="destructive" onConfirm={async () => { if (deletingInsumo) await deleteInsumo.mutateAsync(deletingInsumo.id); setDeletingInsumo(null); }} />
    </div>
  );
}
