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
import { Banknote, ArrowRightLeft, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  factura: FacturaProveedor | null;
  proveedorNombre?: string;
}

interface PagoLine {
  monto: string;
  medio_pago: string;
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
      ventaTotal: vt,
      efectivo: ef,
      online,
      canonMarca: canonMatch ? parseFloat(canonMatch[1]) : vt * 0.045,
      canonMkt: mktMatch ? parseFloat(mktMatch[1]) : vt * 0.005,
      pagarEfectivo: ef * 0.05,
      pagarTransferencia: online * 0.05,
    };
  } catch {
    return null;
  }
}

const EMPTY_LINE: PagoLine = { monto: '', medio_pago: 'transferencia' };

export function PagoProveedorModal({ open, onOpenChange, factura, proveedorNombre }: Props) {
  const { create } = usePagoProveedorMutations();
  const [lines, setLines] = useState<PagoLine[]>([{ ...EMPTY_LINE }]);
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().slice(0, 10));
  const [referencia, setReferencia] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const saldoPendiente = Number(factura?.saldo_pendiente ?? 0);
  const isHoppiness = proveedorNombre?.toLowerCase().includes('hoppiness');
  const canonInfo = useMemo(() => {
    if (!isHoppiness || !factura) return null;
    return parseCanonObservaciones(factura.observaciones as string);
  }, [isHoppiness, factura]);

  const totalPagos = lines.reduce((s, l) => s + (parseFloat(l.monto) || 0), 0);
  const excede = totalPagos > saldoPendiente + 0.01;

  const updateLine = (idx: number, key: keyof PagoLine, value: string) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [key]: value } : l));
  };

  const addLine = () => {
    if (lines.length < 4) setLines(prev => [...prev, { ...EMPTY_LINE }]);
  };

  const removeLine = (idx: number) => {
    if (lines.length > 1) setLines(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!factura) return;
    const validLines = lines.filter(l => parseFloat(l.monto) > 0);
    if (validLines.length === 0) return;
    if (excede) {
      toast.error('El total de pagos excede el saldo pendiente');
      return;
    }

    setSubmitting(true);
    try {
      for (const line of validLines) {
        await create.mutateAsync({
          factura_id: factura.id,
          proveedor_id: factura.proveedor_id,
          branch_id: factura.branch_id,
          monto: parseFloat(line.monto),
          fecha_pago: fechaPago,
          medio_pago: line.medio_pago,
          referencia: referencia || undefined,
          observaciones: observaciones || undefined,
        });
      }
      onOpenChange(false);
      setLines([{ ...EMPTY_LINE }]);
      setReferencia('');
      setObservaciones('');
    } catch {
      // error handled by mutation
    } finally {
      setSubmitting(false);
    }
  };

  const setCanonPreset = () => {
    if (!canonInfo) return;
    const efectivo = Math.round(canonInfo.pagarEfectivo * 100) / 100;
    const transferencia = Math.round((saldoPendiente - efectivo) * 100) / 100;
    setLines([
      { monto: efectivo.toFixed(2), medio_pago: 'efectivo' },
      { monto: transferencia.toFixed(2), medio_pago: 'transferencia' },
    ]);
  };

  const fmt = (n: number) => Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const hasValidPayment = lines.some(l => parseFloat(l.monto) > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Pago</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 rounded-md bg-muted text-sm">
            <p>Total factura: <strong>$ {fmt(Number(factura?.total ?? 0))}</strong></p>
            <p>Saldo pendiente: <strong className="text-destructive">$ {fmt(saldoPendiente)}</strong></p>
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
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>En <strong>efectivo</strong>:</span>
                  </div>
                  <span className="font-mono font-semibold whitespace-nowrap">$ {fmt(canonInfo.pagarEfectivo)}</span>
                </div>
                <p className="text-xs text-muted-foreground ml-6">5% de $ {fmt(canonInfo.efectivo)}</p>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <ArrowRightLeft className="w-4 h-4 shrink-0 text-primary" />
                    <span>Por <strong>transferencia</strong>:</span>
                  </div>
                  <span className="font-mono font-semibold whitespace-nowrap">$ {fmt(canonInfo.pagarTransferencia)}</span>
                </div>
                <p className="text-xs text-muted-foreground ml-6">5% de $ {fmt(canonInfo.online)}</p>
              </div>
              <Button type="button" variant="outline" size="sm" className="w-full mt-2 text-xs" onClick={setCanonPreset}>
                Cargar ambos pagos automáticamente
              </Button>
            </div>
          )}

          {/* Payment lines */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Pagos</Label>
              {lines.length < 4 && (
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={addLine}>
                  <Plus className="w-3 h-3 mr-1" /> Agregar pago
                </Button>
              )}
            </div>

            {lines.map((line, idx) => (
              <div key={idx} className="flex items-end gap-2">
                <div className="flex-1">
                  {idx === 0 && <Label className="text-xs text-muted-foreground">Monto</Label>}
                  <Input
                    type="number"
                    step="0.01"
                    value={line.monto}
                    onChange={e => updateLine(idx, 'monto', e.target.value)}
                    placeholder="$ 0,00"
                  />
                </div>
                <div className="w-[140px]">
                  {idx === 0 && <Label className="text-xs text-muted-foreground">Medio</Label>}
                  <Select value={line.medio_pago} onValueChange={v => updateLine(idx, 'medio_pago', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MEDIO_PAGO_OPTIONS.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {lines.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => removeLine(idx)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}

            {lines.length > 1 && (
              <div className="flex justify-between text-sm pt-1 border-t">
                <span className="text-muted-foreground">Total a registrar:</span>
                <span className={`font-mono font-semibold ${excede ? 'text-destructive' : ''}`}>
                  $ {fmt(totalPagos)}
                </span>
              </div>
            )}
            {excede && (
              <p className="text-xs text-destructive">El total excede el saldo pendiente de $ {fmt(saldoPendiente)}</p>
            )}
          </div>

          <div>
            <Label>Fecha de pago</Label>
            <Input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)} />
          </div>
          <div>
            <Label>Referencia</Label>
            <Input value={referencia} onChange={e => setReferencia(e.target.value)} />
          </div>
          <div>
            <Label>Observaciones</Label>
            <Textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={submitting || !hasValidPayment || excede}>
              {submitting ? 'Guardando...' : lines.filter(l => parseFloat(l.monto) > 0).length > 1 ? `Registrar ${lines.filter(l => parseFloat(l.monto) > 0).length} Pagos` : 'Registrar Pago'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
