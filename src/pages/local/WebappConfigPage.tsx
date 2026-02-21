import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/ui/page-header';
import { Globe, ExternalLink, Loader2, Truck, ShoppingBag, Utensils, Clock, MapPin, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

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

export default function WebappConfigPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: config, isLoading } = useWebappConfigAdmin(branchId);
  const { data: branchData } = useBranchSlug(branchId);
  const qc = useQueryClient();

  const [form, setForm] = useState({
    webapp_activa: false,
    estado: 'cerrado',
    retiro_habilitado: true,
    delivery_habilitado: false,
    comer_aca_habilitado: false,
    delivery_radio_km: '',
    delivery_costo: '',
    delivery_pedido_minimo: '',
    tiempo_estimado_retiro_min: '',
    tiempo_estimado_delivery_min: '',
    mensaje_pausa: '',
    recepcion_modo: 'auto',
    prep_time_retiro: '15',
    prep_time_delivery: '40',
    prep_time_comer_aca: '15',
    auto_accept_orders: false,
    auto_print_orders: false,
    service_schedules: {} as Record<string, { from: string; to: string; enabled: boolean }>,
  });

  useEffect(() => {
    if (config) {
      setForm({
        webapp_activa: config.webapp_activa ?? false,
        estado: config.estado ?? 'cerrado',
        retiro_habilitado: config.retiro_habilitado ?? true,
        delivery_habilitado: config.delivery_habilitado ?? false,
        comer_aca_habilitado: config.comer_aca_habilitado ?? false,
        delivery_radio_km: config.delivery_radio_km?.toString() ?? '',
        delivery_costo: config.delivery_costo?.toString() ?? '',
        delivery_pedido_minimo: config.delivery_pedido_minimo?.toString() ?? '',
        tiempo_estimado_retiro_min: config.tiempo_estimado_retiro_min?.toString() ?? '',
        tiempo_estimado_delivery_min: config.tiempo_estimado_delivery_min?.toString() ?? '',
        mensaje_pausa: config.mensaje_pausa ?? '',
        recepcion_modo: config.recepcion_modo ?? 'auto',
        prep_time_retiro: config.prep_time_retiro?.toString() ?? '15',
        prep_time_delivery: config.prep_time_delivery?.toString() ?? '40',
        prep_time_comer_aca: config.prep_time_comer_aca?.toString() ?? '15',
        auto_accept_orders: config.auto_accept_orders ?? false,
        auto_print_orders: config.auto_print_orders ?? false,
        service_schedules: config.service_schedules ?? {},
      });
    }
  }, [config]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        branch_id: branchId!,
        webapp_activa: form.webapp_activa,
        estado: form.estado,
        retiro_habilitado: form.retiro_habilitado,
        delivery_habilitado: form.delivery_habilitado,
        comer_aca_habilitado: form.comer_aca_habilitado,
        delivery_radio_km: form.delivery_radio_km ? parseFloat(form.delivery_radio_km) : null,
        delivery_costo: form.delivery_costo ? parseFloat(form.delivery_costo) : null,
        delivery_pedido_minimo: form.delivery_pedido_minimo ? parseFloat(form.delivery_pedido_minimo) : null,
        tiempo_estimado_retiro_min: form.tiempo_estimado_retiro_min ? parseInt(form.tiempo_estimado_retiro_min) : null,
        tiempo_estimado_delivery_min: form.tiempo_estimado_delivery_min ? parseInt(form.tiempo_estimado_delivery_min) : null,
        mensaje_pausa: form.mensaje_pausa || null,
        recepcion_modo: form.recepcion_modo,
        prep_time_retiro: form.prep_time_retiro ? parseInt(form.prep_time_retiro) : 15,
        prep_time_delivery: form.prep_time_delivery ? parseInt(form.prep_time_delivery) : 40,
        prep_time_comer_aca: form.prep_time_comer_aca ? parseInt(form.prep_time_comer_aca) : 15,
        auto_accept_orders: form.auto_accept_orders,
        auto_print_orders: form.auto_print_orders,
        service_schedules: form.service_schedules,
        updated_at: new Date().toISOString(),
      };

      if (config) {
        const { error } = await supabase
          .from('webapp_config' as any)
          .update(payload)
          .eq('branch_id', branchId!);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('webapp_config' as any)
          .insert(payload);
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

  const set = (partial: Partial<typeof form>) => setForm(prev => ({ ...prev, ...partial }));

  const publicUrl = branchData?.slug ? `${window.location.origin}/pedir/${branchData.slug}` : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tienda Online"
        description="Configurá tu tienda online para recibir pedidos desde la web."
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
                  <p className="text-xs text-muted-foreground">Habilita o deshabilita la tienda online</p>
                </div>
                <Switch
                  checked={form.webapp_activa}
                  onCheckedChange={(v) => set({ webapp_activa: v })}
                />
              </div>

              {form.webapp_activa && (
                <>
                  <div className="space-y-2">
                    <Label>Estado operativo</Label>
                    <Select value={form.estado} onValueChange={(v) => set({ estado: v })}>
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
                        onChange={(e) => set({ mensaje_pausa: e.target.value })}
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

          {/* Services */}
          <Card>
            <CardHeader>
              <CardTitle>Servicios disponibles</CardTitle>
              <CardDescription>Elegí qué tipos de servicio ofrece tu tienda online</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <Label>Retiro en local</Label>
                    <p className="text-xs text-muted-foreground">El cliente retira su pedido</p>
                  </div>
                </div>
                <Switch
                  checked={form.retiro_habilitado}
                  onCheckedChange={(v) => set({ retiro_habilitado: v })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <Label>Delivery</Label>
                    <p className="text-xs text-muted-foreground">Envío a domicilio</p>
                  </div>
                </div>
                <Switch
                  checked={form.delivery_habilitado}
                  onCheckedChange={(v) => set({ delivery_habilitado: v })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <Label>Comer en el local</Label>
                    <p className="text-xs text-muted-foreground">Pedido para consumir en el local</p>
                  </div>
                </div>
                <Switch
                  checked={form.comer_aca_habilitado}
                  onCheckedChange={(v) => set({ comer_aca_habilitado: v })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Delivery config */}
          {form.delivery_habilitado && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Configuración de Delivery
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> Radio de cobertura (km)
                    </Label>
                    <Input
                      type="number"
                      placeholder="5"
                      value={form.delivery_radio_km}
                      onChange={(e) => set({ delivery_radio_km: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" /> Costo de envío
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        placeholder="500"
                        value={form.delivery_costo}
                        onChange={(e) => set({ delivery_costo: e.target.value })}
                        className="pl-7"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" /> Pedido mínimo
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        placeholder="3000"
                        value={form.delivery_pedido_minimo}
                        onChange={(e) => set({ delivery_pedido_minimo: e.target.value })}
                        className="pl-7"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Prep times per service */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Tiempos de preparación por servicio
              </CardTitle>
              <CardDescription>
                Configurá los tiempos estimados que se muestran al cliente, diferenciados por tipo de servicio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {form.retiro_habilitado && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5" /> Retiro (min)
                    </Label>
                    <Input
                      type="number"
                      placeholder="15"
                      value={form.prep_time_retiro}
                      onChange={(e) => set({ prep_time_retiro: e.target.value })}
                    />
                  </div>
                )}
                {form.delivery_habilitado && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5" /> Delivery (min)
                    </Label>
                    <Input
                      type="number"
                      placeholder="40"
                      value={form.prep_time_delivery}
                      onChange={(e) => set({ prep_time_delivery: e.target.value })}
                    />
                  </div>
                )}
                {form.comer_aca_habilitado && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Utensils className="w-3.5 h-3.5" /> Comer acá (min)
                    </Label>
                    <Input
                      type="number"
                      placeholder="15"
                      value={form.prep_time_comer_aca}
                      onChange={(e) => set({ prep_time_comer_aca: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Service schedules */}
          <Card>
            <CardHeader>
              <CardTitle>Horarios por servicio</CardTitle>
              <CardDescription>
                Definí en qué horarios están disponibles los distintos tipos de servicio. Fuera de estos horarios, ese tipo de servicio no aparece.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'retiro', label: 'Retiro en local', icon: ShoppingBag, enabled: form.retiro_habilitado },
                { key: 'delivery', label: 'Delivery', icon: Truck, enabled: form.delivery_habilitado },
                { key: 'comer_aca', label: 'Comer en el local', icon: Utensils, enabled: form.comer_aca_habilitado },
              ].filter(s => s.enabled).map(service => {
                const sched = form.service_schedules[service.key] || { from: '10:00', to: '23:00', enabled: true };
                return (
                  <div key={service.key} className="flex items-center gap-4 flex-wrap border rounded-lg p-3">
                    <div className="flex items-center gap-2 min-w-[140px]">
                      <service.icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{service.label}</span>
                    </div>
                    <Switch
                      checked={sched.enabled}
                      onCheckedChange={(v) => set({
                        service_schedules: {
                          ...form.service_schedules,
                          [service.key]: { ...sched, enabled: v },
                        },
                      })}
                    />
                    {sched.enabled && (
                      <>
                        <Input
                          type="time"
                          value={sched.from}
                          onChange={(e) => set({
                            service_schedules: {
                              ...form.service_schedules,
                              [service.key]: { ...sched, from: e.target.value },
                            },
                          })}
                          className="w-28"
                        />
                        <span className="text-sm text-muted-foreground">a</span>
                        <Input
                          type="time"
                          value={sched.to}
                          onChange={(e) => set({
                            service_schedules: {
                              ...form.service_schedules,
                              [service.key]: { ...sched, to: e.target.value },
                            },
                          })}
                          className="w-28"
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Reception mode */}
          <Card>
            <CardHeader>
              <CardTitle>Recepción de pedidos</CardTitle>
              <CardDescription>Cómo se reciben y procesan los pedidos entrantes de la webapp</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={form.recepcion_modo} onValueChange={(v) => set({ recepcion_modo: v })}>
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
                  onCheckedChange={(v) => set({ auto_accept_orders: v })}
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
                  onCheckedChange={(v) => set({ auto_print_orders: v })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Save button */}
          <div className="flex justify-end">
            <Button onClick={() => save.mutate()} disabled={save.isPending} size="lg">
              {save.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar configuración
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
