import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PageHeader } from '@/components/ui/page-header';
import {
  Globe,
  ExternalLink,
  Truck,
  ShoppingBag,
  Clock,
  MapPin,
  DollarSign,
  ChevronDown,
  Search,
  Banknote,
  CreditCard,
} from 'lucide-react';
import { toast } from 'sonner';
import { DotsLoader } from '@/components/ui/loaders';

const DAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'] as const;
const DAY_LABELS: Record<string, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miércoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sábado: 'Sábado',
  domingo: 'Domingo',
};

type DaySchedule = { enabled: boolean; from: string; to: string };
type WebappPaymentMethods = { efectivo: boolean; mercadopago: boolean };
type ServiceScheduleV2 = {
  enabled: boolean;
  prep_time: number;
  days: Record<string, DaySchedule>;
  payment_methods?: WebappPaymentMethods;
  // delivery-only
  radio_km?: number;
  costo?: number;
  pedido_minimo?: number;
};

const defaultDays = (): Record<string, DaySchedule> =>
  Object.fromEntries(DAYS.map((d) => [d, { enabled: true, from: '11:00', to: '23:00' }]));

const defaultPaymentMethods = (serviceKey: string): WebappPaymentMethods => {
  if (serviceKey === 'delivery') return { efectivo: false, mercadopago: true };
  return { efectivo: true, mercadopago: true };
};

const defaultService = (serviceKey: string, prepTime: number): ServiceScheduleV2 => ({
  enabled: false,
  prep_time: prepTime,
  days: defaultDays(),
  payment_methods: defaultPaymentMethods(serviceKey),
});

/** Migrate old flat format to new v2 format */
function migrateSchedules(
  raw: any,
  form: { retiro_habilitado: boolean; delivery_habilitado: boolean; comer_aca_habilitado: boolean },
  config: any,
): Record<string, ServiceScheduleV2> {
  const result: Record<string, ServiceScheduleV2> = {
    retiro: defaultService('retiro', config?.prep_time_retiro ?? 15),
    delivery: {
      ...defaultService('delivery', config?.prep_time_delivery ?? 40),
      radio_km: config?.delivery_radio_km ?? 5,
      costo: config?.delivery_costo ?? 0,
      pedido_minimo: config?.delivery_pedido_minimo ?? 0,
    },
    comer_aca: defaultService('comer_aca', config?.prep_time_comer_aca ?? 15),
  };

  // If already v2 format (has .days object)
  if (raw?.retiro?.days || raw?.delivery?.days || raw?.comer_aca?.days) {
    for (const key of ['retiro', 'delivery', 'comer_aca']) {
      if (raw[key]) {
        result[key] = {
          ...result[key],
          ...raw[key],
          payment_methods: { ...defaultPaymentMethods(key), ...(raw[key].payment_methods || {}) },
          days: { ...result[key].days, ...(raw[key].days || {}) },
        };
      }
    }
  } else if (raw) {
    // Old format: { retiro: { from, to, enabled } }
    for (const key of ['retiro', 'delivery', 'comer_aca']) {
      if (raw[key]) {
        const old = raw[key];
        result[key].enabled = old.enabled ?? false;
        if (old.from && old.to) {
          // Apply same hours to all days
          for (const d of DAYS) {
            result[key].days[d] = { enabled: true, from: old.from, to: old.to };
          }
        }
      }
    }
  }

  // Sync enabled from top-level booleans
  result.retiro.enabled = form.retiro_habilitado;
  result.delivery.enabled = form.delivery_habilitado;
  result.comer_aca.enabled = form.comer_aca_habilitado;

  return result;
}

