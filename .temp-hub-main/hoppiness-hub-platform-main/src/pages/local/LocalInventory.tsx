import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { ClipboardList, Play, Check, AlertTriangle, Search, Save } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type Branch = Tables<'branches'>;
type Ingredient = Tables<'ingredients'>;
type BranchIngredient = Tables<'branch_ingredients'>;
type InventoryCount = Tables<'inventory_counts'>;
type InventoryCountLine = Tables<'inventory_count_lines'>;

interface ContextType {
  branch: Branch;
}

interface CountLine {
  ingredient: Ingredient;
  systemQty: number;
  countedQty: string;
  difference: number;
}

type CountType = 'weekly' | 'monthly';

export default function LocalInventory() {
  const { branch } = useOutletContext<ContextType>();
  const { user } = useAuth();
  const [counts, setCounts] = useState<InventoryCount[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Active count state
  const [activeCount, setActiveCount] = useState<InventoryCount | null>(null);
  const [countLines, setCountLines] = useState<CountLine[]>([]);
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // New count dialog
  const [newCountOpen, setNewCountOpen] = useState(false);
  const [selectedCountType, setSelectedCountType] = useState<CountType>('weekly');

  useEffect(() => {
    fetchCounts();
  }, [branch.id]);

  async function fetchCounts() {
    setLoading(true);
    const { data } = await supabase
      .from('inventory_counts')
      .select('*')
      .eq('branch_id', branch.id)
      .order('count_date', { ascending: false })
      .limit(20);
    
    if (data) {
      setCounts(data);
      // Check for in_progress count
      const inProgress = data.find(c => c.status === 'in_progress');
      if (inProgress) {
        loadActiveCount(inProgress);
      }
    }
    setLoading(false);
  }

  async function loadActiveCount(count: InventoryCount) {
    setActiveCount(count);
    setNotes(count.notes || '');
    
    // Load ingredients and existing lines
    const [ingredientsRes, branchIngredientsRes, linesRes] = await Promise.all([
      supabase.from('ingredients').select('*').eq('is_active', true).order('name'),
      supabase.from('branch_ingredients').select('*').eq('branch_id', branch.id),
      supabase.from('inventory_count_lines').select('*').eq('count_id', count.id),
    ]);

    if (ingredientsRes.data) {
      const branchMap = new Map(
        (branchIngredientsRes.data || []).map(bi => [bi.ingredient_id, bi])
      );
      const linesMap = new Map(
        (linesRes.data || []).map(l => [l.ingredient_id, l])
      );

      const lines: CountLine[] = ingredientsRes.data.map(ing => {
        const branchIng = branchMap.get(ing.id);
        const existingLine = linesMap.get(ing.id);
        const systemQty = branchIng?.current_stock || 0;
        const countedQty = existingLine?.counted_quantity?.toString() || '';
        
        return {
          ingredient: ing,
          systemQty,
          countedQty,
          difference: countedQty ? parseFloat(countedQty) - systemQty : 0,
        };
      });

      setCountLines(lines);
    }
  }

  async function startNewCount() {
    setNewCountOpen(false);
    
    const { data, error } = await supabase
      .from('inventory_counts')
      .insert({
        branch_id: branch.id,
        status: 'in_progress',
        started_by: user?.id,
        count_type: selectedCountType,
      } as any)
      .select()
      .single();

    if (error) {
      toast.error('Error al iniciar conteo');
      return;
    }

    toast.success(`Conteo ${selectedCountType === 'monthly' ? 'mensual' : 'semanal'} iniciado`);
    loadActiveCount(data);
    fetchCounts();
  }

  function updateCountedQty(ingredientId: string, value: string) {
    setCountLines(prev => prev.map(line => {
      if (line.ingredient.id === ingredientId) {
        const countedQty = value;
        const numValue = parseFloat(value) || 0;
        return {
          ...line,
          countedQty,
          difference: numValue - line.systemQty,
        };
      }
      return line;
    }));
  }

  async function saveProgress() {
    if (!activeCount) return;
    setIsSaving(true);

    try {
      // Delete existing lines and insert new ones
      await supabase
        .from('inventory_count_lines')
        .delete()
        .eq('count_id', activeCount.id);

      const linesToInsert = countLines
        .filter(l => l.countedQty !== '')
        .map(l => ({
          count_id: activeCount.id,
          ingredient_id: l.ingredient.id,
          system_quantity: l.systemQty,
          counted_quantity: parseFloat(l.countedQty),
          difference: l.difference,
          counted_by: user?.id,
          counted_at: new Date().toISOString(),
        }));

      if (linesToInsert.length > 0) {
        await supabase.from('inventory_count_lines').insert(linesToInsert);
      }

      // Update notes
      await supabase
        .from('inventory_counts')
        .update({ notes })
        .eq('id', activeCount.id);

      toast.success('Progreso guardado');
    } catch (error) {
      toast.error('Error al guardar');
    } finally {
      setIsSaving(false);
    }
  }

  async function finalizeCount() {
    if (!activeCount) return;
    
    await saveProgress();

    // Apply adjustments to stock
    const adjustments = countLines.filter(l => l.countedQty !== '' && l.difference !== 0);
    
    for (const adj of adjustments) {
      await supabase.from('stock_movements').insert({
        branch_id: branch.id,
        ingredient_id: adj.ingredient.id,
        quantity: adj.difference,
        type: 'adjustment' as any,
        notes: `Ajuste por conteo de inventario #${activeCount.id.slice(0, 8)}`,
        reference_id: activeCount.id,
      });
    }

    // Mark count as completed
    await supabase
      .from('inventory_counts')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: user?.id,
      })
      .eq('id', activeCount.id);

    toast.success('Conteo finalizado y stock ajustado');
    setActiveCount(null);
    setCountLines([]);
    fetchCounts();
  }

  const filteredLines = countLines.filter(l =>
    l.ingredient.name.toLowerCase().includes(search.toLowerCase())
  );

  const countedCount = countLines.filter(l => l.countedQty !== '').length;
  const differencesCount = countLines.filter(l => l.countedQty !== '' && l.difference !== 0).length;

  const formatDate = (date: string) => format(new Date(date), "d MMM yyyy HH:mm", { locale: es });

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  // Active count view
  if (activeCount) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Conteo en Progreso</h1>
            <p className="text-muted-foreground">
              Iniciado: {formatDate(activeCount.count_date)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={saveProgress} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              Guardar Progreso
            </Button>
            <Button onClick={finalizeCount} disabled={isSaving}>
              <Check className="w-4 h-4 mr-2" />
              Finalizar Conteo
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Contados</p>
              <p className="text-2xl font-bold">{countedCount} / {countLines.length}</p>
            </CardContent>
          </Card>
          <Card className={differencesCount > 0 ? 'border-amber-500' : ''}>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Con Diferencias</p>
              <p className="text-2xl font-bold">{differencesCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Progreso</p>
              <p className="text-2xl font-bold">
                {countLines.length > 0 ? Math.round((countedCount / countLines.length) * 100) : 0}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ingrediente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Count Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingrediente</TableHead>
                  <TableHead className="text-right">Sistema</TableHead>
                  <TableHead className="text-right">Contado</TableHead>
                  <TableHead className="text-right">Diferencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLines.map(line => (
                  <TableRow key={line.ingredient.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{line.ingredient.name}</p>
                        <p className="text-xs text-muted-foreground">{line.ingredient.unit}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {line.systemQty.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.countedQty}
                        onChange={(e) => updateCountedQty(line.ingredient.id, e.target.value)}
                        className="w-24 text-right ml-auto"
                        placeholder="—"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {line.countedQty !== '' && (
                        <Badge variant={line.difference === 0 ? 'secondary' : line.difference > 0 ? 'default' : 'destructive'}>
                          {line.difference > 0 ? '+' : ''}{line.difference.toFixed(2)}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notas del Conteo</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones generales del conteo..."
              rows={3}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // History view
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Conteo de Inventario</h1>
          <p className="text-muted-foreground">Verificación física vs sistema</p>
        </div>
        <Button onClick={() => setNewCountOpen(true)}>
          <Play className="w-4 h-4 mr-2" />
          Iniciar Conteo
        </Button>
      </div>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Conteos</CardTitle>
        </CardHeader>
        <CardContent>
          {counts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardList className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No hay conteos registrados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {counts.map(count => (
                  <TableRow key={count.id}>
                    <TableCell>{formatDate(count.count_date)}</TableCell>
                    <TableCell>
                      <Badge variant={(count as any).count_type === 'monthly' ? 'default' : 'outline'}>
                        {(count as any).count_type === 'monthly' ? 'Mensual' : 'Semanal'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={count.status === 'completed' ? 'secondary' : 'outline'}>
                        {count.status === 'completed' ? 'Completado' : 'En progreso'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {count.notes || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New Count Dialog */}
      <Dialog open={newCountOpen} onOpenChange={setNewCountOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Iniciar Nuevo Conteo</DialogTitle>
            <DialogDescription>
              Seleccioná el tipo de conteo que vas a realizar.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <RadioGroup value={selectedCountType} onValueChange={(v) => setSelectedCountType(v as CountType)}>
              <div className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="weekly" id="weekly" className="mt-1" />
                <Label htmlFor="weekly" className="flex-1 cursor-pointer">
                  <p className="font-medium">Conteo Semanal</p>
                  <p className="text-sm text-muted-foreground">
                    Para control de stock y gestión de pedidos a proveedores
                  </p>
                </Label>
              </div>
              <div className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="monthly" id="monthly" className="mt-1" />
                <Label htmlFor="monthly" className="flex-1 cursor-pointer">
                  <p className="font-medium">Conteo Mensual (CMV)</p>
                  <p className="text-sm text-muted-foreground">
                    Para cálculo del Costo de Mercadería Vendida del mes
                  </p>
                </Label>
              </div>
            </RadioGroup>
            
            <div className="flex items-center gap-2 p-3 bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p className="text-sm">
                Al finalizar, las diferencias se aplicarán como ajustes de stock.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCountOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={startNewCount}>
              <Play className="w-4 h-4 mr-2" />
              Comenzar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
