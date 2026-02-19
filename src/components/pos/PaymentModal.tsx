/**
 * PaymentModal - Modal de cobro con métodos de pago visuales
 */
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Split, Banknote, CreditCard, QrCode, ArrowRightLeft, Smartphone } from 'lucide-react';
import type { MetodoPago } from '@/types/pos';
import { TipInput } from '@/components/pos/TipInput';
import { SplitPayment, type PaymentLine } from '@/components/pos/SplitPayment';
import { cn } from '@/lib/utils';

/** Calculate quick cash amounts based on common Argentine bills */
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

const METODOS: { value: MetodoPago; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'efectivo', label: 'Efectivo', icon: Banknote },
  { value: 'tarjeta_debito', label: 'Débito', icon: CreditCard },
  { value: 'tarjeta_credito', label: 'Crédito', icon: CreditCard },
  { value: 'mercadopago_qr', label: 'QR MP', icon: QrCode },
  { value: 'transferencia', label: 'Transferencia', icon: ArrowRightLeft },
];

export type PaymentPayload =
  | { type: 'single'; metodo: MetodoPago; montoRecibido?: number; tip?: number }
  | { type: 'split'; payments: PaymentLine[]; tip?: number };

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  onConfirm: (payload: PaymentPayload) => void;
  loading?: boolean;
}

export function PaymentModal({
  open,
  onOpenChange,
  total,
  onConfirm,
  loading = false,
}: PaymentModalProps) {
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [tip, setTip] = useState(0);
  const [showSplit, setShowSplit] = useState(false);

  const totalToPay = total + tip;
  const esEfectivo = metodo === 'efectivo';
  const montoNum = parseFloat(montoRecibido) || 0;
  const vuelto = esEfectivo ? Math.max(0, montoNum - totalToPay) : 0;

  const handleConfirmSingle = () => {
    onConfirm({
      type: 'single',
      metodo,
      montoRecibido: esEfectivo ? montoNum : undefined,
      tip: tip > 0 ? tip : undefined,
    });
  };

  const handleConfirmSplit = (payments: PaymentLine[]) => {
    onConfirm({
      type: 'split',
      payments,
      tip: tip > 0 ? tip : undefined,
    });
  };

  const canConfirmSingle = !esEfectivo || montoNum >= totalToPay;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cobrar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-2xl font-bold text-primary">
              Total: $ {totalToPay.toLocaleString('es-AR')}
              {tip > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  (pedido $ {total.toLocaleString('es-AR')} + propina $ {tip.toLocaleString('es-AR')})
                </span>
              )}
            </div>

            <TipInput value={tip} onChange={setTip} orderTotal={total} disabled={loading} />

            {/* Payment method buttons */}
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
                      onClick={() => setMetodo(m.value)}
                      className={cn(
                        'flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border text-sm font-medium transition-colors min-h-[72px]',
                        isSelected
                          ? 'border-primary bg-primary/5 text-primary'
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

            {esEfectivo && (
              <>
                <div>
                  <Label>Monto recibido</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={montoRecibido}
                    onChange={(e) => setMontoRecibido(e.target.value)}
                  />
                </div>
                {/* Quick amount buttons */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Exacto', value: totalToPay },
                    ...getQuickAmounts(totalToPay).map((v) => ({ label: `$ ${v.toLocaleString('es-AR')}`, value: v })),
                  ].map((btn) => (
                    <Button
                      key={btn.label}
                      type="button"
                      variant={montoNum === btn.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMontoRecibido(String(btn.value))}
                    >
                      {btn.label}
                    </Button>
                  ))}
                </div>
                {montoNum > 0 && (
                  <div className="text-lg font-semibold">
                    Vuelto: $ {vuelto.toLocaleString('es-AR')}
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSplit(true)} disabled={loading}>
              <Split className="w-4 h-4 mr-2" />
              Dividir pago
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmSingle} disabled={!canConfirmSingle || loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmar cobro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SplitPayment
        total={totalToPay}
        open={showSplit}
        onOpenChange={setShowSplit}
        onConfirm={(payments) => {
          setShowSplit(false);
          handleConfirmSplit(payments);
        }}
      />
    </>
  );
}
