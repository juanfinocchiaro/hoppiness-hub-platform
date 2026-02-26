import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { usePagoCanonMutations } from '@/hooks/useCanonLiquidaciones';
import { MEDIO_PAGO_OPTIONS } from '@/types/compra';
import type { CanonLiquidacion } from '@/types/ventas';

interface PagoCanonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canon: CanonLiquidacion | null;
}

export function PagoCanonModal({ open, onOpenChange, canon }: PagoCanonModalProps) {
  const { create } = usePagoCanonMutations();
  const [form, setForm] = useState({
    monto: '',
    fecha_pago: new Date().toISOString().slice(0, 10),
    medio_pago: 'transferencia',
    referencia: '',
    observaciones: '',
  });

  const saldo = canon?.saldo_pendiente ?? 0;

  const handleSubmit = async () => {
    if (!canon || !form.monto) return;
    await create.mutateAsync({
      canon_liquidacion_id: canon.id,
      branch_id: canon.branch_id,
      monto: parseFloat(form.monto),
      fecha_pago: form.fecha_pago,
      medio_pago: form.medio_pago,
      referencia: form.referencia || undefined,
      observaciones: form.observaciones || undefined,
    });
    onOpenChange(false);
  };

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar Pago de Canon</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 rounded-md bg-muted text-sm">
            <p>
              Total Canon: <strong>$ {Number(canon?.total_canon).toLocaleString('es-AR')}</strong>
            </p>
            <p>
              Saldo pendiente:{' '}
              <strong className="text-destructive">
                $ {Number(saldo).toLocaleString('es-AR')}
              </strong>
            </p>
          </div>

          <div>
            <Label>Monto a pagar *</Label>
            <Input
              type="number"
              step="0.01"
              value={form.monto}
              onChange={(e) => set('monto', e.target.value)}
              placeholder={`Máx $ ${Number(saldo).toLocaleString('es-AR')}`}
            />
          </div>

          <div>
            <Label>Fecha de pago</Label>
            <Input
              type="date"
              value={form.fecha_pago}
              onChange={(e) => set('fecha_pago', e.target.value)}
            />
          </div>

          <div>
            <Label>Medio de pago</Label>
            <Select value={form.medio_pago} onValueChange={(v) => set('medio_pago', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEDIO_PAGO_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Referencia</Label>
            <Input value={form.referencia} onChange={(e) => set('referencia', e.target.value)} />
          </div>

          <div>
            <Label>Observaciones</Label>
            <Textarea
              value={form.observaciones}
              onChange={(e) => set('observaciones', e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={create.isPending || !form.monto}>
              {create.isPending ? 'Guardando...' : 'Registrar Pago'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
