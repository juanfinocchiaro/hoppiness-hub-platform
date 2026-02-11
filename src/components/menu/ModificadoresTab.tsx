import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Ban, PlusCircle, ArrowRightLeft, X } from 'lucide-react';
import { useModificadores, useModificadoresMutations } from '@/hooks/useModificadores';
import { useInsumos } from '@/hooks/useInsumos';
import { usePreparaciones } from '@/hooks/usePreparaciones';
import { useItemCartaComposicion } from '@/hooks/useItemsCarta';
import { useItemIngredientesDeepList } from '@/hooks/useItemIngredientesDeepList';
import { Skeleton } from '@/components/ui/skeleton';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);

interface Props {
  itemId: string;
}

export function ModificadoresTab({ itemId }: Props) {
  const { data: modificadores, isLoading } = useModificadores(itemId);
  const { create, update, remove } = useModificadoresMutations();
  const { data: insumos } = useInsumos();
  const { data: recetas } = usePreparaciones();
  const { data: composicion } = useItemCartaComposicion(itemId);
  const { data: deepGroups } = useItemIngredientesDeepList(itemId);

  const [showNewRemovible, setShowNewRemovible] = useState(false);
  const [showNewExtra, setShowNewExtra] = useState(false);
  const [showNewSustitucion, setShowNewSustitucion] = useState(false);

  // Flat list for backward compat + grouped data for selector
  const ingredientesDelItem = useMemo(() => {
    if (!deepGroups) return [];
    return deepGroups.flatMap(g => g.ingredientes.map(ing => ({
      id: ing.insumo_id,
      nombre: ing.nombre,
      cantidad: ing.cantidad,
      unidad: ing.unidad,
      costo_por_unidad_base: ing.costo_por_unidad_base,
      _fromItem: true,
      _recetaOrigen: ing.receta_origen,
    })));
  }, [deepGroups]);

  const removibles = modificadores?.filter((m: any) => m.tipo === 'removible') || [];
  const extras = modificadores?.filter((m: any) => m.tipo === 'extra') || [];
  const sustituciones = modificadores?.filter((m: any) => m.tipo === 'sustitucion') || [];

  if (isLoading) {
    return <div className="space-y-4 py-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  }

  return (
    <div className="space-y-6 py-2">
      {/* ═══ REMOVIBLES ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Ban className="w-4 h-4 text-destructive" />
              Removibles
              <Badge variant="secondary" className="ml-1">{removibles.length}</Badge>
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowNewRemovible(true)} disabled={showNewRemovible}>
              <Plus className="w-4 h-4 mr-1" /> Agregar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Ingredientes que el cliente puede pedir SIN. No se cobra menos.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {removibles.length === 0 && !showNewRemovible && (
            <p className="text-sm text-muted-foreground text-center py-4">No hay removibles configurados</p>
          )}
          {removibles.map((mod: any) => (
            <div key={mod.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-destructive border-destructive/30">SIN</Badge>
                <div>
                  <p className="font-medium text-sm">{mod.nombre}</p>
                  {mod.cantidad_ahorro > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {mod.cantidad_ahorro} {mod.unidad_ahorro} · Ahorro: {formatCurrency(mod.costo_ahorro)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={mod.activo} onCheckedChange={(checked) => update.mutate({ id: mod.id, data: { activo: checked } })} />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove.mutate(mod.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {showNewRemovible && (
            <NewRemovibleForm
              itemId={itemId}
              ingredientes={ingredientesDelItem}
              deepGroups={deepGroups || []}
              insumos={insumos || []}
              onCreate={create}
              onClose={() => setShowNewRemovible(false)}
            />
          )}
        </CardContent>
      </Card>

      {/* ═══ EXTRAS ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-green-600" />
              Extras
              <Badge variant="secondary" className="ml-1">{extras.length}</Badge>
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowNewExtra(true)} disabled={showNewExtra}>
              <Plus className="w-4 h-4 mr-1" /> Agregar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Ingredientes o recetas que el cliente puede agregar pagando extra.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {extras.length === 0 && !showNewExtra && (
            <p className="text-sm text-muted-foreground text-center py-4">No hay extras configurados</p>
          )}
          {extras.map((mod: any) => (
            <div key={mod.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-green-600 border-green-600/30">EXTRA</Badge>
                <div>
                  <p className="font-medium text-sm">{mod.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {mod.cantidad_extra} {mod.unidad_extra} · Costo: {formatCurrency(mod.costo_extra)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono font-medium text-sm text-green-600">+{formatCurrency(mod.precio_extra)}</span>
                {mod.precio_extra > 0 && (
                  <Badge variant={mod.costo_extra / mod.precio_extra <= 0.32 ? 'default' : 'secondary'} className="text-xs">
                    FC {((mod.costo_extra / mod.precio_extra) * 100).toFixed(0)}%
                  </Badge>
                )}
                <Switch checked={mod.activo} onCheckedChange={(checked) => update.mutate({ id: mod.id, data: { activo: checked } })} />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove.mutate(mod.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {showNewExtra && (
            <NewExtraForm
              itemId={itemId}
              insumos={insumos || []}
              recetas={recetas || []}
              onCreate={create}
              onClose={() => setShowNewExtra(false)}
            />
          )}
        </CardContent>
      </Card>

      {/* ═══ SUSTITUCIONES ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-blue-600" />
              Sustituciones
              <Badge variant="secondary" className="ml-1">{sustituciones.length}</Badge>
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowNewSustitucion(true)} disabled={showNewSustitucion}>
              <Plus className="w-4 h-4 mr-1" /> Agregar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Cambiar un ingrediente por otro. Puede tener cargo extra o ser gratis.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {sustituciones.length === 0 && !showNewSustitucion && (
            <p className="text-sm text-muted-foreground text-center py-4">No hay sustituciones configuradas</p>
          )}
          {sustituciones.map((mod: any) => (
            <div key={mod.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-blue-600 border-blue-600/30">CAMBIO</Badge>
                <div>
                  <p className="font-medium text-sm">{mod.nombre}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {mod.diferencia_precio !== 0 ? (
                  <span className={`font-mono font-medium text-sm ${mod.diferencia_precio > 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {mod.diferencia_precio > 0 ? '+' : ''}{formatCurrency(mod.diferencia_precio)}
                  </span>
                ) : (
                  <Badge variant="secondary" className="text-xs">Gratis</Badge>
                )}
                <Switch checked={mod.activo} onCheckedChange={(checked) => update.mutate({ id: mod.id, data: { activo: checked } })} />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove.mutate(mod.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {showNewSustitucion && (
            <NewSustitucionForm
              itemId={itemId}
              ingredientes={ingredientesDelItem}
              insumos={insumos || []}
              onCreate={create}
              onClose={() => setShowNewSustitucion(false)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══ NEW REMOVIBLE FORM ═══ */
function NewRemovibleForm({ itemId, ingredientes, deepGroups, insumos, onCreate, onClose }: any) {
  const [selectedId, setSelectedId] = useState('');
  const [nombre, setNombre] = useState('');

  // Flat list from deep groups + other insumos not in item
  const allInsumos = useMemo(() => {
    const fromItem = ingredientes.map((i: any) => ({ ...i, _fromItem: true }));
    const others = (insumos || []).filter((i: any) => !ingredientes.some((fi: any) => fi.id === i.id));
    return [...fromItem, ...others];
  }, [ingredientes, insumos]);

  const selected = allInsumos.find((i: any) => i.id === selectedId);

  const handleSelect = (v: string) => {
    setSelectedId(v);
    const ins = allInsumos.find((i: any) => i.id === v);
    setNombre(`Sin ${ins?.nombre || ''}`);
  };

  const handleSave = async () => {
    if (!selectedId) return;
    const displayName = nombre.trim() || `Sin ${selected?.nombre}`;
    await onCreate.mutateAsync({
      item_carta_id: itemId,
      tipo: 'removible',
      nombre: displayName,
      ingrediente_id: selectedId,
      cantidad_ahorro: selected?.cantidad || 0,
      unidad_ahorro: selected?.unidad || selected?.unidad_base || 'un',
      costo_ahorro: (selected?.costo_por_unidad_base || 0) * (selected?.cantidad || 1),
    });
    onClose();
  };

  const hasDeepGroups = deepGroups && deepGroups.length > 0;
  const otherInsumos = (insumos || []).filter((i: any) => !ingredientes.some((fi: any) => fi.id === i.id));

  return (
    <div className="p-4 border-2 border-dashed rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Nuevo removible</p>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}><X className="w-3.5 h-3.5" /></Button>
      </div>
      <Select value={selectedId} onValueChange={handleSelect}>
        <SelectTrigger><SelectValue placeholder="Seleccionar ingrediente..." /></SelectTrigger>
        <SelectContent>
          {hasDeepGroups ? (
            <>
              {deepGroups.map((group: any) => (
                <SelectGroup key={group.receta_id}>
                  <SelectLabel className="text-xs font-semibold text-primary">— {group.receta_nombre} —</SelectLabel>
                  {group.ingredientes.map((ing: any) => (
                    <SelectItem key={`${group.receta_id}-${ing.insumo_id}`} value={ing.insumo_id}>
                      {ing.nombre}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
              {otherInsumos.length > 0 && (
                <SelectGroup>
                  <SelectLabel className="text-xs font-semibold text-muted-foreground">— Otros insumos —</SelectLabel>
                  {otherInsumos.map((ins: any) => (
                    <SelectItem key={ins.id} value={ins.id}>{ins.nombre}</SelectItem>
                  ))}
                </SelectGroup>
              )}
            </>
          ) : (
            allInsumos.map((ing: any) => (
              <SelectItem key={ing.id} value={ing.id}>
                {ing.nombre} {ing._fromItem ? '(del item)' : ''}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre (ej: Sin Queso)" className="text-sm" />
      {selected && (
        <div className="p-2 bg-muted/50 rounded text-xs">
          <strong>{nombre || `Sin ${selected.nombre}`}</strong>
          {selected.cantidad > 0 && <span className="ml-2 text-muted-foreground">Ahorro: {formatCurrency((selected.costo_por_unidad_base || 0) * selected.cantidad)}</span>}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm" onClick={handleSave} disabled={!selectedId || onCreate.isPending}>Guardar</Button>
      </div>
    </div>
  );
}

/* ═══ NEW EXTRA FORM ═══ */
function NewExtraForm({ itemId, insumos, recetas, onCreate, onClose }: any) {
  const [tipo, setTipo] = useState<'ingrediente' | 'receta'>('ingrediente');
  const [selectedId, setSelectedId] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [unidad, setUnidad] = useState('un');
  const [precio, setPrecio] = useState(0);
  const [nombre, setNombre] = useState('');

  const selectedItem = tipo === 'ingrediente'
    ? insumos?.find((i: any) => i.id === selectedId)
    : recetas?.find((r: any) => r.id === selectedId);

  const costoCalculado = selectedItem
    ? (tipo === 'ingrediente'
        ? (selectedItem.costo_por_unidad_base || 0) * cantidad
        : (selectedItem.costo_calculado || 0) * cantidad)
    : 0;

  const handleSave = async () => {
    if (!selectedId || !precio) return;
    const displayName = nombre.trim() || `Extra ${selectedItem?.nombre}`;
    await onCreate.mutateAsync({
      item_carta_id: itemId,
      tipo: 'extra',
      nombre: displayName,
      ingrediente_extra_id: tipo === 'ingrediente' ? selectedId : null,
      receta_extra_id: tipo === 'receta' ? selectedId : null,
      cantidad_extra: cantidad,
      unidad_extra: unidad,
      precio_extra: precio,
      costo_extra: costoCalculado,
    });
    onClose();
  };

  return (
    <div className="p-4 border-2 border-dashed rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Nuevo extra</p>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}><X className="w-3.5 h-3.5" /></Button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select value={tipo} onValueChange={(v: any) => { setTipo(v); setSelectedId(''); }}>
          <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ingrediente">Ingrediente</SelectItem>
            <SelectItem value="receta">Receta</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedId} onValueChange={(v) => { setSelectedId(v); const item = (tipo === 'ingrediente' ? insumos : recetas)?.find((i: any) => i.id === v); setNombre(`Extra ${item?.nombre || ''}`); }}>
          <SelectTrigger className="text-sm"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
          <SelectContent>
            {tipo === 'ingrediente'
              ? insumos?.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.nombre}</SelectItem>)
              : recetas?.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>)
            }
          </SelectContent>
        </Select>
      </div>
      <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre (ej: Extra Bacon)" className="text-sm" />
      <div className="grid grid-cols-3 gap-3">
        <Input type="number" value={cantidad || ''} onChange={(e) => setCantidad(Number(e.target.value))} placeholder="Cantidad" min={0.01} step={0.01} />
        <Select value={unidad} onValueChange={setUnidad}>
          <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="un">unidad</SelectItem>
            <SelectItem value="g">g</SelectItem>
            <SelectItem value="ml">ml</SelectItem>
            <SelectItem value="porcion">porción</SelectItem>
            <SelectItem value="feta">feta</SelectItem>
          </SelectContent>
        </Select>
        <Input type="number" value={precio || ''} onChange={(e) => setPrecio(Number(e.target.value))} placeholder="Precio ($)" min={0} />
      </div>
      {selectedItem && precio > 0 && (
        <div className="p-2 bg-muted/50 rounded text-xs space-y-1">
          <div className="flex justify-between"><span>Costo:</span><span className="font-mono">{formatCurrency(costoCalculado)}</span></div>
          <div className="flex justify-between"><span>Precio:</span><span className="font-mono">{formatCurrency(precio)}</span></div>
          <div className="flex justify-between"><span>FC%:</span>
            <Badge variant={costoCalculado / precio <= 0.32 ? 'default' : costoCalculado / precio <= 0.40 ? 'secondary' : 'destructive'} className="text-xs">
              {((costoCalculado / precio) * 100).toFixed(1)}%
            </Badge>
          </div>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm" onClick={handleSave} disabled={!selectedId || !precio || onCreate.isPending}>Guardar</Button>
      </div>
    </div>
  );
}

/* ═══ NEW SUSTITUCION FORM ═══ */
function NewSustitucionForm({ itemId, ingredientes, insumos, onCreate, onClose }: any) {
  const [originalId, setOriginalId] = useState('');
  const [nuevoId, setNuevoId] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [unidad, setUnidad] = useState('un');
  const [diferenciaPrecio, setDiferenciaPrecio] = useState(0);
  const [nombre, setNombre] = useState('');

  // All insumos as options for both original and new
  const allInsumos = insumos || [];
  const original = allInsumos.find((i: any) => i.id === originalId);
  const nuevo = allInsumos.find((i: any) => i.id === nuevoId);

  const diferenciaCosto = original && nuevo
    ? (nuevo.costo_por_unidad_base || 0) * cantidad - (original.costo_por_unidad_base || 0) * cantidad
    : 0;

  const handleSave = async () => {
    if (!originalId || !nuevoId) return;
    const displayName = nombre.trim() || `Cambiar ${original?.nombre} por ${nuevo?.nombre}`;
    await onCreate.mutateAsync({
      item_carta_id: itemId,
      tipo: 'sustitucion',
      nombre: displayName,
      ingrediente_original_id: originalId,
      ingrediente_nuevo_id: nuevoId,
      cantidad_nuevo: cantidad,
      unidad_nuevo: unidad,
      diferencia_precio: diferenciaPrecio,
      diferencia_costo: diferenciaCosto,
    });
    onClose();
  };

  return (
    <div className="p-4 border-2 border-dashed rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Nueva sustitución</p>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}><X className="w-3.5 h-3.5" /></Button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Original (se reemplaza)</label>
          <Select value={originalId} onValueChange={(v) => { setOriginalId(v); const o = allInsumos.find((i: any) => i.id === v); if (nuevo) setNombre(`Cambiar ${o?.nombre} por ${nuevo.nombre}`); }}>
            <SelectTrigger className="text-sm"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
            <SelectContent>
              {allInsumos.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Nuevo (se agrega)</label>
          <Select value={nuevoId} onValueChange={(v) => { setNuevoId(v); const n = allInsumos.find((i: any) => i.id === v); if (original) setNombre(`Cambiar ${original.nombre} por ${n?.nombre}`); }}>
            <SelectTrigger className="text-sm"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
            <SelectContent>
              {allInsumos.filter((i: any) => i.id !== originalId).map((i: any) => <SelectItem key={i.id} value={i.id}>{i.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre (ej: Cambiar Cheddar por Provoleta)" className="text-sm" />
      <div className="grid grid-cols-3 gap-3">
        <Input type="number" value={cantidad || ''} onChange={(e) => setCantidad(Number(e.target.value))} placeholder="Cantidad" min={0.01} step={0.01} />
        <Select value={unidad} onValueChange={setUnidad}>
          <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="un">unidad</SelectItem>
            <SelectItem value="g">g</SelectItem>
            <SelectItem value="feta">feta</SelectItem>
          </SelectContent>
        </Select>
        <Input type="number" value={diferenciaPrecio} onChange={(e) => setDiferenciaPrecio(Number(e.target.value))} placeholder="Dif. precio ($)" />
      </div>
      {original && nuevo && (
        <div className="p-2 bg-muted/50 rounded text-xs space-y-1">
          <div className="flex justify-between"><span>Dif. costo:</span>
            <span className={`font-mono ${diferenciaCosto > 0 ? 'text-destructive' : 'text-green-600'}`}>
              {diferenciaCosto > 0 ? '+' : ''}{formatCurrency(diferenciaCosto)}
            </span>
          </div>
          <div className="flex justify-between"><span>Cargo al cliente:</span>
            <span className="font-mono">{diferenciaPrecio === 0 ? 'Gratis' : formatCurrency(diferenciaPrecio)}</span>
          </div>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm" onClick={handleSave} disabled={!originalId || !nuevoId || onCreate.isPending}>Guardar</Button>
      </div>
    </div>
  );
}
