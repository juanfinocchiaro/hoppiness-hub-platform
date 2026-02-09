import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  branchName?: string;
  periodo: string;
  venta?: VentaMensual | null;
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function formatPeriodoLargo(p: string) {
  if (!p) return '';
  const [y, m] = p.split('-');
  return `${MESES[parseInt(m) - 1]} ${y}`;
}

export function VentaMensualFormModal({ open, onOpenChange, branchId, branchName, periodo, venta }: VentaMensualFormModalProps) {
  const { create, update } = useVentaMensualMutations();
  const isEditing = !!venta;

  const [form, setForm] = useState({
    periodo: periodo || getCurrentPeriodo(),
    venta_total: '',
    efectivo: '',
    observaciones: '',
  });

  useEffect(() => {
    if (open) {
      if (venta) {
        setForm({
          periodo: venta.periodo,
          venta_total: String(venta.venta_total ?? 0),
          efectivo: String(venta.efectivo ?? 0),
          observaciones: venta.observaciones || '',
        });
      } else {
        setForm({
          periodo: periodo,
          venta_total: '',
          efectivo: '',
          observaciones: '',
        });
      }
    }
  }, [open, venta, periodo]);

  const ventaTotal = parseFloat(form.venta_total) || 0;
  const efectivo = parseFloat(form.efectivo) || 0;
  const fc = ventaTotal - efectivo; // Facturación Contable = Venta Total - Efectivo
  const canon = fc * 0.05;
  const pctEfectivo = ventaTotal > 0 ? ((efectivo / ventaTotal) * 100).toFixed(1) : '0.0';

  const handleSubmit = async () => {
    if (!form.venta_total) return;

    const payload = {
      venta_total: ventaTotal,
      efectivo: efectivo,
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
          <DialogTitle>
            {isEditing ? 'Editar Ventas del Período' : 'Registrar Ventas Mensuales'}
          </DialogTitle>
          <DialogDescription>
            {branchName && <>{branchName} — </>}
            {formatPeriodoLargo(form.periodo)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Venta Total *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                step="0.01"
                value={form.venta_total}
                onChange={e => set('venta_total', e.target.value)}
                placeholder="0.00"
                className="pl-7"
              />
            </div>
          </div>

          <div>
            <Label>Efectivo</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                step="0.01"
                value={form.efectivo}
                onChange={e => set('efectivo', e.target.value)}
                placeholder="0.00"
                className="pl-7"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Parte de la venta total cobrada en efectivo
            </p>
          </div>

          <div className="p-3 rounded-md bg-muted text-sm space-y-1">
            <div className="flex justify-between">
              <span>FC (Facturación Contable)</span>
              <strong className="font-mono">$ {fc.toLocaleString('es-AR')}</strong>
            </div>
            <div className="flex justify-between">
              <span>% Efectivo</span>
              <span className="font-mono">{pctEfectivo}%</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Canon (5% sobre FC)</span>
              <span className="font-mono">$ {canon.toLocaleString('es-AR')}</span>
            </div>
          </div>

          <div>
            <Label>Observaciones</Label>
            <Textarea 
              value={form.observaciones} 
              onChange={e => set('observaciones', e.target.value)} 
              rows={2}
              placeholder="Notas adicionales sobre el período..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isPending || !form.venta_total}
            >
              {isPending ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
