import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Package, TrendingDown } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface IngredientConsumptionProps {
  branchId: string;
  days?: number;
}

interface ConsumptionData {
  ingredient_id: string;
  ingredient_name: string;
  unit: string;
  category: string | null;
  total_consumed: number;
  total_cost: number;
}

const COLORS = ['#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function IngredientConsumption({ branchId, days = 30 }: IngredientConsumptionProps) {
  const [data, setData] = useState<ConsumptionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConsumption();
  }, [branchId, days]);

  async function fetchConsumption() {
    setLoading(true);

    const startDate = subDays(new Date(), days);

    // Fetch stock movements (sales/waste)
    const { data: movements, error } = await supabase
      .from('stock_movements')
      .select(`
        ingredient_id,
        quantity,
        type,
        unit_cost,
        ingredients!inner(name, unit, category)
      `)
      .eq('branch_id', branchId)
      .in('type', ['sale', 'waste'])
      .gte('created_at', startDate.toISOString());

    if (error || !movements) {
      setLoading(false);
      return;
    }

    // Aggregate by ingredient
    const aggregated = new Map<string, ConsumptionData>();

    movements.forEach(mov => {
      const ing = mov.ingredients as any;
      const existing = aggregated.get(mov.ingredient_id) || {
        ingredient_id: mov.ingredient_id,
        ingredient_name: ing.name,
        unit: ing.unit,
        category: ing.category,
        total_consumed: 0,
        total_cost: 0,
      };

      const consumed = Math.abs(mov.quantity);
      const cost = consumed * (mov.unit_cost || 0);

      aggregated.set(mov.ingredient_id, {
        ...existing,
        total_consumed: existing.total_consumed + consumed,
        total_cost: existing.total_cost + cost,
      });
    });

    // Sort by cost (highest first)
    const sorted = Array.from(aggregated.values())
      .sort((a, b) => b.total_cost - a.total_cost);

    setData(sorted);
    setLoading(false);
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatNumber = (n: number) => new Intl.NumberFormat('es-AR').format(n);

  const totalCost = data.reduce((sum, d) => sum + d.total_cost, 0);

  // Prepare chart data (top 8 + others)
  const chartData = data.slice(0, 8).map(d => ({
    name: d.ingredient_name,
    value: d.total_cost,
  }));

  const othersValue = data.slice(8).reduce((sum, d) => sum + d.total_cost, 0);
  if (othersValue > 0) {
    chartData.push({ name: 'Otros', value: othersValue });
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5" />
            Consumo de Ingredientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="w-5 h-5" />
          Consumo de Ingredientes
          <Badge variant="outline" className="ml-2">Últimos {days} días</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No hay consumos registrados en el período</p>
          </div>
        ) : (
          <>
            {/* Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {chartData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatPrice(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Summary */}
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Costo Total de Consumo</p>
              <p className="text-3xl font-bold text-primary">{formatPrice(totalCost)}</p>
            </div>

            {/* Table */}
            <div className="max-h-64 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingrediente</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Consumido</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.slice(0, 15).map(item => (
                    <TableRow key={item.ingredient_id}>
                      <TableCell className="font-medium">{item.ingredient_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.category || 'Sin categoría'}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(item.total_consumed)} {item.unit}
                      </TableCell>
                      <TableCell className="text-right font-mono text-primary">
                        {formatPrice(item.total_cost)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
