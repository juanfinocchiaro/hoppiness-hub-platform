/**
 * POSPage - Punto de venta
 * Layout lineal: config arriba (siempre compact), carrito + menú abajo.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { ProductGrid, type CartItem } from '@/components/pos/ProductGrid';
import { OrderPanel } from '@/components/pos/OrderPanel';
import { OrderConfigPanel, ConfigForm } from '@/components/pos/OrderConfigPanel';
import { PaymentModal, type PaymentPayload } from '@/components/pos/PaymentModal';

import { ModifiersModal } from '@/components/pos/ModifiersModal';
import { useCreatePedido } from '@/hooks/pos/useOrders';
import { useShiftStatus } from '@/hooks/useShiftStatus';
import { useCashRegisters, useOpenShift } from '@/hooks/useCashRegister';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { DEFAULT_ORDER_CONFIG } from '@/types/pos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Banknote } from 'lucide-react';

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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [configConfirmed, setConfigConfirmed] = useState(false);
  
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

  const cancelOrder = useCallback(() => {
    setCart([]);
    setOrderConfig(DEFAULT_ORDER_CONFIG);
    setConfigConfirmed(false);
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
        precio_referencia: c.precio_referencia,
      }));
      if (payload.type === 'single') {
        await createPedido.mutateAsync({
          items,
          metodoPago: payload.metodo,
          montoRecibido: payload.montoRecibido,
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
          orderConfig,
        });
      }
      toast.success('Pedido registrado');
      setCart([]);
      setOrderConfig(DEFAULT_ORDER_CONFIG);
      setConfigConfirmed(false);
      setShowPayment(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al registrar pedido');
    }
  };

  const subtotal = cart.reduce((s, i) => s + i.subtotal, 0);

  // Show full-page "Abrir Caja" when cash register is closed
  if (!shiftStatus.loading && !shiftStatus.hasCashOpen) {
    return (
      <div className="flex flex-col h-[calc(100vh-6rem)]">
        <PageHeader title="Punto de Venta" subtitle="Tomar pedidos y cobrar" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-sm">
            <InlineCashOpen branchId={branchId!} onOpened={() => shiftStatus.refetch()} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] pb-16 lg:pb-0">
      <PageHeader title="Punto de Venta" subtitle="Tomar pedidos y cobrar" />

      {/* Modal obligatorio de configuración - scoped to main content area */}
      {!configConfirmed && (
        <div className="fixed inset-0 lg:left-72 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative z-50 w-full max-w-md mx-4 bg-background border rounded-lg shadow-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold">Nueva venta</h2>
            <ConfigForm
              config={orderConfig}
              onChange={setOrderConfig}
              onConfirm={() => setConfigConfirmed(true)}
            />
          </div>
        </div>
      )}

      {/* Main grid: menu + cart */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_minmax(380px,1.1fr)] gap-4 flex-1 min-h-0">
        {/* Menu column */}
        <div className="min-h-[200px] lg:min-h-0 flex flex-col flex-1 overflow-hidden">
          <ProductGrid onAddItem={addItem} onSelectItem={handleSelectItem} cart={cart} branchId={branchId} disabled={!configConfirmed} />
        </div>

        {/* Cart column */}
        <div className="min-h-[200px] lg:min-h-0 flex flex-col gap-3">
          <div ref={configRef}>
            <OrderConfigPanel
              config={orderConfig}
              onChange={setOrderConfig}
              compact
            />
          </div>
          <OrderPanel
            items={cart}
            onUpdateQty={updateQty}
            onRemove={removeItem}
            onUpdateNotes={updateNotes}
            onCancelOrder={cancelOrder}
            onCobrar={handleCobrar}
            disabled={createPedido.isPending}
          />
        </div>
      </div>

      {/* Mobile sticky footer */}
      {configConfirmed && cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t bg-background px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
          <div className="text-sm">
            <span className="text-muted-foreground">{cart.reduce((s, i) => s + i.cantidad, 0)} items</span>
            <span className="ml-2 font-semibold text-foreground">$ {subtotal.toLocaleString('es-AR')}</span>
          </div>
          <Button
            size="lg"
            onClick={handleCobrar}
            disabled={createPedido.isPending}
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
        cartItems={cart}
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
