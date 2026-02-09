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
    fc_total: '',
    ft_total: '',
    observaciones: '',
  });

  // Cuando cambia el período seleccionado o se abre el modal, actualizar el form
  useEffect(() => {
    if (open) {
      if (venta) {
        // Modo edición: usar datos de la venta existente
        setForm({
          periodo: venta.periodo,
          fc_total: String(venta.fc_total),
          ft_total: String(venta.ft_total),
          observaciones: venta.observaciones || '',
        });
      } else {
        // Modo nuevo: usar el período que viene de la página padre
        setForm({
          periodo: periodo,
          fc_total: '',
          ft_total: '',
          observaciones: '',
        });
      }
    }
  }, [open, venta, periodo]);

  const fcTotal = parseFloat(form.fc_total) || 0;
  const ftTotal = parseFloat(form.ft_total) || 0;
  const ventaTotal = fcTotal + ftTotal;
  const porcentajeFt = ventaTotal > 0 ? ((ftTotal / ventaTotal) * 100).toFixed(1) : '0.0';

  const handleSubmit = async () => {
    if (!form.fc_total && !form.ft_total) return;
    
    if (isEditing) {
      await update.mutateAsync({
        id: venta.id,
        data: { 
          fc_total: fcTotal, 
          ft_total: ftTotal, 
          observaciones: form.observaciones || undefined 
        },
      });
    } else {
      await create.mutateAsync({
        branch_id: branchId,
        periodo: form.periodo, // Usa el período del form (que viene de la página)
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
            <Label>Facturación Contable (FC) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                step="0.01"
                value={form.fc_total}
                onChange={e => set('fc_total', e.target.value)}
                placeholder="0.00"
                className="pl-7"
              />
            </div>
          </div>

          <div>
            <Label>Efectivo (FT)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                step="0.01"
                value={form.ft_total}
                onChange={e => set('ft_total', e.target.value)}
                placeholder="0.00"
                className="pl-7"
              />
            </div>
          </div>

          <div className="p-3 rounded-md bg-muted text-sm space-y-1">
            <div className="flex justify-between">
              <span>Venta Total</span>
              <strong className="font-mono">$ {ventaTotal.toLocaleString('es-AR')}</strong>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Canon (5% FC)</span>
              <span className="font-mono">$ {(fcTotal * 0.05).toLocaleString('es-AR')}</span>
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
              disabled={isPending || (!form.fc_total && !form.ft_total)}
            >
              {isPending ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
