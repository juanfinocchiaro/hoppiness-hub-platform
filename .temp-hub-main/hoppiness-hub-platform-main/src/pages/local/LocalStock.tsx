import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { handleError } from '@/lib/errorHandler';
import { Package, AlertTriangle, Plus, Minus, Search, TrendingDown, TrendingUp } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;
type Ingredient = Tables<'ingredients'>;
type BranchIngredient = Tables<'branch_ingredients'>;

interface IngredientWithStock extends Ingredient {
  branchStock: BranchIngredient | null;
}

interface ContextType {
  branch: Branch;
}

type MovementType = 'purchase' | 'adjustment' | 'waste' | 'transfer_in' | 'transfer_out';

const MOVEMENT_TYPES: { value: MovementType; label: string; sign: 'positive' | 'negative' }[] = [
  { value: 'purchase', label: 'Compra/Ingreso', sign: 'positive' },
  { value: 'adjustment', label: 'Ajuste', sign: 'positive' },
  { value: 'waste', label: 'Merma/Desperdicio', sign: 'negative' },
  { value: 'transfer_in', label: 'Transferencia entrada', sign: 'positive' },
  { value: 'transfer_out', label: 'Transferencia salida', sign: 'negative' },
];

export default function LocalStock() {
  const { branch } = useOutletContext<ContextType>();
  const [ingredients, setIngredients] = useState<IngredientWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  
  const [movementOpen, setMovementOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<IngredientWithStock | null>(null);
  const [movementType, setMovementType] = useState<MovementType>('purchase');
  const [movementQty, setMovementQty] = useState('');
  const [movementNotes, setMovementNotes] = useState('');
  const [movementCost, setMovementCost] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchIngredients();
  }, [branch.id]);

  async function fetchIngredients() {
    setLoading(true);
    const [ingredientsRes, branchIngredientsRes] = await Promise.all([
      supabase.from('ingredients').select('*').eq('is_active', true).order('name'),
      supabase.from('branch_ingredients').select('*').eq('branch_id', branch.id),
    ]);

    if (ingredientsRes.data) {
      const branchMap = new Map(
        (branchIngredientsRes.data || []).map(bi => [bi.ingredient_id, bi])
      );
      
      setIngredients(
        ingredientsRes.data.map(ing => ({
          ...ing,
          branchStock: branchMap.get(ing.id) || null,
        }))
      );
    }
    setLoading(false);
  }

  const filteredIngredients = ingredients.filter(ing => {
    const matchesSearch = ing.name.toLowerCase().includes(search.toLowerCase());
    const stock = ing.branchStock?.current_stock || 0;
    const minStock = ing.branchStock?.min_stock_override || ing.min_stock || 0;
    const isLow = stock <= minStock;
    
    if (showLowStock && !isLow) return false;
    return matchesSearch;
  });

  const openMovement = (ingredient: IngredientWithStock) => {
    setSelectedIngredient(ingredient);
    setMovementType('purchase');
    setMovementQty('');
    setMovementNotes('');
    setMovementCost(ingredient.branchStock?.last_cost?.toString() || ingredient.cost_per_unit?.toString() || '');
    setMovementOpen(true);
  };

  const handleMovement = async () => {
    if (!selectedIngredient || !movementQty) return;
    
    const qty = parseFloat(movementQty);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Cantidad inválida');
      return;
    }

    setIsSubmitting(true);
    try {
      const movementInfo = MOVEMENT_TYPES.find(m => m.value === movementType)!;
      const finalQty = movementInfo.sign === 'negative' ? -qty : qty;

      // Insert stock movement
      const { error: moveError } = await supabase.from('stock_movements').insert({
        branch_id: branch.id,
        ingredient_id: selectedIngredient.id,
        quantity: finalQty,
        type: movementType as any,
        notes: movementNotes || null,
        unit_cost: movementCost ? parseFloat(movementCost) : null,
      });

      if (moveError) throw moveError;

      // Update last_cost if it's a purchase
      if (movementType === 'purchase' && movementCost) {
        await supabase
          .from('branch_ingredients')
          .update({ last_cost: parseFloat(movementCost) })
          .eq('branch_id', branch.id)
          .eq('ingredient_id', selectedIngredient.id);
      }

      toast.success('Movimiento registrado');
      setMovementOpen(false);
      fetchIngredients();
    } catch (error) {
      handleError(error, { userMessage: 'Error al registrar movimiento', context: 'LocalStock.handleMovement' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatNumber = (n: number) => new Intl.NumberFormat('es-AR').format(n);

  const lowStockCount = ingredients.filter(ing => {
    const stock = ing.branchStock?.current_stock || 0;
    const minStock = ing.branchStock?.min_stock_override || ing.min_stock || 0;
    return stock <= minStock;
  }).length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Stock de Ingredientes</h1>
          <p className="text-muted-foreground">Gestión de inventario de insumos</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Ingredientes</p>
                <p className="text-2xl font-bold">{ingredients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={lowStockCount > 0 ? 'border-destructive' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${lowStockCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
              <div>
                <p className="text-sm text-muted-foreground">Stock Bajo</p>
                <p className="text-2xl font-bold">{lowStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ingrediente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={showLowStock ? 'default' : 'outline'}
          onClick={() => setShowLowStock(!showLowStock)}
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Stock Bajo
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingrediente</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Mínimo</TableHead>
                  <TableHead className="text-right">Costo Unit.</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIngredients.map(ing => {
                  const stock = ing.branchStock?.current_stock || 0;
                  const minStock = ing.branchStock?.min_stock_override || ing.min_stock || 0;
                  const isLow = stock <= minStock;
                  const cost = ing.branchStock?.last_cost || ing.cost_per_unit || 0;

                  return (
                    <TableRow key={ing.id}>
                      <TableCell className="font-medium">{ing.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{ing.category || 'Sin categoría'}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(stock)} {ing.unit}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {formatNumber(minStock)} {ing.unit}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${formatNumber(cost)}
                      </TableCell>
                      <TableCell>
                        {isLow ? (
                          <Badge variant="destructive" className="gap-1">
                            <TrendingDown className="w-3 h-3" />
                            Bajo
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <TrendingUp className="w-3 h-3" />
                            OK
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => openMovement(ing)}>
                          <Plus className="w-4 h-4 mr-1" />
                          Movimiento
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredIngredients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No se encontraron ingredientes
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Movement Dialog */}
      <Dialog open={movementOpen} onOpenChange={setMovementOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Movimiento</DialogTitle>
          </DialogHeader>
          {selectedIngredient && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedIngredient.name}</p>
                <p className="text-sm text-muted-foreground">
                  Stock actual: {formatNumber(selectedIngredient.branchStock?.current_stock || 0)} {selectedIngredient.unit}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Movimiento</Label>
                <Select value={movementType} onValueChange={(v) => setMovementType(v as MovementType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOVEMENT_TYPES.map(mt => (
                      <SelectItem key={mt.value} value={mt.value}>
                        {mt.sign === 'positive' ? (
                          <span className="flex items-center gap-2">
                            <Plus className="w-3 h-3 text-green-600" />
                            {mt.label}
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Minus className="w-3 h-3 text-red-600" />
                            {mt.label}
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cantidad ({selectedIngredient.unit})</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={movementQty}
                    onChange={(e) => setMovementQty(e.target.value)}
                    placeholder="0"
                  />
                </div>
                {movementType === 'purchase' && (
                  <div className="space-y-2">
                    <Label>Costo Unitario ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={movementCost}
                      onChange={(e) => setMovementCost(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Textarea
                  value={movementNotes}
                  onChange={(e) => setMovementNotes(e.target.value)}
                  placeholder="Motivo del movimiento, proveedor, etc."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMovementOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleMovement} disabled={isSubmitting || !movementQty}>
              {isSubmitting ? 'Guardando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
