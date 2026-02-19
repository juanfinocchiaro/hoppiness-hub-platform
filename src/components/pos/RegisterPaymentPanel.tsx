/**
 * RegisterPaymentPanel - Panel para registrar un pago individual
 * Reemplaza PaymentModal: permite pagos progresivos uno a uno.
 */
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { POSDialogContent } from './POSDialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Banknote, CreditCard, QrCode, ArrowRightLeft } from 'lucide-react';
import type { MetodoPago, LocalPayment } from '@/types/pos';
import { cn } from '@/lib/utils';

const METODOS: { value: MetodoPago; label: string; icon: React.ComponentType<{ className?: string }>; selectedStyle: string }[] = [
  { value: 'efectivo', label: 'Efectivo', icon: Banknote, selectedStyle: 'border-emerald-500 bg-emerald-500/10 text-emerald-700' },
  { value: 'tarjeta_debito', label: 'Débito', icon: CreditCard, selectedStyle: 'border-blue-500 bg-blue-500/10 text-blue-700' },
  { value: 'tarjeta_credito', label: 'Crédito', icon: CreditCard, selectedStyle: 'border-violet-500 bg-violet-500/10 text-violet-700' },
  { value: 'mercadopago_qr', label: 'QR MP', icon: QrCode, selectedStyle: 'border-sky-500 bg-sky-500/10 text-sky-700' },
  { value: 'transferencia', label: 'Transferencia', icon: ArrowRightLeft, selectedStyle: 'border-indigo-500 bg-indigo-500/10 text-indigo-700' },
];

function getQuickAmounts(total: number): number[] {
  const bills = [1000, 2000, 5000, 10000, 20000];
  const results: number[] = [];
  for (const bill of bills) {
    const rounded = Math.ceil(total / bill) * bill;
    if (rounded > total && !results.includes(rounded)) {
      results.push(rounded);
    }
  }
  return results.slice(0, 4);
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saldoPendiente: number;
  onRegister: (payment: LocalPayment) => void;
}

export function RegisterPaymentPanel({ open, onOpenChange, saldoPendiente, onRegister }: Props) {
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo');
  const [monto, setMonto] = useState('');
  const [montoRecibido, setMontoRecibido] = useState('');

  const esEfectivo = metodo === 'efectivo';
  const montoNum = parseFloat(monto) || 0;
  const recibidoNum = parseFloat(montoRecibido) || 0;
  const vuelto = esEfectivo ? Math.max(0, recibidoNum - montoNum) : 0;

  const canConfirm = montoNum > 0 && montoNum <= saldoPendiente && (!esEfectivo || recibidoNum >= montoNum);

  // Sync state when dialog opens or saldoPendiente changes
  useEffect(() => {
    if (open) {
      setMetodo('efectivo');
      setMonto(String(saldoPendiente));
      setMontoRecibido(String(saldoPendiente));
    }
  }, [open, saldoPendiente]);

  // When switching payment method, auto-fill or clear received amount
  const handleMetodoChange = (m: MetodoPago) => {
    setMetodo(m);
    if (m === 'efectivo') {
      setMontoRecibido(monto || String(saldoPendiente));
    } else {
      setMontoRecibido('');
    }
  };

  const handleConfirm = () => {
    if (!canConfirm) return;
    onRegister({
      id: crypto.randomUUID(),
      method: metodo,
      amount: montoNum,
      montoRecibido: esEfectivo ? recibidoNum : undefined,
      vuelto: esEfectivo ? vuelto : undefined,
      createdAt: Date.now(),
    });
    setMetodo('efectivo');
    setMonto('');
    setMontoRecibido('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <POSDialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Saldo pendiente */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Saldo pendiente</p>
            <p className="text-2xl font-bold text-primary">$ {saldoPendiente.toLocaleString('es-AR')}</p>
          </div>

          {/* Método */}
          <div>
            <Label className="mb-2 block">Método de pago</Label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {METODOS.map((m) => {
                const Icon = m.icon;
                const isSelected = metodo === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => handleMetodoChange(m.value)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border text-sm font-medium transition-colors min-h-[72px]',
                      isSelected
                        ? m.selectedStyle
                        : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs leading-tight text-center">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Monto */}
          <div>
            <Label>Monto a cobrar</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                placeholder="0"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="pl-7"
              />
            </div>
            {montoNum > saldoPendiente && (
              <p className="text-xs text-destructive mt-1">No puede superar el saldo pendiente</p>
            )}
          </div>

          {/* Efectivo: recibido + vuelto */}
          {esEfectivo && (
            <>
              <div>
                <Label>Monto recibido</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    placeholder="0"
                    value={montoRecibido}
                    onChange={(e) => setMontoRecibido(e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>
              {/* Quick amount buttons */}
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Exacto', value: montoNum },
                  ...getQuickAmounts(montoNum).map((v) => ({ label: `$ ${v.toLocaleString('es-AR')}`, value: v })),
                ].map((btn) => (
                  <Button
                    key={btn.label}
                    type="button"
                    variant={recibidoNum === btn.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMontoRecibido(String(btn.value))}
                  >
                    {btn.label}
                  </Button>
                ))}
              </div>
              {recibidoNum > 0 && recibidoNum >= montoNum && (
                <div className="text-lg font-semibold">
                  Vuelto: $ {vuelto.toLocaleString('es-AR')}
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            Registrar · $ {montoNum.toLocaleString('es-AR')}
          </Button>
        </DialogFooter>
      </POSDialogContent>
    </Dialog>
  );
}
