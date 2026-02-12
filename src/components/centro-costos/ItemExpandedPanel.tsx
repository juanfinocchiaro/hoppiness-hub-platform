import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingButton } from '@/components/ui/loading-button';
import { FormRow, FormSection } from '@/components/ui/forms-pro';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Layers, Tag, Plus, Trash2, Save, DollarSign, Clock, ChevronUp, Sparkles, Ban,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useItemCartaComposicion, useItemCartaHistorial, useItemCartaMutations } from '@/hooks/useItemsCarta';
import { useGruposOpcionales, useGruposOpcionalesMutations } from '@/hooks/useGruposOpcionales';
import { usePreparaciones } from '@/hooks/usePreparaciones';
import { useInsumos } from '@/hooks/useInsumos';
import { useMenuCategorias } from '@/hooks/useMenu';
import { useItemIngredientesDeepList } from '@/hooks/useItemIngredientesDeepList';
import { useItemRemovibles, useItemRemoviblesMutations } from '@/hooks/useItemRemovibles';

const IVA = 1.21;
const fmt = (v: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);
const fmtPct = (v: number) => `${v.toFixed(1)}%`;
const calcFC = (costo: number, precio: number) => precio > 0 ? (costo / (precio / IVA)) * 100 : 0;

function fcColor(real: number, obj: number): 'ok' | 'warn' | 'danger' {
  const d = real - obj;
  return d <= 2 ? 'ok' : d <= 8 ? 'warn' : 'danger';
}
const badgeVar = { ok: 'default' as const, warn: 'secondary' as const, danger: 'destructive' as const };

type PanelTab = 'composicion' | 'editar' | 'historial';

interface Props {
  item: any;
  onClose: () => void;
  onDeleted: () => void;
}

