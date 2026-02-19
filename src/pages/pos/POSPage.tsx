/**
 * POSPage - Punto de venta
 * Layout lineal: config arriba, carrito + menú abajo (siempre visibles).
 */
import { useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { ProductGrid, type CartItem } from '@/components/pos/ProductGrid';
import { OrderPanel } from '@/components/pos/OrderPanel';
import { OrderConfigPanel } from '@/components/pos/OrderConfigPanel';
import { PaymentModal, type PaymentPayload } from '@/components/pos/PaymentModal';
import { RegisterOpenModal } from '@/components/pos/RegisterOpenModal';
import { useCreatePedido } from '@/hooks/pos/useOrders';
import { useShiftStatus } from '@/hooks/useShiftStatus';
import { toast } from 'sonner';
import { DEFAULT_ORDER_CONFIG } from '@/types/pos';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShoppingBag } from 'lucide-react';

export default function POSPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [showOpenCash, setShowOpenCash] = useState(false);
  const [orderConfig, setOrderConfig] = useState(DEFAULT_ORDER_CONFIG);
  const [saleStarted, setSaleStarted] = useState(false);
  const configRef = useRef<HTMLDivElement>(null);

  const shiftStatus = useShiftStatus(branchId);
  const createPedido = useCreatePedido(branchId!);

  const addItem = useCallback((item: CartItem) => {
    setCart((prev) => {
      const idx = prev.findIndex(
        (i) => i.item_carta_id === item.item_carta_id && !i.notas && !item.notas
      );
      if (idx >= 0) {
        const copy = [...prev];
        const n = copy[idx].cantidad + 1;
        copy[idx] = { ...copy[idx], cantidad: n, subtotal: copy[idx].precio_unitario * n };
        return copy;
      }
      return [...prev, { ...item }];
    });
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

  const validateOrderConfig = (): string | null => {
    if (orderConfig.canalVenta === 'mostrador') {
      if (orderConfig.tipoServicio === 'comer_aca' && !orderConfig.numeroLlamador) {
        return 'Ingresá el número de llamador';
      }
      if (orderConfig.tipoServicio === 'takeaway' && !orderConfig.clienteNombre?.trim()) {
        return 'Ingresá el nombre o número de llamador';
      }
      if (orderConfig.tipoServicio === 'delivery') {
        if (!orderConfig.clienteNombre?.trim() || !orderConfig.clienteTelefono?.trim()) {
          return 'Nombre y teléfono son requeridos';
        }
        if (!orderConfig.clienteDireccion?.trim()) return 'Ingresá la dirección de entrega';
      }
    } else {
      if (!orderConfig.clienteNombre?.trim() || !orderConfig.clienteTelefono?.trim()) {
        return 'Nombre y teléfono son requeridos';
      }
      if (!orderConfig.clienteDireccion?.trim()) return 'Ingresá la dirección de entrega';
    }
    return null;
  };

  const handleCobrar = () => {
    if (!shiftStatus.hasCashOpen) {
      toast.error('Abrí la caja para poder cobrar');
      setShowOpenCash(true);
      return;
    }
    const err = validateOrderConfig();
    if (err) {
      toast.error(err);
      return;
    }
    setShowPayment(true);
  };

  const handleConfirmPayment = async (payload: PaymentPayload) => {
    if (!branchId || cart.length === 0) return;
    try {
      const items = cart.map((c) => ({
        item_carta_id: c.item_carta_id,
        nombre: c.nombre,
        cantidad: c.cantidad,
        precio_unitario: c.precio_unitario,
        subtotal: c.subtotal,
        notas: c.notas,
        estacion: 'armado' as const,
      }));
      if (payload.type === 'single') {
        await createPedido.mutateAsync({
          items,
          metodoPago: payload.metodo,
          montoRecibido: payload.montoRecibido,
          propina: payload.tip,
          orderConfig,
        });
      } else {
        await createPedido.mutateAsync({
          items,
          payments: payload.payments.map((p) => ({
            method: p.method,
            amount: p.amount,
            montoRecibido: p.method === 'efectivo' ? p.montoRecibido : undefined,
          })),
          propina: payload.tip,
          orderConfig,
        });
      }
      toast.success('Pedido registrado');
      setCart([]);
      setOrderConfig(DEFAULT_ORDER_CONFIG);
      setShowPayment(false);
      setSaleStarted(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al registrar pedido');
    }
  };

  const subtotal = cart.reduce((s, i) => s + i.subtotal, 0);

  const handleComenzarVenta = () => {
    const err = validateOrderConfig();
    if (err) {
      toast.error(err);
      return;
    }
    setSaleStarted(true);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <PageHeader title="Punto de Venta" subtitle="Tomar pedidos y cobrar" />

      {!shiftStatus.loading && !shiftStatus.hasCashOpen && (
        <Alert variant="destructive" className="mb-2">
          <AlertDescription className="flex items-center justify-between gap-2 flex-wrap">
            <span>Caja cerrada. Abrí la caja para poder cobrar.</span>
            <button type="button" onClick={() => setShowOpenCash(true)} className="underline font-medium whitespace-nowrap">
              Abrir caja
            </button>
          </AlertDescription>
        </Alert>
      )}

      <RegisterOpenModal open={showOpenCash} onOpenChange={setShowOpenCash} branchId={branchId!} onOpened={() => shiftStatus.refetch()} />

      {/* Config panel — always visible */}
      <div ref={configRef} className="mb-3">
        <OrderConfigPanel
          config={orderConfig}
          onChange={setOrderConfig}
          compact={saleStarted}
          onConfirm={handleComenzarVenta}
          deliveryDisabled={false}
        />
      </div>

      {/* Main grid: cart left + menu right — always rendered */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_minmax(380px,1.1fr)] gap-4 flex-1 min-h-0">
        {/* Menu column */}
        <div className="min-h-[200px] lg:min-h-0 flex flex-col flex-1 overflow-hidden relative">
          {!saleStarted && (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[1px] rounded-xl cursor-pointer"
              onClick={() => configRef.current?.scrollIntoView({ behavior: 'smooth' })}
            >
              <p className="text-sm text-muted-foreground font-medium">Configurá canal y cliente para empezar</p>
            </div>
          )}
          <div className={!saleStarted ? 'opacity-40 pointer-events-none flex-1 min-h-0 overflow-hidden' : 'flex-1 min-h-0 overflow-hidden'}>
            <ProductGrid onAddItem={addItem} />
          </div>
        </div>

        {/* Cart column */}
        <div className="min-h-[200px] lg:min-h-0 flex flex-col gap-3">
          {saleStarted ? (
            <OrderPanel
              items={cart}
              onUpdateQty={updateQty}
              onRemove={removeItem}
              onCobrar={handleCobrar}
              disabled={createPedido.isPending || !shiftStatus.hasCashOpen}
            />
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 rounded-xl border border-dashed border-muted-foreground/20 bg-muted/30 text-muted-foreground gap-2 p-6">
              <ShoppingBag className="w-10 h-10 opacity-40" />
              <p className="text-sm">El carrito aparecerá acá</p>
            </div>
          )}
        </div>
      </div>

      <PaymentModal
        open={showPayment}
        onOpenChange={setShowPayment}
        total={subtotal}
        onConfirm={handleConfirmPayment}
        loading={createPedido.isPending}
      />
    </div>
  );
}
