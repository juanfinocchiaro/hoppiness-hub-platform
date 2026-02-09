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
    fc_total: '',
    ft_total: '',
    observaciones: '',
  });

  useEffect(() => {
    if (open && venta) {
      setForm({
        periodo: venta.periodo,
        fc_total: String(venta.fc_total),
        ft_total: String(venta.ft_total),
        observaciones: venta.observaciones || '',
      });
    } else if (open) {
      setForm({ periodo: getCurrentPeriodo(), fc_total: '', ft_total: '', observaciones: '' });
    }
  }, [open, venta]);

  const fcTotal = parseFloat(form.fc_total) || 0;
  const ftTotal = parseFloat(form.ft_total) || 0;
  const ventasTotal = fcTotal + ftTotal;
  const porcentajeFt = ventasTotal > 0 ? ((ftTotal / ventasTotal) * 100).toFixed(1) : '0.0';

  const handleSubmit = async () => {
    if (!form.fc_total || !form.ft_total) return;
    if (isEditing) {
      await update.mutateAsync({
        id: venta.id,
        data: { fc_total: fcTotal, ft_total: ftTotal, observaciones: form.observaciones || undefined },
      });
    } else {
      await create.mutateAsync({
        branch_id: branchId,
        periodo: form.periodo,
        fc_total: fcTotal,
        ft_total: ftTotal,
        observaciones: form.observaciones || undefined,
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Facturación Contable (FC) *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.fc_total}
                onChange={e => set('fc_total', e.target.value)}
                placeholder="$ 0.00"
              />
            </div>
            <div>
              <Label>Facturación Total (FT) *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.ft_total}
                onChange={e => set('ft_total', e.target.value)}
                placeholder="$ 0.00"
              />
            </div>
          </div>

          <div className="p-3 rounded-md bg-muted text-sm space-y-1">
            <p>Ventas Totales (FC+FT): <strong>$ {ventasTotal.toLocaleString('es-AR')}</strong></p>
            <p>% FT sobre total: <strong>{porcentajeFt}%</strong></p>
          </div>

          <div>
            <Label>Observaciones</Label>
            <Textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)} rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isPending || !form.fc_total || !form.ft_total}>
              {isPending ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
