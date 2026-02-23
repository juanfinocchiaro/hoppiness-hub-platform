import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/states';
import { Plus, Pencil, Trash2, Tag, Clock, Calendar, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  usePromociones, usePromocionMutations, usePromocionItems,
  type Promocion, type PromocionFormData,
} from '@/hooks/usePromociones';
import { useItemsCarta } from '@/hooks/useItemsCarta';
import { supabase } from '@/integrations/supabase/client';

const TIPO_LABELS: Record<string, string> = {
  descuento_porcentaje: '% Descuento',
  descuento_fijo: '$ Descuento',
  '2x1': '2x1',
  combo: 'Combo',
  precio_especial: 'Precio especial',
};

const PAGO_LABELS: Record<string, string> = {
  cualquiera: 'Cualquiera',
  solo_efectivo: 'Solo efectivo',
  solo_digital: 'Solo digital',
};

const CANAL_LABELS: Record<string, string> = {
  salon: 'Salón',
  webapp: 'WebApp',
  rappi: 'Rappi',
  pedidos_ya: 'PedidosYa',
};

const ALL_CANALES = ['salon', 'webapp', 'rappi', 'pedidos_ya'];
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

interface PromoItemDraft {
  item_carta_id: string;
  nombre: string;
  imagen_url?: string | null;
  precio_base: number;
  precio_promo: number;
}

const EMPTY_FORM: PromocionFormData = {
  nombre: '',
  descripcion: '',
  tipo: 'descuento_porcentaje',
  valor: 0,
  restriccion_pago: 'cualquiera',
  dias_semana: [0, 1, 2, 3, 4, 5, 6],
  hora_inicio: '00:00',
  hora_fin: '23:59',
  fecha_inicio: null,
  fecha_fin: null,
  aplica_a: 'producto',
  producto_ids: [],
  categoria_ids: [],
  tipo_usuario: 'todos',
  activa: true,
  branch_ids: [],
  canales: ['webapp', 'salon', 'rappi', 'pedidos_ya'],
};

/* ── Promo Card ─────────────────────────────────────────── */

