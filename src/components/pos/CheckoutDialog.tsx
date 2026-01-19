import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Store,
  Utensils,
  Bike,
  User,
  Phone,
  MapPin,
  Hash,
  CreditCard,
  Banknote,
  QrCode,
  ArrowLeft,
  Split,
  Check,
  Send,
  Plus,
  Receipt,
} from 'lucide-react';
import { toast } from 'sonner';
import SplitPayment, { PaymentMethod as SplitPaymentMethod } from './SplitPayment';
import TipInput from './TipInput';
import type { Tables, Enums } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface CartItem {
  id: string;
  product: Tables<'products'>;
  quantity: number;
  notes?: string;
  customPrice?: number;
  modifiers: Array<{
    optionId: string;
    optionName: string;
    groupName: string;
    priceAdjustment: number;
    quantity: number;
  }>;
  modifiersTotal: number;
}

interface PaymentRecord {
  id: string;
  payment_method: string;
  amount: number;
  created_at: string;
}

interface OrderConfig {
  orderArea: 'mostrador' | 'delivery' | 'apps';
  counterSubType: 'takeaway' | 'dine_here';
  appsChannel: 'rappi' | 'pedidos_ya' | 'mercadopago_delivery';
  callerNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryAddress: string;
  externalOrderId: string;
  customDeliveryFee: string;
  invoiceType: 'consumidor_final' | 'factura_a';
  customerCuit: string;
  customerBusinessName: string;
}

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItem[];
  branch: Branch;
  orderConfig: OrderConfig;
  activeShiftId: string | null;
  userId: string | null;
  onOrderComplete: () => void;
  onEditOrder: () => void;
  // For existing draft orders
  existingOrderId?: string | null;
  existingPayments?: PaymentRecord[];
  // Lift draft state to parent so closing/reopening doesn't forget payments
  onDraftUpdated?: (draft: { orderId: string; payments: PaymentRecord[] }) => void;
}

// Use the same type as SplitPayment
type PaymentMethod = SplitPaymentMethod;

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { value: 'efectivo', label: 'Efectivo', icon: Banknote },
  { value: 'tarjeta_debito', label: 'Débito', icon: CreditCard },
  { value: 'tarjeta_credito', label: 'Crédito', icon: CreditCard },
  { value: 'mercadopago_qr', label: 'MP QR', icon: QrCode },
  { value: 'mercadopago_link', label: 'MP Link', icon: CreditCard },
  { value: 'transferencia', label: 'Transferencia', icon: CreditCard },
];

const ORDER_AREA_LABELS = {
  mostrador: { label: 'Mostrador', icon: Store },
  delivery: { label: 'Delivery Propio', icon: Bike },
  apps: { label: 'Apps de Delivery', icon: Bike },
};

const APPS_LABELS = {
  rappi: 'Rappi',
  pedidos_ya: 'PedidosYa',
  mercadopago_delivery: 'MP Delivery',
};