function useWebappConfigAdmin(branchId: string | undefined) {
  return useQuery({
    queryKey: ['webapp-config-admin', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webapp_config' as any)
        .select('*')
        .eq('branch_id', branchId!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!branchId,
  });
}

function useBranchSlug(branchId: string | undefined) {
  return useQuery({
    queryKey: ['branch-slug', branchId],
    queryFn: async () => {
      const { data } = await supabase
        .from('branches')
        .select('slug, name')
        .eq('id', branchId!)
        .single();
      return data;
    },
    enabled: !!branchId,
  });
}

type BranchWebappAvailabilityRow = {
  itemId: string;
  nombre: string;
  categoriaNombre: string;
  categoriaOrden: number;
  productoOrden: number;
  marcaDisponibleWebapp: boolean;
  localDisponibleWebapp: boolean;
  outOfStock: boolean;
};

function useBranchWebappAvailability(branchId: string | undefined) {
  return useQuery({
    queryKey: ['branch-webapp-availability', branchId],
    queryFn: async () => {
      const { data: items, error: itemsErr } = await supabase
        .from('items_carta')
        .select(
          'id, nombre, tipo, orden, disponible_webapp, menu_categorias:categoria_carta_id(nombre, orden)',
        )
        .eq('activo', true)
        .is('deleted_at', null)
        .order('orden');
      if (itemsErr) throw itemsErr;

      const { data: availability, error: avErr } = await supabase
        .from('branch_item_availability' as any)
        .select('item_carta_id, available_webapp, out_of_stock')
        .eq('branch_id', branchId!);
      if (avErr) throw avErr;

      const availabilityMap = new Map((availability || []).map((a: any) => [a.item_carta_id, a]));

      const rows = (items || [])
        .filter((item: any) => item.tipo !== 'extra')
        .map((item: any) => {
          const av = availabilityMap.get(item.id);
          return {
            itemId: item.id,
            nombre: item.nombre,
            categoriaNombre: item.menu_categorias?.nombre ?? 'Sin categoría',
            categoriaOrden: item.menu_categorias?.orden ?? 999,
            productoOrden: item.orden ?? 999,
            marcaDisponibleWebapp: item.disponible_webapp !== false,
            localDisponibleWebapp: av?.available_webapp ?? true,
            outOfStock: av?.out_of_stock ?? false,
          } satisfies BranchWebappAvailabilityRow;
        })
        .sort((a, b) => {
          if (a.categoriaOrden !== b.categoriaOrden) return a.categoriaOrden - b.categoriaOrden;
          if (a.productoOrden !== b.productoOrden) return a.productoOrden - b.productoOrden;
          return a.nombre.localeCompare(b.nombre);
        });

      return rows;
    },
    enabled: !!branchId,
  });
}

function useUpdateBranchWebappAvailability(branchId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      itemId: string;
      localDisponibleWebapp?: boolean;
      outOfStock?: boolean;
    }) => {
      const patch: Record<string, any> = {};
      if (params.localDisponibleWebapp !== undefined)
        patch.available_webapp = params.localDisponibleWebapp;
      if (params.outOfStock !== undefined) patch.out_of_stock = params.outOfStock;
      patch.updated_at = new Date().toISOString();

      const { data: updated, error: updateErr } = await supabase
        .from('branch_item_availability' as any)
        .update(patch)
        .eq('branch_id', branchId!)
        .eq('item_carta_id', params.itemId)
        .select('id');
      if (updateErr) throw updateErr;

      if (!updated || updated.length === 0) {
        const { error: upsertErr } = await supabase.from('branch_item_availability' as any).upsert(
          {
            branch_id: branchId!,
            item_carta_id: params.itemId,
            available_webapp: params.localDisponibleWebapp ?? true,
            out_of_stock: params.outOfStock ?? false,
          },
          { onConflict: 'branch_id,item_carta_id' },
        );
        if (upsertErr) throw upsertErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branch-webapp-availability', branchId] });
      qc.invalidateQueries({ queryKey: ['webapp-menu-items', branchId] });
      qc.invalidateQueries({ queryKey: ['items-carta', branchId] });
    },
    onError: (err: Error) => {
      toast.error('No se pudo actualizar la disponibilidad', { description: err.message });
    },
  });
}

// ─── Service Config Section ─────────────────────────────────

