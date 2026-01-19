import { useState } from 'react';
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
  CheckCircle,
  User,
  Phone,
  MapPin,
  Hash,
  Receipt,
  ShoppingBag,
  CreditCard,
  Banknote,
  QrCode,
  Wallet,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';

interface CartItem {
  id: string;
  product: { name: string; price: number };
  quantity: number;
  notes?: string;
  modifiers: Array<{
    optionName: string;
    priceAdjustment: number;
    quantity: number;
  }>;
  modifiersTotal: number;
  customPrice?: number;
}

interface PaymentRecord {
  id: string;
  payment_method: string;
  amount: number;
  created_at: string;
}

interface OrderConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItem[];
  draftOrderId: string | null;
  draftPayments: PaymentRecord[];
  customerName: string;
  customerPhone: string;
  callerNumber: string;
  orderArea: string;
  deliveryAddress: string;
  total: number;
  subtotal: number;
  deliveryFee: number;
  onOrderConfirmed: () => void;
  branchId: string;
  activeShiftId: string | null;
}

const PAYMENT_METHOD_ICONS: Record<string, React.ReactNode> = {
  efectivo: <Banknote className="w-4 h-4" />,
  tarjeta_debito: <CreditCard className="w-4 h-4" />,
  tarjeta_credito: <CreditCard className="w-4 h-4" />,
  mercadopago: <QrCode className="w-4 h-4" />,
  qr: <QrCode className="w-4 h-4" />,
  cuenta_corriente: <Wallet className="w-4 h-4" />,
};

const ORDER_AREA_LABELS: Record<string, string> = {
  mostrador: 'Mostrador',
  delivery: 'Delivery',
  apps: 'Apps',
};

export default function OrderConfirmationDialog({
  open,
  onOpenChange,
  cart,
  draftOrderId,
  draftPayments,
  customerName,
  customerPhone,
  callerNumber,
  orderArea,
  deliveryAddress,
  total,
  subtotal,
  deliveryFee,
  onOrderConfirmed,
  branchId,
  activeShiftId,
}: OrderConfirmationDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getItemPrice = (item: CartItem) => {
    return (item.customPrice || item.product.price) + item.modifiersTotal;
  };

  const handleConfirmOrder = async () => {
    if (!draftOrderId) {
      toast.error('No hay pedido para confirmar');
      return;
    }

    setIsProcessing(true);

    try {
      // Update order status to pending (sent to kitchen)
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'pending',
          is_finalized: true,
        })
        .eq('id', draftOrderId);

      if (error) throw error;

      toast.success('¡Pedido enviado a cocina!', {
        description: `Pedido #${draftOrderId.slice(0, 8)} confirmado`,
        duration: 5000,
      });

      onOrderConfirmed();
      onOpenChange(false);
    } catch (error) {
      console.error('Error confirming order:', error);
      toast.error('Error al confirmar el pedido');
    } finally {
      setIsProcessing(false);
    }
  };

  const totalPaid = draftPayments.reduce((sum, p) => sum + p.amount, 0);
  const displayName = customerName || (callerNumber ? `Llamador #${callerNumber}` : 'Sin nombre');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-success">
            <CheckCircle className="w-5 h-5" />
            Confirmar Pedido
          </DialogTitle>
          <DialogDescription>
            Revisá el pedido antes de enviarlo a cocina
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 max-h-[60vh]">
          <div className="space-y-4 py-2">
            {/* Customer Info */}
            <div className="bg-muted rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <User className="w-4 h-4 text-primary" />
                <span>{displayName}</span>
              </div>
              {customerPhone && customerPhone !== '-' && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{customerPhone}</span>
                </div>
              )}
              {callerNumber && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Hash className="w-4 h-4" />
                  <span>Llamador #{callerNumber}</span>
                </div>
              )}
              {deliveryAddress && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{deliveryAddress}</span>
                </div>
              )}
              <Badge variant="outline" className="mt-1">
                {ORDER_AREA_LABELS[orderArea] || orderArea}
              </Badge>
            </div>

            {/* Order Items */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShoppingBag className="w-4 h-4 text-primary" />
                <span>Productos ({cart.length})</span>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div className="flex-1">
                      <span className="font-medium">{item.quantity}x</span>{' '}
                      <span>{item.product.name}</span>
                      {item.modifiers.length > 0 && (
                        <p className="text-xs text-muted-foreground ml-4">
                          {item.modifiers.map(m => 
                            m.quantity > 1 ? `${m.quantity}x ${m.optionName}` : m.optionName
                          ).join(', ')}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-xs text-primary ml-4">Nota: {item.notes}</p>
                      )}
                    </div>
                    <span className="font-medium">{formatPrice(getItemPrice(item) * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Payments */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Receipt className="w-4 h-4 text-primary" />
                <span>Pagos ({draftPayments.length})</span>
              </div>
              <div className="bg-success/10 rounded-lg p-3 space-y-2">
                {draftPayments.map(payment => (
                  <div key={payment.id} className="flex justify-between text-sm">
                    <span className="flex items-center gap-2 capitalize">
                      {PAYMENT_METHOD_ICONS[payment.payment_method] || <Banknote className="w-4 h-4" />}
                      {payment.payment_method.replace('_', ' ')}
                    </span>
                    <span className="font-medium text-success">{formatPrice(payment.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Envío</span>
                  <span>{formatPrice(deliveryFee)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between font-bold text-success">
                <span>Pagado</span>
                <span>{formatPrice(totalPaid)}</span>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
            className="w-full sm:w-auto"
          >
            Volver
          </Button>
          <Button
            onClick={handleConfirmOrder}
            disabled={isProcessing}
            className="w-full sm:w-auto bg-success hover:bg-success/90"
          >
            {isProcessing ? (
              'Enviando...'
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Enviar a cocina
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
