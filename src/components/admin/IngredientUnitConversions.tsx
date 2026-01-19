import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, ArrowRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface UnitConversion {
  id: string;
  ingredient_id: string;
  from_unit: string;
  to_unit: string;
  conversion_factor: number;
  is_purchase_to_usage: boolean;
  notes: string | null;
}

interface IngredientUnitConversionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredientId: string;
  ingredientName: string;
  purchaseUnit: string;
  usageUnit: string;
  onUpdated: () => void;
}

const COMMON_UNITS = [
  { value: 'u', label: 'Unidad' },
  { value: 'kg', label: 'Kilogramo' },
  { value: 'g', label: 'Gramo' },
  { value: 'l', label: 'Litro' },
  { value: 'ml', label: 'Mililitro' },
  { value: 'docena', label: 'Docena' },
  { value: 'pack', label: 'Pack' },
  { value: 'caja', label: 'Caja' },
  { value: 'bolsa', label: 'Bolsa' },
  { value: 'feta', label: 'Feta' },
  { value: 'porcion', label: 'Porción' },
];

export function IngredientUnitConversions({
  open,
  onOpenChange,
  ingredientId,
  ingredientName,
  purchaseUnit,
  usageUnit,
  onUpdated,
}: IngredientUnitConversionsProps) {
  const [conversions, setConversions] = useState<UnitConversion[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form for new conversion
  const [newFromUnit, setNewFromUnit] = useState('');
  const [newToUnit, setNewToUnit] = useState('');
  const [newFactor, setNewFactor] = useState('');
  const [isPurchaseToUsage, setIsPurchaseToUsage] = useState(false);

  useEffect(() => {
    if (open && ingredientId) {
      fetchConversions();
    }
  }, [open, ingredientId]);

  const fetchConversions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ingredient_unit_conversions')
      .select('*')
      .eq('ingredient_id', ingredientId)
      .order('is_purchase_to_usage', { ascending: false });

    if (data) setConversions(data);
    if (error) console.error(error);
    setLoading(false);
  };

  const handleAddConversion = async () => {
    if (!newFromUnit || !newToUnit || !newFactor) {
      toast.error('Completá todos los campos');
      return;
    }

    if (newFromUnit === newToUnit) {
      toast.error('Las unidades deben ser diferentes');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('ingredient_unit_conversions')
        .insert({
          ingredient_id: ingredientId,
          from_unit: newFromUnit,
          to_unit: newToUnit,
          conversion_factor: parseFloat(newFactor),
          is_purchase_to_usage: isPurchaseToUsage,
        });

      if (error) throw error;

      toast.success('Equivalencia agregada');
      setNewFromUnit('');
      setNewToUnit('');
      setNewFactor('');
      setIsPurchaseToUsage(false);
      fetchConversions();
      onUpdated();
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Esta equivalencia ya existe');
      } else {
        toast.error('Error al guardar');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConversion = async (id: string) => {
    const { error } = await supabase
      .from('ingredient_unit_conversions')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Error al eliminar');
    } else {
      toast.success('Equivalencia eliminada');
      fetchConversions();
      onUpdated();
    }
  };

  const handleSetAsPurchaseToUsage = async (id: string) => {
    // First, unset all others
    await supabase
      .from('ingredient_unit_conversions')
      .update({ is_purchase_to_usage: false })
      .eq('ingredient_id', ingredientId);

    // Then set the selected one
    await supabase
      .from('ingredient_unit_conversions')
      .update({ is_purchase_to_usage: true })
      .eq('id', id);

    toast.success('Conversión principal actualizada');
    fetchConversions();
    onUpdated();
  };

  const getUnitLabel = (value: string) => {
    return COMMON_UNITS.find(u => u.value === value)?.label || value;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Equivalencias de Unidades</DialogTitle>
          <DialogDescription>
            {ingredientName} — Definí las conversiones entre unidades
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current units info */}
          <div className="flex items-center gap-4 p-3 bg-muted rounded-lg text-sm">
            <div>
              <span className="text-muted-foreground">Compra:</span>{' '}
              <Badge variant="outline">{getUnitLabel(purchaseUnit)}</Badge>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <div>
              <span className="text-muted-foreground">Uso:</span>{' '}
              <Badge variant="secondary">{getUnitLabel(usageUnit)}</Badge>
            </div>
          </div>

          {/* Existing conversions */}
          {conversions.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">De</TableHead>
                    <TableHead className="text-xs">A</TableHead>
                    <TableHead className="text-xs text-right">Factor</TableHead>
                    <TableHead className="text-xs w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conversions.map((conv) => (
                    <TableRow key={conv.id}>
                      <TableCell className="py-2">
                        <span className="text-sm">{getUnitLabel(conv.from_unit)}</span>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-sm">{getUnitLabel(conv.to_unit)}</span>
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <span className="font-mono text-sm">
                          1 = {conv.conversion_factor}
                        </span>
                        {conv.is_purchase_to_usage && (
                          <Badge className="ml-2 text-[10px]" variant="default">
                            Principal
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-1">
                          {!conv.is_purchase_to_usage && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleSetAsPurchaseToUsage(conv.id)}
                              title="Establecer como conversión principal"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteConversion(conv.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Add new conversion */}
          <div className="space-y-3 pt-2 border-t">
            <Label className="text-sm font-medium">Nueva Equivalencia</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Select value={newFromUnit} onValueChange={setNewFromUnit}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="De unidad..." />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_UNITS.map(u => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <span className="text-muted-foreground">=</span>
              <Input
                type="number"
                placeholder="Cant."
                value={newFactor}
                onChange={(e) => setNewFactor(e.target.value)}
                className="w-20 h-9"
                step="0.01"
              />
              <div className="flex-1">
                <Select value={newToUnit} onValueChange={setNewToUnit}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="A unidad..." />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_UNITS.map(u => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPurchaseToUsage}
                  onChange={(e) => setIsPurchaseToUsage(e.target.checked)}
                  className="rounded"
                />
                Conversión principal (compra → uso)
              </label>
              <Button size="sm" onClick={handleAddConversion} disabled={saving}>
                <Plus className="w-4 h-4 mr-1" />
                Agregar
              </Button>
            </div>
          </div>

          {conversions.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay equivalencias definidas. Agregá una conversión.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
