/**
 * POSPage - Punto de venta
 * Layout lineal: config arriba (siempre compact), carrito + menú abajo.
 */
import { useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { ProductGrid, type CartItem } from '@/components/pos/ProductGrid';
import { OrderPanel } from '@/components/pos/OrderPanel';
import { OrderConfigPanel } from '@/components/pos/OrderConfigPanel';
import { PaymentModal, type PaymentPayload } from '@/components/pos/PaymentModal';
import { ModifiersModal } from '@/components/pos/ModifiersModal';
import { RegisterOpenModal } from '@/components/pos/RegisterOpenModal';
import { useCreatePedido } from '@/hooks/pos/useOrders';
import { useShiftStatus } from '@/hooks/useShiftStatus';
import { toast } from 'sonner';
import { DEFAULT_ORDER_CONFIG } from '@/types/pos';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';

export default function POSPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [showOpenCash, setShowOpenCash] = useState(false);
  const [orderConfig, setOrderConfig] = useState(DEFAULT_ORDER_CONFIG);
  const [modifiersItem, setModifiersItem] = useState<any | null>(null);
  const configRef = useRef<HTMLDivElement>(null);

  const shiftStatus = useShiftStatus(branchId);
  const createPedido = useCreatePedido(branchId!);

  const addItem = useCallback((item: CartItem) => {
    setCart((prev) => {
      if (!item.notas && !item.extras && !item.removibles) {
        const idx = prev.findIndex(
          (i) => i.item_carta_id === item.item_carta_id && !i.notas && !i.extras && !i.removibles
        );
        if (idx >= 0) {
          const copy = [...prev];
          const n = copy[idx].cantidad + 1;
          copy[idx] = { ...copy[idx], cantidad: n, subtotal: copy[idx].precio_unitario * n };
          return copy;
        }
      }
      return [...prev, { ...item }];
    });
  }, []);

  const handleSelectItem = useCallback((item: any) => {
    setModifiersItem(item);
  }, []);

  const handleModifierConfirm = useCallback((cartItem: CartItem) => {
    setCart((prev) => [...prev, cartItem]);
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
      configRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al registrar pedido');
    }
  };

  const subtotal = cart.reduce((s, i) => s + i.subtotal, 0);

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] pb-16 lg:pb-0">
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

      {/* Config panel - always compact */}
      <div ref={configRef} className="mb-3">
        <OrderConfigPanel
          config={orderConfig}
          onChange={setOrderConfig}
          compact
        />
      </div>

      {/* Main grid: menu + cart */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_minmax(380px,1.1fr)] gap-4 flex-1 min-h-0">
        {/* Menu column */}
        <div className="min-h-[200px] lg:min-h-0 flex flex-col flex-1 overflow-hidden">
          <ProductGrid onAddItem={addItem} onSelectItem={handleSelectItem} />
        </div>

        {/* Cart column */}
        <div className="min-h-[200px] lg:min-h-0 flex flex-col gap-3">
          <OrderPanel
            items={cart}
            onUpdateQty={updateQty}
            onRemove={removeItem}
            onUpdateNotes={updateNotes}
            onCobrar={handleCobrar}
            disabled={createPedido.isPending || !shiftStatus.hasCashOpen}
          />
        </div>
      </div>

      {/* Mobile sticky footer */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t bg-background px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
          <div className="text-sm">
            <span className="text-muted-foreground">{cart.reduce((s, i) => s + i.cantidad, 0)} items</span>
            <span className="ml-2 font-semibold text-foreground">$ {subtotal.toLocaleString('es-AR')}</span>
          </div>
          <Button
            size="lg"
            onClick={handleCobrar}
            disabled={createPedido.isPending || !shiftStatus.hasCashOpen}
            className="shrink-0"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Cobrar
          </Button>
        </div>
      )}

      <PaymentModal
        open={showPayment}
        onOpenChange={setShowPayment}
        total={subtotal}
        onConfirm={handleConfirmPayment}
        loading={createPedido.isPending}
      />

      <ModifiersModal
        open={!!modifiersItem}
        onOpenChange={(open) => { if (!open) setModifiersItem(null); }}
        item={modifiersItem}
        onConfirm={handleModifierConfirm}
      />
    </div>
  );
}
