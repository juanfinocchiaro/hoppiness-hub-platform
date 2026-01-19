import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  AlertTriangle,
  Banknote,
  CreditCard,
  QrCode,
  Wallet,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface PaymentRecord {
  id: string;
  payment_method: string;
  amount: number;
  created_at: string;
}

interface CancelOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftOrderId: string | null;
  draftPayments: PaymentRecord[];
  branchId: string;
  activeShiftId: string | null;
  onCancelComplete: () => void;
  total: number;
}

const PAYMENT_METHOD_ICONS: Record<string, React.ReactNode> = {
  efectivo: <Banknote className="w-4 h-4" />,
  tarjeta_debito: <CreditCard className="w-4 h-4" />,
  tarjeta_credito: <CreditCard className="w-4 h-4" />,
  mercadopago: <QrCode className="w-4 h-4" />,
  qr: <QrCode className="w-4 h-4" />,
  cuenta_corriente: <Wallet className="w-4 h-4" />,
};

const REFUND_METHODS = [
  { value: 'efectivo', label: 'Efectivo', icon: <Banknote className="w-4 h-4" /> },
  { value: 'tarjeta', label: 'Devolución a tarjeta', icon: <CreditCard className="w-4 h-4" /> },
  { value: 'mercadopago', label: 'MercadoPago', icon: <QrCode className="w-4 h-4" /> },
  { value: 'cuenta_corriente', label: 'A cuenta corriente', icon: <Wallet className="w-4 h-4" /> },
];

const CANCEL_REASONS = [
  'Cliente cambió de opinión',
  'Error en el pedido',
  'Producto no disponible',
  'Tiempo de espera excesivo',
  'Duplicado',
  'Otro',
];

