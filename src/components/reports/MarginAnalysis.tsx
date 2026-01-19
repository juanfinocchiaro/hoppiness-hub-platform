import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface MarginAnalysisProps {
  branchId?: string;
}

interface ProductMargin {
  id: string;
  name: string;
  price: number;
  cost: number;
  margin: number;
  marginPercent: number;
}

export default function MarginAnalysis({ branchId }: MarginAnalysisProps) {
  const [products, setProducts] = useState<ProductMargin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMargins();
  }, [branchId]);

  async function fetchMargins() {
    setLoading(true);

    // Fetch products
    const { data: productsData } = await supabase
      .from('products')
      .select('id, name, price')
      .eq('is_available', true)
      .order('name');

    if (!productsData) {
      setLoading(false);
      return;
    }

    // Fetch recipes with ingredient costs
    const { data: recipes } = await supabase
      .from('product_recipes')
      .select(`
        product_id,
        quantity_required,
        ingredients!inner(cost_per_unit)
      `);

    // Calculate costs from recipes
    const costMap = new Map<string, number>();
    
    recipes?.forEach(recipe => {
      const ingredientCost = (recipe.ingredients as any)?.cost_per_unit || 0;
      const recipeCost = recipe.quantity_required * ingredientCost;
      const existing = costMap.get(recipe.product_id) || 0;
      costMap.set(recipe.product_id, existing + recipeCost);
    });

    // Calculate margins
    const margins: ProductMargin[] = productsData.map(product => {
      const cost = costMap.get(product.id) || 0;
      const margin = product.price - cost;
      const marginPercent = product.price > 0 ? (margin / product.price) * 100 : 0;

      return {
        id: product.id,
        name: product.name,
        price: product.price,
        cost,
        margin,
        marginPercent,
      };
    });

    // Sort by margin percent (lowest first to highlight issues)
    margins.sort((a, b) => a.marginPercent - b.marginPercent);

    setProducts(margins);
    setLoading(false);
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getMarginColor = (percent: number) => {
    if (percent < 30) return 'text-destructive';
    if (percent < 50) return 'text-amber-500';
    return 'text-green-600';
  };

  const getMarginBadge = (percent: number) => {
    if (percent < 30) return 'destructive';
    if (percent < 50) return 'secondary';
    return 'default';
  };

  const avgMargin = products.length > 0 
    ? products.reduce((sum, p) => sum + p.marginPercent, 0) / products.length 
    : 0;

  const lowMarginCount = products.filter(p => p.marginPercent < 30).length;
  const noRecipeCount = products.filter(p => p.cost === 0).length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Análisis de Márgenes
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
          <DollarSign className="w-5 h-5" />
          Análisis de Márgenes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Margen Promedio</p>
            <p className={`text-2xl font-bold ${getMarginColor(avgMargin)}`}>
              {avgMargin.toFixed(1)}%
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Margen Bajo
            </p>
            <p className="text-2xl font-bold text-destructive">{lowMarginCount}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Sin Receta</p>
            <p className="text-2xl font-bold text-amber-500">{noRecipeCount}</p>
          </div>
        </div>

        {/* Table */}
        <div className="max-h-96 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="text-right">Costo</TableHead>
                <TableHead className="text-right">Margen</TableHead>
                <TableHead className="w-32">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map(product => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {product.name}
                      {product.cost === 0 && (
                        <Badge variant="outline" className="text-xs">Sin receta</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatPrice(product.price)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatPrice(product.cost)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={getMarginColor(product.marginPercent)}>
                      {formatPrice(product.margin)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={Math.min(product.marginPercent, 100)} 
                        className="h-2"
                      />
                      <Badge variant={getMarginBadge(product.marginPercent) as any} className="w-14 justify-center">
                        {product.marginPercent.toFixed(0)}%
                      </Badge>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {products.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No hay productos para analizar</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
