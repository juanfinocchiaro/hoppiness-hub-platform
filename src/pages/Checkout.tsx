import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  ArrowLeft, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  CreditCard, 
  Banknote,
  FileText,
  ChevronDown,
  Loader2,
  Clock,
  Store,
  Truck,
  ShoppingBag,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useCart } from '@/contexts/CartContext';
import { CartSummary } from '@/components/store/Cart';
import { traceLog } from '@/lib/trace';
import logoOriginal from '@/assets/logo-hoppiness-original.jpg';
import type { Enums } from '@/integrations/supabase/types';

type PaymentMethod = Enums<'payment_method'>;
type OrderType = Enums<'order_type'>;

// Cash amount presets
const CASH_PRESETS = [5000, 10000, 20000, 50000];

export default function Checkout() {
  const navigate = useNavigate();
  const {
    branch,
    orderMode,
    deliveryAddress,
    setDeliveryAddress,
    items,
    itemCount,
    subtotal,
    deliveryFee,
    total,
    formatPrice,
    clearCart,
  } = useCart();
  
  // Customer data
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [notes, setNotes] = useState('');
  
  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'mercadopago_link'>('efectivo');
  const [cashAmount, setCashAmount] = useState('');
  
  // Invoice
  const [wantsInvoice, setWantsInvoice] = useState(false);
  const [invoiceType, setInvoiceType] = useState<'B' | 'A'>('B');
  const [customerCuit, setCustomerCuit] = useState('');
  const [customerBusinessName, setCustomerBusinessName] = useState('');
  
  // State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Redirect if no items
  useEffect(() => {
    if (items.length === 0) {
      navigate('/pedir');
    }
  }, [items.length, navigate]);
  
  // Calculate change
  const cashAmountNum = parseFloat(cashAmount) || 0;
  const change = cashAmountNum > total ? cashAmountNum - total : 0;
  
  // Validation
  const isDelivery = orderMode === 'delivery';
  const isFormValid = customerName.trim() && 
                      customerPhone.trim() && 
                      (!isDelivery || deliveryAddress.trim()) &&
                      (!wantsInvoice || invoiceType === 'B' || (customerCuit.trim() && customerBusinessName.trim()));
  
  const handleSubmit = async () => {
    traceLog('checkout', 'submit_clicked', {
      branchId: branch?.id,
      itemsCount: items.length,
      paymentMethod,
      hasCashAmount: !!cashAmount.trim(),
      wantsInvoice,
      invoiceType,
    });

    if (!branch || items.length === 0) {
      traceLog('checkout', 'blocked_no_branch_or_items');
      return;
    }

    if (!isFormValid) {
      traceLog('checkout', 'validation_failed', {
        customerName: !!customerName.trim(),
        customerPhone: !!customerPhone.trim(),
        deliveryAddress: isDelivery ? !!deliveryAddress.trim() : 'n/a',
        invoiceOk: !wantsInvoice || invoiceType === 'B' || (!!customerCuit.trim() && !!customerBusinessName.trim()),
      });
      toast.error('Completá los campos requeridos');
      return;
    }

    // Validate cash amount if paying with cash
    if (paymentMethod === 'efectivo' && cashAmountNum > 0 && cashAmountNum < total) {
      traceLog('checkout', 'validation_failed_cash_amount', { cashAmountNum, total });
      toast.error('El monto en efectivo debe ser mayor o igual al total');
      return;
    }

    setIsProcessing(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      traceLog('checkout', 'session_loaded', {
        role: sessionData?.session ? 'authenticated' : 'anon',
      });

      // Build notes with cash info if applicable
      let orderNotes = notes;
      if (paymentMethod === 'efectivo' && cashAmountNum > 0) {
        orderNotes = `${notes ? notes + ' | ' : ''}Paga con: ${formatPrice(cashAmountNum)}`;
      }
      traceLog('checkout', 'notes_built', { hasNotes: !!orderNotes });

      // Find or create customer by phone
      traceLog('checkout', 'customer_rpc_start');
      const { data: customerId, error: customerError } = await supabase.rpc('find_or_create_customer', {
        p_phone: customerPhone.trim(),
        p_name: customerName.trim(),
        p_email: customerEmail.trim() || null,
      });

      if (customerError) {
        traceLog('checkout', 'customer_rpc_error', {
          message: customerError.message,
          code: (customerError as any)?.code,
          details: (customerError as any)?.details,
        });
        // Continue without customer_id - not a blocking error
      } else {
        traceLog('checkout', 'customer_rpc_ok', { hasCustomerId: !!customerId });
      }

      const orderPayload: any = {
        branch_id: branch.id,
        customer_id: customerId || null,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim() || null,
        order_type: orderMode as OrderType,
        delivery_address: isDelivery ? deliveryAddress.trim() : null,
        notes: orderNotes || null,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        status: 'pending',
        sales_channel: 'web_app',
        order_area: isDelivery ? 'delivery' : 'mostrador',
        payment_method: paymentMethod as PaymentMethod,
        invoice_type: wantsInvoice ? (invoiceType === 'A' ? 'factura_a' : 'factura_b') : 'consumidor_final',
        customer_cuit: invoiceType === 'A' ? customerCuit.trim() : null,
        customer_business_name: invoiceType === 'A' ? customerBusinessName.trim() : null,
      };

      traceLog('checkout', 'order_insert_payload', orderPayload);

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderPayload as any)
        .select()
        .single();

      if (orderError) {
        traceLog('checkout', 'order_insert_error', {
          message: orderError.message,
          code: (orderError as any)?.code,
          details: (orderError as any)?.details,
          hint: (orderError as any)?.hint,
        });
        throw orderError;
      }

      traceLog('checkout', 'order_insert_ok', {
        orderId: order.id,
        trackingToken: order.tracking_token,
      });

      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.finalPrice + (item.modifiersTotal || 0),
        product_name_snapshot: item.product.name,
        notes: [
          ...(item.modifierNames || []),
          item.notes ? `"${item.notes}"` : null,
        ]
          .filter(Boolean)
          .join(', ') || null,
      }));

      traceLog('checkout', 'order_items_insert_payload', { count: orderItems.length });

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);

      if (itemsError) {
        traceLog('checkout', 'order_items_insert_error', {
          message: itemsError.message,
          code: (itemsError as any)?.code,
          details: (itemsError as any)?.details,
          hint: (itemsError as any)?.hint,
        });
        throw itemsError;
      }

      traceLog('checkout', 'order_items_insert_ok');

      if (paymentMethod === 'mercadopago_link') {
        traceLog('checkout', 'mp_flow_start');
        toast.info('Redirigiendo a MercadoPago...');
      }

      clearCart();
      traceLog('checkout', 'cart_cleared');
      toast.success('¡Pedido realizado con éxito!');

      const trackingPath = `/pedido/${order.tracking_token || order.id}`;
      traceLog('checkout', 'navigate_tracking', { trackingPath });
      navigate(trackingPath);
    } catch (error: any) {
      traceLog('checkout', 'fatal_error', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
      });
      console.error('Checkout error:', error);
      const msg = error?.message || 'Error desconocido';
      const details = error?.details || error?.hint || error?.code;
      toast.error(`Error al procesar el pedido: ${msg}${details ? ` (${details})` : ''}`);
    } finally {
      setIsProcessing(false);
      traceLog('checkout', 'processing_end');
    }
  };
  
  if (!branch || items.length === 0) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="container mx-auto px-4 h-14 flex items-center gap-4">
          <Link to={`/pedir/${branch.slug || branch.id}`}>
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <img src={logoOriginal} alt="Hoppiness" className="h-8 w-8 rounded-full" />
            <span className="font-bold">Checkout</span>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="space-y-6">
          
          {/* Order Summary Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  Tu Pedido
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {isDelivery ? (
                    <><Truck className="w-3 h-3 mr-1" /> Delivery</>
                  ) : (
                    <><ShoppingBag className="w-3 h-3 mr-1" /> Retiro</>
                  )}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Hoppiness {branch.name} • ~{branch.estimated_prep_time_min || 25} min
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Items list */}
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {item.quantity}x {item.product.name}
                      {item.modifierNames && item.modifierNames.length > 0 && (
                        <span className="text-xs block text-muted-foreground/70">
                          {item.modifierNames.join(', ')}
                        </span>
                      )}
                    </span>
                    <span className="font-medium">
                      {formatPrice((item.product.finalPrice + (item.modifiersTotal || 0)) * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              
              <Separator />
              
              <CartSummary
                subtotal={subtotal}
                deliveryFee={deliveryFee}
                total={total}
                itemCount={itemCount}
                formatPrice={formatPrice}
                showDelivery={isDelivery}
              />
            </CardContent>
          </Card>
          
          {/* Delivery/Pickup Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {isDelivery ? <MapPin className="w-4 h-4" /> : <Store className="w-4 h-4" />}
                {isDelivery ? 'Datos de Entrega' : 'Datos para Retiro'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Delivery Address */}
              {isDelivery && (
                <div className="space-y-2">
                  <Label htmlFor="address">Dirección de entrega *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="address"
                      placeholder="Ej: Av. Colón 1234, Nueva Córdoba"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}
              
              {/* Customer Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Tu nombre"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="351 123 4567"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {/* Email (optional) */}
              <div className="space-y-2">
                <Label htmlFor="email">Email (opcional)</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notas adicionales</Label>
                <Textarea
                  id="notes"
                  placeholder="Instrucciones especiales, referencias, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Payment Method */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Método de Pago
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup 
                value={paymentMethod} 
                onValueChange={(v) => setPaymentMethod(v as 'efectivo' | 'mercadopago_link')}
                className="space-y-3"
              >
                {/* Cash */}
                <div 
                  className={`flex items-center space-x-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === 'efectivo' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setPaymentMethod('efectivo')}
                >
                  <RadioGroupItem value="efectivo" id="efectivo" />
                  <Banknote className="w-5 h-5 text-success" />
                  <Label htmlFor="efectivo" className="flex-1 cursor-pointer">
                    <span className="font-medium">Efectivo</span>
                    <span className="text-sm text-muted-foreground block">Pagás al recibir</span>
                  </Label>
                </div>
                
                {/* MercadoPago */}
                <div 
                  className={`flex items-center space-x-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === 'mercadopago_link' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setPaymentMethod('mercadopago_link')}
                >
                  <RadioGroupItem value="mercadopago_link" id="mercadopago_link" />
                  <CreditCard className="w-5 h-5 text-primary" />
                  <Label htmlFor="mercadopago_link" className="flex-1 cursor-pointer">
                    <span className="font-medium">MercadoPago</span>
                    <span className="text-sm text-muted-foreground block">Tarjeta, débito o cuenta MP</span>
                  </Label>
                </div>
              </RadioGroup>
              
              {/* Cash amount calculator */}
              {paymentMethod === 'efectivo' && (
                <div className="space-y-3 pt-2">
                  <Label>¿Con cuánto abonás? (opcional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Si no lo completás, igual podés confirmar el pedido.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {CASH_PRESETS.map(amount => (
                      <Button
                        key={amount}
                        variant={cashAmount === String(amount) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCashAmount(String(amount))}
                        className="flex-1 min-w-[80px]"
                      >
                        {formatPrice(amount)}
                      </Button>
                    ))}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      placeholder="Otro monto"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  {change > 0 && (
                    <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <span className="text-sm text-emerald-700 dark:text-emerald-300">Tu vuelto:</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-300">
                        {formatPrice(change)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Invoice Section */}
          <Card>
            <Collapsible open={isInvoiceOpen} onOpenChange={setIsInvoiceOpen}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 rounded-t-lg transition-colors pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Facturación
                    </CardTitle>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isInvoiceOpen ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4 pt-0">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="wantsInvoice"
                      checked={wantsInvoice}
                      onCheckedChange={(checked) => setWantsInvoice(!!checked)}
                    />
                    <Label htmlFor="wantsInvoice" className="cursor-pointer">
                      Necesito que me envíen factura por mail
                    </Label>
                  </div>
                  
                  {wantsInvoice && (
                    <div className="space-y-4 pt-2">
                      <RadioGroup 
                        value={invoiceType} 
                        onValueChange={(v) => setInvoiceType(v as 'B' | 'A')}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="B" id="facturaB" />
                          <Label htmlFor="facturaB">Factura B</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="A" id="facturaA" />
                          <Label htmlFor="facturaA">Factura A</Label>
                        </div>
                      </RadioGroup>
                      
                      {invoiceType === 'A' && (
                        <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>Para Factura A necesitamos tus datos fiscales</span>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cuit">CUIT *</Label>
                            <Input
                              id="cuit"
                              placeholder="XX-XXXXXXXX-X"
                              value={customerCuit}
                              onChange={(e) => setCustomerCuit(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="businessName">Razón Social *</Label>
                            <Input
                              id="businessName"
                              placeholder="Nombre de la empresa"
                              value={customerBusinessName}
                              onChange={(e) => setCustomerBusinessName(e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
          
        </div>
      </div>
      
      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 z-40">
        <div className="container mx-auto max-w-2xl">
          <Button
            size="lg"
            className="w-full h-14 text-lg"
            onClick={handleSubmit}
            disabled={isProcessing || !isFormValid}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                {paymentMethod === 'mercadopago_link' ? 'Pagar con MercadoPago' : 'Confirmar Pedido'}
                {' • '}
                {formatPrice(total)}
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Bottom padding for fixed footer */}
      <div className="h-24" />
    </div>
  );
}