export default function CancelOrderDialog({
  open,
  onOpenChange,
  draftOrderId,
  draftPayments,
  branchId,
  activeShiftId,
  onCancelComplete,
  total,
}: CancelOrderDialogProps) {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelNotes, setCancelNotes] = useState('');
  const [selectedPaymentsToRefund, setSelectedPaymentsToRefund] = useState<Set<string>>(new Set());
  const [refundMethods, setRefundMethods] = useState<Record<string, string>>({});

  // Initialize all payments as selected for refund
  useEffect(() => {
    if (open && draftPayments.length > 0) {
      const allPaymentIds = new Set(draftPayments.map(p => p.id));
      setSelectedPaymentsToRefund(allPaymentIds);
      
      // Set default refund method based on original payment method
      const defaultMethods: Record<string, string> = {};
      draftPayments.forEach(p => {
        if (p.payment_method === 'efectivo') {
          defaultMethods[p.id] = 'efectivo';
        } else if (p.payment_method.includes('tarjeta')) {
          defaultMethods[p.id] = 'tarjeta';
        } else if (p.payment_method === 'mercadopago' || p.payment_method === 'qr') {
          defaultMethods[p.id] = 'mercadopago';
        } else {
          defaultMethods[p.id] = 'efectivo';
        }
      });
      setRefundMethods(defaultMethods);
    }
  }, [open, draftPayments]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const totalPaid = draftPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalToRefund = draftPayments
    .filter(p => selectedPaymentsToRefund.has(p.id))
    .reduce((sum, p) => sum + p.amount, 0);

  const togglePaymentRefund = (paymentId: string) => {
    setSelectedPaymentsToRefund(prev => {
      const next = new Set(prev);
      if (next.has(paymentId)) {
        next.delete(paymentId);
      } else {
        next.add(paymentId);
      }
      return next;
    });
  };

  const handleCancel = async () => {
    if (!cancelReason) {
      toast.error('Seleccioná un motivo de cancelación');
      return;
    }

    setIsProcessing(true);

    try {
      // If there's a draft order, update its status and create cancellation record
      if (draftOrderId) {
        // Update order status to 'cancelled'
        const { error: orderError } = await supabase
          .from('orders')
          .update({ status: 'cancelled' })
          .eq('id', draftOrderId);

        if (orderError) throw orderError;

        // Create cancellation record
        const { error: cancelError } = await supabase
          .from('order_cancellations')
          .insert({
            order_id: draftOrderId,
            cancelled_by: user?.id,
            cancelled_at: new Date().toISOString(),
            cancel_reason: cancelReason,
            cancel_notes: cancelNotes || null,
            refund_amount: totalToRefund > 0 ? totalToRefund : null,
            refund_method: totalToRefund > 0 
              ? Object.values(refundMethods).join(', ') 
              : null,
          });

        if (cancelError) throw cancelError;

        // Create refund movements in cash register for each payment to refund
        if (activeShiftId && totalToRefund > 0) {
          const refundMovements = draftPayments
            .filter(p => selectedPaymentsToRefund.has(p.id))
            .map(p => ({
              shift_id: activeShiftId,
              branch_id: branchId,
              type: 'expense' as const,
              payment_method: refundMethods[p.id] || 'efectivo',
              amount: p.amount,
              concept: `Devolución - Pedido #${draftOrderId.slice(0, 8)} - ${cancelReason}`,
              order_id: draftOrderId,
              recorded_by: user?.id || null,
            }));

          if (refundMovements.length > 0) {
            const { error: movementError } = await supabase
              .from('cash_register_movements')
              .insert(refundMovements);

            if (movementError) throw movementError;
          }
        }
      }

      toast.success('Pedido cancelado correctamente');
      onCancelComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Error canceling order:', error);
      toast.error('Error al cancelar el pedido');
    } finally {
      setIsProcessing(false);
    }
  };

  const hasPayments = draftPayments.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Cancelar Pedido
          </DialogTitle>
          <DialogDescription>
            {hasPayments 
              ? 'Este pedido tiene pagos registrados. Configurá las devoluciones antes de cancelar.'
              : 'El pedido será marcado como incompleto en los registros.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Cancel reason */}
          <div className="space-y-2">
            <Label>Motivo de cancelación *</Label>
            <Select value={cancelReason} onValueChange={setCancelReason}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar motivo" />
              </SelectTrigger>
              <SelectContent>
                {CANCEL_REASONS.map(reason => (
                  <SelectItem key={reason} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional notes */}
          <div className="space-y-2">
            <Label>Notas adicionales</Label>
            <Textarea
              value={cancelNotes}
              onChange={(e) => setCancelNotes(e.target.value)}
              placeholder="Detalles sobre la cancelación..."
              rows={2}
            />
          </div>

          {/* Payments to refund */}
          {hasPayments && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Banknote className="w-4 h-4" />
                  Gestión de devoluciones
                </Label>
                <p className="text-xs text-muted-foreground">
                  Seleccioná los pagos a devolver y el método de devolución para cada uno.
                </p>

                <div className="space-y-2">
                  {draftPayments.map(payment => (
                    <div 
                      key={payment.id} 
                      className={`border rounded-lg p-3 space-y-2 transition-colors ${
                        selectedPaymentsToRefund.has(payment.id) 
                          ? 'border-destructive/50 bg-destructive/5' 
                          : 'border-muted bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedPaymentsToRefund.has(payment.id)}
                            onCheckedChange={() => togglePaymentRefund(payment.id)}
                          />
                          <span className="flex items-center gap-1 text-sm capitalize">
                            {PAYMENT_METHOD_ICONS[payment.payment_method] || <Banknote className="w-4 h-4" />}
                            {payment.payment_method.replace('_', ' ')}
                          </span>
                        </div>
                        <Badge variant={selectedPaymentsToRefund.has(payment.id) ? 'destructive' : 'secondary'}>
                          {formatPrice(payment.amount)}
                        </Badge>
                      </div>

                      {selectedPaymentsToRefund.has(payment.id) && (
                        <div className="pl-6">
                          <Label className="text-xs text-muted-foreground">Devolver vía:</Label>
                          <Select 
                            value={refundMethods[payment.id] || 'efectivo'} 
                            onValueChange={(value) => setRefundMethods(prev => ({
                              ...prev,
                              [payment.id]: value
                            }))}
                          >
                            <SelectTrigger className="h-8 mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {REFUND_METHODS.map(method => (
                                <SelectItem key={method.value} value={method.value}>
                                  <span className="flex items-center gap-2">
                                    {method.icon}
                                    {method.label}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Refund summary */}
                <div className="bg-muted rounded-lg p-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total pagado</span>
                    <span>{formatPrice(totalPaid)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-destructive">
                    <span>Total a devolver</span>
                    <span>{formatPrice(totalToRefund)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Volver
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={isProcessing || !cancelReason}
          >
            {isProcessing ? (
              'Procesando...'
            ) : (
              <>
                <X className="w-4 h-4 mr-2" />
                Confirmar Cancelación
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
