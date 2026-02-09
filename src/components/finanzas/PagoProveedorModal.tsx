import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { usePagoProveedorMutations } from '@/hooks/useCompras';
import { MEDIO_PAGO_OPTIONS } from '@/types/compra';
import type { FacturaProveedor } from '@/types/compra';
import { Banknote, ArrowRightLeft } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  factura: FacturaProveedor | null;
  proveedorNombre?: string;
}

function parseCanonObservaciones(obs: string | null) {
  if (!obs) return null;
  try {
    const vtMatch = obs.match(/VT:\s*\$?([\d.]+)/);
    const efMatch = obs.match(/Ef:\s*\$?([\d.]+)/);
    const canonMatch = obs.match(/Canon\s*4[.,]5%:\s*\$?([\d.]+)/);
    const mktMatch = obs.match(/M(?:ktg|arketing)\s*0[.,]5%:\s*\$?([\d.]+)/);
    if (!vtMatch || !efMatch) return null;
    const vt = parseFloat(vtMatch[1]);
    const ef = parseFloat(efMatch[1]);
    const online = vt - ef;
    return {
      ventaTotal: vt / 100,
      efectivo: ef / 100,
      online: online / 100,
      canonMarca: canonMatch ? parseFloat(canonMatch[1]) / 100 : vt * 0.045 / 100,
      canonMkt: mktMatch ? parseFloat(mktMatch[1]) / 100 : vt * 0.005 / 100,
      pagarEfectivo: ef * 0.05 / 100,
      pagarTransferencia: online * 0.05 / 100,
    };
  } catch {
    return null;
  }
}

export function PagoProveedorModal({ open, onOpenChange, factura, proveedorNombre }: Props) {
  const { create } = usePagoProveedorMutations();
  const [form, setForm] = useState({
    monto: '',
    fecha_pago: new Date().toISOString().slice(0, 10),
    medio_pago: 'transferencia',
    referencia: '',
    observaciones: '',
  });

  const saldoPendiente = factura?.saldo_pendiente ?? 0;
  const isHoppiness = proveedorNombre?.toLowerCase().includes('hoppiness');
  const canonInfo = useMemo(() => {
    if (!isHoppiness || !factura) return null;
    return parseCanonObservaciones(factura.observaciones as string);
  }, [isHoppiness, factura]);

  const handleSubmit = async () => {
    if (!factura || !form.monto) return;
    await create.mutateAsync({
      factura_id: factura.id,
      proveedor_id: factura.proveedor_id,
      branch_id: factura.branch_id,
      monto: parseFloat(form.monto),
      fecha_pago: form.fecha_pago,
      medio_pago: form.medio_pago,
      referencia: form.referencia || undefined,
      observaciones: form.observaciones || undefined,
    });
    onOpenChange(false);
  };

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const fmt = (n: number) => Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pago</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 rounded-md bg-muted text-sm">
            <p>Total factura: <strong>$ {fmt(Number(factura?.total ?? 0))}</strong></p>
            <p>Saldo pendiente: <strong className="text-destructive">$ {fmt(Number(saldoPendiente))}</strong></p>
          </div>

          {/* Canon breakdown for Hoppiness Club */}
          {canonInfo && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-2 text-sm">
              <p className="font-semibold text-primary">Desglose Canon</p>
              <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5">
                <span>Canon 4,5% Uso de Marca</span>
                <span className="font-mono text-right">$ {fmt(canonInfo.canonMarca)}</span>
                <span>Canon 0,5% Marketing y Publicidad</span>
                <span className="font-mono text-right">$ {fmt(canonInfo.canonMkt)}</span>
              </div>
              <hr className="border-primary/20" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Pagar en <strong>efectivo</strong> (5% de $ {fmt(canonInfo.efectivo)}):</span>
                  <span className="font-mono font-semibold ml-auto">$ {fmt(canonInfo.pagarEfectivo)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-primary shrink-0" />
                  <span>Pagar por <strong>transferencia</strong> (5% de $ {fmt(canonInfo.online)}):</span>
                  <span className="font-mono font-semibold ml-auto">$ {fmt(canonInfo.pagarTransferencia)}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Podés registrar pagos parciales (ej: primero el efectivo, luego la transferencia).</p>
            </div>
          )}

          <div>
            <Label>Monto a pagar *</Label>
            <Input type="number" step="0.01" max={Number(saldoPendiente)} value={form.monto} onChange={e => set('monto', e.target.value)} placeholder={`Máx $ ${fmt(Number(saldoPendiente))}`} />
            {canonInfo && (
              <div className="flex gap-2 mt-1.5">
                <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={() => set('monto', canonInfo.pagarEfectivo.toFixed(2))}>
                  <Banknote className="w-3 h-3 mr-1" /> Porción efectivo
                </Button>
                <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={() => set('monto', canonInfo.pagarTransferencia.toFixed(2))}>
                  <ArrowRightLeft className="w-3 h-3 mr-1" /> Porción transferencia
                </Button>
              </div>
            )}
          </div>
          <div>
            <Label>Fecha de pago</Label>
            <Input type="date" value={form.fecha_pago} onChange={e => set('fecha_pago', e.target.value)} />
          </div>
          <div>
            <Label>Medio de pago</Label>
            <Select value={form.medio_pago} onValueChange={v => set('medio_pago', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MEDIO_PAGO_OPTIONS.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Referencia</Label>
            <Input value={form.referencia} onChange={e => set('referencia', e.target.value)} />
          </div>
          <div>
            <Label>Observaciones</Label>
            <Textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)} rows={2} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={create.isPending || !form.monto}>
              {create.isPending ? 'Guardando...' : 'Registrar Pago'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
