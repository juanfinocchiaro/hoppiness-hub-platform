import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrackingInlineView } from './TrackingInlineView';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Minus, Plus, Trash2, ShoppingBag, Loader2, ArrowLeft, CreditCard, Banknote, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import type { useWebappCart } from '@/hooks/useWebappCart';

interface DeliveryZone {
  id: string;
  nombre: string;
  costo_envio: number;
  pedido_minimo: number;
  tiempo_estimado_min: number;
  barrios: string[];
  descripcion: string | null;
}

function usePublicDeliveryZones(branchId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['delivery-zones-public', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_zones' as any)
        .select('id, nombre, costo_envio, pedido_minimo, tiempo_estimado_min, barrios, descripcion')
        .eq('branch_id', branchId!)
        .eq('is_active', true)
        .order('orden', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as DeliveryZone[];
    },
    enabled: !!branchId && enabled,
  });
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: ReturnType<typeof useWebappCart>;
  branchName: string;
  branchId?: string;
  mpEnabled?: boolean;
  deliveryCosto?: number;
  initialStep?: Step;
  externalTrackingCode?: string | null;
}

type Step = 'cart' | 'checkout' | 'tracking';
type MetodoPago = 'mercadopago' | 'efectivo';

function formatPrice(n: number) {
  return `$${n.toLocaleString('es-AR')}`;
}

// Inline validation helper
function FieldError({ error }: { error: string | null }) {
  if (!error) return null;
  return <p className="text-xs text-destructive mt-1">{error}</p>;
}

