/**
 * PaymentModal - Modal de cobro con propina y pago dividido (Fase 4)
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Split } from 'lucide-react';
import type { MetodoPago } from '@/types/pos';
import { TipInput } from '@/components/pos/TipInput';
import { SplitPayment, type PaymentLine } from '@/components/pos/SplitPayment';

const METODOS: { value: MetodoPago; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta_debito', label: 'Tarjeta Débito' },
  { value: 'tarjeta_credito', label: 'Tarjeta Crédito' },
  { value: 'mercadopago_qr', label: 'Mercado Pago QR' },
  { value: 'transferencia', label: 'Transferencia' },
];

export type PaymentPayload =
  | { type: 'single'; metodo: MetodoPago; montoRecibido?: number; tip?: number }
  | { type: 'split'; payments: PaymentLine[]; tip?: number };

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Total del pedido (subtotal - descuento) */
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

            <div>
              <Label>Método de pago</Label>
              <Select value={metodo} onValueChange={(v) => setMetodo(v as MetodoPago)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METODOS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