function PromoCard({ promo, onEdit, onDelete, onToggle }: {
  promo: Promocion;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (active: boolean) => void;
}) {
  const { data: items = [] } = usePromocionItems(promo.id);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="py-4 px-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold truncate">{promo.nombre}</h3>
              <Badge variant={promo.activa ? 'default' : 'outline'}>
                {promo.activa ? 'Activa' : 'Inactiva'}
              </Badge>
              <Badge variant="secondary">{TIPO_LABELS[promo.tipo]}</Badge>
              {promo.restriccion_pago !== 'cualquiera' && (
                <Badge variant="destructive">{PAGO_LABELS[promo.restriccion_pago]}</Badge>
              )}
            </div>

            {items.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mb-1.5">
                {items.map(item => (
                  <span key={item.id} className="text-[11px] bg-muted px-2 py-0.5 rounded-full">
                    {item.item_nombre} <span className="text-muted-foreground line-through">${item.precio_base}</span>{' '}
                    <span className="font-semibold text-green-600">${item.precio_promo}</span>
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {promo.dias_semana.map(d => DIAS[d]).join(', ')} {promo.hora_inicio}-{promo.hora_fin}
              </span>
              {(promo.fecha_inicio || promo.fecha_fin) && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {promo.fecha_inicio || '...'} — {promo.fecha_fin || '...'}
                </span>
              )}
              <span>
                {(promo.canales || ALL_CANALES).map(c => CANAL_LABELS[c] || c).join(', ')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Switch checked={promo.activa} onCheckedChange={onToggle} />
            <Button variant="ghost" size="icon" onClick={onEdit}><Pencil className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Page ────────────────────────────────────────────────── */

export default function PromocionesPage() {
  const { data: promos, isLoading } = usePromociones();
  const { data: allItems = [] } = useItemsCarta();
  const { create, update, toggleActive, remove } = usePromocionMutations();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Promocion | null>(null);
  const [deleting, setDeleting] = useState<Promocion | null>(null);
  const [form, setForm] = useState<PromocionFormData>(EMPTY_FORM);
  const [promoItems, setPromoItems] = useState<PromoItemDraft[]>([]);
  const [itemSearch, setItemSearch] = useState('');

  const menuItems = useMemo(() =>
    (allItems as any[]).filter((i: any) => i.tipo === 'item' && i.activo),
    [allItems]
  );

  const searchResults = useMemo(() => {
    if (!itemSearch.trim()) return [];
    const q = itemSearch.toLowerCase();
    return menuItems
      .filter((i: any) => i.nombre.toLowerCase().includes(q))
      .filter((i: any) => !promoItems.some(pi => pi.item_carta_id === i.id))
      .slice(0, 8);
  }, [itemSearch, menuItems, promoItems]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setPromoItems([]);
    setItemSearch('');
    setFormOpen(true);
  };

  const openEdit = async (promo: Promocion) => {
    setEditing(promo);
    setForm({
      nombre: promo.nombre,
      descripcion: promo.descripcion,
      tipo: promo.tipo,
      valor: promo.valor,
      restriccion_pago: promo.restriccion_pago,
      dias_semana: promo.dias_semana,
      hora_inicio: promo.hora_inicio,
      hora_fin: promo.hora_fin,
      fecha_inicio: promo.fecha_inicio,
      fecha_fin: promo.fecha_fin,
      aplica_a: promo.aplica_a,
      producto_ids: promo.producto_ids,
      categoria_ids: promo.categoria_ids,
      tipo_usuario: promo.tipo_usuario,
      activa: promo.activa,
      branch_ids: promo.branch_ids,
      canales: promo.canales || ALL_CANALES,
    });
    setItemSearch('');

    // Load existing promo items
    const { data } = await supabase
      .from('promocion_items')
      .select('*, items_carta!inner(nombre, imagen_url, precio_base)')
      .eq('promocion_id', promo.id);
    setPromoItems((data || []).map((d: any) => ({
      item_carta_id: d.item_carta_id,
      nombre: d.items_carta?.nombre || '',
      imagen_url: d.items_carta?.imagen_url,
      precio_base: Number(d.items_carta?.precio_base || 0),
      precio_promo: Number(d.precio_promo),
    })));

    setFormOpen(true);
  };

  const addItem = (item: any) => {
    setPromoItems(prev => [...prev, {
      item_carta_id: item.id,
      nombre: item.nombre,
      imagen_url: item.imagen_url,
      precio_base: Number(item.precio_base),
      precio_promo: Number(item.precio_base),
    }]);
    setItemSearch('');
  };

  const removeItem = (itemCartaId: string) => {
    setPromoItems(prev => prev.filter(i => i.item_carta_id !== itemCartaId));
  };

  const updateItemPrice = (itemCartaId: string, price: number) => {
    setPromoItems(prev => prev.map(i =>
      i.item_carta_id === itemCartaId ? { ...i, precio_promo: price } : i
    ));
  };

  const applyPercentageToAll = () => {
    if (form.tipo !== 'descuento_porcentaje' || form.valor <= 0) return;
    setPromoItems(prev => prev.map(i => ({
      ...i,
      precio_promo: Math.round(i.precio_base * (1 - form.valor / 100)),
    })));
  };

  const toggleCanal = (canal: string) => {
    setForm(prev => ({
      ...prev,
      canales: prev.canales.includes(canal)
        ? prev.canales.filter(c => c !== canal)
        : [...prev.canales, canal],
    }));
  };

  const toggleDay = (day: number) => {
    setForm(prev => ({
      ...prev,
      dias_semana: prev.dias_semana.includes(day)
        ? prev.dias_semana.filter(d => d !== day)
        : [...prev.dias_semana, day].sort(),
    }));
  };

  const handleSubmit = async () => {
    if (!form.nombre.trim()) {
      toast.error('Ingresá un nombre para la promoción');
      return;
    }
    if (form.valor < 0) {
      toast.error('El valor no puede ser negativo');
      return;
    }
    if (form.tipo === 'descuento_porcentaje' && form.valor > 100) {
      toast.error('El porcentaje no puede ser mayor a 100');
      return;
    }
    if (form.dias_semana.length === 0) {
      toast.error('Seleccioná al menos un día de la semana');
      return;
    }
    if (form.canales.length === 0) {
      toast.error('Seleccioná al menos un canal');
      return;
    }
    if (form.fecha_inicio && form.fecha_fin && form.fecha_inicio > form.fecha_fin) {
      toast.error('La fecha de inicio no puede ser posterior a la fecha de fin');
      return;
    }

    const itemsPayload = promoItems.map(i => ({
      item_carta_id: i.item_carta_id,
      precio_promo: i.precio_promo,
    }));

    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, data: form, items: itemsPayload });
      } else {
        await create.mutateAsync({ ...form, items: itemsPayload });
      }
      setFormOpen(false);
    } catch {
      // handled by toast in mutations
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Promociones"
        subtitle="Importá productos de la carta y crea promociones por canal"
        actions={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Nueva Promoción
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Card key={i}><CardContent className="h-20 animate-pulse" /></Card>)}
        </div>
      ) : !promos?.length ? (
        <EmptyState icon={Tag} title="Sin promociones" description="Creá tu primera promoción" />
      ) : (
        <div className="space-y-3">
          {promos.map(promo => (
            <PromoCard
              key={promo.id}
              promo={promo}
              onEdit={() => openEdit(promo)}
              onDelete={() => setDeleting(promo)}
              onToggle={(checked) => toggleActive.mutate({ id: promo.id, activa: checked })}
            />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Promoción' : 'Nueva Promoción'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Name + Description */}
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Martes de Clásicas" />
            </div>
            <div className="space-y-1.5">
              <Label>Descripción (visible para clientes)</Label>
              <Input value={form.descripcion || ''} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Ej: Todas las clásicas a $4500" />
            </div>

            {/* Products import */}
            <div className="space-y-2">
              <Label className="font-bold">Productos</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={itemSearch}
                  onChange={e => setItemSearch(e.target.value)}
                  placeholder="Buscar producto de la carta..."
                  className="pl-9 h-9"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="border rounded-lg max-h-40 overflow-y-auto divide-y">
                  {searchResults.map((item: any) => (
                    <button
                      key={item.id}
                      onClick={() => addItem(item)}
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center justify-between text-sm"
                    >
                      <span className="truncate">{item.nombre}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">${Number(item.precio_base).toLocaleString('es-AR')}</span>
                    </button>
                  ))}
                </div>
              )}

              {promoItems.length > 0 && (
                <div className="border rounded-lg divide-y">
                  {promoItems.map(item => (
                    <div key={item.item_carta_id} className="flex items-center gap-2 px-3 py-2">
                      <span className="text-sm truncate flex-1">{item.nombre}</span>
                      <span className="text-xs text-muted-foreground line-through">${item.precio_base.toLocaleString('es-AR')}</span>
                      <span className="text-xs">→</span>
                      <Input
                        type="number"
                        value={item.precio_promo}
                        onChange={e => updateItemPrice(item.item_carta_id, Math.max(0, Number(e.target.value) || 0))}
                        className="h-7 w-24 text-xs"
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(item.item_carta_id)}>
                        <X className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Discount type + value */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo de descuento</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor</Label>
                <div className="flex gap-2">
                  <Input type="number" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: Number(e.target.value) }))} className="flex-1" />
                  {form.tipo === 'descuento_porcentaje' && promoItems.length > 0 && (
                    <Button type="button" variant="outline" size="sm" onClick={applyPercentageToAll} className="shrink-0 text-xs h-9">
                      Aplicar a todos
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Channels */}
            <div className="space-y-2">
              <Label className="font-bold">Canales</Label>
              <div className="flex gap-3 flex-wrap">
                {ALL_CANALES.map(canal => (
                  <label key={canal} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={form.canales.includes(canal)}
                      onCheckedChange={() => toggleCanal(canal)}
                    />
                    {CANAL_LABELS[canal]}
                  </label>
                ))}
              </div>
            </div>

            {/* Days */}
            <div className="space-y-1.5">
              <Label>Días de la semana</Label>
              <div className="flex gap-1.5 flex-wrap">
                {DIAS.map((dia, i) => (
                  <Button key={i} type="button" size="sm" variant={form.dias_semana.includes(i) ? 'default' : 'outline'} onClick={() => toggleDay(i)} className="w-10">
                    {dia}
                  </Button>
                ))}
              </div>
            </div>

            {/* Hours */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Hora inicio</Label>
                <Input type="time" value={form.hora_inicio} onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Hora fin</Label>
                <Input type="time" value={form.hora_fin} onChange={e => setForm(f => ({ ...f, hora_fin: e.target.value }))} />
              </div>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fecha inicio (opcional)</Label>
                <Input type="date" value={form.fecha_inicio || ''} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value || null }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha fin (opcional)</Label>
                <Input type="date" value={form.fecha_fin || ''} onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value || null }))} />
              </div>
            </div>

            {/* Payment restriction */}
            <div className="space-y-1.5">
              <Label>Restricción de pago</Label>
              <Select value={form.restriccion_pago} onValueChange={v => setForm(f => ({ ...f, restriccion_pago: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PAGO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* User type */}
            <div className="space-y-1.5">
              <Label>Tipo de usuario</Label>
              <Select value={form.tipo_usuario} onValueChange={v => setForm(f => ({ ...f, tipo_usuario: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="nuevo">Nuevos</SelectItem>
                  <SelectItem value="recurrente">Recurrentes</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button className="w-full" onClick={handleSubmit} disabled={create.isPending || update.isPending}>
              {editing ? 'Guardar cambios' : 'Crear promoción'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={() => setDeleting(null)}
        title="Eliminar promoción"
        description={`¿Eliminar "${deleting?.nombre}"?`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={async () => {
          if (deleting) await remove.mutateAsync(deleting.id);
          setDeleting(null);
        }}
      />
    </div>
  );
}
