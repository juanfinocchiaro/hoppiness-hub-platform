import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useVentaMensualMutations } from '@/hooks/useVentasMensuales';
import { getCurrentPeriodo } from '@/types/compra';
import type { VentaMensual } from '@/types/ventas';

interface VentaMensualFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  venta?: VentaMensual | null;
}

export function VentaMensualFormModal({ open, onOpenChange, branchId, venta }: VentaMensualFormModalProps) {
  const { create, update } = useVentaMensualMutations();
  const isEditing = !!venta;

  const [form, setForm] = useState({
    periodo: getCurrentPeriodo(),
    venta_total: '',
    efectivo: '',
    observaciones: '',
  });

  useEffect(() => {
    if (open && venta) {
      setForm({
        periodo: venta.periodo,
        venta_total: String(venta.venta_total ?? (Number(venta.fc_total) + Number(venta.ft_total))),
        efectivo: String(venta.efectivo ?? venta.ft_total),
        observaciones: venta.observaciones || '',
      });
    } else if (open) {
      setForm({ periodo: getCurrentPeriodo(), venta_total: '', efectivo: '', observaciones: '' });
    }
  }, [open, venta]);

  const ventaTotal = parseFloat(form.venta_total) || 0;
  const efectivo = parseFloat(form.efectivo) || 0;
  const facturacionContable = ventaTotal - efectivo;
  const porcentajeEfectivo = ventaTotal > 0 ? ((efectivo / ventaTotal) * 100).toFixed(1) : '0.0';

  const handleSubmit = async () => {
    if (!form.venta_total) return;
    const payload = {
      venta_total: ventaTotal,
      efectivo: efectivo,
      fc_total: facturacionContable,
      ft_total: efectivo,
      observaciones: form.observaciones || undefined,
    };

    if (isEditing) {
      await update.mutateAsync({ id: venta.id, data: payload });
    } else {
      await create.mutateAsync({
        branch_id: branchId,
        periodo: form.periodo,
        ...payload,
      });
    }
    onOpenChange(false);
  };

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));
  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Ventas del Período' : 'Registrar Ventas Mensuales'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Período *</Label>
            <Input
              type="month"
              value={form.periodo}
              onChange={e => set('periodo', e.target.value)}
              disabled={isEditing}
            />
          </div>

          <div>
            <Label>Venta Total *</Label>
            <Input
              type="number"
              step="0.01"
              value={form.venta_total}
              onChange={e => set('venta_total', e.target.value)}
              placeholder="$ 0.00"
            />
          </div>

          <div>
            <Label>Efectivo</Label>
            <Input
              type="number"
              step="0.01"
              value={form.efectivo}
              onChange={e => set('efectivo', e.target.value)}
              placeholder="$ 0.00"
            />
          </div>

          <div className="p-3 rounded-md bg-muted text-sm space-y-1">
            <p>Venta Total: <strong>$ {ventaTotal.toLocaleString('es-AR')}</strong></p>
            <p>Efectivo: <strong>$ {efectivo.toLocaleString('es-AR')}</strong> ({porcentajeEfectivo}%)</p>
            <p>Facturación Contable (FC): <strong>$ {facturacionContable.toLocaleString('es-AR')}</strong></p>
          </div>

          <div>
            <Label>Observaciones</Label>
            <Textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)} rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isPending || !form.venta_total}>
              {isPending ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
