import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { DataToolbar } from '@/components/ui/data-table-pro';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Plus, Pencil, Trash2, FileText, ChefHat, ChevronDown, ChevronUp,
  GripVertical, Check, X, FolderPlus
} from 'lucide-react';
import { useMenuProductos, useMenuCategorias, useMenuProductoMutations, useMenuCategoriaMutations } from '@/hooks/useMenu';
import { MenuProductoFormModal } from '@/components/menu/MenuProductoFormModal';
import { FichaTecnicaModal } from '@/components/menu/FichaTecnicaModal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/states';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export default function MenuCartaPage() {
  const { data: productos, isLoading: loadingProductos } = useMenuProductos();
  const { data: categorias, isLoading: loadingCategorias } = useMenuCategorias();
  const { softDelete: deleteProducto } = useMenuProductoMutations();
  const categoriaMutations = useMenuCategoriaMutations();

  const [search, setSearch] = useState('');
  const [productoModalOpen, setProductoModalOpen] = useState(false);
  const [editingProducto, setEditingProducto] = useState<any>(null);
  const [preselectedCategoriaId, setPreselectedCategoriaId] = useState<string | null>(null);
  const [fichaTecnicaModalOpen, setFichaTecnicaModalOpen] = useState(false);
  const [selectedProductoFicha, setSelectedProductoFicha] = useState<any>(null);
  const [deletingProducto, setDeletingProducto] = useState<any>(null);
  const [deletingCategoria, setDeletingCategoria] = useState<any>(null);

  // Category editing
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);

  // Expanded state - all open by default
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());

  const toggleCat = (catId: string) => {
    setCollapsedCats(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  // Group products by category
  const productsByCategory = useMemo(() => {
    const map: Record<string, any[]> = {};
    const filtered = (productos || []).filter((p: any) => {
      if (p.tipo === 'combo') return false;
      if (p.visible_en_carta === false) return false;
      if (!search) return true;
      return p.nombre.toLowerCase().includes(search.toLowerCase());
    });

    for (const p of filtered) {
      const catId = p.categoria_id || 'sin-categoria';
      if (!map[catId]) map[catId] = [];
      map[catId].push(p);
    }
    return map;
  }, [productos, search]);

  const uncategorizedProducts = productsByCategory['sin-categoria'] || [];

  const handleStartEditCat = (cat: any) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.nombre);
  };

  const handleSaveEditCat = async () => {
    if (!editingCatId || !editingCatName.trim()) return;
    await categoriaMutations.update.mutateAsync({ id: editingCatId, data: { nombre: editingCatName.trim() } });
    setEditingCatId(null);
  };

  const handleCreateCat = async () => {
    if (!newCatName.trim()) return;
    const maxOrden = categorias?.reduce((max: number, c: any) => Math.max(max, c.orden || 0), 0) || 0;
    await categoriaMutations.create.mutateAsync({ nombre: newCatName.trim(), orden: maxOrden + 1 });
    setNewCatName('');
    setShowNewCat(false);
  };

  const handleMoveCat = async (catId: string, direction: 'up' | 'down') => {
    if (!categorias) return;
    const idx = categorias.findIndex((c: any) => c.id === catId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= categorias.length) return;

    const items = [
      { id: categorias[idx].id, orden: categorias[swapIdx].orden },
      { id: categorias[swapIdx].id, orden: categorias[idx].orden },
    ];
    await categoriaMutations.reorder.mutateAsync(items);
  };

  const isLoading = loadingProductos || loadingCategorias;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Carta" subtitle="Productos que se venden en los locales" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Carta" subtitle="Productos que se venden en los locales" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <DataToolbar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Buscar producto..." />
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowNewCat(true)}>
            <FolderPlus className="w-4 h-4 mr-2" /> Nueva Categoría
          </Button>
          <Button onClick={() => { setEditingProducto(null); setPreselectedCategoriaId(null); setProductoModalOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Nuevo Producto
          </Button>
        </div>
      </div>

      {/* New category inline form */}
      {showNewCat && (
        <Card className="border-dashed border-primary/40">
          <CardContent className="p-4 flex items-center gap-3">
            <FolderPlus className="w-5 h-5 text-primary shrink-0" />
            <Input
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Nombre de la categoría..."
              className="max-w-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateCat();
                if (e.key === 'Escape') { setShowNewCat(false); setNewCatName(''); }
              }}
            />
            <Button size="sm" onClick={handleCreateCat} disabled={!newCatName.trim() || categoriaMutations.create.isPending}>
              <Check className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowNewCat(false); setNewCatName(''); }}>
              <X className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Category sections */}
      {(!categorias || categorias.length === 0) && uncategorizedProducts.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <EmptyState icon={ChefHat} title="Carta vacía" description="Creá una categoría y empezá a agregar productos" />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {categorias?.map((cat: any, idx: number) => {
            const catProducts = productsByCategory[cat.id] || [];
            const isOpen = !collapsedCats.has(cat.id);
            const isEditing = editingCatId === cat.id;

            return (
              <Collapsible key={cat.id} open={isOpen} onOpenChange={() => toggleCat(cat.id)}>
              <Card className="overflow-hidden">
                {/* Category Header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-muted/40 border-b">
                  {/* Reorder arrows */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5"
                      disabled={idx === 0}
                      onClick={() => handleMoveCat(cat.id, 'up')}
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5"
                      disabled={idx === (categorias?.length || 0) - 1}
                      onClick={() => handleMoveCat(cat.id, 'down')}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Category name or edit input */}
                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editingCatName}
                        onChange={(e) => setEditingCatName(e.target.value)}
                        className="h-8 max-w-xs"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEditCat();
                          if (e.key === 'Escape') setEditingCatId(null);
                        }}
                      />
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSaveEditCat}>
                        <Check className="w-4 h-4 text-green-600" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingCatId(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <CollapsibleTrigger asChild>
                      <button className="flex items-center gap-2 flex-1 text-left">
                        <span className="font-semibold text-sm">{cat.nombre}</span>
                        <Badge variant="secondary" className="text-xs font-normal">
                          {catProducts.length} {catProducts.length === 1 ? 'producto' : 'productos'}
                        </Badge>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground ml-auto" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />
                        )}
                      </button>
                    </CollapsibleTrigger>
                  )}

                  {/* Category actions */}
                  {!isEditing && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleStartEditCat(cat)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeletingCategoria(cat)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          setEditingProducto(null);
                          setPreselectedCategoriaId(cat.id);
                          setProductoModalOpen(true);
                        }}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Producto
                      </Button>
                    </div>
                  )}
                </div>

                {/* Products list */}
                <CollapsibleContent>
                    {catProducts.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                        Sin productos en esta categoría
                      </div>
                    ) : (
                      <div className="divide-y">
                        {catProducts.map((producto: any) => (
                          <div key={producto.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{producto.nombre}</p>
                                {producto.descripcion && (
                                  <p className="text-xs text-muted-foreground truncate max-w-[300px]">{producto.descripcion}</p>
                                )}
                              </div>
                              <Badge variant={producto.tipo === 'elaborado' ? 'default' : 'secondary'} className="shrink-0 text-xs">
                                {producto.tipo === 'elaborado' ? 'Elaborado' : 'Terminado'}
                              </Badge>
                              {producto.disponible_delivery && (
                                <Badge variant="outline" className="shrink-0 text-xs">Delivery</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {producto.tipo === 'elaborado' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => { setSelectedProductoFicha(producto); setFichaTecnicaModalOpen(true); }}
                                >
                                  <FileText className="w-3.5 h-3.5 mr-1" /> Ficha
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditingProducto(producto); setPreselectedCategoriaId(null); setProductoModalOpen(true); }}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeletingProducto(producto)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </CollapsibleContent>
              </Card>
              </Collapsible>
            );
          })}

          {/* Uncategorized products */}
          {uncategorizedProducts.length > 0 && (
            <Card className="overflow-hidden border-dashed">
              <div className="flex items-center gap-2 px-4 py-3 bg-muted/20 border-b">
                <span className="font-semibold text-sm text-muted-foreground">Sin categoría</span>
                <Badge variant="secondary" className="text-xs">{uncategorizedProducts.length}</Badge>
              </div>
              <div className="divide-y">
                {uncategorizedProducts.map((producto: any) => (
                  <div key={producto.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{producto.nombre}</p>
                      <Badge variant={producto.tipo === 'elaborado' ? 'default' : 'secondary'} className="shrink-0 text-xs">
                        {producto.tipo === 'elaborado' ? 'Elaborado' : 'Terminado'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditingProducto(producto); setPreselectedCategoriaId(null); setProductoModalOpen(true); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeletingProducto(producto)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      <MenuProductoFormModal
        open={productoModalOpen}
        onOpenChange={setProductoModalOpen}
        producto={editingProducto}
        preselectedCategoriaId={preselectedCategoriaId}
      />
      <FichaTecnicaModal open={fichaTecnicaModalOpen} onOpenChange={setFichaTecnicaModalOpen} producto={selectedProductoFicha} />

      <ConfirmDialog
        open={!!deletingProducto}
        onOpenChange={() => setDeletingProducto(null)}
        title="Eliminar producto"
        description={`¿Eliminar "${deletingProducto?.nombre}" de la carta?`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={async () => {
          await deleteProducto.mutateAsync(deletingProducto.id);
          setDeletingProducto(null);
        }}
      />

      <ConfirmDialog
        open={!!deletingCategoria}
        onOpenChange={() => setDeletingCategoria(null)}
        title="Eliminar categoría"
        description={`¿Eliminar la categoría "${deletingCategoria?.nombre}"? Los productos que contenga quedarán sin categoría.`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={async () => {
          await categoriaMutations.softDelete.mutateAsync(deletingCategoria.id);
          setDeletingCategoria(null);
        }}
      />
    </div>
  );
}
