import { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { handleError } from '@/lib/errorHandler';
import { 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  Package,
  ShoppingCart,
  ClipboardCheck,
  ChevronDown,
  ChevronRight,
  Download
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { utils, writeFile } from 'xlsx';

type Branch = Tables<'branches'>;
type Ingredient = Tables<'ingredients'>;

interface ContextType {
  branch: Branch;
}

interface CMVLineItem {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  categoryId: string | null;
  categoryName: string;
  stockInicial: number;
  compras: number;
  comprasCosto: number;
  stockFinal: number;
  consumo: number;
  costoConsumo: number;
  unitCost: number;
}

interface CategorySummary {
  categoryId: string;
  categoryName: string;
  totalConsumo: number;
  items: CMVLineItem[];
}

interface IngredientCategory {
  id: string;
  name: string;
  display_order: number;
}

export default function LocalCMVReport() {
  const { branch } = useOutletContext<ContextType>();
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return format(startOfMonth(subMonths(now, 1)), 'yyyy-MM');
  });
  const [cmvData, setCmvData] = useState<CMVLineItem[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['alimentos']));

  // Generate month options (last 12 months)
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = subMonths(now, i);
      options.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy', { locale: es }),
      });
    }
    return options;
  }, []);

  useEffect(() => {
    fetchCMVData();
  }, [branch.id, selectedMonth]);

  async function fetchCMVData() {
    setLoading(true);
    
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));
    const prevMonthEnd = endOfMonth(subMonths(monthStart, 1));

    try {
      // 1. Get all ingredient categories
      const { data: ingredientCategories } = await supabase
        .from('ingredient_categories')
        .select('id, name, display_order')
        .eq('is_active', true)
        .order('display_order');
      
      const categoriesMap = new Map<string, string>(
        ingredientCategories?.map(c => [c.id, c.name]) || []
      );

      // 2. Get all ingredients with their category
      const { data: ingredients } = await supabase
        .from('ingredients')
        .select('*')
        .eq('is_active', true);

      if (!ingredients) {
        setCmvData([]);
        setLoading(false);
        return;
      }

      // 2. Get stock at start of month (from last monthly count of previous month)
      const { data: initialCount } = await supabase
        .from('inventory_counts')
        .select('id, count_date')
        .eq('branch_id', branch.id)
        .eq('count_type', 'monthly')
        .eq('status', 'completed')
        .lte('count_date', prevMonthEnd.toISOString())
        .order('count_date', { ascending: false })
        .limit(1)
        .single();

      // 3. Get stock at end of month (from monthly count of current month)
      const { data: finalCount } = await supabase
        .from('inventory_counts')
        .select('id, count_date')
        .eq('branch_id', branch.id)
        .eq('count_type', 'monthly')
        .eq('status', 'completed')
        .gte('count_date', monthStart.toISOString())
        .lte('count_date', monthEnd.toISOString())
        .order('count_date', { ascending: false })
        .limit(1)
        .single();

      // Get count lines if counts exist
      let initialLines: Map<string, number> = new Map();
      let finalLines: Map<string, number> = new Map();

      if (initialCount) {
        const { data } = await supabase
          .from('inventory_count_lines')
          .select('ingredient_id, counted_quantity')
          .eq('count_id', initialCount.id);
        
        data?.forEach(l => {
          if (l.ingredient_id && l.counted_quantity !== null) {
            initialLines.set(l.ingredient_id, l.counted_quantity);
          }
        });
      }

      if (finalCount) {
        const { data } = await supabase
          .from('inventory_count_lines')
          .select('ingredient_id, counted_quantity')
          .eq('count_id', finalCount.id);
        
        data?.forEach(l => {
          if (l.ingredient_id && l.counted_quantity !== null) {
            finalLines.set(l.ingredient_id, l.counted_quantity);
          }
        });
      }

      // 4. Get purchases during the month
      const { data: movements } = await supabase
        .from('stock_movements')
        .select('ingredient_id, quantity, unit_cost, type')
        .eq('branch_id', branch.id)
        .eq('type', 'purchase')
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString());

      // Aggregate purchases
      const purchases: Map<string, { qty: number; cost: number }> = new Map();
      movements?.forEach(m => {
        if (m.ingredient_id) {
          const existing = purchases.get(m.ingredient_id) || { qty: 0, cost: 0 };
          existing.qty += Math.abs(m.quantity);
          existing.cost += Math.abs(m.quantity) * (m.unit_cost || 0);
          purchases.set(m.ingredient_id, existing);
        }
      });

      // 5. Get current costs from branch_ingredients
      const { data: branchIngredients } = await supabase
        .from('branch_ingredients')
        .select('ingredient_id, last_cost')
        .eq('branch_id', branch.id);

      const costsMap = new Map(
        branchIngredients?.map(bi => [bi.ingredient_id, bi.last_cost || 0]) || []
      );

      // 6. Calculate CMV for each ingredient
      const cmvLines: CMVLineItem[] = ingredients.map(ing => {
        const stockInicial = initialLines.get(ing.id) || 0;
        const stockFinal = finalLines.get(ing.id) || 0;
        const purchaseData = purchases.get(ing.id) || { qty: 0, cost: 0 };
        const unitCost = costsMap.get(ing.id) || ing.cost_per_unit || 0;
        
        // CMV Formula: Stock Inicial + Compras - Stock Final = Consumo
        const consumo = stockInicial + purchaseData.qty - stockFinal;
        const costoConsumo = consumo * unitCost;
        
        const categoryId = (ing as any).category_id || null;
        const categoryName = categoryId ? (categoriesMap.get(categoryId) || 'Sin Categoría') : 'Sin Categoría';

        return {
          ingredientId: ing.id,
          ingredientName: ing.name,
          unit: ing.unit,
          categoryId,
          categoryName,
          stockInicial,
          compras: purchaseData.qty,
          comprasCosto: purchaseData.cost,
          stockFinal,
          consumo: Math.max(0, consumo),
          costoConsumo: Math.max(0, costoConsumo),
          unitCost,
        };
      });

      setCmvData(cmvLines);
    } catch (error) {
      handleError(error, { userMessage: 'Error al cargar datos de CMV', context: 'LocalCMVReport.fetchCMVData' });
    } finally {
      setLoading(false);
    }
  }

  // Group by category
  const categorySummaries: CategorySummary[] = useMemo(() => {
    const grouped = new Map<string, CMVLineItem[]>();
    
    cmvData.forEach(item => {
      const catKey = item.categoryId || 'sin-categoria';
      if (!grouped.has(catKey)) {
        grouped.set(catKey, []);
      }
      grouped.get(catKey)!.push(item);
    });

    return Array.from(grouped.entries())
      .map(([categoryId, items]) => ({
        categoryId,
        categoryName: items[0]?.categoryName || 'Sin Categoría',
        totalConsumo: items.reduce((sum, i) => sum + i.costoConsumo, 0),
        items: items.sort((a, b) => b.costoConsumo - a.costoConsumo),
      }))
      .sort((a, b) => b.totalConsumo - a.totalConsumo);
  }, [cmvData]);

  const totalCMV = categorySummaries.reduce((sum, cat) => sum + cat.totalConsumo, 0);

  const formatPrice = (n: number) => 
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);

  const formatNumber = (n: number) => 
    new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(n);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleExport = () => {
    const exportRows = categorySummaries.flatMap(cat => [
      // Category header row
      { Categoría: cat.categoryName, Ingrediente: '', Unidad: '', 'Stock Inicial': '', Compras: '', 'Stock Final': '', Consumo: '', 'Costo Unit.': '', 'Costo Total': formatPrice(cat.totalConsumo) },
      // Item rows
      ...cat.items.map(item => ({
        Categoría: '',
        Ingrediente: item.ingredientName,
        Unidad: item.unit,
        'Stock Inicial': formatNumber(item.stockInicial),
        Compras: formatNumber(item.compras),
        'Stock Final': formatNumber(item.stockFinal),
        Consumo: formatNumber(item.consumo),
        'Costo Unit.': formatPrice(item.unitCost),
        'Costo Total': formatPrice(item.costoConsumo),
      })),
    ]);

    // Add total row
    exportRows.push({
      Categoría: 'TOTAL',
      Ingrediente: '',
      Unidad: '',
      'Stock Inicial': '',
      Compras: '',
      'Stock Final': '',
      Consumo: '',
      'Costo Unit.': '',
      'Costo Total': formatPrice(totalCMV),
    });

    const ws = utils.json_to_sheet(exportRows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'CMV');
    writeFile(wb, `CMV_${branch.name}_${selectedMonth}.xlsx`);
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reporte CMV</h1>
          <p className="text-muted-foreground">Costo de Mercadería Vendida por consumo</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">CMV Total</p>
                <p className="text-2xl font-bold">{formatPrice(totalCMV)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">CMV Alimentos</p>
                <p className="text-2xl font-bold">
                  {formatPrice(categorySummaries.find(c => c.categoryName.toLowerCase().includes('alimento'))?.totalConsumo || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Bebidas</p>
                <p className="text-2xl font-bold">
                  {formatPrice(
                    categorySummaries
                      .filter(c => c.categoryName.toLowerCase().includes('bebida'))
                      .reduce((sum, c) => sum + c.totalConsumo, 0)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Categorías</p>
                <p className="text-2xl font-bold">{categorySummaries.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Desglose por Categoría
          </CardTitle>
          <CardDescription>
            Fórmula: Stock Inicial + Compras - Stock Final = Consumo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {categorySummaries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardCheck className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No hay datos de conteos mensuales para este período</p>
              <p className="text-sm">Realizá un conteo de inventario mensual para calcular el CMV</p>
            </div>
          ) : (
            categorySummaries.map(cat => {
              const isExpanded = expandedCategories.has(cat.categoryId);
              const percentage = totalCMV > 0 ? (cat.totalConsumo / totalCMV) * 100 : 0;

              return (
                <Collapsible key={cat.categoryId} open={isExpanded}>
                  <CollapsibleTrigger asChild>
                    <div 
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => toggleCategory(cat.categoryId)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <div>
                          <p className="font-medium">{cat.categoryName}</p>
                          <p className="text-sm text-muted-foreground">
                            {cat.items.length} ingredientes
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-32 hidden md:block">
                          <Progress value={percentage} className="h-2" />
                        </div>
                        <Badge variant="secondary" className="text-base font-bold">
                          {formatPrice(cat.totalConsumo)}
                        </Badge>
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ingrediente</TableHead>
                          <TableHead className="text-right">Stock Inicial</TableHead>
                          <TableHead className="text-right">Compras</TableHead>
                          <TableHead className="text-right">Stock Final</TableHead>
                          <TableHead className="text-right">Consumo</TableHead>
                          <TableHead className="text-right">Costo Unit.</TableHead>
                          <TableHead className="text-right">Costo Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cat.items.map(item => (
                          <TableRow key={item.ingredientId}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{item.ingredientName}</p>
                                <p className="text-xs text-muted-foreground">{item.unit}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatNumber(item.stockInicial)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-emerald-600 dark:text-emerald-400">
                              +{formatNumber(item.compras)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatNumber(item.stockFinal)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium">
                              {formatNumber(item.consumo)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                              {formatPrice(item.unitCost)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold">
                              {formatPrice(item.costoConsumo)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Total Summary */}
      {categorySummaries.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-medium">Total CMV del Mes</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedMonth + '-01'), 'MMMM yyyy', { locale: es })}
                </p>
              </div>
              <p className="text-3xl font-bold text-primary">
                {formatPrice(totalCMV)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
