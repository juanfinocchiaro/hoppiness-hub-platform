import { useState, useMemo, type Dispatch, type SetStateAction } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/states';
import {
  Plus,
  Trash2,
  Tag,
  Calendar,
  Search,
  X,
  Copy,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  usePromociones,
  usePromocionMutations,
  usePromocionItems,
  type Promocion,
  type PromocionFormData,
} from '@/hooks/usePromociones';
import { useItemsCarta } from '@/hooks/useItemsCarta';
import { useItemExtras } from '@/hooks/useItemExtras';
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
const DIAS_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function formatTimeRange(inicio: string, fin: string): string {
  const h0 = inicio?.slice(0, 5) || '00:00';
  const h1 = fin?.slice(0, 5) || '23:59';
  if (h0 === '00:00' && h1 === '23:59') return 'Todo el día';
  return `${h0} - ${h1}`;
}

function formatChannels(canales?: string[]): string {
  if (!canales || canales.length === 0) return '';
  if (canales.length >= ALL_CANALES.length && ALL_CANALES.every((c) => canales.includes(c))) {
    return 'Todos los canales';
  }
  return canales.map((c) => CANAL_LABELS[c] || c).join(', ');
}

interface PromoItemExtraDraft {
  extra_item_carta_id: string;
  nombre: string;
  cantidad: number;
  precio_extra: number;
}

interface PromoItemDraft {
  item_carta_id: string;
  nombre: string;
  imagen_url?: string | null;
  precio_base: number;
  precio_promo: number;
  preconfigExtras?: PromoItemExtraDraft[];
}

