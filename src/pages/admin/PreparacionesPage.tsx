import { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { DataToolbar } from '@/components/ui/data-table-pro';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormRow, FormSection } from '@/components/ui/forms-pro';
import { StickyActions } from '@/components/ui/forms-pro';
import { LoadingButton } from '@/components/ui/loading-button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/states';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus, Pencil, Trash2, ChefHat, Package, Save, Shuffle,
} from 'lucide-react';
import {
  usePreparaciones,
  usePreparacionIngredientes,
  usePreparacionOpciones,
  usePreparacionMutations,
} from '@/hooks/usePreparaciones';
import { useInsumos } from '@/hooks/useInsumos';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(value);

const UNIDADES = [
  { value: 'g', label: 'Gramos (g)' },
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'ml', label: 'Mililitros (ml)' },
  { value: 'l', label: 'Litros (l)' },
  { value: 'un', label: 'Unidades' },
];

function calcSubtotal(cantidad: number, costoUnit: number, unidad: string) {
  if (!cantidad || !costoUnit) return 0;
  const mult = (unidad === 'kg' || unidad === 'l') ? 1000 : 1;
  return cantidad * costoUnit * mult;
}

export default function PreparacionesPage() {
  const { data: preparaciones, isLoading } = usePreparaciones();
  const mutations = usePreparacionMutations();

  const [search, setSearch] = useState('');
  const [modalPrep, setModalPrep] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingPrep, setDeletingPrep] = useState<any>(null);

  const filteredPreps = useMemo(() => {
    return preparaciones?.filter((p: any) => {
      if (!search) return true;
      return p.nombre.toLowerCase().includes(search.toLowerCase());
    }) || [];
  }, [preparaciones, search]);

  const openCreate = () => { setModalPrep(null); setIsCreating(true); };
  const openEdit = (prep: any) => { setModalPrep(prep); setIsCreating(true); };
  const closeModal = () => { setModalPrep(null); setIsCreating(false); };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Preparaciones" subtitle="Capa 2 — Lo que hace la cocina" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Preparaciones" subtitle="Capa 2 — Fichas técnicas y componentes intermedios" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <DataToolbar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Buscar preparación..." />
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Nueva Preparación
        </Button>
      </div>

      {filteredPreps.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <EmptyState icon={ChefHat} title="Sin preparaciones" description="Creá una preparación para empezar a definir fichas técnicas" />
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Costo Calculado</TableHead>
                <TableHead className="w-[120px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPreps.map((prep: any) => (
                <TableRow key={prep.id} className="cursor-pointer" onClick={() => openEdit(prep)}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{prep.nombre}</p>
                      {prep.descripcion && <p className="text-xs text-muted-foreground truncate max-w-[250px]">{prep.descripcion}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={prep.tipo === 'elaborado' ? 'default' : 'secondary'}>
                      {prep.tipo === 'elaborado' ? '🍳 Elaborado' : '📦 Componente'}
                    </Badge>
                    {prep.es_intercambiable && (
                      <Badge variant="outline" className="ml-1 text-xs">
                        <Shuffle className="w-3 h-3 mr-1" /> Intercambiable
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {prep.costo_calculado > 0 ? formatCurrency(prep.costo_calculado) : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(prep)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeletingPrep(prep)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ═══ UNIFIED CREATE/EDIT + FICHA MODAL ═══ */}
      {isCreating && (
        <PreparacionFullModal
          open={isCreating}
          onOpenChange={(v) => { if (!v) closeModal(); }}
          preparacion={modalPrep}
          mutations={mutations}
        />
      )}

      <ConfirmDialog
        open={!!deletingPrep}
        onOpenChange={() => setDeletingPrep(null)}
        title="Eliminar preparación"
        description={`¿Eliminar "${deletingPrep?.nombre}"? Los items de carta que la usen perderán su referencia.`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={async () => {
          await mutations.softDelete.mutateAsync(deletingPrep.id);
          setDeletingPrep(null);
        }}
      />
    </div>
  );
}

// ═══ UNIFIED MODAL: General + Ficha Técnica / Opciones ═══
function PreparacionFullModal({ open, onOpenChange, preparacion, mutations }: {
  open: boolean; onOpenChange: (v: boolean) => void; preparacion: any; mutations: any;
}) {
  const isEdit = !!preparacion;
  const [form, setForm] = useState({ nombre: '', descripcion: '', tipo: 'elaborado', es_intercambiable: false, metodo_costeo: 'promedio' });
  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));
  const [savedId, setSavedId] = useState<string | null>(preparacion?.id || null);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    if (preparacion) {
      setForm({
        nombre: preparacion.nombre,
        descripcion: preparacion.descripcion || '',
        tipo: preparacion.tipo,
        es_intercambiable: preparacion.es_intercambiable || false,
        metodo_costeo: preparacion.metodo_costeo || 'promedio',
      });
      setSavedId(preparacion.id);
    } else {
      setForm({ nombre: '', descripcion: '', tipo: 'elaborado', es_intercambiable: false, metodo_costeo: 'promedio' });
      setSavedId(null);
    }
  }, [preparacion, open]);

  const handleSaveGeneral = async () => {
    if (!form.nombre.trim()) return;
    if (isEdit || savedId) {
      await mutations.update.mutateAsync({ id: savedId || preparacion.id, data: form });
    } else {
      const result = await mutations.create.mutateAsync(form);
      setSavedId(result.id);
      // Auto-switch to ficha tab after creation
      setActiveTab('ficha');
    }
  };

  const effectiveTipo = form.tipo;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? preparacion.nombre : 'Nueva Preparación'}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="general" className="flex-1">General</TabsTrigger>
            <TabsTrigger value="ficha" className="flex-1" disabled={!savedId}>
              {effectiveTipo === 'elaborado' ? '🍳 Ficha Técnica' : '📦 Opciones'}
            </TabsTrigger>
          </TabsList>

          {/* ─── TAB: General ─── */}
          <TabsContent value="general" className="space-y-4 mt-4">
            <FormRow label="Nombre" required>
              <Input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Ej: Hamburguesa Clásica" />
            </FormRow>
            <FormRow label="Descripción">
              <Textarea value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} rows={2} />
            </FormRow>
            <FormSection title="Tipo" icon={ChefHat}>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => set('tipo', 'elaborado')}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${form.tipo === 'elaborado' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                  <p className="font-medium text-sm">🍳 Elaborado</p>
                  <p className="text-xs text-muted-foreground">Tiene ficha técnica con ingredientes</p>
                </button>
                <button type="button" onClick={() => set('tipo', 'componente_terminado')}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${form.tipo === 'componente_terminado' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                  <p className="font-medium text-sm">📦 Componente</p>
                  <p className="text-xs text-muted-foreground">Porción de insumo terminado</p>
                </button>
              </div>
            </FormSection>

            {form.tipo === 'componente_terminado' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Intercambiable (múltiples opciones)</span>
                  <Switch checked={form.es_intercambiable} onCheckedChange={(v) => set('es_intercambiable', v)} />
                </div>
                {form.es_intercambiable && (
                  <FormRow label="Método de costeo">
                    <Select value={form.metodo_costeo} onValueChange={(v) => set('metodo_costeo', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="promedio">Promedio</SelectItem>
                        <SelectItem value="mas_caro">Más caro</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormRow>
                )}
              </div>
            )}

            <StickyActions>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <LoadingButton loading={mutations.create.isPending || mutations.update.isPending} onClick={handleSaveGeneral} disabled={!form.nombre}>
                {savedId ? 'Guardar Cambios' : 'Crear y Continuar →'}
              </LoadingButton>
            </StickyActions>
          </TabsContent>

          {/* ─── TAB: Ficha Técnica / Opciones ─── */}
          <TabsContent value="ficha" className="mt-4">
            {savedId && effectiveTipo === 'elaborado' && (
              <FichaTecnicaTab preparacionId={savedId} mutations={mutations} onClose={() => onOpenChange(false)} />
            )}
            {savedId && effectiveTipo === 'componente_terminado' && (
              <OpcionesTab preparacionId={savedId} mutations={mutations} onClose={() => onOpenChange(false)} />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ═══ FICHA TÉCNICA TAB (Elaborado) ═══
function FichaTecnicaTab({ preparacionId, mutations, onClose }: { preparacionId: string; mutations: any; onClose: () => void }) {
  const { data: ingredientesActuales } = usePreparacionIngredientes(preparacionId);
  const { data: insumos } = useInsumos();

  const ingredientesDisponibles = useMemo(() => {
    return insumos?.filter((i: any) => i.tipo_item === 'ingrediente' || i.tipo_item === 'insumo') || [];
  }, [insumos]);

  const [items, setItems] = useState<any[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (ingredientesActuales) {
      setItems(ingredientesActuales.map((item: any) => ({
        insumo_id: item.insumo_id,
        cantidad: item.cantidad,
        unidad: item.unidad,
        insumo: item.insumos,
      })));
      setHasChanges(false);
    }
  }, [ingredientesActuales]);

  const addItem = () => { setItems([...items, { insumo_id: '', cantidad: 0, unidad: '', insumo: null }]); setHasChanges(true); };
  const removeItem = (i: number) => { setItems(items.filter((_, idx) => idx !== i)); setHasChanges(true); };
  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'insumo_id') {
      const ins = ingredientesDisponibles.find((i: any) => i.id === value);
      newItems[index].insumo = ins;
      newItems[index].unidad = ins?.unidad_base || 'g';
    }
    setItems(newItems);
    setHasChanges(true);
  };

  const costoTotal = useMemo(() => items.reduce((t, item) => t + calcSubtotal(item.cantidad, item.insumo?.costo_por_unidad_base || 0, item.unidad), 0), [items]);

  const handleSave = async () => {
    await mutations.saveIngredientes.mutateAsync({
      preparacion_id: preparacionId,
      items: items.filter(i => i.insumo_id && i.cantidad > 0),
    });
    setHasChanges(false);
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Ingrediente</TableHead>
              <TableHead className="w-[100px]">Cantidad</TableHead>
              <TableHead className="w-[120px]">Unidad</TableHead>
              <TableHead className="text-right">Costo Unit.</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Sin ingredientes — agregá el primero</TableCell></TableRow>
            ) : items.map((item, index) => {
              const costoUnit = item.insumo?.costo_por_unidad_base || 0;
              const subtotal = calcSubtotal(item.cantidad, costoUnit, item.unidad);
              return (
                <TableRow key={index}>
                  <TableCell>
                    <Select value={item.insumo_id || 'none'} onValueChange={(v) => updateItem(index, 'insumo_id', v === 'none' ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Seleccionar...</SelectItem>
                        {ingredientesDisponibles.map((ing: any) => (
                          <SelectItem key={ing.id} value={ing.id}>{ing.nombre} (${ing.costo_por_unidad_base?.toFixed(2)}/{ing.unidad_base})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Input type="number" step="0.01" value={item.cantidad || ''} onChange={(e) => updateItem(index, 'cantidad', Number(e.target.value))} className="w-24" /></TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{item.unidad || '—'}</span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{costoUnit > 0 ? formatCurrency(costoUnit) : '—'}</TableCell>
                  <TableCell className="text-right font-mono">{subtotal > 0 ? formatCurrency(subtotal) : '—'}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => removeItem(index)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <Button variant="outline" onClick={addItem} className="w-full"><Plus className="w-4 h-4 mr-2" /> Agregar Ingrediente</Button>

      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">Costo Total de la Preparación</p>
          <p className="text-2xl font-bold font-mono text-primary">{formatCurrency(costoTotal)}</p>
        </div>
        {hasChanges && (
          <LoadingButton loading={mutations.saveIngredientes.isPending} onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" /> Guardar Ficha
          </LoadingButton>
        )}
      </div>
    </div>
  );
}

// ═══ OPCIONES TAB (Componente Terminado) ═══
function OpcionesTab({ preparacionId, mutations, onClose }: { preparacionId: string; mutations: any; onClose: () => void }) {
  const { data: opcionesActuales } = usePreparacionOpciones(preparacionId);
  const { data: insumos } = useInsumos();

  const productosDisponibles = useMemo(() => insumos?.filter((i: any) => i.tipo_item === 'producto') || [], [insumos]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (opcionesActuales) {
      setSelectedIds(opcionesActuales.map((o: any) => o.insumo_id));
      setHasChanges(false);
    }
  }, [opcionesActuales]);

  const toggleOption = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    setHasChanges(true);
  };

  const handleSave = async () => {
    await mutations.saveOpciones.mutateAsync({ preparacion_id: preparacionId, insumo_ids: selectedIds });
    setHasChanges(false);
    onClose();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Seleccioná los productos intercambiables para este componente:</p>
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {productosDisponibles.map((prod: any) => (
          <button
            key={prod.id}
            type="button"
            onClick={() => toggleOption(prod.id)}
            className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors text-left ${selectedIds.includes(prod.id) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
          >
            <div>
              <p className="font-medium text-sm">{prod.nombre}</p>
              <p className="text-xs text-muted-foreground">{formatCurrency(prod.costo_por_unidad_base || 0)}</p>
            </div>
            {selectedIds.includes(prod.id) && <Badge variant="default">✓</Badge>}
          </button>
        ))}
      </div>
      {hasChanges && (
        <div className="flex justify-end">
          <LoadingButton loading={mutations.saveOpciones.isPending} onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" /> Guardar Opciones
          </LoadingButton>
        </div>
      )}
    </div>
  );
}
