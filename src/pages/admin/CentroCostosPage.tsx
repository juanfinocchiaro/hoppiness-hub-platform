import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { DataToolbar } from '@/components/ui/data-table-pro';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingButton } from '@/components/ui/loading-button';
import { FormRow, FormSection } from '@/components/ui/forms-pro';
import { StickyActions } from '@/components/ui/forms-pro';
import { EmptyState } from '@/components/ui/states';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Percent, AlertTriangle, CheckCircle, TrendingDown, Edit, History, Plus,
  Trash2, Package, Save, DollarSign, Tag, Layers,
} from 'lucide-react';
import { useItemsCarta, useItemCartaComposicion, useItemCartaHistorial, useItemCartaMutations } from '@/hooks/useItemsCarta';
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

  const cmvCategories = useMemo(() => {
    return rdoCategories?.filter((c: any) => c.parent_code === 'CMV' || c.code?.startsWith('cmv')) || [];
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
        <PageHeader title="Centro de Costos" subtitle="Capa 3 — Items de carta con precio y composición" />
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
              <TableHead>Categoría RDO</TableHead>
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
                <TableCell className="text-sm">{item.rdo_categories?.name || <span className="text-muted-foreground italic">—</span>}</TableCell>
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

      {/* PRECIO MODAL */}
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
          <FormSection title="Clasificación RDO" icon={Tag}>
            <FormRow label="Categoría RDO" required>
              <Select value={form.rdo_category_code || 'none'} onValueChange={(v) => set('rdo_category_code', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seleccionar...</SelectItem>
                  {cmvCategories.map((c: any) => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormRow>
          </FormSection>
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
  const [rows, setRows] = useState<any[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

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

  const costoTotal = rows.reduce((t, r) => t + r.cantidad * r._costo, 0);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Composición: {item.nombre}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Tipo</TableHead>
                  <TableHead>Componente</TableHead>
                  <TableHead className="w-[80px]">Cantidad</TableHead>
                  <TableHead className="text-right">Costo Unit.</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Sin composición — agregá componentes</TableCell></TableRow>
                ) : rows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Select value={row.tipo} onValueChange={(v) => updateRow(i, 'tipo', v)}>
                        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="preparacion">Preparación</SelectItem>
                          <SelectItem value="insumo">Insumo</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {row.tipo === 'preparacion' ? (
                        <Select value={row.preparacion_id || 'none'} onValueChange={(v) => updateRow(i, 'preparacion_id', v === 'none' ? '' : v)}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Seleccionar...</SelectItem>
                            {preparaciones.map((p: any) => (
                              <SelectItem key={p.id} value={p.id}>{p.nombre} ({formatCurrency(p.costo_calculado || 0)})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Select value={row.insumo_id || 'none'} onValueChange={(v) => updateRow(i, 'insumo_id', v === 'none' ? '' : v)}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Seleccionar...</SelectItem>
                            {insumos.filter((x: any) => x.tipo_item === 'insumo' || x.tipo_item === 'producto').map((ins: any) => (
                              <SelectItem key={ins.id} value={ins.id}>{ins.nombre} ({formatCurrency(ins.costo_por_unidad_base || 0)})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell><Input type="number" className="w-20" value={row.cantidad} onChange={(e) => updateRow(i, 'cantidad', Number(e.target.value))} /></TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatCurrency(row._costo)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(row.cantidad * row._costo)}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => removeRow(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Button variant="outline" onClick={addRow} className="w-full"><Plus className="w-4 h-4 mr-2" /> Agregar Componente</Button>
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Costo Total Composición</p>
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
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{hasChanges ? 'Cancelar' : 'Cerrar'}</Button>
            {hasChanges && <LoadingButton loading={mutations.saveComposicion.isPending} onClick={handleSave}><Save className="w-4 h-4 mr-2" /> Guardar</LoadingButton>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Precio Modal ───
function PrecioModal({ open, onOpenChange, item, cmvCategories, mutations, userId }: any) {
  const [nuevoPrecio, setNuevoPrecio] = useState(item?.precio_base || 0);
  const [motivo, setMotivo] = useState('');
  const [rdoCode, setRdoCode] = useState(item?.rdo_category_code || '');

  const handleSubmit = async () => {
    if (!nuevoPrecio) return;
    if (rdoCode !== item.rdo_category_code) {
      await mutations.update.mutateAsync({ id: item.id, data: { rdo_category_code: rdoCode || null } });
    }
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
          <FormRow label="Categoría RDO">
            <Select value={rdoCode || 'none'} onValueChange={(v) => setRdoCode(v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin categoría</SelectItem>
                {cmvCategories.map((c: any) => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormRow>
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
