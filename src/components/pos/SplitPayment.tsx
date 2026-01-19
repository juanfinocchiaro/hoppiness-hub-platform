import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Banknote,
  CreditCard,
  QrCode,
  Plus,
  Trash2,
  Split,
  Check,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type PaymentMethod = 
  | 'efectivo' 
  | 'tarjeta_debito' 
  | 'tarjeta_credito' 
  | 'mercadopago_qr' 
  | 'mercadopago_link' 
  | 'transferencia' 
  | 'cuenta_corriente';

interface PaymentLine {
  id: string;
  method: PaymentMethod;
  amount: number;
  reference?: string;
}

interface SplitPaymentProps {
  total: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payments: PaymentLine[]) => void;
  customerHasAccount?: boolean;
  customerAccountBalance?: number;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { value: 'efectivo', label: 'Efectivo', icon: Banknote },
  { value: 'tarjeta_debito', label: 'Débito', icon: CreditCard },
  { value: 'tarjeta_credito', label: 'Crédito', icon: CreditCard },
  { value: 'mercadopago_qr', label: 'MP QR', icon: QrCode },
  { value: 'mercadopago_link', label: 'MP Link', icon: CreditCard },
  { value: 'transferencia', label: 'Transferencia', icon: CreditCard },
  { value: 'cuenta_corriente', label: 'Cuenta Corriente', icon: CreditCard },
];

export default function SplitPayment({
  total,
  open,
  onOpenChange,
  onConfirm,
  customerHasAccount = false,
  customerAccountBalance = 0,
}: SplitPaymentProps) {
  const [payments, setPayments] = useState<PaymentLine[]>([
    { id: crypto.randomUUID(), method: 'efectivo', amount: total },
  ]);

  // Reset when total changes or dialog opens
  useEffect(() => {
    if (open) {
      setPayments([{ id: crypto.randomUUID(), method: 'efectivo', amount: total }]);
    }
  }, [open, total]);

  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const remaining = total - totalPaid;
  const isValid = Math.abs(remaining) < 0.01; // Allow small rounding differences

  const addPayment = () => {
    setPayments([
      ...payments,
      { id: crypto.randomUUID(), method: 'efectivo', amount: remaining > 0 ? remaining : 0 },
    ]);
  };

  const removePayment = (id: string) => {
    if (payments.length > 1) {
      setPayments(payments.filter((p) => p.id !== id));
    }
  };

  const updatePayment = (id: string, updates: Partial<PaymentLine>) => {
    setPayments(
      payments.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const handleQuickSplit = (ways: number) => {
    const amountPerWay = Math.floor((total / ways) * 100) / 100;
    const lastAmount = total - amountPerWay * (ways - 1);
    
    const newPayments: PaymentLine[] = [];
    for (let i = 0; i < ways; i++) {
      newPayments.push({
        id: crypto.randomUUID(),
        method: 'efectivo',
        amount: i === ways - 1 ? lastAmount : amountPerWay,
      });
    }
    setPayments(newPayments);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleConfirm = () => {
    if (isValid) {
      onConfirm(payments);
      onOpenChange(false);
    }
  };

  const filteredMethods = PAYMENT_METHODS.filter(
    (m) => m.value !== 'cuenta_corriente' || customerHasAccount
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Split className="w-5 h-5" />
            Dividir Pago
          </DialogTitle>
          <DialogDescription>
            Total a cobrar: <strong>{formatPrice(total)}</strong>
          </DialogDescription>
        </DialogHeader>

        {/* Quick Split Buttons */}
        <div className="flex gap-2 pb-2">
          <span className="text-sm text-muted-foreground self-center">División rápida:</span>
          {[2, 3, 4].map((n) => (
            <Button
              key={n}
              variant="outline"
              size="sm"
              onClick={() => handleQuickSplit(n)}
            >
              {n} partes
            </Button>
          ))}
        </div>

        {/* Payment Lines */}
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {payments.map((payment, index) => {
            const MethodIcon = PAYMENT_METHODS.find((m) => m.value === payment.method)?.icon || Banknote;
            
            return (
              <Card key={payment.id} className="relative">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="w-6 h-6 rounded-full p-0 flex items-center justify-center">
                      {index + 1}
                    </Badge>
                    
                    <Select
                      value={payment.method}
                      onValueChange={(value) =>
                        updatePayment(payment.id, { method: value as PaymentMethod })
                      }
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredMethods.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            <div className="flex items-center gap-2">
                              <method.icon className="w-4 h-4" />
                              {method.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex-1">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={payment.amount || ''}
                        onChange={(e) =>
                          updatePayment(payment.id, {
                            amount: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="text-right font-mono"
                        placeholder="0"
                      />
                    </div>

                    {payments.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePayment(payment.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Account balance warning */}
                  {payment.method === 'cuenta_corriente' && 
                   payment.amount > customerAccountBalance && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-amber-600">
                      <AlertCircle className="w-3 h-3" />
                      Saldo disponible: {formatPrice(customerAccountBalance)}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Add Payment Button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={addPayment}
        >
          <Plus className="w-4 h-4 mr-2" />
          Agregar medio de pago
        </Button>

        {/* Summary */}
        <div className={cn(
          "rounded-lg p-4 space-y-2",
          isValid ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"
        )}>
          <div className="flex justify-between text-sm">
            <span>Total a cobrar:</span>
            <span className="font-medium">{formatPrice(total)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Total ingresado:</span>
            <span className="font-medium">{formatPrice(totalPaid)}</span>
          </div>
          <div className={cn(
            "flex justify-between font-bold pt-2 border-t",
            remaining > 0 ? "text-amber-700" : remaining < 0 ? "text-red-600" : "text-green-700"
          )}>
            <span>{remaining > 0 ? 'Falta:' : remaining < 0 ? 'Vuelto:' : 'Correcto:'}</span>
            <span className="flex items-center gap-1">
              {isValid && <Check className="w-4 h-4" />}
              {formatPrice(Math.abs(remaining))}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid}>
            Confirmar Pagos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
