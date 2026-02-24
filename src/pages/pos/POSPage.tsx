/**
 * POSPage - Punto de venta con modelo de cuenta progresiva
 * Items y pagos se mantienen en estado local hasta "Enviar a cocina".
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProductGrid, type CartItem } from '@/components/pos/ProductGrid';
import { AccountPanel } from '@/components/pos/AccountPanel';
import { ConfigForm } from '@/components/pos/OrderConfigPanel';
import { RegisterPaymentPanel } from '@/components/pos/RegisterPaymentPanel';
import { ModifiersModal } from '@/components/pos/ModifiersModal';
import { POSPortalProvider } from '@/components/pos/POSPortalContext';
import { useCreatePedido } from '@/hooks/pos/useOrders';
import { useKitchen } from '@/hooks/pos/useKitchen';
import { usePOSSessionState } from '@/hooks/pos/usePOSSessionState';
import { useShiftStatus } from '@/hooks/useShiftStatus';
import { useCashRegisters, useOpenShift } from '@/hooks/useCashRegister';
import { useAuth } from '@/hooks/useAuth';
import { usePrinting } from '@/hooks/usePrinting';
import { usePrintConfig } from '@/hooks/usePrintConfig';
import { useBranchPrinters } from '@/hooks/useBranchPrinters';
import { useAfipConfig, useEmitirFactura } from '@/hooks/useAfipConfig';
import { evaluateInvoicing, type SalesChannel, type OrderPayment } from '@/lib/invoicing-rules';
import type { FacturaPrintData, PaymentPrintData } from '@/lib/print-router';
import { toast } from 'sonner';
import type { LocalPayment } from '@/types/pos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Banknote, ChefHat, PlusCircle, ShoppingBag } from 'lucide-react';
import { PendingOrdersBar } from '@/components/pos/PendingOrdersBar';
import { WebappOrdersPanel } from '@/components/pos/WebappOrdersPanel';
import { PointPaymentModal } from '@/components/pos/PointPaymentModal';
import { useMercadoPagoConfig } from '@/hooks/useMercadoPagoConfig';

/* Inline cash open form - shown when no register is open */
function InlineCashOpen({ branchId, onOpened }: { branchId: string; onOpened: () => void }) {
  const { user } = useAuth();
  const { data: registersData } = useCashRegisters(branchId);
  const openShift = useOpenShift(branchId);
  const [selectedRegister, setSelectedRegister] = useState('');
  const [openingAmount, setOpeningAmount] = useState('');
  const [isOpening, setIsOpening] = useState(false);
  const registers = (registersData?.active ?? []).filter(r => r.register_type === 'ventas');

  useEffect(() => {
    if (registers.length > 0 && !selectedRegister) {
      setSelectedRegister(registers[0].id);
    }
  }, [registers, selectedRegister]);

  const handleOpen = async () => {
    if (!user || !selectedRegister) return;
    setIsOpening(true);
    try {
      await openShift.mutateAsync({
        registerId: selectedRegister,
        userId: user.id,
        openingAmount: parseFloat(openingAmount) || 0,
      });
      setOpeningAmount('');
      onOpened();
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al abrir caja');
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
        <Banknote className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">Caja cerrada</h2>
        <p className="text-sm text-muted-foreground mt-1">Abrí la caja para empezar a tomar pedidos</p>
      </div>
      {registers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay cajas configuradas para esta sucursal.</p>
      ) : (
        <div className="w-full space-y-4 text-left">
          {registers.length > 1 && (
            <div className="space-y-2">
              <Label>Caja</Label>
              <Select value={selectedRegister} onValueChange={setSelectedRegister}>
                <SelectTrigger><SelectValue placeholder="Seleccionar caja" /></SelectTrigger>
                <SelectContent>
                  {registers.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Efectivo inicial</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                placeholder="0"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                className="pl-7"
              />
            </div>
          </div>
          <Button className="w-full" size="lg" onClick={handleOpen} disabled={isOpening || !selectedRegister}>
            <Banknote className="h-4 w-4 mr-2" />
            {isOpening ? 'Abriendo...' : 'Abrir Caja'}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function POSPage() {
  const { branchId } = useParams<{ branchId: string }>();

  if (!branchId) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground">
        Local no encontrado. Seleccioná un local desde el menú lateral.
      </div>
    );
  }

  return <POSPageContent branchId={branchId} />;
}

function POSPageContent({ branchId }: { branchId: string }) {
  const {
    cart, setCart,
    payments, setPayments,
    configConfirmed, setConfigConfirmed,
    orderConfig, setOrderConfig,
    resetAll,
  } = usePOSSessionState(branchId);
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  const [modifiersItem, setModifiersItem] = useState<any | null>(null);
  const configRef = useRef<HTMLDivElement>(null);

  // Point Smart payment state
  const [pointPaymentOpen, setPointPaymentOpen] = useState(false);
  const [pointPedidoId, setPointPedidoId] = useState<string | null>(null);
  const [pointAmount, setPointAmount] = useState(0);
  const { data: mpConfig } = useMercadoPagoConfig(branchId);
  const hasPointSmart = !!mpConfig?.device_id && mpConfig.estado_conexion === 'conectado';

  const shiftStatus = useShiftStatus(branchId);
  const createPedido = useCreatePedido(branchId);
  const { data: kitchenPedidos } = useKitchen(branchId);

  // ARCA invoicing
  const { data: afipConfig } = useAfipConfig(branchId);
  const emitirFactura = useEmitirFactura();

  // Printing integration
  const printing = usePrinting(branchId);
  const { data: printConfig } = usePrintConfig(branchId);
  const { data: printersData } = useBranchPrinters(branchId);
  const allPrinters = printersData ?? [];

  const { data: branchInfo } = useQuery({
    queryKey: ['branch-name', branchId],
    queryFn: async () => {
      const { data } = await supabase.from('branches').select('name').eq('id', branchId).single();
      return data;
    },
    enabled: !!branchId,
  });

  const { data: menuCategorias } = useQuery({
    queryKey: ['menu-categorias-print', branchId],
    queryFn: async () => {
      const { data } = await supabase
        .from('menu_categorias')
        .select('id, nombre, tipo_impresion')
        .eq('activo', true);
      return (data ?? []) as { id: string; nombre: string; tipo_impresion: string }[];
    },
  });

  // Cart management
  const addItem = useCallback((item: CartItem) => {
    setCart((prev) => {
      const hasNoMods = !item.notas && (!item.extras || item.extras.length === 0) && (!item.removibles || item.removibles.length === 0) && (!item.opcionales || item.opcionales.length === 0);
      if (hasNoMods) {
        const idx = prev.findIndex(
          (i) => i.item_carta_id === item.item_carta_id && !i.notas && (!i.extras || i.extras.length === 0) && (!i.removibles || i.removibles.length === 0) && (!i.opcionales || i.opcionales.length === 0)
        );
        if (idx >= 0) {
          const copy = [...prev];
          const n = copy[idx].cantidad + 1;
          copy[idx] = { ...copy[idx], cantidad: n, subtotal: copy[idx].precio_unitario * n };
          return copy;
        }
      }
      return [...prev, { ...item, createdAt: Date.now() }];
    });
  }, []);

  const handleSelectItem = useCallback((item: any) => {
    setModifiersItem(item);
  }, []);

  const handleModifierConfirm = useCallback((cartItem: CartItem) => {
    setCart((prev) => [...prev, { ...cartItem, createdAt: Date.now() }]);
    setModifiersItem(null);
  }, []);

  const updateQty = useCallback((index: number, delta: number) => {
    setCart((prev) => {
      const copy = [...prev];
      const n = Math.max(1, copy[index].cantidad + delta);
      copy[index] = { ...copy[index], cantidad: n, subtotal: copy[index].precio_unitario * n };
      return copy;
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateNotes = useCallback((index: number, notes: string) => {
    setCart((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], notas: notes || undefined };
      return copy;
    });
  }, []);

  // Payment management
  const registerPayment = useCallback((payment: LocalPayment) => {
    setPayments((prev) => [...prev, payment]);
  }, []);

  const removePayment = useCallback((paymentId: string) => {
    setPayments((prev) => prev.filter((p) => p.id !== paymentId));
  }, []);

  // Cancel = reset everything
  const cancelOrder = useCallback(() => {
    resetAll();
  }, [resetAll]);

  // Validate config before allowing payment registration
  const validateOrderConfig = (): string | null => {
    if (orderConfig.canalVenta === 'mostrador') {
      if (orderConfig.tipoServicio === 'comer_aca' && !orderConfig.numeroLlamador) {
        return 'Ingresá el número de llamador';
      }
      if (orderConfig.tipoServicio === 'takeaway' && !orderConfig.clienteNombre?.trim() && !orderConfig.numeroLlamador) {
        return 'Ingresá el nombre del cliente o un número de llamador';
      }
      if (orderConfig.tipoServicio === 'delivery') {
        if (!orderConfig.clienteNombre?.trim() || !orderConfig.clienteTelefono?.trim()) {
          return 'Nombre y teléfono son requeridos';
        }
        if (!orderConfig.clienteDireccion?.trim()) return 'Ingresá la dirección de entrega';
      }
    }
    // Validate invoice fields — required only for Factura A
    if (orderConfig.tipoFactura === 'A') {
      if (!orderConfig.receptorCuit?.trim()) return 'Ingresá el CUIT del cliente';
      if (!orderConfig.receptorRazonSocial?.trim()) return 'Ingresá la razón social del cliente';
    }
    return null;
  };

  const handleOpenPayment = () => {
    const err = validateOrderConfig();
    if (err) {
      toast.error(err);
      configRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    setShowPaymentPanel(true);
  };

  // Point Smart: create order as pendiente_pago, then open PointPaymentModal
  const handlePointSmartPayment = async (amount: number) => {
    if (!branchId || cart.length === 0) return;

    const err = validateOrderConfig();
    if (err) {
      toast.error(err);
      return;
    }

    try {
      const items = cart.map((c) => ({
        item_carta_id: c.item_carta_id,
        nombre: c.nombre,
        cantidad: c.cantidad,
        precio_unitario: c.precio_unitario,
        subtotal: c.subtotal,
        notas: c.notas,
        estacion: 'armado' as const,
        precio_referencia: c.precio_referencia,
        categoria_carta_id: c.categoria_carta_id,
      }));

      const pedido = await createPedido.mutateAsync({
        items,
        payments: [],
        orderConfig,
        estadoInicial: 'pendiente_pago',
      });

      setPointPedidoId(pedido.id);
      setPointAmount(amount);
      setPointPaymentOpen(true);
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al crear el pedido');
    }
  };

  const handlePointPaymentConfirmed = (payment: { metodo: string; monto: number; mp_payment_id: string }) => {
    toast.success('Pago confirmado', {
      description: `El pedido ya está en cocina`,
    });
    resetAll();
  };

  const handlePointPaymentCancelled = async () => {
    // Cancel the order that was created in pendiente_pago
    if (pointPedidoId) {
      try {
        await supabase
          .from('pedidos')
          .update({ estado: 'cancelado' })
          .eq('id', pointPedidoId);
      } catch {
        // best-effort
      }
    }
    setPointPedidoId(null);
  };

  const formatMetodoPago = (method?: string) => {
    switch (method) {
      case 'efectivo':
        return 'Efectivo';
      case 'tarjeta_debito':
        return 'Tarjeta debito';
      case 'tarjeta_credito':
        return 'Tarjeta credito';
      case 'mercadopago_qr':
        return 'QR Mercado Pago';
      case 'transferencia':
        return 'Transferencia';
      default:
        return 'Otro';
    }
  };

  const resolveInvoicingChannel = (): SalesChannel => {
    if (orderConfig.canalVenta === 'mostrador') return 'mostrador';
    if (orderConfig.canalVenta === 'apps') {
      if (orderConfig.canalApp === 'rappi') return 'rappi';
      if (orderConfig.canalApp === 'pedidos_ya') return 'pedidosya';
      if (orderConfig.canalApp === 'mp_delivery') return 'mp_delivery';
    }
    return 'delivery';
  };

  const willInvoice = afipConfig?.estado_conexion === 'conectado';
  const willPrint = !!(printConfig && menuCategorias && printing.bridgeStatus === 'connected');

  // Send to kitchen = persist everything to DB + print
  const handleSendToKitchen = async (onProgress?: (stage: string) => void) => {
    if (!branchId || cart.length === 0) return;

    onProgress?.('creating');
    const items = cart.map((c) => ({
      item_carta_id: c.item_carta_id,
      nombre: c.nombre,
      cantidad: c.cantidad,
      precio_unitario: c.precio_unitario,
      subtotal: c.subtotal,
      notas: c.notas,
      estacion: 'armado' as const,
      precio_referencia: c.precio_referencia,
      categoria_carta_id: c.categoria_carta_id,
    }));

    const pedido = await createPedido.mutateAsync({
      items,
      payments: payments.map((p) => ({
        method: p.method,
        amount: p.amount,
        montoRecibido: p.method === 'efectivo' ? p.montoRecibido : undefined,
      })),
      orderConfig,
    });

    let facturaData: FacturaPrintData | null = null;
    if (afipConfig?.estado_conexion === 'conectado') {
      onProgress?.('invoicing');
      try {
        const channel = resolveInvoicingChannel();
        const orderPayments: OrderPayment[] = payments.map(p => ({
          method: p.method as OrderPayment['method'],
          amount: p.amount,
        }));

        const totalAmount = orderPayments.reduce((s, p) => s + p.amount, 0);

        const clienteQuiereFactura = !!(orderConfig.receptorCuit && orderConfig.receptorRazonSocial);
        const result = clienteQuiereFactura
          ? { shouldInvoice: true, invoiceableAmount: totalAmount, totalAmount }
          : evaluateInvoicing(orderPayments, channel, afipConfig.reglas_facturacion ?? null);

        if (result.shouldInvoice && result.invoiceableAmount > 0) {
          const tipoFactura = orderConfig.tipoFactura === 'A' ? 'A' : 'B';
          const condicionIvaReceptor = tipoFactura === 'A'
            ? 'IVA Responsable Inscripto'
            : 'Consumidor Final';

          const invoiceResult = await emitirFactura.mutateAsync({
            branch_id: branchId!,
            pedido_id: pedido?.id,
            tipo_factura: tipoFactura,
            receptor_cuit: orderConfig.receptorCuit || undefined,
            receptor_razon_social: orderConfig.receptorRazonSocial || undefined,
            receptor_condicion_iva: condicionIvaReceptor,
            items: [{ descripcion: 'Venta POS', cantidad: 1, precio_unitario: result.invoiceableAmount }],
            total: result.invoiceableAmount,
          });

          if (invoiceResult) {
            const pvStr = String(invoiceResult.punto_venta).padStart(5, '0');
            const numStr = String(invoiceResult.numero).padStart(8, '0');
            const neto = result.invoiceableAmount / 1.21;
            const iva = result.invoiceableAmount - neto;
            const afipExtra = afipConfig as unknown as { iibb?: string; condicion_iva?: string };
            facturaData = {
              tipo: tipoFactura as 'A' | 'B',
              codigo: tipoFactura === 'A' ? '01' : '06',
              numero: `${pvStr}-${numStr}`,
              fecha: new Date().toLocaleDateString('es-AR'),
              emisor: {
                razon_social: afipConfig.razon_social || '',
                cuit: afipConfig.cuit || '',
                iibb: afipExtra.iibb || afipConfig.cuit || '',
                condicion_iva: afipExtra.condicion_iva || 'Responsable Inscripto',
                domicilio: afipConfig.direccion_fiscal || '',
                inicio_actividades: afipConfig.inicio_actividades || '',
              },
              receptor: {
                nombre: orderConfig.receptorRazonSocial || orderConfig.clienteNombre || undefined,
                documento_tipo: orderConfig.receptorCuit ? 'CUIT' : 'DNI',
                documento_numero: orderConfig.receptorCuit || undefined,
                condicion_iva: condicionIvaReceptor,
              },
              neto_gravado: neto,
              iva,
              otros_tributos: 0,
              iva_contenido: iva,
              otros_imp_nacionales: 0,
              cae: invoiceResult.cae,
              cae_vto: invoiceResult.cae_vencimiento,
            };
          }
        }
      } catch (invoiceErr) {
        if (import.meta.env.DEV) console.error('Invoice error (non-blocking):', invoiceErr);
      }
    }

    if (printConfig && menuCategorias && printing.bridgeStatus === 'connected') {
      onProgress?.('printing');
      const ticketTrigger = printConfig.ticket_trigger || 'on_payment';
      const shouldPrintTicketNow = ticketTrigger !== 'on_ready';
      const effectivePrintConfig = shouldPrintTicketNow
        ? printConfig
        : { ...printConfig, ticket_enabled: false };
      const esSalon = orderConfig.tipoServicio === 'comer_aca';
      const printableOrder = {
        numero_pedido: pedido.numero_pedido ?? 0,
        tipo_servicio: orderConfig.tipoServicio ?? null,
        canal_venta: orderConfig.canalVenta === 'apps' ? orderConfig.canalApp : orderConfig.canalVenta ?? null,
        numero_llamador: orderConfig.numeroLlamador ? parseInt(orderConfig.numeroLlamador, 10) : null,
        cliente_nombre: orderConfig.clienteNombre ?? null,
        referencia_app: orderConfig.referenciaApp ?? null,
        created_at: new Date().toISOString(),
        items: cart.map((c) => ({
          nombre: c.nombre,
          cantidad: c.cantidad,
          notas: c.notas,
          estacion: 'armado',
          categoria_carta_id: c.categoria_carta_id,
          precio_unitario: c.precio_unitario,
          subtotal: c.subtotal,
        })),
        total: totalToPay,
        descuento: descuentos,
        costo_delivery: costoEnvio > 0 ? costoEnvio : undefined,
        cliente_telefono: orderConfig.clienteTelefono ?? null,
        cliente_direccion: orderConfig.clienteDireccion ?? null,
      };

      const singlePayment = payments.length === 1 ? payments[0] : null;
      const paymentData: PaymentPrintData = {
        metodo_pago: payments.length > 1
          ? `Mixto: ${payments.map((p) => formatMetodoPago(p.method)).join(' + ')}`
          : formatMetodoPago(singlePayment?.method),
        monto_recibido: singlePayment?.method === 'efectivo' ? singlePayment.montoRecibido : undefined,
        vuelto: singlePayment?.method === 'efectivo'
          ? Math.max(0, (singlePayment.montoRecibido || 0) - singlePayment.amount)
          : undefined,
      };

      try {
        await printing.printOrder(
          printableOrder,
          effectivePrintConfig,
          allPrinters,
          menuCategorias as { id: string; nombre: string; tipo_impresion: 'comanda' | 'vale' | 'no_imprimir' }[],
          branchInfo?.name ?? 'Hoppiness',
          esSalon,
          paymentData,
          facturaData,
          pedido?.id,
        );
      } catch (printErr) {
        if (import.meta.env.DEV) console.error('Print error (non-blocking):', printErr);
      }
    }
  };

  // Reopen config editing
  const handleEditConfig = useCallback(() => {
    setConfigConfirmed(false);
  }, []);

  const isAppsChannel = orderConfig.canalVenta === 'apps';
  const subtotal = cart.reduce((s, i) => s + i.subtotal, 0);
  const costoEnvio = (orderConfig.tipoServicio === 'delivery' || isAppsChannel) ? (orderConfig.costoDelivery ?? 0) : 0;
  const descuentos = (orderConfig.descuentoPlataforma ?? 0) + (orderConfig.descuentoRestaurante ?? 0);
  const totalToPay = subtotal + costoEnvio - descuentos;
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const saldo = isAppsChannel ? 0 : totalToPay - totalPaid;
  const canSend = isAppsChannel ? cart.length > 0 : (Math.abs(totalToPay - totalPaid) < 0.01 && cart.length > 0);

  // Show full-page "Abrir Caja" when cash register is closed
  if (!shiftStatus.loading && !shiftStatus.hasCashOpen) {
    return (
      <POSPortalProvider>
        <div className="flex flex-col h-[calc(100vh-6rem)]">
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-sm">
              <InlineCashOpen branchId={branchId!} onOpened={() => shiftStatus.refetch()} />
            </div>
          </div>
        </div>
      </POSPortalProvider>
    );
  }

  return (
    <POSPortalProvider>
    <div className="flex flex-col h-[calc(100vh-6rem)] pb-16 lg:pb-0">
      {/* Pending orders bar — always visible */}
      <PendingOrdersBar pedidos={(kitchenPedidos ?? []).filter(p => p.origen !== 'webapp')} branchId={branchId!} shiftOpenedAt={shiftStatus.activeCashShift?.opened_at ?? null} />
      <WebappOrdersPanel branchId={branchId!} />
      {/* Main grid: menu + account */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_minmax(380px,1.1fr)] flex-1 min-h-0">
        {/* Menu column - Zona B */}
        <div className="min-h-[200px] lg:min-h-0 flex flex-col flex-1 overflow-hidden bg-slate-50 p-4">
          {!configConfirmed ? (
            /* Empty state while config not confirmed */
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <ShoppingBag className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Configurá el pedido</h3>
                <p className="text-sm text-muted-foreground mt-1">Elegí canal y servicio para ver el menú</p>
              </div>
            </div>
          ) : (
            <ProductGrid
              onAddItem={addItem}
              onSelectItem={handleSelectItem}
              cart={cart}
              branchId={branchId}
              disabled={!configConfirmed}
              promoChannel={
                orderConfig.canalVenta === 'apps'
                  ? orderConfig.canalApp ?? undefined
                  : orderConfig.canalVenta === 'mostrador'
                    ? 'salon'
                    : undefined
              }
            />
          )}
        </div>

        {/* Account column - Zona C */}
        <div className="min-h-[200px] lg:min-h-0 flex flex-col bg-background border-l">
          {!configConfirmed ? (
            /* Config form inline in Zona C */
            <div ref={configRef} className="flex-1 overflow-y-auto p-4">
              <h2 className="text-lg font-semibold mb-4">Nueva venta</h2>
              <ConfigForm
                config={orderConfig}
                onChange={setOrderConfig}
                onConfirm={() => {
                  const err = validateOrderConfig();
                  if (err) {
                    toast.error(err);
                    return;
                  }
                  setConfigConfirmed(true);
                }}
              />
            </div>
          ) : (
            /* Account panel with order config header */
            <>
              <AccountPanel
                items={cart}
                payments={payments}
                onUpdateQty={updateQty}
                onRemove={removeItem}
                onUpdateNotes={updateNotes}
                onCancelOrder={cancelOrder}
                onRegisterPayment={handleOpenPayment}
                onRemovePayment={removePayment}
                onSendToKitchen={handleSendToKitchen}
                onSendComplete={resetAll}
                willInvoice={willInvoice}
                willPrint={willPrint}
                disabled={createPedido.isPending}
                orderConfig={orderConfig}
                onEditConfig={handleEditConfig}
                onUpdateOrderConfig={(partial) => setOrderConfig((prev) => ({ ...prev, ...partial }))}
              />
            </>
          )}
        </div>
      </div>

      {/* Mobile sticky footer */}
      {configConfirmed && cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t bg-background px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
          <div className="text-sm">
            <span className="text-muted-foreground">{cart.reduce((s, i) => s + i.cantidad, 0)} items</span>
            <span className="ml-2 font-semibold text-foreground">$ {totalToPay.toLocaleString('es-AR')}</span>
            {!isAppsChannel && totalPaid > 0 && (
              <span className="ml-2 text-xs text-green-600">pagado $ {totalPaid.toLocaleString('es-AR')}</span>
            )}
          </div>
          {canSend ? (
            <Button
              size="lg"
              onClick={() => handleSendToKitchen().then(resetAll).catch((e: any) => toast.error(e?.message ?? 'Error al registrar pedido'))}
              disabled={createPedido.isPending}
              className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <ChefHat className="h-4 w-4 mr-2" />
              Enviar
            </Button>
          ) : !isAppsChannel ? (
            <Button
              size="lg"
              onClick={handleOpenPayment}
              disabled={createPedido.isPending || saldo <= 0}
              className="shrink-0"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Pagar
            </Button>
          ) : null}
        </div>
      )}

      {/* Register payment modal */}
      <RegisterPaymentPanel
        open={showPaymentPanel}
        onOpenChange={setShowPaymentPanel}
        saldoPendiente={saldo}
        onRegister={registerPayment}
        onPointSmartPayment={hasPointSmart ? handlePointSmartPayment : undefined}
      />

      {/* Point Smart payment modal */}
      {pointPedidoId && (
        <PointPaymentModal
          open={pointPaymentOpen}
          onOpenChange={setPointPaymentOpen}
          pedidoId={pointPedidoId}
          branchId={branchId!}
          amount={pointAmount}
          onConfirmed={handlePointPaymentConfirmed}
          onCancelled={handlePointPaymentCancelled}
        />
      )}

      <ModifiersModal
        open={!!modifiersItem}
        onOpenChange={(open) => { if (!open) setModifiersItem(null); }}
        item={modifiersItem}
        onConfirm={handleModifierConfirm}
      />
    </div>
    </POSPortalProvider>
  );
}
