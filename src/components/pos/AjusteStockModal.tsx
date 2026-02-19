/**
 * AjusteStockModal - Ajuste puntual de stock (un insumo, cantidad nueva, motivo)
 */
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useStock } from '@/hooks/pos/useStock';
import { useAjusteStockMutation } from '@/hooks/pos/useStock';

interface AjusteStockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
}

export function AjusteStockModal({ open, onOpenChange, branchId }: AjusteStockModalProps) {
  const { data: stock = [] } = useStock(branchId);
  const saveMutation = useAjusteStockMutation(branchId);
  const [insumoId, setInsumoId] = useState('');
  const [cantidadNueva, setCantidadNueva] = useState('');
  const [motivo, setMotivo] = useState('');

  const selectedRow = stock.find((r: { insumo_id: string }) => r.insumo_id === insumoId);
  const cantidadActual = selectedRow ? Number(selectedRow.cantidad ?? 0) : null;

  useEffect(() => {
    if (open && stock.length > 0 && !insumoId) {
      setInsumoId(stock[0].insumo_id);
    }
  }, [open, stock, insumoId]);

  const handleSave = async () => {
    const q = parseFloat(cantidadNueva);
    if (Number.isNaN(q) || q < 0 || !insumoId) return;
    await saveMutation.mutateAsync({
      insumo_id: insumoId,
      cantidad_nueva: q,
      motivo: motivo.trim() || 'Ajuste de stock',
    });
    setCantidadNueva('');
    setMotivo('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar stock</DialogTitle>
          <DialogDescription>
            Elegí el insumo y la nueva cantidad. Se registrará un movimiento de tipo ajuste.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Insumo</Label>
            <Select value={insumoId} onValueChange={setInsumoId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar insumo" />
              </SelectTrigger>
              <SelectContent>
                {stock.map((row: { insumo_id: string; insumos?: { nombre?: string }; unidad?: string; cantidad?: number }) => (
                  <SelectItem key={row.insumo_id} value={row.insumo_id}>
                    {row.insumos?.nombre ?? row.insumo_id} — {Number(row.cantidad ?? 0)} {row.unidad}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedRow && (
            <p className="text-muted-foreground text-sm">
              Stock actual: {cantidadActual} {(selectedRow as { unidad?: string }).unidad}
            </p>
          )}
          <div>
            <Label>Cantidad nueva</Label>
            <Input
              type="number"
              min={0}
              step="any"
              placeholder="0"
              value={cantidadNueva}
              onChange={(e) => setCantidadNueva(e.target.value)}
            />
          </div>
          <div>
            <Label>Motivo (opcional)</Label>
            <Input
              placeholder="Ej: inventario, corrección"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              !insumoId ||
              cantidadNueva === '' ||
              Number.isNaN(parseFloat(cantidadNueva)) ||
              parseFloat(cantidadNueva) < 0 ||
              saveMutation.isPending
            }
          >
            {saveMutation.isPending ? 'Guardando…' : 'Guardar ajuste'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