interface PromoEditDraft {
  form: PromocionFormData;
  promoItems: PromoItemDraft[];
  itemSearch: string;
  initialSignature: string;
  loading: boolean;
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

/* ── Promo Card (compact, with extras + auto-subtitle) ── */

function buildItemLabel(item: {
  item_nombre?: string;
  precio_base?: number;
  precio_promo: number;
  preconfigExtras?: { nombre?: string; cantidad: number }[];
}) {
  const parts = [item.item_nombre || ''];
  if (item.preconfigExtras && item.preconfigExtras.length > 0) {
    for (const ex of item.preconfigExtras) {
      const name = ex.nombre || 'extra';
      parts.push(ex.cantidad > 1 ? `${ex.cantidad}x ${name}` : name);
    }
  }
  return parts.join(' + ');
}

function PromoCard({
  promo,
  isEditing,
  onEdit,
  onDuplicate,
  onDelete,
  onToggle,
}: {
  promo: Promocion;
  isEditing?: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggle: (active: boolean) => void;
}) {
  const { data: items = [] } = usePromocionItems(promo.id);
  const timeLabel = formatTimeRange(promo.hora_inicio, promo.hora_fin);
  const channelsLabel = formatChannels(promo.canales);
  const discountLabel =
    promo.tipo === 'descuento_porcentaje' && promo.valor > 0 ? `${promo.valor}% OFF` : null;

  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-2.5 border-b last:border-b-0 transition-colors cursor-pointer ${isEditing ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
      onClick={onEdit}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {isEditing ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          <h3 className="font-semibold text-sm truncate">{promo.nombre}</h3>
          {!promo.activa && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              Inactiva
            </Badge>
          )}
          {discountLabel && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {discountLabel}
            </Badge>
          )}
          {promo.restriccion_pago !== 'cualquiera' && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              {PAGO_LABELS[promo.restriccion_pago]}
            </Badge>
          )}
        </div>
        {items.length > 0 && (
          <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-1 flex-wrap">
                <span className="font-medium text-foreground/80">{buildItemLabel(item)}</span>
                <span className="text-muted-foreground/60">→</span>
                <span className="line-through text-muted-foreground/50">
                  ${item.precio_base?.toLocaleString('es-AR')}
                </span>
                <span className="font-semibold text-green-600">
                  ${item.precio_promo.toLocaleString('es-AR')}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
          <span>{timeLabel}</span>
          <span className="text-muted-foreground/40">·</span>
          <span>{channelsLabel}</span>
          {(promo.fecha_inicio || promo.fecha_fin) && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="flex items-center gap-0.5">
                <Calendar className="w-3 h-3" />
                {promo.fecha_inicio || '...'} — {promo.fecha_fin || '...'}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Switch
          checked={promo.activa}
          onCheckedChange={onToggle}
          onClick={(e) => e.stopPropagation()}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          title="Duplicar"
        >
          <Copy className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Eliminar"
        >
          <Trash2 className="w-3.5 h-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

/* ── Grouped by day ────────────────────────────────────── */

function PromosByDay({
  promos,
  openPromoIds,
  renderInlineForm,
  onEdit,
  onDuplicate,
  onDelete,
  onToggle,
}: {
  promos: Promocion[];
  openPromoIds: string[];
  renderInlineForm: (promo: Promocion) => React.ReactNode;
  onEdit: (p: Promocion) => void;
  onDuplicate: (p: Promocion) => void;
  onDelete: (p: Promocion) => void;
  onToggle: (id: string, activa: boolean) => void;
}) {
  const today = new Date().getDay();

  const { allDaysPromos, dayGroups } = useMemo(() => {
    const allDays: Promocion[] = [];
    const byDay = new Map<number, Promocion[]>();

    for (const p of promos) {
      if (p.dias_semana.length === 7) {
        allDays.push(p);
      } else {
        for (const d of p.dias_semana) {
          const list = byDay.get(d) || [];
          list.push(p);
          byDay.set(d, list);
        }
      }
    }

    const groups: { day: number; promos: Promocion[] }[] = [];
    for (const d of DAY_ORDER) {
      const list = byDay.get(d);
      if (list && list.length > 0) groups.push({ day: d, promos: list });
    }

    return { allDaysPromos: allDays, dayGroups: groups };
  }, [promos]);

  const renderedInline = new Set<string>();

  const renderGroup = (label: string, items: Promocion[], isToday: boolean, key: string) => (
    <Card key={key} className={isToday ? 'border-primary/50 shadow-card' : ''}>
      <div
        className={`flex items-center justify-between px-4 py-2 border-b rounded-t-lg ${isToday ? 'bg-primary/5' : 'bg-muted/40'}`}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-sm">{label}</h3>
          {isToday && (
            <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full uppercase">
              Hoy
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {items.length} {items.length === 1 ? 'promo' : 'promos'}
        </span>
      </div>
      {items.map((promo) => {
        const showInline = openPromoIds.includes(promo.id) && !renderedInline.has(promo.id);
        if (showInline) renderedInline.add(promo.id);
        return (
          <div key={promo.id}>
            <PromoCard
              promo={promo}
              isEditing={openPromoIds.includes(promo.id)}
              onEdit={() => onEdit(promo)}
              onDuplicate={() => onDuplicate(promo)}
              onDelete={() => onDelete(promo)}
              onToggle={(checked) => onToggle(promo.id, checked)}
            />
            {showInline && (
              <div className="border-t-2 border-primary/30 bg-muted/10 px-5 py-4">
                {renderInlineForm(promo)}
              </div>
            )}
          </div>
        );
      })}
    </Card>
  );

  return (
    <div className="space-y-4">
      {allDaysPromos.length > 0 && renderGroup('Todos los días', allDaysPromos, true, 'all')}
      {dayGroups.map((g) =>
        renderGroup(DIAS_FULL[g.day], g.promos, g.day === today, `day-${g.day}`),
      )}
    </div>
  );
}

/* ── Promo Item Row with extras from product ───────────── */

function PromoItemRow({
  item,
  discountPercent,
  onUpdate,
  onRemove,
}: {
  item: PromoItemDraft;
  discountPercent: number;
  onUpdate: (updated: PromoItemDraft) => void;
  onRemove: () => void;
}) {
  const { data: productExtras = [] } = useItemExtras(item.item_carta_id);
  const [showExtras, setShowExtras] = useState(!!item.preconfigExtras?.length);

  const availableExtras = useMemo(
    () =>
      productExtras.map((e) => ({
        id: e.id,
        nombre: e.preparaciones?.nombre || e.insumos?.nombre || '',
        precio: Number(e.preparaciones?.precio_extra ?? e.insumos?.precio_extra ?? 0),
      })),
    [productExtras],
  );

  const computeAutoPrice = (base: number, extras: PromoItemExtraDraft[], disc: number) => {
    const extrasTotal = extras.reduce((s, e) => s + e.precio_extra * e.cantidad, 0);
    return Math.round((base + extrasTotal) * (1 - disc / 100));
  };

  const toggleExtra = (extraId: string, nombre: string, precio: number) => {
    const existing = item.preconfigExtras || [];
    let next: PromoItemExtraDraft[];
    if (existing.some((e) => e.extra_item_carta_id === extraId)) {
      next = existing.filter((e) => e.extra_item_carta_id !== extraId);
    } else {
      next = [
        ...existing,
        { extra_item_carta_id: extraId, nombre, cantidad: 1, precio_extra: precio },
      ];
    }
    const newPrice = computeAutoPrice(item.precio_base, next, discountPercent);
    onUpdate({
      ...item,
      preconfigExtras: next.length > 0 ? next : undefined,
      precio_promo: newPrice,
    });
  };

  const updateQty = (extraId: string, qty: number) => {
    const next = (item.preconfigExtras || []).map((e) =>
      e.extra_item_carta_id === extraId ? { ...e, cantidad: Math.max(1, qty) } : e,
    );
    const newPrice = computeAutoPrice(item.precio_base, next, discountPercent);
    onUpdate({ ...item, preconfigExtras: next, precio_promo: newPrice });
  };

  const extrasSubtotal = (item.preconfigExtras || []).reduce(
    (s, e) => s + e.precio_extra * e.cantidad,
    0,
  );
  const baseWithExtras = item.precio_base + extrasSubtotal;
  const autoPrice =
    discountPercent > 0
      ? computeAutoPrice(item.precio_base, item.preconfigExtras || [], discountPercent)
      : null;
  const effectivePercent =
    baseWithExtras > 0
      ? Math.max(0, Math.min(100, Math.round((1 - item.precio_promo / baseWithExtras) * 1000) / 10))
      : 0;
  const isOverride = autoPrice != null && item.precio_promo !== autoPrice;
  const isMoreDiscountThanConfigured = autoPrice != null && item.precio_promo < autoPrice;

  return (
    <div className="px-3 py-2 space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-sm truncate flex-1">{item.nombre}</span>
        <span className="text-xs text-muted-foreground line-through">
          ${item.precio_base.toLocaleString('es-AR')}
        </span>
        <span className="text-xs">→</span>
        <Input
          type="number"
          value={item.precio_promo}
          onChange={(e) =>
            onUpdate({ ...item, precio_promo: Math.max(0, Number(e.target.value) || 0) })
          }
          className="h-7 w-24 text-xs"
        />
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}>
          <X className="w-3.5 h-3.5 text-destructive" />
        </Button>
      </div>

      {/* Percentage mode: show auto price + effective % when overridden */}
      {discountPercent > 0 && autoPrice != null && (
        <div className="flex items-center justify-between gap-2">
          <div
            className={`text-[11px] ${isMoreDiscountThanConfigured ? 'text-destructive' : 'text-muted-foreground'}`}
          >
            Auto ({discountPercent}%): ${autoPrice.toLocaleString('es-AR')}
            {isOverride && (
              <>
                <span className="text-muted-foreground/40"> · </span>
                <span>Equivale a {effectivePercent.toLocaleString('es-AR')}%</span>
                {isMoreDiscountThanConfigured && (
                  <>
                    <span className="text-muted-foreground/40"> · </span>
                    <span className="font-medium">Más descuento del configurado</span>
                  </>
                )}
              </>
            )}
          </div>
          {isOverride && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 text-[11px] px-2"
              onClick={() => onUpdate({ ...item, precio_promo: autoPrice })}
              title="Volver al precio auto-calculado"
            >
              Usar auto
            </Button>
          )}
        </div>
      )}

      {availableExtras.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowExtras(!showExtras)}
            className="text-[11px] text-primary hover:underline"
          >
            {showExtras ? '▾ Ocultar extras' : '▸ Extras preconfigurados'}
            {(item.preconfigExtras?.length ?? 0) > 0 && ` (${item.preconfigExtras!.length})`}
          </button>

          {showExtras && (
            <div className="pl-3 border-l-2 border-primary/20 space-y-1">
              {availableExtras.map((ex) => {
                const selected = (item.preconfigExtras || []).find(
                  (pe) => pe.extra_item_carta_id === ex.id,
                );
                return (
                  <div key={ex.id} className="flex items-center gap-2 text-xs">
                    <Checkbox
                      checked={!!selected}
                      onCheckedChange={() => toggleExtra(ex.id, ex.nombre, ex.precio)}
                    />
                    <span className="truncate flex-1">{ex.nombre}</span>
                    <span className="text-muted-foreground shrink-0">
                      ${ex.precio.toLocaleString('es-AR')}
                    </span>
                    {selected && (
                      <>
                        <span className="text-muted-foreground">×</span>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={selected.cantidad}
                          onChange={(e) => updateQty(ex.id, Number(e.target.value) || 1)}
                          className="h-6 w-14 text-xs text-center"
                        />
                      </>
                    )}
                  </div>
                );
              })}

              {/* Price breakdown */}
              <div className="text-[11px] text-muted-foreground space-y-0.5 pt-1 border-t">
                <div className="flex justify-between">
                  <span>Base</span>
                  <span>${item.precio_base.toLocaleString('es-AR')}</span>
                </div>
                {extrasSubtotal > 0 && (
                  <div className="flex justify-between">
                    <span>+ Extras</span>
                    <span>${extrasSubtotal.toLocaleString('es-AR')}</span>
                  </div>
                )}
                {discountPercent > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span>= Subtotal</span>
                      <span>${(item.precio_base + extrasSubtotal).toLocaleString('es-AR')}</span>
                    </div>
                    <div className="flex justify-between text-red-500">
                      <span>- {discountPercent}% desc</span>
                      <span>
                        -$
                        {Math.round(
                          ((item.precio_base + extrasSubtotal) * discountPercent) / 100,
                        ).toLocaleString('es-AR')}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-semibold text-green-600">
                  <span>= Promo</span>
                  <span>${item.precio_promo.toLocaleString('es-AR')}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────── */

export default function PromocionesPage() {
  const { data: promos, isLoading } = usePromociones();
  const { data: allItems = [] } = useItemsCarta();
  const { create, update, toggleActive, remove } = usePromocionMutations();

  const [creatingNew, setCreatingNew] = useState(false);
  const [deleting, setDeleting] = useState<Promocion | null>(null);
  const [createForm, setCreateForm] = useState<PromocionFormData>(EMPTY_FORM);
  const [createPromoItems, setCreatePromoItems] = useState<PromoItemDraft[]>([]);
  const [createItemSearch, setCreateItemSearch] = useState('');
  const [openPromoIds, setOpenPromoIds] = useState<string[]>([]);
  const [promoDrafts, setPromoDrafts] = useState<Record<string, PromoEditDraft>>({});
  const [confirmClosePromo, setConfirmClosePromo] = useState<Promocion | null>(null);

  const menuItems = useMemo(
    () => (allItems as any[]).filter((i: any) => i.tipo === 'item' && i.activo),
    [allItems],
  );

  const getSearchResults = (itemSearch: string, promoItems: PromoItemDraft[]) => {
    if (!itemSearch.trim()) return [];
    const q = itemSearch.toLowerCase();
    return menuItems
      .filter((i: any) => i.nombre.toLowerCase().includes(q))
      .filter((i: any) => !promoItems.some((pi) => pi.item_carta_id === i.id))
      .slice(0, 8);
  };

  const buildFormFromPromo = (promo: Promocion): PromocionFormData => ({
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

  const getDraftSignature = (form: PromocionFormData, promoItems: PromoItemDraft[]) => {
    const normalized = {
      form: {
        ...form,
        dias_semana: [...form.dias_semana].sort((a, b) => a - b),
        producto_ids: [...form.producto_ids].sort(),
        categoria_ids: [...form.categoria_ids].sort(),
        branch_ids: [...form.branch_ids].sort(),
        canales: [...form.canales].sort(),
      },
      promoItems: [...promoItems]
        .map((item) => ({
          item_carta_id: item.item_carta_id,
          precio_promo: item.precio_promo,
          preconfigExtras: (item.preconfigExtras || [])
            .map((extra) => ({
              extra_item_carta_id: extra.extra_item_carta_id,
              cantidad: extra.cantidad,
            }))
            .sort((a, b) => a.extra_item_carta_id.localeCompare(b.extra_item_carta_id)),
        }))
        .sort((a, b) => a.item_carta_id.localeCompare(b.item_carta_id)),
    };
    return JSON.stringify(normalized);
  };

  const fetchPromoItems = async (promoId: string): Promise<PromoItemDraft[]> => {
    const { data } = await supabase
      .from('promocion_items')
      .select('*, items_carta!inner(nombre, imagen_url, precio_base)')
      .eq('promocion_id', promoId);

    const promoItemIds = (data || []).map((d: any) => d.id);
    const extrasMap = new Map<string, PromoItemExtraDraft[]>();
    if (promoItemIds.length > 0) {
      const { data: extrasData } = await supabase
        .from('promocion_item_extras' as any)
        .select('promocion_item_id, extra_item_carta_id, cantidad')
        .in('promocion_item_id', promoItemIds);
      if (extrasData && extrasData.length > 0) {
        const extraItemIds = [
          ...new Set((extrasData as any[]).map((e: any) => e.extra_item_carta_id)),
        ];
        const { data: extraInfo } = await supabase
          .from('items_carta')
          .select('id, nombre, precio_base')
          .in('id', extraItemIds);
        const infoMap = new Map(
          (extraInfo || []).map((n: any) => [
            n.id,
            { nombre: n.nombre, precio: Number(n.precio_base ?? 0) },
          ]),
        );
        for (const e of extrasData as any[]) {
          const list = extrasMap.get(e.promocion_item_id) || [];
          const info = infoMap.get(e.extra_item_carta_id);
          list.push({
            extra_item_carta_id: e.extra_item_carta_id,
            cantidad: e.cantidad,
            nombre: info?.nombre || '',
            precio_extra: info?.precio || 0,
          });
          extrasMap.set(e.promocion_item_id, list);
        }
      }
    }

    return (data || []).map((d: any) => ({
      item_carta_id: d.item_carta_id,
      nombre: d.items_carta?.nombre || '',
      imagen_url: d.items_carta?.imagen_url,
      precio_base: Number(d.items_carta?.precio_base || 0),
      precio_promo: Number(d.precio_promo),
      preconfigExtras: extrasMap.get(d.id) || undefined,
    }));
  };

  const openCreate = () => {
    setCreateForm(EMPTY_FORM);
    setCreatePromoItems([]);
    setCreateItemSearch('');
    setCreatingNew(true);
  };

  const closePromoNow = (promoId: string) => {
    setOpenPromoIds((prev) => prev.filter((id) => id !== promoId));
    setPromoDrafts((prev) => {
      const next = { ...prev };
      delete next[promoId];
      return next;
    });
  };

  const openEdit = async (promo: Promocion) => {
    setOpenPromoIds((prev) => (prev.includes(promo.id) ? prev : [...prev, promo.id]));
    if (promoDrafts[promo.id]) return;

    setPromoDrafts((prev) => ({
      ...prev,
      [promo.id]: {
        form: buildFormFromPromo(promo),
        promoItems: [],
        itemSearch: '',
        initialSignature: '',
        loading: true,
      },
    }));

    const loadedItems = await fetchPromoItems(promo.id);
    const loadedForm = buildFormFromPromo(promo);
    const initialSignature = getDraftSignature(loadedForm, loadedItems);
    setPromoDrafts((prev) => ({
      ...prev,
      [promo.id]: {
        form: loadedForm,
        promoItems: loadedItems,
        itemSearch: '',
        initialSignature,
        loading: false,
      },
    }));
    setCreatingNew(false);
  };

  const requestClosePromo = (promo: Promocion) => {
    const draft = promoDrafts[promo.id];
    if (!draft || draft.loading) {
      closePromoNow(promo.id);
      return;
    }
    const hasChanges = getDraftSignature(draft.form, draft.promoItems) !== draft.initialSignature;
    if (hasChanges) {
      setConfirmClosePromo(promo);
      return;
    }
    closePromoNow(promo.id);
  };

  const openDuplicate = async (promo: Promocion) => {
    const loadedItems = await fetchPromoItems(promo.id);
    const loadedForm = buildFormFromPromo(promo);
    setCreateForm({ ...loadedForm, nombre: `${loadedForm.nombre} (Copia)` });
    setCreatePromoItems(loadedItems);
    setCreateItemSearch('');
    setCreatingNew(true);
  };

  const addItem = (
    item: any,
    setItems: Dispatch<SetStateAction<PromoItemDraft[]>>,
    setSearch: Dispatch<SetStateAction<string>>,
  ) => {
    setItems((prev) => [
      ...prev,
      {
        item_carta_id: item.id,
        nombre: item.nombre,
        imagen_url: item.imagen_url,
        precio_base: Number(item.precio_base),
        precio_promo: Number(item.precio_base),
      },
    ]);
    setSearch('');
  };

  const removeItem = (
    itemCartaId: string,
    setItems: Dispatch<SetStateAction<PromoItemDraft[]>>,
  ) => {
    setItems((prev) => prev.filter((i) => i.item_carta_id !== itemCartaId));
  };

  const updatePromoItem = (
    itemCartaId: string,
    updated: PromoItemDraft,
    setItems: Dispatch<SetStateAction<PromoItemDraft[]>>,
  ) => {
    setItems((prev) => prev.map((i) => (i.item_carta_id === itemCartaId ? updated : i)));
  };

  const applyPercentageToAll = (
    form: PromocionFormData,
    setItems: Dispatch<SetStateAction<PromoItemDraft[]>>,
  ) => {
    if (form.tipo !== 'descuento_porcentaje' || form.valor <= 0) return;
    setItems((prev) =>
      prev.map((i) => {
        const extrasTotal = (i.preconfigExtras || []).reduce(
          (s, e) => s + e.precio_extra * e.cantidad,
          0,
        );
        return {
          ...i,
          precio_promo: Math.round((i.precio_base + extrasTotal) * (1 - form.valor / 100)),
        };
      }),
    );
  };

  const toggleCanal = (canal: string, setForm: Dispatch<SetStateAction<PromocionFormData>>) => {
    setForm((prev) => ({
      ...prev,
      canales: prev.canales.includes(canal)
        ? prev.canales.filter((c) => c !== canal)
        : [...prev.canales, canal],
    }));
  };

  const toggleDay = (day: number, setForm: Dispatch<SetStateAction<PromocionFormData>>) => {
    setForm((prev) => ({
      ...prev,
      dias_semana: prev.dias_semana.includes(day)
        ? prev.dias_semana.filter((d) => d !== day)
        : [...prev.dias_semana, day].sort(),
    }));
  };

  const validateForm = (form: PromocionFormData) => {
    if (!form.nombre.trim()) {
      toast.error('Ingresá un nombre para la promoción');
      return false;
    }
    if (form.valor < 0) {
      toast.error('El valor no puede ser negativo');
      return false;
    }
    if (form.tipo === 'descuento_porcentaje' && form.valor > 100) {
      toast.error('El porcentaje no puede ser mayor a 100');
      return false;
    }
    if (form.dias_semana.length === 0) {
      toast.error('Seleccioná al menos un día de la semana');
      return false;
    }
    if (form.canales.length === 0) {
      toast.error('Seleccioná al menos un canal');
      return false;
    }
    if (form.fecha_inicio && form.fecha_fin && form.fecha_inicio > form.fecha_fin) {
      toast.error('La fecha de inicio no puede ser posterior a la fecha de fin');
      return false;
    }
    return true;
  };

  const buildItemsPayload = (promoItems: PromoItemDraft[]) =>
    promoItems.map((i) => ({
      item_carta_id: i.item_carta_id,
      precio_promo: i.precio_promo,
      preconfigExtras: i.preconfigExtras?.map((e) => ({
        extra_item_carta_id: e.extra_item_carta_id,
        cantidad: e.cantidad,
      })),
    }));

  const handleCreateSubmit = async () => {
    if (!validateForm(createForm)) return;
    try {
      await create.mutateAsync({ ...createForm, items: buildItemsPayload(createPromoItems) });
      setCreatingNew(false);
      setCreateForm(EMPTY_FORM);
      setCreatePromoItems([]);
      setCreateItemSearch('');
    } catch {
      // handled by toast in mutations
    }
  };

  const handleEditSubmit = async (promoId: string) => {
    const draft = promoDrafts[promoId];
    if (!draft || !validateForm(draft.form)) return;
    try {
      await update.mutateAsync({
        id: promoId,
        data: draft.form,
        items: buildItemsPayload(draft.promoItems),
      });
      closePromoNow(promoId);
    } catch {
      // handled by toast in mutations
    }
  };

  const renderFormFields = ({
    form,
    setForm,
    promoItems,
    setPromoItems,
    itemSearch,
    setItemSearch,
  }: {
    form: PromocionFormData;
    setForm: Dispatch<SetStateAction<PromocionFormData>>;
    promoItems: PromoItemDraft[];
    setPromoItems: Dispatch<SetStateAction<PromoItemDraft[]>>;
    itemSearch: string;
    setItemSearch: Dispatch<SetStateAction<string>>;
  }) => {
    const searchResults = getSearchResults(itemSearch, promoItems);
    const timeLabel = formatTimeRange(form.hora_inicio, form.hora_fin);
    const channelsLabel = formatChannels(form.canales) || '—';
    const daysLabel =
      form.dias_semana.length >= 7
        ? 'Todos los días'
        : form.dias_semana
            .slice()
            .sort((a, b) => a - b)
            .map((d) => DIAS[d] ?? String(d))
            .join(', ');
    const discountLabel = (() => {
      if (!form.valor || form.valor <= 0) return '';
      if (form.tipo === 'descuento_porcentaje') return `${form.valor}% OFF`;
      if (form.tipo === 'descuento_fijo')
        return `$${Number(form.valor).toLocaleString('es-AR')} OFF`;
      return TIPO_LABELS[form.tipo] || '';
    })();
    const itemsLabel = promoItems.length === 1 ? '1 producto' : `${promoItems.length} productos`;
    const hasOverrides =
      form.tipo === 'descuento_porcentaje' && form.valor > 0
        ? promoItems.some((it) => {
            const extrasTotal = (it.preconfigExtras || []).reduce(
              (s, e) => s + e.precio_extra * e.cantidad,
              0,
            );
            const auto = Math.round(
              (Number(it.precio_base) + extrasTotal) * (1 - form.valor / 100),
            );
            return Number(it.precio_promo) !== auto;
          })
        : false;
    const summary = `${daysLabel} · ${timeLabel} · ${channelsLabel}${discountLabel ? ` · ${discountLabel}` : ''} · ${itemsLabel}${hasOverrides ? ' · precios ajustados' : ''}`;

    const sectionHeader = (title: string, hint?: string) => (
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-sm font-bold">{title}</h4>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
    );

    const discountSection = (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select
              value={form.tipo}
              onValueChange={(v) => setForm((f) => ({ ...f, tipo: v as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIPO_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Valor</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={form.valor}
                onChange={(e) => setForm((f) => ({ ...f, valor: Number(e.target.value) }))}
                className="flex-1"
              />
              {form.tipo === 'descuento_porcentaje' && promoItems.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPercentageToAll(form, setPromoItems)}
                  className="shrink-0 text-xs h-9"
                >
                  Aplicar a todos
                </Button>
              )}
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          El precio final se calcula por producto (base + extras incluidos) y podés ajustarlo
          manualmente.
        </p>
      </div>
    );

    const whereSection = (
      <div className="space-y-2">
        <Label className="font-medium">Canales</Label>
        <div className="flex gap-3 flex-wrap">
          {ALL_CANALES.map((canal) => (
            <label key={canal} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={form.canales.includes(canal)}
                onCheckedChange={() => toggleCanal(canal, setForm)}
              />
              {CANAL_LABELS[canal]}
            </label>
          ))}
        </div>
      </div>
    );

    const whenSection = (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="font-medium">Días</Label>
          <div className="flex gap-1 flex-wrap">
            {DIAS.map((dia, i) => (
              <Button
                key={i}
                type="button"
                size="sm"
                variant={form.dias_semana.includes(i) ? 'default' : 'outline'}
                onClick={() => toggleDay(i, setForm)}
                className="w-9 h-7 text-xs px-0"
              >
                {dia}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Hora inicio</Label>
            <Input
              type="time"
              value={form.hora_inicio}
              onChange={(e) => setForm((f) => ({ ...f, hora_inicio: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Hora fin</Label>
            <Input
              type="time"
              value={form.hora_fin}
              onChange={(e) => setForm((f) => ({ ...f, hora_fin: e.target.value }))}
            />
          </div>
        </div>

        <details className="rounded-lg border bg-muted/10 px-3 py-2">
          <summary className="cursor-pointer select-none text-sm font-medium flex items-center justify-between">
            <span>Rango de fechas (opcional)</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </summary>
          <div className="pt-3 grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fecha inicio</Label>
              <Input
                type="date"
                value={form.fecha_inicio || ''}
                onChange={(e) => setForm((f) => ({ ...f, fecha_inicio: e.target.value || null }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha fin</Label>
              <Input
                type="date"
                value={form.fecha_fin || ''}
                onChange={(e) => setForm((f) => ({ ...f, fecha_fin: e.target.value || null }))}
              />
            </div>
          </div>
        </details>
      </div>
    );

    const advancedSection = (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Restricción de pago</Label>
          <Select
            value={form.restriccion_pago}
            onValueChange={(v) => setForm((f) => ({ ...f, restriccion_pago: v as any }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PAGO_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Tipo de usuario</Label>
          <Select
            value={form.tipo_usuario}
            onValueChange={(v) => setForm((f) => ({ ...f, tipo_usuario: v as any }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="nuevo">Nuevos</SelectItem>
              <SelectItem value="recurrente">Recurrentes</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5 flex-1 min-w-0">
              <Label>Nombre *</Label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Miércoles de Doble Royal"
              />
            </div>
            <div className="pt-6 flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground">Activa</span>
              <Switch
                checked={form.activa}
                onCheckedChange={(v) => setForm((f) => ({ ...f, activa: v }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Descripción (visible a clientes)</Label>
            <Input
              value={form.descripcion || ''}
              onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              placeholder="Ej: 30% OFF pagando en efectivo"
            />
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
            <Calendar className="w-3.5 h-3.5" />
            <span className="font-medium text-foreground/80">{summary}</span>
          </div>
        </div>

        {/* Main: products + rules */}
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          {/* Products (primary) */}
          <div className="space-y-2">
            {sectionHeader(
              'Productos',
              promoItems.length > 0 ? `${promoItems.length} seleccionados` : undefined,
            )}
            <p className="text-xs text-muted-foreground">
              Importá productos y definí qué incluye la promo. Los extras marcados acá quedan{' '}
              <span className="font-medium">incluidos</span>.
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Buscar producto de la carta..."
                className="pl-9 h-9"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="border rounded-lg max-h-40 overflow-y-auto divide-y">
                {searchResults.map((item: any) => (
                  <button
                    key={item.id}
                    onClick={() => addItem(item, setPromoItems, setItemSearch)}
                    className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center justify-between text-sm"
                  >
                    <span className="truncate">{item.nombre}</span>
                    <span className="text-muted-foreground shrink-0 ml-2">
                      ${Number(item.precio_base).toLocaleString('es-AR')}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {promoItems.length > 0 ? (
              <div className="border rounded-lg divide-y">
                {promoItems.map((item) => (
                  <PromoItemRow
                    key={item.item_carta_id}
                    item={item}
                    discountPercent={form.tipo === 'descuento_porcentaje' ? form.valor : 0}
                    onUpdate={(updated) =>
                      updatePromoItem(item.item_carta_id, updated, setPromoItems)
                    }
                    onRemove={() => removeItem(item.item_carta_id, setPromoItems)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
                Agregá al menos un producto para configurar precios y extras.
              </div>
            )}
          </div>

          {/* Rules (secondary) */}
          <div className="space-y-4">
            {/* Mobile: accordion */}
            <div className="lg:hidden rounded-lg border">
              <Accordion type="single" collapsible defaultValue="discount">
                <AccordionItem value="discount">
                  <AccordionTrigger className="px-3">Descuento</AccordionTrigger>
                  <AccordionContent className="px-3">{discountSection}</AccordionContent>
                </AccordionItem>
                <AccordionItem value="where">
                  <AccordionTrigger className="px-3">Dónde aplica</AccordionTrigger>
                  <AccordionContent className="px-3">{whereSection}</AccordionContent>
                </AccordionItem>
                <AccordionItem value="when">
                  <AccordionTrigger className="px-3">Cuándo aplica</AccordionTrigger>
                  <AccordionContent className="px-3">{whenSection}</AccordionContent>
                </AccordionItem>
                <AccordionItem value="advanced">
                  <AccordionTrigger className="px-3">Restricciones (avanzado)</AccordionTrigger>
                  <AccordionContent className="px-3">{advancedSection}</AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Desktop: simple blocks */}
            <div className="hidden lg:block space-y-4">
              <div className="rounded-lg border p-3 space-y-2">
                {sectionHeader('Descuento')}
                {discountSection}
              </div>
              <div className="rounded-lg border p-3 space-y-2">
                {sectionHeader('Dónde aplica')}
                {whereSection}
              </div>
              <div className="rounded-lg border p-3 space-y-2">
                {sectionHeader('Cuándo aplica')}
                {whenSection}
              </div>
              <details className="rounded-lg border p-3 bg-muted/10">
                <summary className="cursor-pointer select-none text-sm font-bold flex items-center justify-between">
                  <span>Restricciones (avanzado)</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </summary>
                <div className="pt-3">{advancedSection}</div>
              </details>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderInlineForm = (promo: Promocion) => {
    const draft = promoDrafts[promo.id];
    if (!draft || draft.loading) {
      return <div className="text-sm text-muted-foreground">Cargando edición...</div>;
    }

    return (
      <>
        {renderFormFields({
          form: draft.form,
          setForm: (next) =>
            setPromoDrafts((prev) => ({
              ...prev,
              [promo.id]: prev[promo.id]
                ? {
                    ...prev[promo.id],
                    form: typeof next === 'function' ? next(prev[promo.id].form) : next,
                  }
                : prev[promo.id],
            })),
          promoItems: draft.promoItems,
          setPromoItems: (next) =>
            setPromoDrafts((prev) => ({
              ...prev,
              [promo.id]: prev[promo.id]
                ? {
                    ...prev[promo.id],
                    promoItems: typeof next === 'function' ? next(prev[promo.id].promoItems) : next,
                  }
                : prev[promo.id],
            })),
          itemSearch: draft.itemSearch,
          setItemSearch: (next) =>
            setPromoDrafts((prev) => ({
              ...prev,
              [promo.id]: prev[promo.id]
                ? {
                    ...prev[promo.id],
                    itemSearch: typeof next === 'function' ? next(prev[promo.id].itemSearch) : next,
                  }
                : prev[promo.id],
            })),
        })}
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={() => requestClosePromo(promo)} className="flex-1">
            Cerrar
          </Button>
          <Button
            onClick={() => handleEditSubmit(promo.id)}
            disabled={update.isPending}
            className="flex-1"
          >
            Guardar cambios
          </Button>
        </div>
      </>
    );
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
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="h-20 animate-pulse" />
            </Card>
          ))}
        </div>
      ) : !promos?.length ? (
        <EmptyState icon={Tag} title="Sin promociones" description="Creá tu primera promoción" />
      ) : (
        <PromosByDay
          promos={promos}
          openPromoIds={openPromoIds}
          renderInlineForm={renderInlineForm}
          onEdit={(promo) => {
            if (openPromoIds.includes(promo.id)) {
              requestClosePromo(promo);
            } else {
              openEdit(promo);
            }
          }}
          onDuplicate={openDuplicate}
          onDelete={setDeleting}
          onToggle={(id, activa) => toggleActive.mutate({ id, activa })}
        />
      )}

      {/* Dialog only for NEW promo creation */}
      <Dialog open={creatingNew} onOpenChange={setCreatingNew}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Promoción</DialogTitle>
          </DialogHeader>
          {renderFormFields({
            form: createForm,
            setForm: setCreateForm,
            promoItems: createPromoItems,
            setPromoItems: setCreatePromoItems,
            itemSearch: createItemSearch,
            setItemSearch: setCreateItemSearch,
          })}
          <Button className="w-full" onClick={handleCreateSubmit} disabled={create.isPending}>
            Crear promoción
          </Button>
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

      <ConfirmDialog
        open={!!confirmClosePromo}
        onOpenChange={() => setConfirmClosePromo(null)}
        title="Descartar cambios"
        description={`"${confirmClosePromo?.nombre}" tiene cambios sin guardar. ¿Querés cerrarla igual?`}
        confirmLabel="Cerrar sin guardar"
        onConfirm={() => {
          if (confirmClosePromo) {
            closePromoNow(confirmClosePromo.id);
          }
          setConfirmClosePromo(null);
        }}
      />
    </div>
  );
}
