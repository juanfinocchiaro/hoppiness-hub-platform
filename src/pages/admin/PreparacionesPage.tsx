import { useState, useMemo, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { DataToolbar } from '@/components/ui/data-table-pro';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Plus, Pencil, Trash2, ChefHat, Package, Save, Shuffle, ChevronDown, GripVertical, Check, X,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

// Animated expandable panel
function ExpandablePanel({ open, children }: { open: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(open ? undefined : 0);
  const [isVisible, setIsVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      requestAnimationFrame(() => {
        if (ref.current) setHeight(ref.current.scrollHeight);
      });
    } else {
      if (ref.current) setHeight(ref.current.scrollHeight);
      requestAnimationFrame(() => setHeight(0));
    }
  }, [open]);

  const onTransitionEnd = () => {
    if (open) setHeight(undefined);
    else setIsVisible(false);
  };

  if (!isVisible && !open) return null;

  return (
    <div
      style={{ height: height !== undefined ? `${height}px` : 'auto', overflow: 'hidden', transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease' , opacity: open ? 1 : 0 }}
      onTransitionEnd={onTransitionEnd}
    >
      <div ref={ref}>{children}</div>
    </div>
  );
}

// Inline editable name
function InlineNombre({ prep, mutations }: { prep: any; mutations: any }) {
  const [value, setValue] = useState(prep.nombre || '');
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setValue(prep.nombre || ''); setDirty(false); }, [prep.nombre]);

  const save = async () => {
    if (!dirty || !value.trim()) return;
    await mutations.update.mutateAsync({ id: prep.id, data: { nombre: value.trim() } });
    setDirty(false);
  };

  return (
    <div className="flex items-center gap-2 pt-2 mb-1">
      <Input
        value={value}
        onChange={(e) => { setValue(e.target.value); setDirty(true); }}
        placeholder="Nombre de la receta..."
        className="text-sm font-semibold h-8"
        onBlur={save}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } if (e.key === 'Escape') { setValue(prep.nombre); setDirty(false); } }}
      />
      {dirty && (
        <Button size="sm" variant="outline" className="shrink-0 h-8" onClick={save} disabled={mutations.update.isPending}>
          <Save className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}

// Inline editable description
function InlineDescripcion({ prep, mutations }: { prep: any; mutations: any }) {
  const [value, setValue] = useState(prep.descripcion || '');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setValue(prep.descripcion || '');
    setDirty(false);
  }, [prep.descripcion]);

  const save = async () => {
    if (!dirty) return;
    await mutations.update.mutateAsync({ id: prep.id, data: { descripcion: value } });
    setDirty(false);
  };

  return (
    <div className="flex items-start gap-2 mb-3">
      <Textarea
        value={value}
        onChange={(e) => { setValue(e.target.value); setDirty(true); }}
        placeholder="Descripción de la receta..."
        rows={1}
        className="text-sm resize-none min-h-[36px]"
        onBlur={save}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save(); } }}
      />
      {dirty && (
        <Button size="sm" variant="outline" className="shrink-0" onClick={save} disabled={mutations.update.isPending}>
          <Save className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}

// Inline precio extra editor
function InlinePrecioExtra({ prep, mutations }: { prep: any; mutations: any }) {
  const [value, setValue] = useState(prep.precio_extra ?? '');
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setValue(prep.precio_extra ?? ''); setDirty(false); }, [prep.precio_extra]);

  const save = async () => {
    if (!dirty) return;
    const numVal = value === '' || value === null ? null : Number(value);
    await mutations.update.mutateAsync({ id: prep.id, data: { precio_extra: numVal } });
    setDirty(false);
  };

  const costo = prep.costo_calculado || 0;
  const precioExtra = value !== '' && value !== null ? Number(value) : null;
  const fcExtra = precioExtra && precioExtra > 0 && costo > 0 ? (costo / (precioExtra / 1.21)) * 100 : null;

  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-xs text-muted-foreground shrink-0">Precio como extra ($):</span>
      <Input
        type="number"
        value={value}
        onChange={(e) => { setValue(e.target.value === '' ? '' : Number(e.target.value)); setDirty(true); }}
        placeholder="No disponible"
        className="h-8 w-28 text-sm"
        onBlur={save}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } }}
      />
      {fcExtra !== null && (
        <Badge variant={fcExtra <= 45 ? fcExtra <= 30 ? 'default' : 'secondary' : 'destructive'} className="text-xs shrink-0">
          FC {fcExtra.toFixed(0)}%
        </Badge>
      )}
      {dirty && (
        <Button size="sm" variant="outline" className="shrink-0 h-8" onClick={save} disabled={mutations.update.isPending}>
          <Save className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}

import {
  usePreparaciones,
  usePreparacionIngredientes,
  usePreparacionOpciones,
  usePreparacionMutations,
} from '@/hooks/usePreparaciones';
import { useCategoriasPreparacion, useCategoriaPreparacionMutations } from '@/hooks/useCategoriasPreparacion';
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

/* ─── Inline category selector ─── */
function InlineCategoria({ prep, mutations, categorias }: { prep: any; mutations: any; categorias: any[] | undefined }) {
  const current = prep.categoria_preparacion_id || '';
  const save = async (value: string) => {
    const newVal = value === '_none' ? null : value;
    if (newVal === (prep.categoria_preparacion_id || null)) return;
    await mutations.update.mutateAsync({ id: prep.id, data: { categoria_preparacion_id: newVal } });
  };
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-xs text-muted-foreground shrink-0">Categoría:</span>
      <Select value={current || '_none'} onValueChange={save}>
        <SelectTrigger className="h-8 text-xs w-48">
          <SelectValue placeholder="Sin categoría" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_none">Sin categoría</SelectItem>
          {categorias?.map((c: any) => (
            <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/* ─── Recipe row (used inside category cards and uncategorized) ─── */
function PrepRow({ prep, isExpanded, onToggle, mutations, onDelete, categorias }: {
  prep: any; isExpanded: boolean; onToggle: () => void; mutations: any; onDelete: () => void; categorias: any[] | undefined;
}) {
  return (
    <div>
      <div
        className={`flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors ${isExpanded ? 'bg-muted/30' : ''}`}
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <p className="font-medium">{prep.nombre}</p>
          {prep.descripcion && <p className="text-xs text-muted-foreground truncate">{prep.descripcion}</p>}
        </div>
        <Badge variant={prep.tipo === 'elaborado' ? 'default' : 'secondary'} className="shrink-0">
          {prep.tipo === 'elaborado' ? '🍳 Elaborado' : '📦 Componente'}
        </Badge>
        {prep.es_intercambiable && (
          <Badge variant="outline" className="text-xs shrink-0">
            <Shuffle className="w-3 h-3 mr-1" /> Intercambiable
          </Badge>
        )}
        <span className="font-mono text-sm shrink-0 w-24 text-right">
          {prep.costo_calculado > 0 ? formatCurrency(prep.costo_calculado) : '—'}
        </span>
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
      </div>
      <ExpandablePanel open={isExpanded}>
        <div className="px-4 pb-4 pt-1 bg-muted/30 border-t">
          <InlineNombre prep={prep} mutations={mutations} />
          <InlineCategoria prep={prep} mutations={mutations} categorias={categorias} />
          <InlineDescripcion prep={prep} mutations={mutations} />
          <InlinePrecioExtra prep={prep} mutations={mutations} />
          {prep.tipo === 'elaborado' ? (
            <FichaTecnicaTab preparacionId={prep.id} mutations={mutations} onClose={onToggle} />
          ) : (
            <OpcionesTab preparacionId={prep.id} mutations={mutations} onClose={onToggle} />
          )}
        </div>
      </ExpandablePanel>
    </div>
  );
}

/* ─── Sortable category card ─── */
function SortableCategoryCard({
  cat, items, isOpen, onToggle,
  editingId, editingNombre, setEditingNombre, setEditingId, handleUpdateCat, setDeletingCat,
  expandedId, setExpandedId, mutations, setDeletingPrep, categorias,
}: {
  cat: any; items: any[]; isOpen: boolean; onToggle: () => void;
  editingId: string | null; editingNombre: string; setEditingNombre: (v: string) => void;
  setEditingId: (v: string | null) => void; handleUpdateCat: () => void; setDeletingCat: (v: any) => void;
  expandedId: string | null; setExpandedId: (v: string | null) => void; mutations: any; setDeletingPrep: (v: any) => void; categorias: any[] | undefined;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : undefined };
  const isEditing = editingId === cat.id;

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <Card ref={setNodeRef} style={style} className="overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-muted/40 border-b">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none shrink-0">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </button>
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Input value={editingNombre} onChange={(e) => setEditingNombre(e.target.value)} className="h-7 w-48 text-sm" autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateCat(); if (e.key === 'Escape') setEditingId(null); }} />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleUpdateCat}><Check className="w-3.5 h-3.5 text-green-600" /></Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="w-3.5 h-3.5" /></Button>
            </div>
          ) : (
            <>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 flex-1 min-w-0 text-left">
                  <span className="font-semibold text-sm">{cat.nombre}</span>
                  <Badge variant="secondary" className="text-xs font-normal">{items.length}</Badge>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground ml-auto transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
              </CollapsibleTrigger>
              <div className="flex items-center gap-0.5 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingId(cat.id); setEditingNombre(cat.nombre); }}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeletingCat(cat)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </>
          )}
        </div>
        <CollapsibleContent>
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">Sin recetas en esta categoría</div>
          ) : (
            <div className="divide-y">
              {items.map((prep: any) => (
                <PrepRow
                  key={prep.id}
                  prep={prep}
                  isExpanded={expandedId === prep.id}
                  onToggle={() => setExpandedId(expandedId === prep.id ? null : prep.id)}
                  mutations={mutations}
                  onDelete={() => setDeletingPrep(prep)}
                  categorias={categorias}
                />
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function PreparacionesPage() {
  const { data: preparaciones, isLoading: loadingPreps } = usePreparaciones();
  const { data: categorias, isLoading: loadingCats } = useCategoriasPreparacion();
  const mutations = usePreparacionMutations();
  const catMutations = useCategoriaPreparacionMutations();

  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [deletingPrep, setDeletingPrep] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Category state
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatNombre, setEditingCatNombre] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatNombre, setNewCatNombre] = useState('');
  const [deletingCat, setDeletingCat] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const toggleCat = (catId: string) => {
    setCollapsedCats(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId); else next.add(catId);
      return next;
    });
  };

  const filteredPreps = useMemo(() => {
    return preparaciones?.filter((p: any) => {
      if (!search) return true;
      return p.nombre.toLowerCase().includes(search.toLowerCase());
    }) || [];
  }, [preparaciones, search]);

  const prepsByCategory = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const p of filteredPreps) {
      const catId = p.categoria_preparacion_id || 'sin-categoria';
      if (!map[catId]) map[catId] = [];
      map[catId].push(p);
    }
    return map;
  }, [filteredPreps]);

  const uncategorized = prepsByCategory['sin-categoria'] || [];
  const isLoading = loadingPreps || loadingCats;

  const handleCreateCat = async () => {
    if (!newCatNombre.trim()) return;
    await catMutations.create.mutateAsync({ nombre: newCatNombre.trim(), orden: (categorias?.length || 0) + 1 });
    setNewCatNombre('');
    setShowNewCat(false);
  };

  const handleUpdateCat = async () => {
    if (!editingCatId || !editingCatNombre.trim()) return;
    await catMutations.update.mutateAsync({ id: editingCatId, data: { nombre: editingCatNombre.trim() } });
    setEditingCatId(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !categorias) return;
    const oldIndex = categorias.findIndex((c: any) => c.id === active.id);
    const newIndex = categorias.findIndex((c: any) => c.id === over.id);
    const reordered = arrayMove(categorias, oldIndex, newIndex);
    await catMutations.reorder.mutateAsync(reordered.map((c: any, i: number) => ({ id: c.id, orden: i + 1 })));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Recetas" subtitle="Fichas técnicas de lo que se prepara en la cocina" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recetas"
        subtitle="Fichas técnicas de lo que se prepara en la cocina"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowNewCat(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Categoría
            </Button>
            <Button size="sm" onClick={() => setIsCreating(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Nueva Receta
            </Button>
          </div>
        }
      />

      <DataToolbar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Buscar receta..." />

      {/* New category inline form */}
      {showNewCat && (
        <Card className="border-dashed border-primary/40">
          <CardContent className="p-4 flex items-center gap-3">
            <Input value={newCatNombre} onChange={(e) => setNewCatNombre(e.target.value)} placeholder="Nombre de la categoría..." className="max-w-xs" autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCat(); if (e.key === 'Escape') { setShowNewCat(false); setNewCatNombre(''); } }} />
            <Button size="sm" onClick={handleCreateCat} disabled={!newCatNombre.trim() || catMutations.create.isPending}><Check className="w-4 h-4" /></Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowNewCat(false); setNewCatNombre(''); }}><X className="w-4 h-4" /></Button>
          </CardContent>
        </Card>
      )}

      {(!categorias || categorias.length === 0) && filteredPreps.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <EmptyState icon={ChefHat} title="Sin recetas" description="Creá una receta para empezar a definir fichas técnicas" />
          </CardContent>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis]}>
          <SortableContext items={categorias?.map((c: any) => c.id) || []} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {categorias?.map((cat: any) => (
                <SortableCategoryCard
                  key={cat.id}
                  cat={cat}
                  items={prepsByCategory[cat.id] || []}
                  isOpen={!collapsedCats.has(cat.id)}
                  onToggle={() => toggleCat(cat.id)}
                  editingId={editingCatId}
                  editingNombre={editingCatNombre}
                  setEditingNombre={setEditingCatNombre}
                  setEditingId={setEditingCatId}
                  handleUpdateCat={handleUpdateCat}
                  setDeletingCat={setDeletingCat}
                  expandedId={expandedId}
                  setExpandedId={setExpandedId}
                  mutations={mutations}
                  setDeletingPrep={setDeletingPrep}
                  categorias={categorias}
                />
              ))}

              {uncategorized.length > 0 && (
                <Card className="overflow-hidden border-dashed">
                  <div className="flex items-center gap-2 px-4 py-3 bg-muted/20 border-b">
                    <span className="font-semibold text-sm text-muted-foreground">Sin categoría</span>
                    <Badge variant="secondary" className="text-xs">{uncategorized.length}</Badge>
                  </div>
                  <div className="divide-y">
                    {uncategorized.map((prep: any) => (
                      <PrepRow
                        key={prep.id}
                        prep={prep}
                        isExpanded={expandedId === prep.id}
                        onToggle={() => setExpandedId(expandedId === prep.id ? null : prep.id)}
                        mutations={mutations}
                        onDelete={() => setDeletingPrep(prep)}
                        categorias={categorias}
                      />
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {isCreating && (
        <PreparacionFullModal
          open={isCreating}
          onOpenChange={(v) => { if (!v) setIsCreating(false); }}
          preparacion={null}
          mutations={mutations}
          categorias={categorias || []}
        />
      )}

      <ConfirmDialog
        open={!!deletingPrep}
        onOpenChange={() => setDeletingPrep(null)}
        title="Eliminar preparación"
        description={`¿Eliminar "${deletingPrep?.nombre}"? Los items de carta que la usen perderán su referencia a esta receta.`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={async () => {
          await mutations.softDelete.mutateAsync(deletingPrep.id);
          setDeletingPrep(null);
        }}
      />

      <ConfirmDialog
        open={!!deletingCat}
        onOpenChange={() => setDeletingCat(null)}
        title="Eliminar categoría"
        description={`¿Eliminar "${deletingCat?.nombre}"? Las recetas quedarán sin categoría.`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={async () => {
          await catMutations.softDelete.mutateAsync(deletingCat.id);
          setDeletingCat(null);
        }}
      />
    </div>
  );
}

// ═══ UNIFIED MODAL: General + Ficha Técnica / Opciones ═══
function PreparacionFullModal({ open, onOpenChange, preparacion, mutations, categorias }: {
  open: boolean; onOpenChange: (v: boolean) => void; preparacion: any; mutations: any; categorias: any[];
}) {
  const isEdit = !!preparacion;
  const [form, setForm] = useState({ nombre: '', descripcion: '', tipo: 'elaborado', es_intercambiable: false, metodo_costeo: 'promedio', categoria_preparacion_id: '' });
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
        categoria_preparacion_id: preparacion.categoria_preparacion_id || '',
      });
      setSavedId(preparacion.id);
    } else {
      setForm({ nombre: '', descripcion: '', tipo: 'elaborado', es_intercambiable: false, metodo_costeo: 'promedio', categoria_preparacion_id: '' });
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
          <DialogTitle>{isEdit ? preparacion.nombre : 'Nueva Receta'}</DialogTitle>
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
            <FormRow label="Categoría">
              <Select value={form.categoria_preparacion_id || 'none'} onValueChange={(v) => set('categoria_preparacion_id', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Sin categoría" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoría</SelectItem>
                  {categorias.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
  const { data: preparaciones } = usePreparaciones();

  const ingredientesDisponibles = useMemo(() => {
    return insumos?.filter((i: any) => i.tipo_item === 'ingrediente' || i.tipo_item === 'insumo') || [];
  }, [insumos]);

  const preparacionesDisponibles = useMemo(() => {
    return preparaciones?.filter((p: any) => p.id !== preparacionId) || [];
  }, [preparaciones, preparacionId]);

  const [items, setItems] = useState<any[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (ingredientesActuales) {
      const mapped = ingredientesActuales.map((item: any) => ({
        tipo_linea: item.sub_preparacion_id ? 'preparacion' : 'insumo',
        insumo_id: item.insumo_id || '',
        sub_preparacion_id: item.sub_preparacion_id || '',
        cantidad: item.cantidad,
        unidad: item.unidad,
        insumo: item.insumos,
        sub_preparacion: item.preparaciones,
      }));
      mapped.sort((a: any, b: any) => {
        const costA = a.tipo_linea === 'preparacion'
          ? (a.cantidad || 0) * (a.sub_preparacion?.costo_calculado || 0)
          : calcSubtotal(a.cantidad, a.insumo?.costo_por_unidad_base || 0, a.unidad);
        const costB = b.tipo_linea === 'preparacion'
          ? (b.cantidad || 0) * (b.sub_preparacion?.costo_calculado || 0)
          : calcSubtotal(b.cantidad, b.insumo?.costo_por_unidad_base || 0, b.unidad);
        return costB - costA;
      });
      setItems(mapped);
      setHasChanges(false);
    }
  }, [ingredientesActuales]);

  const addItem = (tipo: 'insumo' | 'preparacion' = 'insumo') => {
    setItems([...items, { tipo_linea: tipo, insumo_id: '', sub_preparacion_id: '', cantidad: 0, unidad: tipo === 'preparacion' ? 'un' : '', insumo: null, sub_preparacion: null }]);
    setHasChanges(true);
  };
  const removeItem = (i: number) => { setItems(items.filter((_, idx) => idx !== i)); setHasChanges(true); };
  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'tipo_linea') {
      newItems[index].insumo_id = '';
      newItems[index].sub_preparacion_id = '';
      newItems[index].insumo = null;
      newItems[index].sub_preparacion = null;
      newItems[index].unidad = value === 'preparacion' ? 'un' : '';
    }
    if (field === 'insumo_id') {
      const ins = ingredientesDisponibles.find((i: any) => i.id === value);
      newItems[index].insumo = ins;
      newItems[index].unidad = ins?.unidad_base || 'g';
    }
    if (field === 'sub_preparacion_id') {
      const prep = preparacionesDisponibles.find((p: any) => p.id === value);
      newItems[index].sub_preparacion = prep;
      newItems[index].unidad = 'un';
    }
    setItems(newItems);
    setHasChanges(true);
  };

  const costoTotal = useMemo(() => items.reduce((t, item) => {
    if (item.tipo_linea === 'preparacion') {
      return t + (item.cantidad || 0) * (item.sub_preparacion?.costo_calculado || 0);
    }
    return t + calcSubtotal(item.cantidad, item.insumo?.costo_por_unidad_base || 0, item.unidad);
  }, 0), [items]);

  const handleSave = async () => {
    await mutations.saveIngredientes.mutateAsync({
      preparacion_id: preparacionId,
      items: items.filter(i => (i.insumo_id || i.sub_preparacion_id) && i.cantidad > 0).map(i => ({
        insumo_id: i.tipo_linea === 'insumo' ? i.insumo_id : null,
        sub_preparacion_id: i.tipo_linea === 'preparacion' ? i.sub_preparacion_id : null,
        cantidad: i.cantidad,
        unidad: i.unidad,
      })),
    });
    setHasChanges(false);
  };

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground border rounded-lg">Sin ingredientes — agregá el primero</div>
      ) : (
        <div className="space-y-1">
          {items.map((item, index) => {
            const isPrep = item.tipo_linea === 'preparacion';
            const costoUnit = isPrep ? (item.sub_preparacion?.costo_calculado || 0) : (item.insumo?.costo_por_unidad_base || 0);
            const subtotal = isPrep ? (item.cantidad || 0) * costoUnit : calcSubtotal(item.cantidad, costoUnit, item.unidad);
            const usedInsumoIds = items.filter((_, idx) => idx !== index).map(i => i.insumo_id).filter(Boolean);
            const usedPrepIds = items.filter((_, idx) => idx !== index).map(i => i.sub_preparacion_id).filter(Boolean);
            const filteredInsumos = ingredientesDisponibles.filter((i: any) => !usedInsumoIds.includes(i.id));
            const filteredPreps = preparacionesDisponibles.filter((p: any) => !usedPrepIds.includes(p.id));
            return (
              <div key={index} className="flex items-center gap-1.5 border rounded px-2 py-1.5 text-sm">
                <Select value={item.tipo_linea} onValueChange={(v) => updateItem(index, 'tipo_linea', v)}>
                  <SelectTrigger className="h-7 w-[90px] text-xs shrink-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="insumo">Insumo</SelectItem>
                    <SelectItem value="preparacion">Preparación</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex-1 min-w-0">
                  {isPrep ? (
                    <Select value={item.sub_preparacion_id || 'none'} onValueChange={(v) => updateItem(index, 'sub_preparacion_id', v === 'none' ? '' : v)}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Seleccionar...</SelectItem>
                        {filteredPreps.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>{p.nombre} ({formatCurrency(p.costo_calculado || 0)})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select value={item.insumo_id || 'none'} onValueChange={(v) => updateItem(index, 'insumo_id', v === 'none' ? '' : v)}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Seleccionar...</SelectItem>
                        {filteredInsumos.map((ing: any) => (
                          <SelectItem key={ing.id} value={ing.id}>{ing.nombre} (${ing.costo_por_unidad_base?.toFixed(2)}/{ing.unidad_base})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <Input type="number" step="0.01" value={item.cantidad || ''} onChange={(e) => updateItem(index, 'cantidad', Number(e.target.value))} className="h-7 w-16 text-xs shrink-0" />
                <span className="text-xs text-muted-foreground w-6 shrink-0">{item.unidad || '—'}</span>
                <span className="text-xs text-muted-foreground shrink-0">×</span>
                <span className="font-mono text-xs w-16 text-right shrink-0">{costoUnit > 0 ? formatCurrency(costoUnit) : '—'}</span>
                <span className="text-xs text-muted-foreground shrink-0">=</span>
                <span className="font-mono text-xs font-semibold w-20 text-right shrink-0">{subtotal > 0 ? formatCurrency(subtotal) : '—'}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeItem(index)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
              </div>
            );
          })}
        </div>
      )}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => addItem('insumo')} className="flex-1"><Plus className="w-4 h-4 mr-1" /> Insumo</Button>
        <Button variant="outline" size="sm" onClick={() => addItem('preparacion')} className="flex-1"><ChefHat className="w-4 h-4 mr-1" /> Preparación</Button>
      </div>

      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex justify-between items-center">
        <div>
          <p className="text-xs text-muted-foreground">Costo Total</p>
          <p className="text-xl font-bold font-mono text-primary">{formatCurrency(costoTotal)}</p>
        </div>
        {hasChanges && (
          <LoadingButton loading={mutations.saveIngredientes.isPending} onClick={handleSave} size="sm">
            <Save className="w-4 h-4 mr-1" /> Guardar Ficha
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