function ServiceSection({
  serviceKey,
  label,
  icon: Icon,
  schedule,
  onChange,
  isDelivery,
}: {
  serviceKey: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  schedule: ServiceScheduleV2;
  onChange: (s: ServiceScheduleV2) => void;
  isDelivery?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pm: WebappPaymentMethods = schedule.payment_methods
    ? { ...defaultPaymentMethods(serviceKey), ...schedule.payment_methods }
    : defaultPaymentMethods(serviceKey);

  const setPaymentMethod = (key: keyof WebappPaymentMethods, enabled: boolean) => {
    const next = { ...pm, [key]: enabled };
    if (!next.efectivo && !next.mercadopago) {
      toast.error('Seleccioná al menos un medio de pago');
      return;
    }
    onChange({ ...schedule, payment_methods: next });
  };

  const updateDay = (day: string, patch: Partial<DaySchedule>) => {
    onChange({
      ...schedule,
      days: { ...schedule.days, [day]: { ...schedule.days[day], ...patch } },
    });
  };

  const toggleAllDays = (enabled: boolean) => {
    const newDays = { ...schedule.days };
    for (const d of DAYS) {
      newDays[d] = { ...newDays[d], enabled };
    }
    onChange({ ...schedule, days: newDays });
  };

  const copyToAll = (sourceDay: string) => {
    const src = schedule.days[sourceDay];
    if (!src) return;
    const newDays = { ...schedule.days };
    for (const d of DAYS) {
      newDays[d] = { ...src };
    }
    onChange({ ...schedule, days: newDays });
  };

  return (
    <div className="border rounded-lg">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-muted-foreground" />
          <div>
            <span className="font-medium">{label}</span>
            {schedule.enabled && (
              <p className="text-xs text-muted-foreground">Prep: {schedule.prep_time} min</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={schedule.enabled}
            onCheckedChange={(v) =>
              onChange({
                ...schedule,
                enabled: v,
                payment_methods: schedule.payment_methods ?? defaultPaymentMethods(serviceKey),
              })
            }
          />
          {schedule.enabled && (
            <Collapsible open={open} onOpenChange={setOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
                  />
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          )}
        </div>
      </div>

      {schedule.enabled && (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-4 border-t pt-4">
              {/* Prep time */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Tiempo de preparación (min)
                </Label>
                <Input
                  type="number"
                  value={schedule.prep_time}
                  onChange={(e) =>
                    onChange({ ...schedule, prep_time: parseInt(e.target.value) || 0 })
                  }
                  className="w-32"
                />
              </div>

              {/* Delivery-specific fields */}
              {isDelivery && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1 text-xs">
                      <MapPin className="w-3 h-3" /> Radio (km)
                    </Label>
                    <Input
                      type="number"
                      value={schedule.radio_km ?? ''}
                      onChange={(e) =>
                        onChange({ ...schedule, radio_km: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1 text-xs">
                      <DollarSign className="w-3 h-3" /> Costo envío
                    </Label>
                    <Input
                      type="number"
                      value={schedule.costo ?? ''}
                      onChange={(e) =>
                        onChange({ ...schedule, costo: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1 text-xs">
                      <DollarSign className="w-3 h-3" /> Pedido mínimo
                    </Label>
                    <Input
                      type="number"
                      value={schedule.pedido_minimo ?? ''}
                      onChange={(e) =>
                        onChange({ ...schedule, pedido_minimo: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
              )}

              {/* Payment methods */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" />
                  Medios de pago (WebApp)
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-green-700" />
                      <div>
                        <p className="text-sm font-medium">Efectivo</p>
                        <p className="text-xs text-muted-foreground">Pagás al recibir / retirar</p>
                      </div>
                    </div>
                    <Switch
                      checked={pm.efectivo}
                      onCheckedChange={(v) => setPaymentMethod('efectivo', v)}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-blue-700" />
                      <div>
                        <p className="text-sm font-medium">MercadoPago</p>
                        <p className="text-xs text-muted-foreground">Tarjeta, débito o billetera</p>
                      </div>
                    </div>
                    <Switch
                      checked={pm.mercadopago}
                      onCheckedChange={(v) => setPaymentMethod('mercadopago', v)}
                    />
                  </div>
                </div>
                {isDelivery && pm.efectivo && (
                  <p className="text-xs text-amber-700">
                    Si habilitás efectivo en delivery, el pedido puede ingresar sin pago previo.
                  </p>
                )}
              </div>

              <Separator />

              {/* Schedule per day */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Horarios por día</Label>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => toggleAllDays(true)}
                    >
                      Activar todos
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => toggleAllDays(false)}
                    >
                      Desactivar todos
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {DAYS.map((day) => {
                    const ds = schedule.days[day] || { enabled: true, from: '11:00', to: '23:00' };
                    return (
                      <div key={day} className="flex items-center gap-2 py-1">
                        <Switch
                          checked={ds.enabled}
                          onCheckedChange={(v) => updateDay(day, { enabled: v })}
                          className="scale-75"
                        />
                        <span
                          className={`text-sm w-20 ${ds.enabled ? 'font-medium' : 'text-muted-foreground'}`}
                        >
                          {DAY_LABELS[day]}
                        </span>
                        {ds.enabled ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <Input
                              type="time"
                              value={ds.from}
                              onChange={(e) => updateDay(day, { from: e.target.value })}
                              className="w-28 h-8 text-sm"
                            />
                            <span className="text-xs text-muted-foreground">a</span>
                            <Input
                              type="time"
                              value={ds.to}
                              onChange={(e) => updateDay(day, { to: e.target.value })}
                              className="w-28 h-8 text-sm"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7 px-2 text-muted-foreground"
                              onClick={() => copyToAll(day)}
                              title="Copiar este horario a todos los días"
                            >
                              Copiar a todos
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Cerrado</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────

export default function WebappConfigPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: config, isLoading } = useWebappConfigAdmin(branchId);
  const { data: branchData } = useBranchSlug(branchId);
  const { data: availabilityRows, isLoading: loadingAvailability } =
    useBranchWebappAvailability(branchId);
  const updateAvailability = useUpdateBranchWebappAvailability(branchId);
  const qc = useQueryClient();

  const [form, setForm] = useState({
    webapp_activa: false,
    estado: 'cerrado',
    mensaje_pausa: '',
    recepcion_modo: 'auto',
    auto_accept_orders: false,
    auto_print_orders: false,
  });

  const [services, setServices] = useState<Record<string, ServiceScheduleV2>>({
    retiro: defaultService('retiro', 15),
    delivery: { ...defaultService('delivery', 40), radio_km: 5, costo: 0, pedido_minimo: 0 },
    comer_aca: defaultService('comer_aca', 15),
  });
  const [itemSearch, setItemSearch] = useState('');

  useEffect(() => {
    if (config) {
      setForm({
        webapp_activa: config.webapp_activa ?? false,
        estado: config.estado ?? 'cerrado',
        mensaje_pausa: config.mensaje_pausa ?? '',
        recepcion_modo: config.recepcion_modo ?? 'auto',
        auto_accept_orders: config.auto_accept_orders ?? false,
        auto_print_orders: config.auto_print_orders ?? false,
      });
      setServices(
        migrateSchedules(
          config.service_schedules,
          {
            retiro_habilitado: config.retiro_habilitado ?? true,
            delivery_habilitado: config.delivery_habilitado ?? false,
            comer_aca_habilitado: config.comer_aca_habilitado ?? false,
          },
          config,
        ),
      );
    }
  }, [config]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        branch_id: branchId!,
        webapp_activa: form.webapp_activa,
        estado: form.estado,
        mensaje_pausa: form.mensaje_pausa || null,
        recepcion_modo: form.recepcion_modo,
        auto_accept_orders: form.auto_accept_orders,
        auto_print_orders: form.auto_print_orders,
        // Sync flat booleans for backward compat
        retiro_habilitado: services.retiro?.enabled ?? false,
        delivery_habilitado: services.delivery?.enabled ?? false,
        comer_aca_habilitado: services.comer_aca?.enabled ?? false,
        // Sync flat fields for backward compat
        delivery_radio_km: services.delivery?.radio_km ?? null,
        delivery_costo: services.delivery?.costo ?? null,
        delivery_pedido_minimo: services.delivery?.pedido_minimo ?? null,
        prep_time_retiro: services.retiro?.prep_time ?? 15,
        prep_time_delivery: services.delivery?.prep_time ?? 40,
        prep_time_comer_aca: services.comer_aca?.prep_time ?? 15,
        tiempo_estimado_retiro_min: services.retiro?.prep_time ?? null,
        tiempo_estimado_delivery_min: services.delivery?.prep_time ?? null,
        // New v2 schedules
        service_schedules: services,
        updated_at: new Date().toISOString(),
      };

      if (config) {
        const { error } = await supabase
          .from('webapp_config' as any)
          .update(payload)
          .eq('branch_id', branchId!);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('webapp_config' as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['webapp-config-admin', branchId] });
      toast.success('Configuración guardada');
    },
    onError: (err: Error) => {
      toast.error('Error al guardar', { description: err.message });
    },
  });

  const publicUrl = branchData?.slug ? `${window.location.origin}/pedir/${branchData.slug}` : null;

  const updateService = (key: string, s: ServiceScheduleV2) => {
    setServices((prev) => ({ ...prev, [key]: s }));
  };

  const filteredAvailabilityRows = useMemo(() => {
    const rows = availabilityRows || [];
    const q = itemSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.nombre.toLowerCase().includes(q) || r.categoriaNombre.toLowerCase().includes(q),
    );
  }, [availabilityRows, itemSearch]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tienda Online"
        subtitle="Configurá tu tienda online para recibir pedidos desde la web."
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <>
          {/* Status & Link */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Estado de la tienda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Tienda activa</Label>
                  <p className="text-xs text-muted-foreground">
                    Habilita o deshabilita la tienda online
                  </p>
                </div>
                <Switch
                  checked={form.webapp_activa}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, webapp_activa: v }))}
                />
              </div>

              {form.webapp_activa && (
                <>
                  <div className="space-y-2">
                    <Label>Estado operativo</Label>
                    <Select
                      value={form.estado}
                      onValueChange={(v) => setForm((f) => ({ ...f, estado: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="abierto">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            Abierto
                          </div>
                        </SelectItem>
                        <SelectItem value="pausado">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            Pausado
                          </div>
                        </SelectItem>
                        <SelectItem value="cerrado">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            Cerrado
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {form.estado === 'pausado' && (
                    <div className="space-y-2">
                      <Label>Mensaje de pausa (opcional)</Label>
                      <Input
                        placeholder="Ej: Volvemos en 15 minutos"
                        value={form.mensaje_pausa}
                        onChange={(e) => setForm((f) => ({ ...f, mensaje_pausa: e.target.value }))}
                      />
                    </div>
                  )}
                </>
              )}

              {publicUrl && (
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3 border">
                  <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground truncate flex-1">{publicUrl}</span>
                  <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" className="shrink-0 gap-1">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Abrir
                    </Button>
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Services — Collapsible sections */}
          <Card>
            <CardHeader>
              <CardTitle>Servicios</CardTitle>
              <CardDescription>
                Activá cada servicio y configurá sus horarios y tiempos de preparación de forma
                independiente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ServiceSection
                serviceKey="retiro"
                label="Retiro en local"
                icon={ShoppingBag}
                schedule={services.retiro}
                onChange={(s) => updateService('retiro', s)}
              />
              <ServiceSection
                serviceKey="delivery"
                label="Delivery"
                icon={Truck}
                schedule={services.delivery}
                onChange={(s) => updateService('delivery', s)}
                isDelivery
              />
              {/* Comer acá no se ofrece en la webapp; se mantiene en backend por compatibilidad */}
            </CardContent>
          </Card>

          {/* Product visibility for WebApp (branch-level override) */}
          <Card>
            <CardHeader>
              <CardTitle>Disponibilidad de productos (Online)</CardTitle>
              <CardDescription>
                Elegí qué productos se ven en la tienda online de este local. No afecta el POS.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  className="pl-9"
                  placeholder="Buscar producto o categoría..."
                />
              </div>

              {loadingAvailability ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <div className="border rounded-lg max-h-[380px] overflow-y-auto divide-y">
                  {filteredAvailabilityRows.map((row) => {
                    const webVisible =
                      row.marcaDisponibleWebapp && row.localDisponibleWebapp && !row.outOfStock;
                    const isPendingThisRow =
                      updateAvailability.isPending &&
                      updateAvailability.variables?.itemId === row.itemId;

                    return (
                      <div
                        key={row.itemId}
                        className="px-3 py-2.5 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{row.nombre}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {row.categoriaNombre}
                            {!row.marcaDisponibleWebapp && ' · Oculto por marca'}
                            {row.outOfStock && ' · Sin stock'}
                            {webVisible && ' · Visible online'}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">Online</Label>
                            <Switch
                              checked={row.marcaDisponibleWebapp && row.localDisponibleWebapp}
                              disabled={!row.marcaDisponibleWebapp || isPendingThisRow}
                              onCheckedChange={(checked) => {
                                updateAvailability.mutate({
                                  itemId: row.itemId,
                                  localDisponibleWebapp: checked,
                                });
                              }}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">Sin stock</Label>
                            <Switch
                              checked={row.outOfStock}
                              disabled={isPendingThisRow}
                              onCheckedChange={(checked) => {
                                updateAvailability.mutate({
                                  itemId: row.itemId,
                                  outOfStock: checked,
                                });
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredAvailabilityRows.length === 0 && (
                    <div className="px-3 py-6 text-sm text-muted-foreground text-center">
                      No hay productos para mostrar con ese filtro.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reception mode */}
          <Card>
            <CardHeader>
              <CardTitle>Recepción de pedidos</CardTitle>
              <CardDescription>
                Cómo se reciben y procesan los pedidos entrantes de la webapp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={form.recepcion_modo}
                onValueChange={(v) => setForm((f) => ({ ...f, recepcion_modo: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automático (entran directo a cocina)</SelectItem>
                  <SelectItem value="manual">Manual (requieren confirmación en OPERAR)</SelectItem>
                </SelectContent>
              </Select>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-aceptar pedidos</Label>
                  <p className="text-xs text-muted-foreground">
                    Los pedidos se aceptan automáticamente sin intervención
                  </p>
                </div>
                <Switch
                  checked={form.auto_accept_orders}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, auto_accept_orders: v }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Impresión automática</Label>
                  <p className="text-xs text-muted-foreground">
                    Si está activo, los pedidos auto-aceptados se imprimen automáticamente
                  </p>
                </div>
                <Switch
                  checked={form.auto_print_orders}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, auto_print_orders: v }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Save button */}
          <div className="flex justify-end">
            <Button onClick={() => save.mutate()} disabled={save.isPending} size="lg">
              {save.isPending && (
                <span className="mr-2 inline-flex">
                  <DotsLoader />
                </span>
              )}
              Guardar configuración
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