export function ItemExpandedPanel({ item, onClose, onDeleted }: Props) {
  const [activeTab, setActiveTab] = useState<PanelTab>('composicion');
  const [showDelete, setShowDelete] = useState(false);
  const mutations = useItemCartaMutations();

  const tabs: { id: PanelTab; label: string; icon: any }[] = [
    { id: 'composicion', label: 'Composición', icon: Layers },
    { id: 'editar', label: 'Editar', icon: DollarSign },
    { id: 'historial', label: 'Historial', icon: Clock },
  ];

  return (
    <div className="bg-muted/30 border-x border-b rounded-b-lg">
      <div className="flex items-center justify-between px-4 pt-3 pb-0 border-b">
        <div className="flex gap-1">
          {tabs.map(t => {
            const I = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px ${
                  activeTab === t.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <I className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => setShowDelete(true)}>
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Eliminar
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <ChevronUp className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-4">
        {activeTab === 'composicion' && <ComposicionInline item={item} mutations={mutations} />}
        {activeTab === 'editar' && <EditarInline item={item} mutations={mutations} onSaved={onClose} />}
        {activeTab === 'historial' && <HistorialInline item={item} />}
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Eliminar item"
        description={`¿Eliminar "${item.nombre}"?`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={async () => {
          await mutations.softDelete.mutateAsync(item.id);
          setShowDelete(false);
          onDeleted();
        }}
      />
    </div>
  );
}

// ═══ COMPOSICIÓN INLINE (new model: es_extra + item_removibles) ═══
function ComposicionInline({ item, mutations }: { item: any; mutations: any }) {
  const { data: composicionActual } = useItemCartaComposicion(item?.id);
  const { data: grupos } = useGruposOpcionales(item?.id);
  const { data: preparaciones } = usePreparaciones();
  const { data: insumos } = useInsumos();
  const gruposMutations = useGruposOpcionalesMutations();

  // Deep ingredients for removibles
  const { data: deepGroups } = useItemIngredientesDeepList(item?.id);
  const { data: removibles } = useItemRemovibles(item?.id);
  const removiblesMutations = useItemRemoviblesMutations();

  const [rows, setRows] = useState<any[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [grupoNuevoNombre, setGrupoNuevoNombre] = useState('');
  const [showNewGrupo, setShowNewGrupo] = useState(false);

  // Extra adding
  const [showAddExtra, setShowAddExtra] = useState(false);

  useEffect(() => {
    if (composicionActual) {
      setRows(composicionActual.map((c: any) => ({
        tipo: c.preparacion_id ? 'preparacion' : 'insumo',
        preparacion_id: c.preparacion_id || '',
        insumo_id: c.insumo_id || '',
        cantidad: c.cantidad,
        es_extra: c.es_extra || false,
        _label: c.preparaciones?.nombre || c.insumos?.nombre || '',
        _costo: c.preparaciones?.costo_calculado || c.insumos?.costo_por_unidad_base || 0,
        _precioExtra: c.preparaciones?.precio_extra || c.insumos?.precio_extra || 0,
      })));
      setHasChanges(false);
    }
  }, [composicionActual]);

  const addRow = () => { setRows([...rows, { tipo: 'preparacion', preparacion_id: '', insumo_id: '', cantidad: 1, es_extra: false, _label: '', _costo: 0, _precioExtra: 0 }]); setHasChanges(true); };
  const addExtraRow = (tipo: string, id: string, label: string, costo: number, precioExtra: number) => {
    setRows([...rows, {
      tipo,
      preparacion_id: tipo === 'preparacion' ? id : '',
      insumo_id: tipo === 'insumo' ? id : '',
      cantidad: 0,
      es_extra: true,
      _label: label,
      _costo: costo,
      _precioExtra: precioExtra,
    }]);
    setHasChanges(true);
    setShowAddExtra(false);
  };
  const removeRow = (i: number) => { setRows(rows.filter((_, idx) => idx !== i)); setHasChanges(true); };
  const updateRow = (i: number, field: string, value: any) => {
    const nr = [...rows]; nr[i] = { ...nr[i], [field]: value };
    if (field === 'tipo') { nr[i].preparacion_id = ''; nr[i].insumo_id = ''; nr[i]._costo = 0; nr[i]._label = ''; nr[i]._precioExtra = 0; }
    if (field === 'preparacion_id') { const p = (preparaciones || []).find((x: any) => x.id === value); nr[i]._label = p?.nombre || ''; nr[i]._costo = p?.costo_calculado || 0; nr[i]._precioExtra = p?.precio_extra || 0; }
    if (field === 'insumo_id') { const ins = (insumos || []).find((x: any) => x.id === value); nr[i]._label = ins?.nombre || ''; nr[i]._costo = ins?.costo_por_unidad_base || 0; nr[i]._precioExtra = ins?.precio_extra || 0; }
    setRows(nr); setHasChanges(true);
  };

  // Base components (cantidad > 0) and extras (es_extra = true)
  const baseRows = rows.filter(r => r.cantidad > 0);
  const extraRows = rows.filter(r => r.es_extra);

  const costoFijo = baseRows.reduce((t, r) => t + r.cantidad * r._costo, 0);
  const costoGrupos = (grupos || []).reduce((t: number, g: any) => t + (g.costo_promedio || 0), 0);
  const costoTotal = costoFijo + costoGrupos;

  // Removibles: flatten deep ingredients and check against item_removibles
  const removibleSet = useMemo(() => new Set((removibles || []).map((r: any) => r.insumo_id)), [removibles]);
  const allDeepIngredients = useMemo(() => {
    if (!deepGroups) return [];
    return deepGroups.flatMap(g => g.ingredientes.map(ing => ({ ...ing, receta_nombre: g.receta_nombre })));
  }, [deepGroups]);
  // Deduplicate by insumo_id
  const uniqueIngredients = useMemo(() => {
    const map = new Map<string, any>();
    for (const ing of allDeepIngredients) {
      if (!map.has(ing.insumo_id)) map.set(ing.insumo_id, ing);
    }
    return Array.from(map.values());
  }, [allDeepIngredients]);

  const handleToggleRemovible = async (insumoId: string, activo: boolean) => {
    await removiblesMutations.toggle.mutateAsync({ item_carta_id: item.id, insumo_id: insumoId, activo });
  };

  const handleSave = async () => {
    await mutations.saveComposicion.mutateAsync({
      item_carta_id: item.id,
      items: rows.filter(r => r.preparacion_id || r.insumo_id).map(r => ({
        preparacion_id: r.tipo === 'preparacion' ? r.preparacion_id : undefined,
        insumo_id: r.tipo === 'insumo' ? r.insumo_id : undefined,
        cantidad: r.cantidad,
        es_extra: r.es_extra,
      })),
    });
    setHasChanges(false);
  };

  const handleCreateGrupo = async () => {
    if (!grupoNuevoNombre.trim()) return;
    await gruposMutations.createGrupo.mutateAsync({ item_carta_id: item.id, nombre: grupoNuevoNombre.trim(), orden: (grupos?.length || 0) });
    setGrupoNuevoNombre('');
    setShowNewGrupo(false);
  };

  const renderComponentSelect = (row: any, i: number) => {
    if (row.tipo === 'preparacion') {
      return (
        <Select value={row.preparacion_id || 'none'} onValueChange={v => updateRow(i, 'preparacion_id', v === 'none' ? '' : v)}>
          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Seleccionar...</SelectItem>
            {(preparaciones || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre} ({fmt(p.costo_calculado || 0)})</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    const allInsumos = insumos || [];
    const productos = allInsumos.filter((x: any) => x.tipo_item === 'producto');
    const ingredientes = allInsumos.filter((x: any) => x.tipo_item === 'ingrediente');
    const insumosItems = allInsumos.filter((x: any) => x.tipo_item === 'insumo' || !x.tipo_item);
    return (
      <Select value={row.insumo_id || 'none'} onValueChange={v => updateRow(i, 'insumo_id', v === 'none' ? '' : v)}>
        <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Seleccionar...</SelectItem>
          {productos.length > 0 && <><SelectItem value="__h_prod" disabled className="text-xs font-semibold text-muted-foreground">── Productos ──</SelectItem>{productos.map((ins: any) => <SelectItem key={ins.id} value={ins.id}>{ins.nombre} ({fmt(ins.costo_por_unidad_base || 0)})</SelectItem>)}</>}
          {ingredientes.length > 0 && <><SelectItem value="__h_ing" disabled className="text-xs font-semibold text-muted-foreground">── Ingredientes ──</SelectItem>{ingredientes.map((ins: any) => <SelectItem key={ins.id} value={ins.id}>{ins.nombre} ({fmt(ins.costo_por_unidad_base || 0)})</SelectItem>)}</>}
          {insumosItems.length > 0 && <><SelectItem value="__h_ins" disabled className="text-xs font-semibold text-muted-foreground">── Insumos ──</SelectItem>{insumosItems.map((ins: any) => <SelectItem key={ins.id} value={ins.id}>{ins.nombre} ({fmt(ins.costo_por_unidad_base || 0)})</SelectItem>)}</>}
        </SelectContent>
      </Select>
    );
  };

  // Available extras to add (recetas/insumos not already in composition)
  const usedPrepIds = new Set(rows.filter(r => r.preparacion_id).map(r => r.preparacion_id));
  const usedInsumoIds = new Set(rows.filter(r => r.insumo_id).map(r => r.insumo_id));
  const availablePreps = (preparaciones || []).filter((p: any) => !usedPrepIds.has(p.id) && p.precio_extra > 0);
  const availableInsumos = (insumos || []).filter((ins: any) => !usedInsumoIds.has(ins.id) && ins.precio_extra > 0);

  return (
    <div className="space-y-4">
      {/* ── COMPOSICIÓN FIJA ── */}
      <FormSection title="Composición Fija" icon={Layers}>
        <p className="text-xs text-muted-foreground mb-2">Componentes base del producto (cantidad &gt; 0).</p>
        {baseRows.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground border rounded-lg text-sm">Sin componentes fijos</div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-3 py-1">
              <span className="w-[100px] shrink-0">Tipo</span>
              <span className="flex-1">Componente</span>
              <span className="w-16 shrink-0 text-right">Cant.</span>
              <span className="w-20 shrink-0 text-right">Subtotal</span>
              <span className="w-14 shrink-0 text-center">Extra</span>
              <span className="w-6 shrink-0" />
            </div>
            {rows.map((row, i) => {
              if (row.cantidad <= 0 && !row.es_extra) return null; // skip orphans
              if (row.es_extra && row.cantidad === 0) return null; // pure extras shown below
              return (
                <div key={i} className="flex items-center gap-1.5 text-sm border rounded-lg px-3 py-2">
                  <Select value={row.tipo} onValueChange={v => updateRow(i, 'tipo', v)}>
                    <SelectTrigger className="h-7 w-[100px] text-xs shrink-0"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="preparacion">Receta</SelectItem><SelectItem value="insumo">Catálogo</SelectItem></SelectContent>
                  </Select>
                  <div className="flex-1 min-w-0">{renderComponentSelect(row, i)}</div>
                  <Input type="number" className="h-7 w-16 text-xs shrink-0" value={row.cantidad} onChange={e => updateRow(i, 'cantidad', Number(e.target.value))} />
                  <span className="font-mono text-xs font-semibold w-20 text-right shrink-0">{fmt(row.cantidad * row._costo)}</span>
                  <div className="w-14 shrink-0 flex justify-center">
                    <Switch checked={row.es_extra} onCheckedChange={v => updateRow(i, 'es_extra', v)} className="scale-75" />
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeRow(i)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        <Button variant="outline" onClick={addRow} className="w-full mt-2"><Plus className="w-4 h-4 mr-2" /> Agregar Componente</Button>
      </FormSection>

      {/* ── EXTRAS DISPONIBLES ── */}
      <FormSection title="Extras Disponibles" icon={Sparkles}>
        <p className="text-xs text-muted-foreground mb-2">
          Solo se pueden agregar cosas que son parte de este producto. Precio del extra viene de la receta/insumo.
        </p>
        {extraRows.length === 0 ? (
          <div className="py-3 text-center text-xs text-muted-foreground border rounded-lg">
            Sin extras. Agregá un componente como extra o usá "+ Agregar Extra".
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-3 py-1">
              <span className="flex-1">Extra</span>
              <span className="w-16 text-right">Costo</span>
              <span className="w-16 text-right">Precio</span>
              <span className="w-14 text-right">FC%</span>
              <span className="w-6" />
            </div>
            {extraRows.map((row, i) => {
              const realIdx = rows.indexOf(row);
              const costo = row._costo;
              const precio = row._precioExtra || 0;
              const fc = precio > 0 ? calcFC(costo, precio) : 0;
              return (
                <div key={realIdx} className="flex items-center gap-1.5 text-sm border rounded-lg px-3 py-2">
                  <span className="flex-1 text-sm font-medium truncate">{row._label || 'Sin seleccionar'}</span>
                  <span className="font-mono text-xs w-16 text-right">{fmt(costo)}</span>
                  <span className="font-mono text-xs w-16 text-right">{precio > 0 ? fmt(precio) : <span className="text-yellow-600">Sin precio</span>}</span>
                  {precio > 0 && (
                    <Badge variant={badgeVar[fcColor(fc, 30)]} className="text-xs w-14 justify-center">{fmtPct(fc)}</Badge>
                  )}
                  {!precio && <span className="w-14" />}
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeRow(realIdx)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        {showAddExtra ? (
          <div className="border-2 border-dashed rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium">Seleccioná receta o insumo con precio extra:</p>
            {availablePreps.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Recetas</p>
                <div className="space-y-1">
                  {availablePreps.map((p: any) => (
                    <button key={p.id} className="w-full text-left px-3 py-1.5 border rounded text-sm hover:bg-muted/40 transition-colors flex justify-between"
                      onClick={() => addExtraRow('preparacion', p.id, p.nombre, p.costo_calculado || 0, p.precio_extra)}>
                      <span>{p.nombre}</span>
                      <span className="font-mono text-xs text-muted-foreground">{fmt(p.precio_extra)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {availableInsumos.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Insumos</p>
                <div className="space-y-1">
                  {availableInsumos.map((ins: any) => (
                    <button key={ins.id} className="w-full text-left px-3 py-1.5 border rounded text-sm hover:bg-muted/40 transition-colors flex justify-between"
                      onClick={() => addExtraRow('insumo', ins.id, ins.nombre, ins.costo_por_unidad_base || 0, ins.precio_extra)}>
                      <span>{ins.nombre}</span>
                      <span className="font-mono text-xs text-muted-foreground">{fmt(ins.precio_extra)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {availablePreps.length === 0 && availableInsumos.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">No hay recetas/insumos con precio_extra disponibles.</p>
            )}
            <Button variant="ghost" size="sm" onClick={() => setShowAddExtra(false)}>Cancelar</Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setShowAddExtra(true)} className="w-full mt-2">
            <Plus className="w-4 h-4 mr-2" /> Agregar Extra
          </Button>
        )}
      </FormSection>

      {/* ── REMOVIBLES (auto-discovered from deep ingredients) ── */}
      <FormSection title="Removibles" icon={Ban}>
        <p className="text-xs text-muted-foreground mb-2">
          Ingredientes que el cliente puede pedir SIN (sin descuento). Se descubren automáticamente de las recetas.
        </p>
        {uniqueIngredients.length === 0 ? (
          <div className="py-3 text-center text-xs text-muted-foreground border rounded-lg">
            Sin ingredientes descubiertos. Agregá recetas a la composición.
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-3 py-1">
              <span className="flex-1">Ingrediente</span>
              <span className="w-[140px]">Receta origen</span>
              <span className="w-24 text-center">Disponible SIN</span>
            </div>
            {uniqueIngredients.map(ing => {
              const isActive = removibleSet.has(ing.insumo_id);
              return (
                <div key={ing.insumo_id} className={`flex items-center gap-1.5 text-sm border rounded-lg px-3 py-2 ${isActive ? 'border-primary/40 bg-primary/5' : ''}`}>
                  <span className="flex-1 text-sm">{ing.nombre}</span>
                  <span className="w-[140px] text-xs text-muted-foreground truncate">{ing.receta_nombre}</span>
                  <div className="w-24 flex justify-center">
                    <Switch
                      checked={isActive}
                      onCheckedChange={v => handleToggleRemovible(ing.insumo_id, v)}
                      className="scale-75"
                      disabled={removiblesMutations.toggle.isPending}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </FormSection>

      {/* ── GRUPOS OPCIONALES ── */}
      <FormSection title="Grupos Opcionales" icon={Tag}>
        <p className="text-xs text-muted-foreground mb-2">Para componentes variables (ej: bebida).</p>
        {(grupos || []).map((grupo: any) => (
          <GrupoEditorInline key={grupo.id} grupo={grupo} itemId={item.id} insumos={insumos || []} preparaciones={preparaciones || []} mutations={gruposMutations} />
        ))}
        {showNewGrupo ? (
          <div className="flex items-center gap-2 p-3 border-2 border-dashed rounded-lg">
            <Input value={grupoNuevoNombre} onChange={e => setGrupoNuevoNombre(e.target.value)} placeholder="Nombre del grupo (ej: Bebida)" className="text-sm h-8" onKeyDown={e => e.key === 'Enter' && handleCreateGrupo()} />
            <Button size="sm" className="h-8" onClick={handleCreateGrupo} disabled={!grupoNuevoNombre.trim() || gruposMutations.createGrupo.isPending}>Crear</Button>
            <Button variant="ghost" size="sm" className="h-8" onClick={() => { setShowNewGrupo(false); setGrupoNuevoNombre(''); }}>Cancelar</Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setShowNewGrupo(true)} className="w-full"><Plus className="w-4 h-4 mr-2" /> Agregar Grupo Opcional</Button>
        )}
      </FormSection>

      {/* Summary */}
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Comp. fija:</span><span className="font-mono">{fmt(costoFijo)}</span></div>
          {costoGrupos > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Grupos (prom.):</span><span className="font-mono">{fmt(costoGrupos)}</span></div>}
          <div className="flex justify-between items-center pt-2 border-t">
            <div><p className="text-sm text-muted-foreground">Costo Total</p><p className="text-2xl font-bold font-mono text-primary">{fmt(costoTotal)}</p></div>
            {item.precio_base > 0 && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">FC% (s/neto)</p>
                <Badge variant={badgeVar[fcColor(calcFC(costoTotal, item.precio_base), item.fc_objetivo || 32)]} className="text-lg px-3 py-1">
                  {fmtPct(calcFC(costoTotal, item.precio_base))}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>

      {hasChanges && (
        <div className="flex justify-end gap-2">
          <LoadingButton loading={mutations.saveComposicion.isPending} onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" /> Guardar Composición
          </LoadingButton>
        </div>
      )}
    </div>
  );
}

// ═══ GRUPO EDITOR (inline version) ═══
function GrupoEditorInline({ grupo, itemId, insumos, preparaciones, mutations }: any) {
  const [editItems, setEditItems] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [nombre, setNombre] = useState(grupo.nombre);

  useEffect(() => {
    if (grupo.items) setEditItems(grupo.items.map((gi: any) => ({
      tipo: gi.preparacion_id ? 'preparacion' : 'insumo',
      insumo_id: gi.insumo_id || '', preparacion_id: gi.preparacion_id || '',
      cantidad: gi.cantidad, costo_unitario: gi.costo_unitario || gi.insumos?.costo_por_unidad_base || gi.preparaciones?.costo_calculado || 0,
      _nombre: gi.insumos?.nombre || gi.preparaciones?.nombre || '',
    })));
  }, [grupo.items]);

  const addItem = () => { setEditItems([...editItems, { tipo: 'insumo', insumo_id: '', preparacion_id: '', cantidad: 1, costo_unitario: 0, _nombre: '' }]); setEditing(true); };
  const updateItem = (i: number, field: string, value: any) => {
    const next = [...editItems]; next[i] = { ...next[i], [field]: value };
    if (field === 'tipo') { next[i].insumo_id = ''; next[i].preparacion_id = ''; next[i].costo_unitario = 0; next[i]._nombre = ''; }
    if (field === 'insumo_id') { const ins = insumos.find((x: any) => x.id === value); next[i].costo_unitario = ins?.costo_por_unidad_base || 0; next[i]._nombre = ins?.nombre || ''; }
    if (field === 'preparacion_id') { const p = preparaciones.find((x: any) => x.id === value); next[i].costo_unitario = p?.costo_calculado || 0; next[i]._nombre = p?.nombre || ''; }
    setEditItems(next); setEditing(true);
  };
  const removeItem = (i: number) => { setEditItems(editItems.filter((_, idx) => idx !== i)); setEditing(true); };
  const promedio = editItems.length > 0 ? editItems.reduce((s, i) => s + i.cantidad * i.costo_unitario, 0) / editItems.length : 0;

  const handleSave = async () => {
    if (nombre !== grupo.nombre) await mutations.updateGrupo.mutateAsync({ id: grupo.id, item_carta_id: itemId, data: { nombre } });
    await mutations.saveGrupoItems.mutateAsync({
      grupo_id: grupo.id, item_carta_id: itemId,
      items: editItems.filter(i => i.insumo_id || i.preparacion_id).map(i => ({
        insumo_id: i.tipo === 'insumo' ? i.insumo_id : null,
        preparacion_id: i.tipo === 'preparacion' ? i.preparacion_id : null,
        cantidad: i.cantidad, costo_unitario: i.costo_unitario,
      })),
    });
    setEditing(false);
  };

  return (
    <div className="border rounded-lg p-3 space-y-2 mb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">Grupo</Badge>
          <Input value={nombre} onChange={e => { setNombre(e.target.value); setEditing(true); }} className="h-7 text-sm font-medium w-40" />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Prom:</span>
          <span className="font-mono text-sm font-semibold">{fmt(promedio)}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6 ml-2" onClick={() => mutations.deleteGrupo.mutate({ id: grupo.id, item_carta_id: itemId })}>
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </Button>
        </div>
      </div>
      {editItems.map((ei, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs pl-4">
          <Select value={ei.tipo} onValueChange={v => updateItem(i, 'tipo', v)}>
            <SelectTrigger className="h-6 w-[80px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="insumo">Catálogo</SelectItem><SelectItem value="preparacion">Receta</SelectItem></SelectContent>
          </Select>
          <div className="flex-1 min-w-0">
            {ei.tipo === 'insumo' ? (() => {
              const selectedIds = editItems.filter((_, idx) => idx !== i).map(x => x.insumo_id).filter(Boolean);
              const available = insumos.filter((x: any) => (x.tipo_item === 'insumo' || x.tipo_item === 'producto') && !selectedIds.includes(x.id));
              const productos = available.filter((x: any) => x.tipo_item === 'producto');
              const otros = available.filter((x: any) => x.tipo_item !== 'producto');
              return (
                <Select value={ei.insumo_id || 'none'} onValueChange={v => updateItem(i, 'insumo_id', v === 'none' ? '' : v)}>
                  <SelectTrigger className="h-6 text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seleccionar...</SelectItem>
                    {productos.length > 0 && <><SelectItem value="__h_prod" disabled className="text-xs font-semibold text-muted-foreground">── Productos ──</SelectItem>{productos.map((ins: any) => <SelectItem key={ins.id} value={ins.id}>{ins.nombre}</SelectItem>)}</>}
                    {otros.length > 0 && <><SelectItem value="__h_ins" disabled className="text-xs font-semibold text-muted-foreground">── Insumos ──</SelectItem>{otros.map((ins: any) => <SelectItem key={ins.id} value={ins.id}>{ins.nombre}</SelectItem>)}</>}
                  </SelectContent>
                </Select>
              );
            })() : (() => {
              const selectedIds = editItems.filter((_, idx) => idx !== i).map(x => x.preparacion_id).filter(Boolean);
              return (
                <Select value={ei.preparacion_id || 'none'} onValueChange={v => updateItem(i, 'preparacion_id', v === 'none' ? '' : v)}>
                  <SelectTrigger className="h-6 text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seleccionar...</SelectItem>
                    {preparaciones.filter((p: any) => !selectedIds.includes(p.id)).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              );
            })()}
          </div>
          <Input type="number" className="h-6 w-14 text-xs" value={ei.cantidad} onChange={e => updateItem(i, 'cantidad', Number(e.target.value))} />
          <span className="font-mono text-xs w-16 text-right">{fmt(ei.cantidad * ei.costo_unitario)}</span>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeItem(i)}>
            <Trash2 className="w-3 h-3 text-destructive" />
          </Button>
        </div>
      ))}
      <div className="flex items-center gap-2 pl-4">
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={addItem}><Plus className="w-3 h-3 mr-1" /> Agregar opción</Button>
        {editing && <Button size="sm" className="h-6 text-xs ml-auto" onClick={handleSave} disabled={mutations.saveGrupoItems.isPending}><Save className="w-3 h-3 mr-1" /> Guardar</Button>}
      </div>
    </div>
  );
}

// ═══ EDITAR INLINE ═══
function EditarInline({ item, mutations, onSaved }: { item: any; mutations: any; onSaved: () => void }) {
  const { data: categorias } = useMenuCategorias();
  const [form, setForm] = useState({
    nombre: item.nombre || '',
    nombre_corto: item.nombre_corto || '',
    descripcion: item.descripcion || '',
    categoria_carta_id: item.categoria_carta_id || '',
    precio_base: item.precio_base || 0,
    fc_objetivo: item.fc_objetivo || 32,
    disponible_delivery: item.disponible_delivery ?? true,
  });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.nombre || !form.precio_base) return;
    const p = { ...form, categoria_carta_id: form.categoria_carta_id || null };
    await mutations.update.mutateAsync({ id: item.id, data: p });
    onSaved();
  };

  return (
    <div className="space-y-4 max-w-lg">
      <FormRow label="Nombre" required><Input value={form.nombre} onChange={e => set('nombre', e.target.value)} /></FormRow>
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Nombre corto" hint="Para tickets"><Input value={form.nombre_corto} onChange={e => set('nombre_corto', e.target.value)} /></FormRow>
        <FormRow label="Categoría carta">
          <Select value={form.categoria_carta_id || 'none'} onValueChange={v => set('categoria_carta_id', v === 'none' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin categoría</SelectItem>
              {categorias?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormRow>
      </div>
      <FormRow label="Descripción"><Textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)} rows={2} /></FormRow>
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Precio carta (con IVA)" required><Input type="number" value={form.precio_base || ''} onChange={e => set('precio_base', Number(e.target.value))} /></FormRow>
        <FormRow label="CMV Objetivo (%)" hint="Meta de food cost"><Input type="number" value={form.fc_objetivo || ''} onChange={e => set('fc_objetivo', Number(e.target.value))} /></FormRow>
      </div>
      {form.precio_base > 0 && <p className="text-xs text-muted-foreground">Precio neto (sin IVA): {fmt(form.precio_base / IVA)}</p>}
      <div className="flex justify-end">
        <LoadingButton loading={mutations.update.isPending} onClick={submit} disabled={!form.nombre || !form.precio_base}>
          <Save className="w-4 h-4 mr-2" /> Guardar Cambios
        </LoadingButton>
      </div>
    </div>
  );
}

// ═══ HISTORIAL INLINE ═══
function HistorialInline({ item }: { item: any }) {
  const { data: historial } = useItemCartaHistorial(item?.id);
  return (
    <div className="space-y-2 max-h-[300px] overflow-y-auto">
      {historial?.length ? historial.map((h: any) => (
        <div key={h.id} className="flex justify-between items-center p-2 border rounded text-sm">
          <div>
            <span className="font-mono">{fmt(h.precio_anterior || 0)} → {fmt(h.precio_nuevo)}</span>
            {h.motivo && <p className="text-xs text-muted-foreground">{h.motivo}</p>}
          </div>
          <span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleDateString('es-AR')}</span>
        </div>
      )) : <p className="text-sm text-muted-foreground text-center py-4">Sin historial de precios</p>}
    </div>
  );
}