export function CartSheet({ open, onOpenChange, cart, branchName, branchId, mpEnabled, deliveryCosto = 0, initialStep, externalTrackingCode }: Props) {
  const { user } = useAuth();
  const servicioLabel = cart.tipoServicio === 'retiro' ? 'Retiro en local' : cart.tipoServicio === 'delivery' ? 'Delivery' : 'Comer acá';

  // Fetch profile for pre-fill when logged in
  const { data: userProfile } = useQuery({
    queryKey: ['webapp-profile-prefill', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, phone, email')
        .eq('id', user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const isDelivery = cart.tipoServicio === 'delivery';
  const { data: zones = [] } = usePublicDeliveryZones(branchId, isDelivery);
  const hasZones = zones.length > 0;

  // Fetch saved addresses for logged-in users
  const { data: savedAddresses = [] } = useQuery({
    queryKey: ['saved-addresses-checkout', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cliente_direcciones')
        .select('id, etiqueta, direccion, piso, referencia')
        .eq('user_id', user!.id)
        .order('es_principal', { ascending: false });
      if (error) throw error;
      return (data || []) as Array<{ id: string; etiqueta: string; direccion: string; piso: string | null; referencia: string | null }>;
    },
    enabled: !!user && isDelivery,
  });

  const [step, setStep] = useState<Step>(initialStep || 'cart');
  const [trackingCode, setTrackingCode] = useState<string | null>(null);

  useEffect(() => {
    if (open && initialStep) {
      setStep(initialStep);
    }
  }, [open, initialStep]);

  // React to external tracking code (e.g. from ActiveOrderBanner or MisPedidosSheet)
  useEffect(() => {
    if (externalTrackingCode) {
      setTrackingCode(externalTrackingCode);
      setStep('tracking');
    }
  }, [externalTrackingCode]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (hasZones && !selectedZoneId) {
      setSelectedZoneId(zones[0].id);
    }
  }, [hasZones, zones, selectedZoneId]);

  const selectedZone = zones.find(z => z.id === selectedZoneId);

  // Checkout form state - pre-fill from profile (if logged in) or localStorage
  const [nombre, setNombre] = useState(() => {
    try { return localStorage.getItem('hop_client_nombre') || ''; } catch { return ''; }
  });
  const [telefono, setTelefono] = useState(() => {
    try { return localStorage.getItem('hop_client_telefono') || ''; } catch { return ''; }
  });
  const [email, setEmail] = useState(() => {
    try { return localStorage.getItem('hop_client_email') || ''; } catch { return ''; }
  });
  const [direccion, setDireccion] = useState(() => {
    try { return localStorage.getItem('hop_client_direccion') || ''; } catch { return ''; }
  });

  // Pre-fill from profile when data loads (overrides localStorage if profile has data)
  useEffect(() => {
    if (userProfile) {
      if (userProfile.full_name && !nombre) setNombre(userProfile.full_name);
      if (userProfile.phone && !telefono) setTelefono(userProfile.phone);
      if ((userProfile.email || user?.email) && !email) setEmail(userProfile.email || user?.email || '');
    }
  }, [userProfile]);
  const [piso, setPiso] = useState('');
  const [referencia, setReferencia] = useState('');
  const [notas, setNotas] = useState('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(mpEnabled ? 'mercadopago' : 'efectivo');
  const [pagaCon, setPagaCon] = useState<string>('');
  const [showMpConfirm, setShowMpConfirm] = useState(false);

  const costoEnvio = isDelivery
    ? (hasZones && selectedZone ? selectedZone.costo_envio : deliveryCosto)
    : 0;
  const pedidoMinimo = isDelivery && hasZones && selectedZone ? selectedZone.pedido_minimo : 0;
  const totalConEnvio = cart.totalPrecio + costoEnvio;

  const meetsMinimum = pedidoMinimo <= 0 || cart.totalPrecio >= pedidoMinimo;

  // Inline validation errors
  const errors = useMemo(() => {
    const e: Record<string, string | null> = {};
    e.nombre = nombre.trim().length === 0 ? 'Ingresá tu nombre' : nombre.trim().length < 2 ? 'Mínimo 2 caracteres' : null;
    e.telefono = telefono.trim().length === 0 ? 'Ingresá tu teléfono' : telefono.trim().length < 8 ? 'Mínimo 8 dígitos' : null;
    e.email = email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? 'Email no válido' : null;
    if (isDelivery) {
      e.direccion = direccion.trim().length === 0 ? 'Ingresá tu dirección' : direccion.trim().length < 5 ? 'Mínimo 5 caracteres' : null;
    }
    return e;
  }, [nombre, telefono, email, direccion, isDelivery]);

  const hasErrors = Object.values(errors).some(e => e !== null);

  const canSubmit =
    !hasErrors &&
    (!isDelivery || !hasZones || !!selectedZoneId) &&
    meetsMinimum &&
    (metodoPago === 'efectivo' || mpEnabled);

  const handleBlur = (field: string) => setTouched(prev => ({ ...prev, [field]: true }));

  const handleContinue = () => setStep('checkout');

  const handleBack = () => setStep('cart');

  const handleConfirm = async () => {
    // Mark all fields as touched to show errors
    setTouched({ nombre: true, telefono: true, email: true, direccion: true });
    if (!branchId || !canSubmit) return;

    // Show MP confirmation dialog before proceeding
    if (metodoPago === 'mercadopago' && !showMpConfirm) {
      setShowMpConfirm(true);
      return;
    }

    // Save client data to localStorage for pre-fill
    try {
      localStorage.setItem('hop_client_nombre', nombre.trim());
      localStorage.setItem('hop_client_telefono', telefono.trim());
      if (email.trim()) localStorage.setItem('hop_client_email', email.trim());
      if (direccion.trim()) localStorage.setItem('hop_client_direccion', direccion.trim());
    } catch { /* ignore */ }

    setSubmitting(true);
    try {
      const orderItems = cart.items.map(item => ({
        item_carta_id: item.itemId,
        nombre: item.nombre,
        cantidad: item.cantidad,
        precio_unitario: item.precioUnitario,
        extras: item.extras.map(e => ({ nombre: e.nombre, precio: e.precio })),
        removidos: item.removidos,
        notas: item.notas || null,
      }));

      const { data: orderData, error: orderErr } = await supabase.functions.invoke('create-webapp-order', {
        body: {
          branch_id: branchId,
          tipo_servicio: cart.tipoServicio,
          cliente_nombre: nombre.trim(),
          cliente_telefono: telefono.trim(),
          cliente_email: email.trim() || null,
          cliente_direccion: isDelivery ? direccion.trim() : null,
          cliente_piso: isDelivery ? piso.trim() || null : null,
          cliente_referencia: isDelivery ? referencia.trim() || null : null,
          cliente_notas: notas.trim() || null,
          metodo_pago: metodoPago,
          paga_con: metodoPago === 'efectivo' && pagaCon ? parseInt(pagaCon) : null,
          delivery_zone_id: isDelivery && hasZones && selectedZoneId ? selectedZoneId : null,
          items: orderItems,
        },
      });

      if (orderErr) {
        let errorMsg = 'Error al crear el pedido';
        try {
          if (orderErr instanceof Error && 'context' in orderErr) {
            const ctx = (orderErr as any).context;
            if (ctx?.json) {
              const body = await ctx.json();
              errorMsg = body?.error || errorMsg;
            }
          } else if (typeof orderErr === 'object' && orderErr !== null && 'error' in (orderErr as any)) {
            errorMsg = (orderErr as any).error;
          }
        } catch { /* ignore */ }
        throw new Error(errorMsg);
      }
      if (!orderData?.pedido_id) throw new Error('No se pudo crear el pedido');

      const { pedido_id, tracking_code, numero_pedido } = orderData;

      if (metodoPago === 'mercadopago') {
        const checkoutItems = cart.items.map(item => ({
          title: item.nombre,
          quantity: item.cantidad,
          unit_price: item.precioUnitario + item.extras.reduce((s, e) => s + e.precio, 0),
        }));

        if (costoEnvio > 0) {
          checkoutItems.push({ title: 'Envío', quantity: 1, unit_price: costoEnvio });
        }

        const trackingUrl = `${window.location.origin}/pedido/${tracking_code}`;

        const { data: mpData, error: mpErr } = await supabase.functions.invoke('mp-checkout', {
          body: {
            branch_id: branchId,
            items: checkoutItems,
            external_reference: pedido_id,
            payer: {
              name: nombre.trim(),
              email: email.trim() || undefined,
              phone: telefono.trim(),
            },
            back_url: trackingUrl,
            webapp_order: true,
          },
        });

        if (mpErr) throw mpErr;
        if (mpData?.init_point) {
          cart.clearCart();
          window.location.href = mpData.init_point;
          return;
        }
        throw new Error('No se pudo crear el link de pago');
      }

      cart.clearCart();
      toast.success(`Pedido #${numero_pedido} confirmado`);
      localStorage.setItem('hoppiness_last_tracking', tracking_code);
      setTrackingCode(tracking_code);
      setStep('tracking');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear el pedido';
      toast.error('Error', { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && step !== 'tracking') {
      setStep('cart');
      setTouched({});
    }
    onOpenChange(open);
  };

  // Quick cash amount buttons
  const quickAmounts = useMemo(() => {
    const t = totalConEnvio;
    const base = Math.ceil(t / 5000) * 5000;
    const amounts = [base];
    if (base + 5000 <= base * 2) amounts.push(base + 5000);
    if (base + 10000 <= base * 2) amounts.push(base + 10000);
    return amounts.filter((v, i, a) => a.indexOf(v) === i && v >= t);
  }, [totalConEnvio]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl px-0 flex flex-col">
        <SheetHeader className="px-5 pb-3 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2 text-left">
            {(step === 'checkout' || step === 'tracking') && (
              <button onClick={step === 'tracking' ? () => { setTrackingCode(null); setStep('cart'); onOpenChange(false); } : handleBack} className="p-1 -ml-1 rounded-full hover:bg-muted">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <ShoppingBag className="w-5 h-5 text-primary" />
            {step === 'tracking' ? 'Seguimiento' : step === 'cart' ? 'Tu pedido' : 'Completá tus datos'}
          </SheetTitle>
          {step !== 'tracking' && (
            <p className="text-xs text-muted-foreground">
              {servicioLabel} · {branchName}
            </p>
          )}
          {/* Visual stepper — hidden during tracking */}
          {step !== 'tracking' && cart.items.length > 0 && (
            <div className="flex items-center gap-2 pt-2">
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === 'cart' ? 'bg-primary text-primary-foreground' : 'bg-primary text-primary-foreground'
                }`}>1</div>
                <span className={`text-xs font-medium ${step === 'cart' ? 'text-foreground' : 'text-muted-foreground'}`}>Pedido</span>
              </div>
              <div className={`flex-1 h-0.5 rounded ${step === 'checkout' ? 'bg-primary' : 'bg-border'}`} />
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === 'checkout' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>2</div>
                <span className={`text-xs font-medium ${step === 'checkout' ? 'text-foreground' : 'text-muted-foreground'}`}>Datos y pago</span>
              </div>
            </div>
          )}
        </SheetHeader>

        {/* Tracking FIRST — before empty cart check (cart is cleared after order) */}
        {step === 'tracking' && trackingCode ? (
          <div className="flex flex-col flex-1 min-h-0">
            <TrackingInlineView
              trackingCode={trackingCode}
              onNewOrder={() => {
                setTrackingCode(null);
                setStep('cart');
                localStorage.removeItem('hoppiness_last_tracking');
                onOpenChange(false);
              }}
            />
          </div>
        ) : cart.items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-20 text-center">
            <div>
              <span className="text-5xl mb-4 block">🛒</span>
              <p className="text-muted-foreground">Tu carrito está vacío</p>
              <p className="text-xs text-muted-foreground mt-1">Agregá productos del menú</p>
            </div>
          </div>
        ) : step === 'cart' ? (
          /* ── STEP 1: CART ───────────────────────────────────── */
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {cart.items.map(item => {
                const extrasTotal = item.extras.reduce((s, e) => s + e.precio, 0);
                const lineTotal = (item.precioUnitario + extrasTotal) * item.cantidad;

                return (
                  <div key={item.cartId} className="flex items-start gap-3 bg-card rounded-xl p-3 border">
                    {item.imagen_url ? (
                      <img src={item.imagen_url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0 text-xl">🍔</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{item.nombre}</p>
                      {item.extras.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {item.extras.map(e => `+ ${e.nombre}`).join(', ')}
                        </p>
                      )}
                      {item.removidos.length > 0 && (
                        <p className="text-xs text-destructive">
                          {item.removidos.map(r => `Sin ${r}`).join(', ')}
                        </p>
                      )}
                      {item.notas && (
                        <p className="text-xs text-muted-foreground italic">"{item.notas}"</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              if (item.cantidad <= 1) cart.removeItem(item.cartId);
                              else cart.updateQuantity(item.cartId, item.cantidad - 1);
                            }}
                            className="w-7 h-7 rounded-full bg-muted flex items-center justify-center active:scale-95"
                          >
                            {item.cantidad === 1 ? <Trash2 className="w-3 h-3 text-destructive" /> : <Minus className="w-3 h-3" />}
                          </button>
                          <span className="w-5 text-center text-sm font-bold">{item.cantidad}</span>
                          <button
                            onClick={() => cart.updateQuantity(item.cartId, item.cantidad + 1)}
                            className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-95"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="font-bold text-sm">{formatPrice(lineTotal)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t px-5 py-4 space-y-3 bg-background shrink-0">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-sm font-semibold">{formatPrice(cart.totalPrecio)}</span>
              </div>
              {costoEnvio > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Envío</span>
                  <span className="text-sm font-semibold">{formatPrice(costoEnvio)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1 border-t">
                <span className="text-base font-bold">Total</span>
                <span className="text-xl font-black text-foreground">{formatPrice(totalConEnvio)}</span>
              </div>
              <Button
                size="lg"
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-base"
                onClick={handleContinue}
              >
                Continuar
              </Button>
            </div>
          </div>
        ) : (
          /* ── STEP 2: CHECKOUT ───────────────────────────────── */
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Customer data */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground">Tus datos</h3>
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="checkout-nombre" className="text-xs">Nombre *</Label>
                    <Input
                      id="checkout-nombre"
                      value={nombre}
                      onChange={e => setNombre(e.target.value)}
                      onBlur={() => handleBlur('nombre')}
                      placeholder="Tu nombre"
                      className={`mt-1 ${touched.nombre && errors.nombre ? 'border-destructive' : ''}`}
                    />
                    {touched.nombre && <FieldError error={errors.nombre} />}
                  </div>
                  <div>
                    <Label htmlFor="checkout-telefono" className="text-xs">Teléfono *</Label>
                    <Input
                      id="checkout-telefono"
                      type="tel"
                      value={telefono}
                      onChange={e => setTelefono(e.target.value)}
                      onBlur={() => handleBlur('telefono')}
                      placeholder="351 456-7890"
                      className={`mt-1 ${touched.telefono && errors.telefono ? 'border-destructive' : ''}`}
                    />
                    {touched.telefono && <FieldError error={errors.telefono} />}
                  </div>
                  <div>
                    <Label htmlFor="checkout-email" className="text-xs">Email (opcional)</Label>
                    <Input
                      id="checkout-email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onBlur={() => handleBlur('email')}
                      placeholder="tu@email.com"
                      className={`mt-1 ${touched.email && errors.email ? 'border-destructive' : ''}`}
                    />
                    {touched.email && <FieldError error={errors.email} />}
                  </div>
                </div>
              </div>

              {/* Delivery address + zone */}
              {isDelivery && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-foreground">Dirección de entrega</h3>

                  {hasZones && (
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Zona de delivery *
                      </Label>
                      <Select value={selectedZoneId} onValueChange={setSelectedZoneId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccioná tu zona" />
                        </SelectTrigger>
                        <SelectContent>
                          {zones.map(z => (
                            <SelectItem key={z.id} value={z.id}>
                              <div className="flex justify-between items-center gap-3 w-full">
                                <span>{z.nombre}</span>
                                <span className="text-xs text-muted-foreground">
                                  {z.costo_envio > 0 ? `$${z.costo_envio}` : 'Gratis'}
                                  {z.tiempo_estimado_min ? ` · ${z.tiempo_estimado_min} min` : ''}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedZone?.descripcion && (
                        <p className="text-xs text-muted-foreground">{selectedZone.descripcion}</p>
                      )}
                      {selectedZone?.barrios && selectedZone.barrios.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Barrios: {selectedZone.barrios.join(', ')}
                        </p>
                      )}
                      {!meetsMinimum && (
                        <p className="text-xs text-destructive">
                          Pedido mínimo para esta zona: ${pedidoMinimo}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Saved addresses picker */}
                  {savedAddresses.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Dirección guardada</Label>
                      <Select
                        value=""
                        onValueChange={(addrId) => {
                          const addr = savedAddresses.find(a => a.id === addrId);
                          if (addr) {
                            setDireccion(addr.direccion);
                            setPiso(addr.piso || '');
                            setReferencia(addr.referencia || '');
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar dirección guardada" />
                        </SelectTrigger>
                        <SelectContent>
                          {savedAddresses.map(a => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.etiqueta} — {a.direccion}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div>
                      <Label htmlFor="checkout-dir" className="text-xs">Dirección *</Label>
                      <Input
                        id="checkout-dir"
                        value={direccion}
                        onChange={e => setDireccion(e.target.value)}
                        onBlur={() => handleBlur('direccion')}
                        placeholder="Av. Colón 1234"
                        className={`mt-1 ${touched.direccion && errors.direccion ? 'border-destructive' : ''}`}
                      />
                      {touched.direccion && <FieldError error={errors.direccion} />}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="checkout-piso" className="text-xs">Piso / Depto</Label>
                        <Input
                          id="checkout-piso"
                          value={piso}
                          onChange={e => setPiso(e.target.value)}
                          placeholder="3B"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="checkout-ref" className="text-xs">Referencia</Label>
                        <Input
                          id="checkout-ref"
                          value={referencia}
                          onChange={e => setReferencia(e.target.value)}
                          placeholder="Edificio verde"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="checkout-notas" className="text-xs font-bold">Notas para el local (opcional)</Label>
                <Textarea
                  id="checkout-notas"
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  placeholder="Ej: tocar timbre, sin servilletas..."
                  rows={2}
                  className="resize-none"
                />
              </div>

              {/* Payment method */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground">Método de pago</h3>
                <RadioGroup
                  value={metodoPago}
                  onValueChange={v => setMetodoPago(v as MetodoPago)}
                  className="space-y-2"
                >
                  {mpEnabled && (
                    <label
                      htmlFor="pago-mp"
                      className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                        metodoPago === 'mercadopago' ? 'border-primary bg-primary/5' : ''
                      }`}
                    >
                      <RadioGroupItem value="mercadopago" id="pago-mp" />
                      <CreditCard className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="text-sm font-semibold">MercadoPago</p>
                        <p className="text-xs text-muted-foreground">Tarjeta, débito o billetera</p>
                      </div>
                    </label>
                  )}
                  <label
                    htmlFor="pago-efectivo"
                    className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                      metodoPago === 'efectivo' ? 'border-primary bg-primary/5' : ''
                    }`}
                  >
                    <RadioGroupItem value="efectivo" id="pago-efectivo" />
                    <Banknote className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm font-semibold">Efectivo</p>
                      <p className="text-xs text-muted-foreground">
                        {isDelivery ? 'Pagás al recibir' : 'Pagás al retirar'}
                      </p>
                    </div>
                  </label>
                </RadioGroup>

                {/* "¿Con cuánto pagás?" for cash */}
                {metodoPago === 'efectivo' && (
                  <div className="space-y-2 pl-1">
                    <Label className="text-xs">¿Con cuánto pagás?</Label>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => setPagaCon('')}
                        className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                          !pagaCon ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'
                        }`}
                      >
                        Monto justo
                      </button>
                      {quickAmounts.map(amt => (
                        <button
                          key={amt}
                          onClick={() => setPagaCon(String(amt))}
                          className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                            pagaCon === String(amt) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'
                          }`}
                        >
                          {formatPrice(amt)}
                        </button>
                      ))}
                    </div>
                    <Input
                      type="number"
                      value={pagaCon}
                      onChange={e => setPagaCon(e.target.value)}
                      placeholder="Otro monto..."
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Order summary */}
              <div className="space-y-2 rounded-xl border p-3 bg-muted/30">
                <h3 className="text-sm font-bold text-foreground">Resumen</h3>
                {cart.items.map(item => {
                  const ext = item.extras.reduce((s, e) => s + e.precio, 0);
                  return (
                    <div key={item.cartId} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{item.cantidad}x {item.nombre}</span>
                      <span className="font-medium">{formatPrice((item.precioUnitario + ext) * item.cantidad)}</span>
                    </div>
                  );
                })}
                <div className="border-t pt-2 mt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(cart.totalPrecio)}</span>
                  </div>
                  {costoEnvio > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Envío</span>
                      <span>{formatPrice(costoEnvio)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold pt-1">
                    <span>Total</span>
                    <span>{formatPrice(totalConEnvio)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Confirm button */}
            <div className="border-t px-5 py-4 bg-background shrink-0 space-y-3">
              {/* MercadoPago pre-redirect confirmation */}
              {showMpConfirm && metodoPago === 'mercadopago' && (
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 space-y-2">
                  <p className="text-sm font-semibold text-blue-900">Te vamos a llevar a MercadoPago</p>
                  <p className="text-xs text-blue-700">
                    Vas a completar el pago de forma segura en MercadoPago. Una vez confirmado, volvés acá para seguir el estado de tu pedido.
                  </p>
                </div>
              )}
              <Button
                size="lg"
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-base"
                disabled={!canSubmit || submitting}
                onClick={handleConfirm}
              >
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {metodoPago === 'mercadopago'
                  ? (showMpConfirm ? `Ir a MercadoPago · ${formatPrice(totalConEnvio)}` : `Pagar ${formatPrice(totalConEnvio)}`)
                  : `Confirmar pedido ${formatPrice(totalConEnvio)}`}
              </Button>
            </div>
          </div>
        )}

        {/* Tracking block moved above empty cart check */}
      </SheetContent>
    </Sheet>
  );
}
