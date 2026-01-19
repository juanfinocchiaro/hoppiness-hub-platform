import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Package } from 'lucide-react';

interface ProductRankingProps {
  branchId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

interface RankedProduct {
  product_id: string;
  product_name: string;
  total_quantity: number;
  total_revenue: number;
}

export default function ProductRankingChart({ 
  branchId, 
  startDate, 
  endDate, 
  limit = 10 
}: ProductRankingProps) {
  const [data, setData] = useState<RankedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRanking();
  }, [branchId, startDate, endDate]);

  async function fetchRanking() {
    setLoading(true);
    
    let query = supabase
      .from('order_items')
      .select(`
        product_id,
        quantity,
        unit_price,
        orders!inner(branch_id, status, created_at)
      `)
      .in('orders.status', ['delivered', 'ready']);

    if (branchId) {
      query = query.eq('orders.branch_id', branchId);
    }

    if (startDate) {
      query = query.gte('orders.created_at', startDate.toISOString());
    }

    if (endDate) {
      query = query.lte('orders.created_at', endDate.toISOString());
    }

    const { data: items, error } = await query;

    if (error || !items) {
      setLoading(false);
      return;
    }

    // Fetch product names
    const productIds = [...new Set(items.map(i => i.product_id))];
    const { data: products } = await supabase
      .from('products')
      .select('id, name')
      .in('id', productIds);

    const productMap = new Map(products?.map(p => [p.id, p.name]) || []);

    // Aggregate by product
    const aggregated = new Map<string, { quantity: number; revenue: number }>();
    
    items.forEach(item => {
      const existing = aggregated.get(item.product_id) || { quantity: 0, revenue: 0 };
      aggregated.set(item.product_id, {
        quantity: existing.quantity + item.quantity,
        revenue: existing.revenue + (item.quantity * item.unit_price),
      });
    });

    // Convert to array and sort
    const ranked: RankedProduct[] = Array.from(aggregated.entries())
      .map(([product_id, stats]) => ({
        product_id,
        product_name: productMap.get(product_id) || 'Producto desconocido',
        total_quantity: stats.quantity,
        total_revenue: stats.revenue,
      }))
      .sort((a, b) => b.total_quantity - a.total_quantity)
      .slice(0, limit);

    setData(ranked);
    setLoading(false);
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const COLORS = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5'];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Ranking de Productos
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
          <TrendingUp className="w-5 h-5" />
          Ranking de Productos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No hay datos para el período seleccionado</p>
          </div>
        ) : (
          <>
            <div className="h-64 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ left: 100, right: 20 }}>
                  <XAxis type="number" />
                  <YAxis 
                    type="category" 
                    dataKey="product_name" 
                    width={100}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [value, 'Unidades']}
                    labelStyle={{ color: 'black' }}
                  />
                  <Bar dataKey="total_quantity" radius={[0, 4, 4, 0]}>
                    {data.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top 3 Highlight */}
            <div className="grid grid-cols-3 gap-2">
              {data.slice(0, 3).map((product, index) => (
                <div 
                  key={product.product_id}
                  className="p-3 rounded-lg bg-muted/50 text-center"
                >
                  <Badge variant={index === 0 ? 'default' : 'secondary'} className="mb-1">
                    #{index + 1}
                  </Badge>
                  <p className="font-medium text-sm truncate">{product.product_name}</p>
                  <p className="text-xs text-muted-foreground">{product.total_quantity} unidades</p>
                  <p className="text-xs font-medium text-primary">{formatPrice(product.total_revenue)}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
