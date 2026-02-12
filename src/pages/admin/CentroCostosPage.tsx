import { useState, useMemo, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { DataToolbar } from '@/components/ui/data-table-pro';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingButton } from '@/components/ui/loading-button';
import { FormRow, FormSection } from '@/components/ui/forms-pro';
import { StickyActions } from '@/components/ui/forms-pro';
import { EmptyState } from '@/components/ui/states';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Percent, AlertTriangle, CheckCircle, TrendingDown, Edit, History, Plus,
  Trash2, Package, Save, DollarSign, Tag, Layers, Settings2,
} from 'lucide-react';
import { ModificadoresTab } from '@/components/menu/ModificadoresTab';
import { useItemsCarta, useItemCartaComposicion, useItemCartaHistorial, useItemCartaMutations } from '@/hooks/useItemsCarta';
import { useGruposOpcionales, useGruposOpcionalesMutations } from '@/hooks/useGruposOpcionales';
import { usePreparaciones } from '@/hooks/usePreparaciones';
import { useInsumos } from '@/hooks/useInsumos';
import { useMenuCategorias } from '@/hooks/useMenu';
import { useRdoCategories } from '@/hooks/useRdoCategories';
import { useAuth } from '@/hooks/useAuth';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);

export default function CentroCostosPage() {
  const { data: items, isLoading } = useItemsCarta();
  const { data: preparaciones } = usePreparaciones();
  const { data: insumos } = useInsumos();
  const { data: categorias } = useMenuCategorias();
  const { data: rdoCategories } = useRdoCategories();
  const { user } = useAuth();
  const mutations = useItemCartaMutations();

  const [search, setSearch] = useState('');
  const [filterFC, setFilterFC] = useState<'all' | 'ok' | 'warning' | 'danger'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [composicionItem, setComposicionItem] = useState<any>(null);
  const [precioModal, setPrecioModal] = useState<any>(null);
  const [historialModal, setHistorialModal] = useState<any>(null);
  const [deletingItem, setDeletingItem] = useState<any>(null);
  const [modificadoresItem, setModificadoresItem] = useState<any>(null);
  const cmvCategories = useMemo(() => {
    return rdoCategories?.filter((c: any) => c.level === 3 && (c.parent_code?.startsWith('cmv') || c.code?.startsWith('cmv'))) || [];
  }, [rdoCategories]);

  const stats = useMemo(() => {
    if (!items?.length) return null;
    const withFc = items.filter((i: any) => i.fc_actual != null);
    return {
      fcPromedio: withFc.reduce((s: number, i: any) => s + i.fc_actual, 0) / (withFc.length || 1),
      ok: withFc.filter((i: any) => i.fc_actual <= 32).length,
      warning: withFc.filter((i: any) => i.fc_actual > 32 && i.fc_actual <= 40).length,
      danger: withFc.filter((i: any) => i.fc_actual > 40).length,
    };
  }, [items]);

  const filtered = useMemo(() => {
    return items?.filter((i: any) => {
      const matchSearch = i.nombre.toLowerCase().includes(search.toLowerCase());
      let matchFC = true;
      if (filterFC === 'ok') matchFC = i.fc_actual != null && i.fc_actual <= 32;
      else if (filterFC === 'warning') matchFC = i.fc_actual != null && i.fc_actual > 32 && i.fc_actual <= 40;
      else if (filterFC === 'danger') matchFC = i.fc_actual != null && i.fc_actual > 40;
      return matchSearch && matchFC;
    }) || [];
  }, [items, search, filterFC]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Control de Costos" subtitle="Items de carta con precio, composición y FC%" />
        <Button onClick={() => { setEditingItem(null); setCreateOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Nuevo Item
        </Button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Percent className="w-4 h-4" /> FC Promedio</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{stats?.fcPromedio?.toFixed(1) || '—'}%</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> OK</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-green-600">{stats?.ok || 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-500" /> Atención</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-yellow-600">{stats?.warning || 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><TrendingDown className="w-4 h-4 text-red-500" /> Críticos</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-red-600">{stats?.danger || 0}</p></CardContent></Card>
      </div>

      {/* FILTERS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <DataToolbar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Buscar item..." />
        <div className="flex items-center gap-2">
          {(['all', 'ok', 'warning', 'danger'] as const).map((f) => (
            <Button key={f} variant={filterFC === f ? 'default' : 'outline'} size="sm" onClick={() => setFilterFC(f)}>
              {f === 'all' ? 'Todos' : f === 'ok' ? '✓ OK' : f === 'warning' ? '⚠ Atención' : '✕ Críticos'}
            </Button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Item</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Costo</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">FC%</TableHead>
              <TableHead className="w-[200px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>
            )) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-32"><EmptyState icon={Package} title="Sin items" description="Creá un item de carta" /></TableCell></TableRow>
            ) : filtered.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{item.nombre}</p>
                    <p className="text-xs text-muted-foreground">{item.menu_categorias?.nombre || 'Sin categoría'}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{item.menu_categorias?.nombre || <span className="text-muted-foreground italic">Sin categoría</span>}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(item.costo_total || 0)}</TableCell>
                <TableCell className="text-right font-mono font-medium">{formatCurrency(item.precio_base)}</TableCell>
                <TableCell className="text-right">
                  {item.fc_actual != null ? (
                    <Badge variant={item.fc_actual <= 32 ? 'default' : item.fc_actual <= 40 ? 'secondary' : 'destructive'}>
                      {item.fc_actual?.toFixed(1)}%
                    </Badge>
                  ) : '—'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setComposicionItem(item)}>
                      <Layers className="w-3.5 h-3.5 mr-1" /> Composición
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setModificadoresItem(item)}>
                      <Settings2 className="w-3.5 h-3.5 mr-1" /> Modif.
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setPrecioModal(item)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setHistorialModal(item)}>
                      <History className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeletingItem(item)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* CREATE/EDIT ITEM MODAL */}
      <ItemCartaFormModal
        open={createOpen}
        onOpenChange={(v) => { setCreateOpen(v); if (!v) setEditingItem(null); }}
        item={editingItem}
        categorias={categorias}
        cmvCategories={cmvCategories}
        mutations={mutations}
      />

      {/* COMPOSICIÓN MODAL */}
      {composicionItem && (
        <ComposicionModal
          open={!!composicionItem}
          onOpenChange={() => setComposicionItem(null)}
          item={composicionItem}
          preparaciones={preparaciones || []}
          insumos={insumos || []}
          mutations={mutations}
        />
      )}

      {/* MODIFICADORES MODAL */}
      {modificadoresItem && (
        <Dialog open={!!modificadoresItem} onOpenChange={() => setModificadoresItem(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Modificadores: {modificadoresItem.nombre}</DialogTitle></DialogHeader>
            <ModificadoresTab itemId={modificadoresItem.id} />
          </DialogContent>
        </Dialog>
      )}

      {precioModal && (
        <PrecioModal
          open={!!precioModal}
          onOpenChange={() => setPrecioModal(null)}
          item={precioModal}
          cmvCategories={cmvCategories}
          mutations={mutations}
          userId={user?.id}
        />
      )}

      {/* HISTORIAL MODAL */}
      {historialModal && (
        <HistorialModal
          open={!!historialModal}
          onOpenChange={() => setHistorialModal(null)}
          item={historialModal}
        />
      )}

      <ConfirmDialog
        open={!!deletingItem}
        onOpenChange={() => setDeletingItem(null)}
        title="Eliminar item"
        description={`¿Eliminar "${deletingItem?.nombre}" de la carta?`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={async () => { await mutations.softDelete.mutateAsync(deletingItem.id); setDeletingItem(null); }}
      />
    </div>
  );
}

// ─── Item Form Modal ───
function ItemCartaFormModal({ open, onOpenChange, item, categorias, cmvCategories, mutations }: any) {
  const [form, setForm] = useState({ nombre: '', nombre_corto: '', descripcion: '', categoria_carta_id: '', rdo_category_code: '', precio_base: 0, fc_objetivo: 32, disponible_delivery: true });
  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));
  const isEdit = !!item;

  useEffect(() => {
    if (item) {
      setForm({ nombre: item.nombre, nombre_corto: item.nombre_corto || '', descripcion: item.descripcion || '', categoria_carta_id: item.categoria_carta_id || '', rdo_category_code: item.rdo_category_code || '', precio_base: item.precio_base, fc_objetivo: item.fc_objetivo || 32, disponible_delivery: item.disponible_delivery ?? true });
    } else {
      setForm({ nombre: '', nombre_corto: '', descripcion: '', categoria_carta_id: '', rdo_category_code: '', precio_base: 0, fc_objetivo: 32, disponible_delivery: true });
    }
  }, [item, open]);

  const handleSubmit = async () => {
    if (!form.nombre || !form.precio_base) return;
    const payload = { ...form, categoria_carta_id: form.categoria_carta_id || null, rdo_category_code: form.rdo_category_code || null };
    if (isEdit) {
      await mutations.update.mutateAsync({ id: item.id, data: payload });
    } else {
      await mutations.create.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? 'Editar' : 'Nuevo'} Item de Carta</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <FormRow label="Nombre" required><Input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Ej: Argenta Burger" /></FormRow>
          <div className="grid grid-cols-2 gap-3">
            <FormRow label="Nombre corto" hint="Para tickets"><Input value={form.nombre_corto} onChange={(e) => set('nombre_corto', e.target.value)} /></FormRow>
            <FormRow label="Categoría carta">
              <Select value={form.categoria_carta_id || 'none'} onValueChange={(v) => set('categoria_carta_id', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoría</SelectItem>
                  {categorias?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormRow>
          </div>
          <FormRow label="Descripción"><Textarea value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} rows={2} /></FormRow>
          <FormSection title="Precio" icon={DollarSign}>
            <div className="grid grid-cols-2 gap-3">
              <FormRow label="Precio de venta ($)" required><Input type="number" value={form.precio_base || ''} onChange={(e) => set('precio_base', Number(e.target.value))} /></FormRow>
              <FormRow label="FC objetivo (%)"><Input type="number" value={form.fc_objetivo || ''} onChange={(e) => set('fc_objetivo', Number(e.target.value))} /></FormRow>
            </div>
          </FormSection>
          <StickyActions>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <LoadingButton loading={mutations.create.isPending || mutations.update.isPending} onClick={handleSubmit} disabled={!form.nombre || !form.precio_base}>
              {isEdit ? 'Guardar' : 'Crear Item'}
            </LoadingButton>
          </StickyActions>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Composición Modal ───
function ComposicionModal({ open, onOpenChange, item, preparaciones, insumos, mutations }: any) {
  const { data: composicionActual } = useItemCartaComposicion(item?.id);
  const { data: grupos } = useGruposOpcionales(item?.id);
  const gruposMutations = useGruposOpcionalesMutations();
  const [rows, setRows] = useState<any[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Local state for optional groups editing
  const [grupoNuevoNombre, setGrupoNuevoNombre] = useState('');
  const [showNewGrupo, setShowNewGrupo] = useState(false);

  useEffect(() => {
    if (composicionActual) {
      setRows(composicionActual.map((c: any) => ({
        tipo: c.preparacion_id ? 'preparacion' : 'insumo',
        preparacion_id: c.preparacion_id || '',
        insumo_id: c.insumo_id || '',
        cantidad: c.cantidad,
        _label: c.preparaciones?.nombre || c.insumos?.nombre || '',
        _costo: c.preparaciones?.costo_calculado || c.insumos?.costo_por_unidad_base || 0,
      })));
      setHasChanges(false);
    }
  }, [composicionActual]);

  const addRow = () => { setRows([...rows, { tipo: 'preparacion', preparacion_id: '', insumo_id: '', cantidad: 1, _label: '', _costo: 0 }]); setHasChanges(true); };
  const removeRow = (i: number) => { setRows(rows.filter((_, idx) => idx !== i)); setHasChanges(true); };

  const updateRow = (i: number, field: string, value: any) => {
    const newRows = [...rows];
    newRows[i] = { ...newRows[i], [field]: value };
    if (field === 'tipo') { newRows[i].preparacion_id = ''; newRows[i].insumo_id = ''; newRows[i]._costo = 0; newRows[i]._label = ''; }
    if (field === 'preparacion_id') {
      const p = preparaciones.find((x: any) => x.id === value);
      newRows[i]._label = p?.nombre || '';
      newRows[i]._costo = p?.costo_calculado || 0;
    }
    if (field === 'insumo_id') {
      const ins = insumos.find((x: any) => x.id === value);
      newRows[i]._label = ins?.nombre || '';
      newRows[i]._costo = ins?.costo_por_unidad_base || 0;
    }
    setRows(newRows);
    setHasChanges(true);
  };

  const costoFijo = rows.reduce((t, r) => t + r.cantidad * r._costo, 0);
  const costoGrupos = (grupos || []).reduce((t: number, g: any) => t + (g.costo_promedio || 0), 0);
  const costoTotal = costoFijo + costoGrupos;

  const handleSave = async () => {
    await mutations.saveComposicion.mutateAsync({
      item_carta_id: item.id,
      items: rows.filter(r => r.preparacion_id || r.insumo_id).map(r => ({
        preparacion_id: r.tipo === 'preparacion' ? r.preparacion_id : undefined,
        insumo_id: r.tipo === 'insumo' ? r.insumo_id : undefined,
        cantidad: r.cantidad,
      })),
    });
    setHasChanges(false);
  };

  const handleCreateGrupo = async () => {
    if (!grupoNuevoNombre.trim()) return;
    await gruposMutations.createGrupo.mutateAsync({
      item_carta_id: item.id,
      nombre: grupoNuevoNombre.trim(),
      orden: (grupos?.length || 0),
    });
    setGrupoNuevoNombre('');
    setShowNewGrupo(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Composición: {item.nombre}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {/* Fixed composition */}
          <FormSection title="Composición Fija" icon={Layers}>
            {rows.length === 0 ? (
              <div className="py-4 text-center text-muted-foreground border rounded-lg text-sm">Sin componentes fijos</div>
            ) : (
              <div className="space-y-2">
                {rows.map((row, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-sm border rounded-lg px-3 py-2">
                    <Select value={row.tipo} onValueChange={(v) => updateRow(i, 'tipo', v)}>
                      <SelectTrigger className="h-7 w-[100px] text-xs shrink-0"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="preparacion">Receta</SelectItem>
                        <SelectItem value="insumo">Catálogo</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex-1 min-w-0">
                      {row.tipo === 'preparacion' ? (
                        <Select value={row.preparacion_id || 'none'} onValueChange={(v) => updateRow(i, 'preparacion_id', v === 'none' ? '' : v)}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Seleccionar...</SelectItem>
                            {preparaciones.map((p: any) => (
                              <SelectItem key={p.id} value={p.id}>{p.nombre} ({formatCurrency(p.costo_calculado || 0)})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Select value={row.insumo_id || 'none'} onValueChange={(v) => updateRow(i, 'insumo_id', v === 'none' ? '' : v)}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Seleccionar...</SelectItem>
                            {(() => {
                              const productos = insumos.filter((x: any) => x.tipo_item === 'producto');
                              const ingredientes = insumos.filter((x: any) => x.tipo_item === 'ingrediente');
                              const insumosItems = insumos.filter((x: any) => x.tipo_item === 'insumo' || !x.tipo_item);
                              return (
                                <>
                                  {productos.length > 0 && (
                                    <>
                                      <SelectItem value="__header_prod" disabled className="text-xs font-semibold text-muted-foreground">── Productos ──</SelectItem>
                                      {productos.map((ins: any) => (
                                        <SelectItem key={ins.id} value={ins.id}>{ins.nombre} ({formatCurrency(ins.costo_por_unidad_base || 0)})</SelectItem>
                                      ))}
                                    </>
                                  )}
                                  {ingredientes.length > 0 && (
                                    <>
                                      <SelectItem value="__header_ing" disabled className="text-xs font-semibold text-muted-foreground">── Ingredientes ──</SelectItem>
                                      {ingredientes.map((ins: any) => (
                                        <SelectItem key={ins.id} value={ins.id}>{ins.nombre} ({formatCurrency(ins.costo_por_unidad_base || 0)})</SelectItem>
                                      ))}
                                    </>
                                  )}
                                  {insumosItems.length > 0 && (
                                    <>
                                      <SelectItem value="__header_ins" disabled className="text-xs font-semibold text-muted-foreground">── Insumos ──</SelectItem>
                                      {insumosItems.map((ins: any) => (
                                        <SelectItem key={ins.id} value={ins.id}>{ins.nombre} ({formatCurrency(ins.costo_por_unidad_base || 0)})</SelectItem>
                                      ))}
                                    </>
                                  )}
                                </>
                              );
                            })()}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <Input type="number" className="h-7 w-16 text-xs shrink-0" value={row.cantidad} onChange={(e) => updateRow(i, 'cantidad', Number(e.target.value))} />
                    <span className="text-xs text-muted-foreground shrink-0">×</span>
                    <span className="font-mono text-xs w-16 text-right shrink-0">{formatCurrency(row._costo)}</span>
                    <span className="text-xs text-muted-foreground shrink-0">=</span>
                    <span className="font-mono text-xs font-semibold w-20 text-right shrink-0">{formatCurrency(row.cantidad * row._costo)}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeRow(i)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" onClick={addRow} className="w-full mt-2"><Plus className="w-4 h-4 mr-2" /> Agregar Componente</Button>
          </FormSection>

          {/* Optional Groups */}
          <FormSection title="Grupos Opcionales" icon={Tag}>
            <p className="text-xs text-muted-foreground mb-2">
              Para componentes variables (ej: bebida). El costo promedio del grupo se suma al costo total.
            </p>
            {(grupos || []).map((grupo: any) => (
              <GrupoOpcionalEditor
                key={grupo.id}
                grupo={grupo}
                itemId={item.id}
                insumos={insumos}
                preparaciones={preparaciones}
                mutations={gruposMutations}
              />
            ))}
            {showNewGrupo ? (
              <div className="flex items-center gap-2 p-3 border-2 border-dashed rounded-lg">
                <Input
                  value={grupoNuevoNombre}
                  onChange={(e) => setGrupoNuevoNombre(e.target.value)}
                  placeholder="Nombre del grupo (ej: Bebida)"
                  className="text-sm h-8"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateGrupo()}
                />
                <Button size="sm" className="h-8" onClick={handleCreateGrupo} disabled={!grupoNuevoNombre.trim() || gruposMutations.createGrupo.isPending}>
                  Crear
                </Button>
                <Button variant="ghost" size="sm" className="h-8" onClick={() => { setShowNewGrupo(false); setGrupoNuevoNombre(''); }}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setShowNewGrupo(true)} className="w-full">
                <Plus className="w-4 h-4 mr-2" /> Agregar Grupo Opcional
              </Button>
            )}
          </FormSection>

          {/* Cost summary */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Composición fija:</span><span className="font-mono">{formatCurrency(costoFijo)}</span></div>
              {costoGrupos > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">Grupos opcionales (promedio):</span><span className="font-mono">{formatCurrency(costoGrupos)}</span></div>
              )}
              <div className="flex justify-between items-center pt-2 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Costo Total</p>
                  <p className="text-2xl font-bold font-mono text-primary">{formatCurrency(costoTotal)}</p>
                </div>
                {item.precio_base > 0 && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">FC%</p>
                    <Badge variant={(costoTotal / item.precio_base * 100) <= 32 ? 'default' : (costoTotal / item.precio_base * 100) <= 40 ? 'secondary' : 'destructive'} className="text-lg px-3 py-1">
                      {(costoTotal / item.precio_base * 100).toFixed(1)}%
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{hasChanges ? 'Cancelar' : 'Cerrar'}</Button>
            {hasChanges && <LoadingButton loading={mutations.saveComposicion.isPending} onClick={handleSave}><Save className="w-4 h-4 mr-2" /> Guardar</LoadingButton>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Grupo Opcional Editor (inline) ───
function GrupoOpcionalEditor({ grupo, itemId, insumos, preparaciones, mutations }: any) {
  const [editItems, setEditItems] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [nombre, setNombre] = useState(grupo.nombre);

  useEffect(() => {
    if (grupo.items) {
      setEditItems(grupo.items.map((gi: any) => ({
        tipo: gi.preparacion_id ? 'preparacion' : 'insumo',
        insumo_id: gi.insumo_id || '',
        preparacion_id: gi.preparacion_id || '',
        cantidad: gi.cantidad,
        costo_unitario: gi.costo_unitario || gi.insumos?.costo_por_unidad_base || gi.preparaciones?.costo_calculado || 0,
        _nombre: gi.insumos?.nombre || gi.preparaciones?.nombre || '',
      })));
    }
  }, [grupo.items]);

  const addItem = () => {
    setEditItems([...editItems, { tipo: 'insumo', insumo_id: '', preparacion_id: '', cantidad: 1, costo_unitario: 0, _nombre: '' }]);
    setEditing(true);
  };

  const updateItem = (i: number, field: string, value: any) => {
    const next = [...editItems];
    next[i] = { ...next[i], [field]: value };
    if (field === 'tipo') { next[i].insumo_id = ''; next[i].preparacion_id = ''; next[i].costo_unitario = 0; next[i]._nombre = ''; }
    if (field === 'insumo_id') {
      const ins = insumos.find((x: any) => x.id === value);
      next[i].costo_unitario = ins?.costo_por_unidad_base || 0;
      next[i]._nombre = ins?.nombre || '';
    }
    if (field === 'preparacion_id') {
      const p = preparaciones.find((x: any) => x.id === value);
      next[i].costo_unitario = p?.costo_calculado || 0;
      next[i]._nombre = p?.nombre || '';
    }
    setEditItems(next);
    setEditing(true);
  };

  const removeItem = (i: number) => {
    setEditItems(editItems.filter((_, idx) => idx !== i));
    setEditing(true);
  };

  const promedio = editItems.length > 0
    ? editItems.reduce((s, i) => s + i.cantidad * i.costo_unitario, 0) / editItems.length
    : 0;

  const handleSave = async () => {
    if (nombre !== grupo.nombre) {
      await mutations.updateGrupo.mutateAsync({ id: grupo.id, item_carta_id: itemId, data: { nombre } });
    }
    await mutations.saveGrupoItems.mutateAsync({
      grupo_id: grupo.id,
      item_carta_id: itemId,
      items: editItems.filter(i => i.insumo_id || i.preparacion_id).map(i => ({
        insumo_id: i.tipo === 'insumo' ? i.insumo_id : null,
        preparacion_id: i.tipo === 'preparacion' ? i.preparacion_id : null,
        cantidad: i.cantidad,
        costo_unitario: i.costo_unitario,
      })),
    });
    setEditing(false);
  };

  return (
    <div className="border rounded-lg p-3 space-y-2 mb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">Grupo</Badge>
          <Input
            value={nombre}
            onChange={(e) => { setNombre(e.target.value); setEditing(true); }}
            className="h-7 text-sm font-medium w-40"
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Prom:</span>
          <span className="font-mono text-sm font-semibold">{formatCurrency(promedio)}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6 ml-2" onClick={() => mutations.deleteGrupo.mutate({ id: grupo.id, item_carta_id: itemId })}>
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </Button>
        </div>
      </div>

      {editItems.map((ei, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs pl-4">
          <Select value={ei.tipo} onValueChange={(v) => updateItem(i, 'tipo', v)}>
            <SelectTrigger className="h-6 w-[80px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="insumo">Catálogo</SelectItem>
              <SelectItem value="preparacion">Receta</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex-1 min-w-0">
            {ei.tipo === 'insumo' ? (
              <Select value={ei.insumo_id || 'none'} onValueChange={(v) => updateItem(i, 'insumo_id', v === 'none' ? '' : v)}>
                <SelectTrigger className="h-6 text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seleccionar...</SelectItem>
                  {(() => {
                    const selectedIds = editItems.filter((_, idx) => idx !== i).map(item => item.insumo_id).filter(Boolean);
                    const available = insumos.filter((x: any) => (x.tipo_item === 'insumo' || x.tipo_item === 'producto') && !selectedIds.includes(x.id));
                    const productos = available.filter((x: any) => x.tipo_item === 'producto');
                    const otros = available.filter((x: any) => x.tipo_item !== 'producto');
                    return (
                      <>
                        {productos.length > 0 && (
                          <>
                            <SelectItem value="__h_prod" disabled className="text-xs font-semibold text-muted-foreground">── Productos ──</SelectItem>
                            {productos.map((ins: any) => <SelectItem key={ins.id} value={ins.id}>{ins.nombre}</SelectItem>)}
                          </>
                        )}
                        {otros.length > 0 && (
                          <>
                            <SelectItem value="__h_ins" disabled className="text-xs font-semibold text-muted-foreground">── Insumos ──</SelectItem>
                            {otros.map((ins: any) => <SelectItem key={ins.id} value={ins.id}>{ins.nombre}</SelectItem>)}
                          </>
                        )}
                      </>
                    );
                  })()}
                </SelectContent>
              </Select>
            ) : (
              <Select value={ei.preparacion_id || 'none'} onValueChange={(v) => updateItem(i, 'preparacion_id', v === 'none' ? '' : v)}>
                <SelectTrigger className="h-6 text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seleccionar...</SelectItem>
                  {(() => {
                    const selectedIds = editItems.filter((_, idx) => idx !== i).map(item => item.preparacion_id).filter(Boolean);
                    return preparaciones.filter((p: any) => !selectedIds.includes(p.id)).map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            )}
          </div>
          <Input type="number" className="h-6 w-14 text-xs" value={ei.cantidad} onChange={(e) => updateItem(i, 'cantidad', Number(e.target.value))} />
          <span className="font-mono text-xs w-16 text-right">{formatCurrency(ei.cantidad * ei.costo_unitario)}</span>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeItem(i)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
        </div>
      ))}

      <div className="flex items-center gap-2 pl-4">
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={addItem}>
          <Plus className="w-3 h-3 mr-1" /> Agregar opción
        </Button>
        {editing && (
          <Button size="sm" className="h-6 text-xs ml-auto" onClick={handleSave} disabled={mutations.saveGrupoItems.isPending}>
            <Save className="w-3 h-3 mr-1" /> Guardar grupo
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Precio Modal ───
function PrecioModal({ open, onOpenChange, item, cmvCategories, mutations, userId }: any) {
  const [nuevoPrecio, setNuevoPrecio] = useState(item?.precio_base || 0);
  const [motivo, setMotivo] = useState('');

  const handleSubmit = async () => {
    if (!nuevoPrecio) return;
    await mutations.cambiarPrecio.mutateAsync({
      itemId: item.id,
      precioAnterior: item.precio_base,
      precioNuevo: nuevoPrecio,
      motivo: motivo || undefined,
      userId,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Cambiar Precio: {item?.nombre}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Precio actual:</span><span className="font-mono">{formatCurrency(item?.precio_base || 0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Costo:</span><span className="font-mono">{formatCurrency(item?.costo_total || 0)}</span></div>
          </div>
          <FormRow label="Nuevo precio ($)" required>
            <Input type="number" value={nuevoPrecio || ''} onChange={(e) => setNuevoPrecio(Number(e.target.value))} />
          </FormRow>
          <FormRow label="Motivo (opcional)">
            <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} />
          </FormRow>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <LoadingButton loading={mutations.cambiarPrecio.isPending} onClick={handleSubmit} disabled={!nuevoPrecio}>Confirmar</LoadingButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Historial Modal ───
function HistorialModal({ open, onOpenChange, item }: any) {
  const { data: historial } = useItemCartaHistorial(item?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Historial: {item?.nombre}</DialogTitle></DialogHeader>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {historial?.length ? historial.map((h: any) => (
            <div key={h.id} className="flex justify-between items-center p-2 border rounded text-sm">
              <div>
                <span className="font-mono">{formatCurrency(h.precio_anterior || 0)} → {formatCurrency(h.precio_nuevo)}</span>
                {h.motivo && <p className="text-xs text-muted-foreground">{h.motivo}</p>}
              </div>
              <span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleDateString('es-AR')}</span>
            </div>
          )) : <p className="text-sm text-muted-foreground text-center py-4">Sin historial</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