export default function CheckoutDialog({
  open,
  onOpenChange,
  cart,
  branch,
  orderConfig,
  activeShiftId,
  userId,
  onOrderComplete,
  onEditOrder,
  existingOrderId,
  existingPayments = [],
  onDraftUpdated,
}: CheckoutDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSplitPayment, setShowSplitPayment] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [tipAmount, setTipAmount] = useState(0);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(existingOrderId || null);
  const [payments, setPayments] = useState<PaymentRecord[]>(existingPayments);
  
  // Ref to prevent double-click race conditions
  const processingRef = useRef(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentOrderId(existingOrderId || null);
      setPayments(existingPayments);
      setTipAmount(0);
    }
  }, [open, existingOrderId, existingPayments]);

  const getItemPrice = (item: CartItem) => {
    const basePrice = item.customPrice || item.product.price;
    return (basePrice + item.modifiersTotal) * item.quantity;
  };

  const subtotal = cart.reduce((sum, item) => sum + getItemPrice(item), 0);
  const deliveryFee = (orderConfig.orderArea === 'delivery' || orderConfig.orderArea === 'apps') && orderConfig.customDeliveryFee
    ? parseFloat(orderConfig.customDeliveryFee)
    : 0;
  const total = subtotal + deliveryFee + tipAmount;
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = total - totalPaid;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const mapOrderType = (): Enums<'order_type'> => {
    if (orderConfig.orderArea === 'delivery' || orderConfig.orderArea === 'apps') return 'delivery';
    if (orderConfig.orderArea === 'mostrador') {
      return orderConfig.counterSubType === 'dine_here' ? 'dine_in' : 'takeaway';
    }
    return 'takeaway';
  };

  const getSalesChannel = (): Enums<'sales_channel'> => {
    if (orderConfig.orderArea === 'apps') {
      if (orderConfig.appsChannel === 'rappi') return 'rappi';
      if (orderConfig.appsChannel === 'pedidos_ya') return 'pedidos_ya';
      if (orderConfig.appsChannel === 'mercadopago_delivery') return 'mercadopago_delivery';
    }
    return 'pos_local';
  };

  // Create or get the draft order
  const ensureOrderExists = async (): Promise<string> => {
    if (currentOrderId) return currentOrderId;

    // Create new draft order
    const orderNotes = cart.map(item => {
      if (item.modifiers.length === 0 && !item.notes) return null;
      let note = `${item.product.name}:`;
      if (item.modifiers.length > 0) {
        note += ` ${item.modifiers.map(m => m.optionName).join(', ')}`;
      }
      if (item.notes) {
        note += ` [${item.notes}]`;
      }
      return note;
    }).filter(Boolean).join(' | ');

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        branch_id: branch.id,
        customer_name: orderConfig.customerName || `Llamador #${orderConfig.callerNumber}`,
        customer_phone: orderConfig.customerPhone || '-', // Placeholder for counter orders without phone
        customer_email: orderConfig.customerEmail || null,
        delivery_address: (orderConfig.orderArea === 'delivery' || orderConfig.orderArea === 'apps') ? orderConfig.deliveryAddress : null,
        table_number: null,
        caller_number: orderConfig.callerNumber ? parseInt(orderConfig.callerNumber) : null,
        order_type: mapOrderType(),
        order_area: orderConfig.orderArea === 'apps' ? 'delivery' : orderConfig.orderArea,
        sales_channel: getSalesChannel(),
        external_order_id: orderConfig.orderArea === 'apps' ? orderConfig.externalOrderId : null,
        subtotal,
        delivery_fee: deliveryFee,
        tip_amount: tipAmount > 0 ? tipAmount : null,
        total,
        status: 'draft', // Key: draft status means not sent to kitchen
        notes: orderNotes || null,
        invoice_type: orderConfig.invoiceType,
        customer_cuit: orderConfig.invoiceType === 'factura_a' ? orderConfig.customerCuit : null,
        customer_business_name: orderConfig.invoiceType === 'factura_a' ? orderConfig.customerBusinessName : null,
        amount_paid: 0,
        is_finalized: false,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    const orderItems = cart.map(item => ({
      order_id: order.id,
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: (item.customPrice || item.product.price) + item.modifiersTotal,
      notes: item.modifiers.length > 0
        ? item.modifiers.map(m => m.optionName).join(', ') + (item.notes ? ` | ${item.notes}` : '')
        : item.notes || null,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    setCurrentOrderId(order.id);
    onDraftUpdated?.({ orderId: order.id, payments: [] });
    return order.id;
  };

  // Handle single payment (full amount)
  const handleSinglePayment = async () => {
    // Prevent double-click
    if (processingRef.current || isProcessing) return;
    processingRef.current = true;
    setIsProcessing(true);
    try {
      const orderId = await ensureOrderExists();

      // Insert payment
      const { error: paymentError } = await supabase
        .from('order_payments')
        .insert({
          order_id: orderId,
          payment_method: selectedPaymentMethod,
          amount: remaining,
          recorded_by: userId,
        });

      if (paymentError) throw paymentError;

      // Update order amount_paid
      await supabase
        .from('orders')
        .update({
          amount_paid: totalPaid + remaining,
        })
        .eq('id', orderId);

      // Register cash movement if applicable
      if (activeShiftId) {
        await supabase
          .from('cash_register_movements')
          .insert({
            shift_id: activeShiftId,
            branch_id: branch.id,
            type: 'income',
            payment_method: selectedPaymentMethod,
            amount: remaining,
            concept: `Pago Pedido #${orderId.slice(0, 8)}`,
            order_id: orderId,
            recorded_by: userId,
          });
      }

       // Refresh payments
       const { data: updatedPayments } = await supabase
         .from('order_payments')
         .select('*')
         .eq('order_id', orderId);
 
       const nextPayments = (updatedPayments || []) as PaymentRecord[];
       setPayments(nextPayments);
       onDraftUpdated?.({ orderId, payments: nextPayments });
       toast.success('Pago registrado');

    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Error al procesar el pago');
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  };

  // Handle split payment confirmation
  const handleSplitPaymentConfirm = async (splitPayments: Array<{ id: string; method: SplitPaymentMethod; amount: number }>) => {
    if (processingRef.current || isProcessing) return;
    processingRef.current = true;
    setIsProcessing(true);
    try {
      const orderId = await ensureOrderExists();

      // Insert all payments
      const paymentInserts = splitPayments.map(p => ({
        order_id: orderId,
        payment_method: p.method,
        amount: p.amount,
        recorded_by: userId,
      }));

      const { error: paymentError } = await supabase
        .from('order_payments')
        .insert(paymentInserts);

      if (paymentError) throw paymentError;

      // Register cash movements
      if (activeShiftId) {
        const movements = splitPayments.map(p => ({
          shift_id: activeShiftId,
          branch_id: branch.id,
          type: 'income' as const,
          payment_method: p.method,
          amount: p.amount,
          concept: `Pago Pedido #${orderId.slice(0, 8)}`,
          order_id: orderId,
          recorded_by: userId,
        }));

        await supabase
          .from('cash_register_movements')
          .insert(movements);
      }

      // Update order amount_paid
      const newTotalPaid = splitPayments.reduce((sum, p) => sum + p.amount, 0);
      await supabase
        .from('orders')
        .update({
          amount_paid: totalPaid + newTotalPaid,
        })
        .eq('id', orderId);

      // Refresh payments
      const { data: updatedPayments } = await supabase
        .from('order_payments')
        .select('*')
        .eq('order_id', orderId);

      const nextPayments = (updatedPayments || []) as PaymentRecord[];
      setPayments(nextPayments);
      onDraftUpdated?.({ orderId, payments: nextPayments });
      setShowSplitPayment(false);
      toast.success('Pagos registrados');

    } catch (error) {
      console.error('Error processing split payment:', error);
      toast.error('Error al procesar los pagos');
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  };

  // Finalize order - send to kitchen
  const handleFinalizeOrder = async () => {
    if (remaining > 0.01) {
      toast.error('Falta completar el pago');
      return;
    }

    if (processingRef.current || isProcessing) return;
    processingRef.current = true;
    setIsProcessing(true);
    try {
      const orderId = currentOrderId || await ensureOrderExists();

      // Update order to pending (sends to kitchen)
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'pending',
          is_finalized: true,
          tip_amount: tipAmount > 0 ? tipAmount : null,
          total,
        })
        .eq('id', orderId);

      if (error) throw error;

      toast.success('Pedido enviado a cocina');
      onOrderComplete();
      onOpenChange(false);

    } catch (error) {
      console.error('Error finalizing order:', error);
      toast.error('Error al finalizar el pedido');
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  };

  const isPaid = remaining <= 0.01;
  const OrderAreaIcon = ORDER_AREA_LABELS[orderConfig.orderArea]?.icon || Store;

  return (
    <>
      <Dialog open={open && !showSplitPayment} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              {isPaid ? 'Confirmar Pedido' : 'Cobrar Pedido'}
            </DialogTitle>
            <DialogDescription>
              {isPaid ? 'Revisá los datos y enviá a cocina' : 'Registrá el pago para continuar'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 py-4">
              {/* READ-ONLY ORDER INFO */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <OrderAreaIcon className="w-5 h-5 text-primary" />
                    <span className="font-medium">
                      {orderConfig.orderArea === 'apps' 
                        ? APPS_LABELS[orderConfig.appsChannel]
                        : ORDER_AREA_LABELS[orderConfig.orderArea]?.label}
                    </span>
                    {orderConfig.orderArea === 'mostrador' && (
                      <Badge variant="secondary">
                        {orderConfig.counterSubType === 'dine_here' ? 'Comer acá' : 'Para llevar'}
                      </Badge>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={onEditOrder}>
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                </div>

                {/* Caller Number - Big and visible */}
                {orderConfig.callerNumber && (
                  <div className="flex items-center justify-center py-2">
                    <div className="flex items-center gap-2 bg-primary/10 rounded-full px-6 py-2">
                      <Hash className="w-5 h-5 text-primary" />
                      <span className="text-2xl font-bold text-primary">
                        {orderConfig.callerNumber}
                      </span>
                    </div>
                  </div>
                )}

                {/* Customer Info */}
                <div className="grid gap-2 text-sm">
                  {orderConfig.customerName && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>{orderConfig.customerName}</span>
                    </div>
                  )}
                  {orderConfig.customerPhone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{orderConfig.customerPhone}</span>
                    </div>
                  )}
                  {orderConfig.deliveryAddress && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{orderConfig.deliveryAddress}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ITEMS SUMMARY */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {cart.length} {cart.length === 1 ? 'producto' : 'productos'}
                </p>
                <div className="space-y-1 text-sm">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between">
                      <span>
                        {item.quantity}x {item.product.name}
                        {item.modifiers.length > 0 && (
                          <span className="text-muted-foreground ml-1">
                            ({item.modifiers.map(m => m.optionName).join(', ')})
                          </span>
                        )}
                      </span>
                      <span className="font-medium">{formatPrice(getItemPrice(item))}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* TIP (only for dine_in) */}
              {orderConfig.orderArea === 'mostrador' && orderConfig.counterSubType === 'dine_here' && !isPaid && (
                <TipInput
                  subtotal={subtotal}
                  tipAmount={tipAmount}
                  onTipChange={setTipAmount}
                />
              )}

              {/* TOTALS */}
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Envío</span>
                    <span>{formatPrice(deliveryFee)}</span>
                  </div>
                )}
                {tipAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Propina</span>
                    <span>{formatPrice(tipAmount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(total)}</span>
                </div>
              </div>

              {/* PAYMENTS REGISTERED */}
              {payments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Pagos registrados</p>
                  <div className="space-y-1">
                    {payments.map(p => (
                      <div key={p.id} className="flex justify-between items-center text-sm bg-success/10 rounded px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-success" />
                          <span className="capitalize">{p.payment_method.replace('_', ' ')}</span>
                        </div>
                        <span className="font-medium text-success">{formatPrice(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-sm font-medium pt-2">
                    <span>Total pagado</span>
                    <span className="text-success">{formatPrice(totalPaid)}</span>
                  </div>
                  {remaining > 0.01 && (
                    <div className="flex justify-between text-sm font-bold text-warning">
                      <span>Falta cobrar</span>
                      <span>{formatPrice(remaining)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* PAYMENT SELECTION (if not fully paid) */}
              {!isPaid && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Método de pago</p>
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_METHODS.map(method => (
                      <Button
                        key={method.value}
                        variant={selectedPaymentMethod === method.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedPaymentMethod(method.value)}
                        className="flex-col h-auto py-2"
                      >
                        <method.icon className="w-4 h-4 mb-1" />
                        <span className="text-xs">{method.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {!isPaid ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowSplitPayment(true)}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  <Split className="w-4 h-4 mr-2" />
                  Dividir pago
                </Button>
                <Button
                  onClick={handleSinglePayment}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? 'Procesando...' : `Cobrar ${formatPrice(remaining)}`}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Allow adding more items - keep order in draft
                    onEditOrder();
                    onOpenChange(false);
                  }}
                  className="flex-1"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar más
                </Button>
                <Button
                  onClick={handleFinalizeOrder}
                  disabled={isProcessing}
                  className="flex-1 bg-success hover:bg-success/90"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isProcessing ? 'Enviando...' : 'Enviar a cocina'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Split Payment Dialog */}
      <SplitPayment
        open={showSplitPayment}
        onOpenChange={setShowSplitPayment}
        total={remaining}
        onConfirm={handleSplitPaymentConfirm}
      />
    </>
  );
}
