/**
 * StockInicialModal - Cargar stock inicial por insumo
 */
import { useState, useMemo } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useInsumos } from '@/hooks/useInsumos';
import { useStockInicialMutation } from '@/hooks/pos/useStock';

interface StockInicialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
}

export function StockInicialModal({ open, onOpenChange, branchId }: StockInicialModalProps) {
  const { data: insumos = [], isLoading } = useInsumos();
  const saveMutation = useStockInicialMutation(branchId);
  const [cantidades, setCantidades] = useState<Record<string, string>>({});

  const itemsToSave = useMemo(() => {
    return insumos
      .filter((i) => {
        const v = cantidades[i.id];
        return v != null && v !== '' && Number(v) > 0;
      })
      .map((i) => ({ insumo_id: i.id, cantidad: Number(cantidades[i.id] ?? 0) }));
  }, [insumos, cantidades]);

  const handleSave = async () => {
    if (itemsToSave.length === 0) return;
    await saveMutation.mutateAsync(itemsToSave);
    setCantidades({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cargar stock inicial</DialogTitle>
          <DialogDescription>
            Ingresá la cantidad por insumo. Solo se guardan los que tengan cantidad &gt; 0.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Cargando insumos…</div>
        ) : (
          <ScrollArea className="h-[280px] rounded-md border p-2">
            <div className="space-y-3">
              {insumos.map((insumo) => (
                <div key={insumo.id} className="flex items-center gap-3">
                  <Label className="min-w-[180px] truncate text-sm font-normal">
                    {insumo.nombre}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="0"
                    className="w-24"
                    value={cantidades[insumo.id] ?? ''}
                    onChange={(e) =>
                      setCantidades((prev) => ({ ...prev, [insumo.id]: e.target.value }))
                    }
                  />
                  <span className="text-muted-foreground text-xs">
                    {(insumo as { unidad_base?: string })?.unidad_base ?? 'un'}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={itemsToSave.length === 0 || saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Guardando…' : 'Guardar stock inicial'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
