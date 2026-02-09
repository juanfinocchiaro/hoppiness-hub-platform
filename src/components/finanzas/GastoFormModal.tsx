import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useGastoMutations } from '@/hooks/useGastos';
import { CATEGORIA_GASTO_OPTIONS, MEDIO_PAGO_OPTIONS, getCurrentPeriodo } from '@/types/compra';
import { RdoCategorySelector } from '@/components/rdo/RdoCategorySelector';
import type { Gasto } from '@/types/compra';

const ESTADO_OPTIONS = [
  { value: 'pagado', label: 'Pagado' },
  { value: 'pendiente', label: 'Pendiente de pago' },
];

interface GastoFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  gasto?: Gasto | null;
}

export function GastoFormModal({ open, onOpenChange, branchId, gasto }: GastoFormModalProps) {
  const { create, update } = useGastoMutations();
  const isEditing = !!gasto;

  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    categoria_principal: '',
    concepto: '',
    monto: '',
    estado: 'pagado',
    fecha_vencimiento: '',
    fecha_pago: '',
    medio_pago: 'efectivo',
    referencia_pago: '',
    observaciones: '',
    rdo_category_code: '',
  });

  useEffect(() => {
    if (open && gasto) {
      setForm({
        fecha: gasto.fecha,
        categoria_principal: gasto.categoria_principal,
        concepto: gasto.concepto,
        monto: String(gasto.monto),
        estado: gasto.estado || 'pagado',
        fecha_vencimiento: (gasto as any).fecha_vencimiento || '',
        fecha_pago: (gasto as any).fecha_pago || '',
        medio_pago: gasto.medio_pago || 'efectivo',
        referencia_pago: gasto.referencia_pago || '',
        observaciones: gasto.observaciones || '',
        rdo_category_code: (gasto as any).rdo_category_code || '',
      });
    } else if (open) {
      setForm({
        fecha: new Date().toISOString().slice(0, 10),
        categoria_principal: '',
        concepto: '',
        monto: '',
        estado: 'pagado',
        fecha_vencimiento: '',
        fecha_pago: new Date().toISOString().slice(0, 10),
        medio_pago: 'efectivo',
        referencia_pago: '',
        observaciones: '',
        rdo_category_code: '',
      });
    }
  }, [open, gasto]);

  const handleSubmit = async () => {
    if (!form.categoria_principal || !form.concepto || !form.monto) return;

    const payload: any = {
      branch_id: branchId,
      fecha: form.fecha,
      periodo: getCurrentPeriodo(),
      categoria_principal: form.categoria_principal,
      concepto: form.concepto,
      monto: parseFloat(form.monto),
      estado: form.estado,
      fecha_vencimiento: form.estado === 'pendiente' && form.fecha_vencimiento ? form.fecha_vencimiento : null,
      fecha_pago: form.estado === 'pagado' && form.fecha_pago ? form.fecha_pago : null,
      medio_pago: form.estado === 'pagado' ? form.medio_pago : null,
      referencia_pago: form.estado === 'pagado' ? (form.referencia_pago || null) : null,
      observaciones: form.observaciones || null,
      rdo_category_code: form.rdo_category_code || null,
    };

    if (isEditing) {
      await update.mutateAsync({ id: gasto.id, data: payload });
    } else {
      await create.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));
  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Gasto Menor' : 'Registrar Gasto Menor'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fecha *</Label>
              <Input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
            </div>
            <div>
              <Label>Categoría *</Label>
              <Select value={form.categoria_principal} onValueChange={v => set('categoria_principal', v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {CATEGORIA_GASTO_OPTIONS.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Concepto *</Label>
            <Input value={form.concepto} onChange={e => set('concepto', e.target.value)} placeholder="Ej: Propina repartidor" />
          </div>

          <div>
            <Label>Monto *</Label>
            <Input type="number" step="0.01" value={form.monto} onChange={e => set('monto', e.target.value)} />
          </div>

          <div>
            <Label>Categoría RDO</Label>
            <p className="text-xs text-muted-foreground mb-1">Para el Estado de Resultados (opcional)</p>
            <RdoCategorySelector
              value={form.rdo_category_code}
              onChange={(code) => setForm(f => ({ ...f, rdo_category_code: code }))}
            />
          </div>

          <Separator />

          {/* Estado de Pago */}
          <div>
            <Label className="text-sm font-semibold">Estado de Pago</Label>
            <Select value={form.estado} onValueChange={v => set('estado', v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ESTADO_OPTIONS.map(e => (
                  <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.estado === 'pendiente' && (
            <div>
              <Label>Fecha de vencimiento</Label>
              <Input type="date" value={form.fecha_vencimiento} onChange={e => set('fecha_vencimiento', e.target.value)} />
            </div>
          )}

          {form.estado === 'pagado' && (
            <div className="space-y-3">
              <div>
                <Label>Fecha de pago</Label>
                <Input type="date" value={form.fecha_pago} onChange={e => set('fecha_pago', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Medio de Pago</Label>
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
                  <Input value={form.referencia_pago} onChange={e => set('referencia_pago', e.target.value)} placeholder="Nº comprobante" />
                </div>
              </div>
            </div>
          )}

          <div>
            <Label>Observaciones</Label>
            <Textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)} rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isPending || !form.categoria_principal || !form.concepto || !form.monto}>
              {isPending ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar Gasto'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
