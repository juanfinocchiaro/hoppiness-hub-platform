import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, Package, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

interface StockMovement {
  id: string;
  ingredient_id: string;
  quantity: number;
  type: string;
  notes: string | null;
  unit_cost: number | null;
  created_at: string;
  ingredient?: { name: string; unit: string };
}

interface StockMovementHistoryProps {
  branchId: string;
  ingredientId?: string;
  limit?: number;
}

const MOVEMENT_TYPE_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; isPositive: boolean }> = {
  purchase: { label: 'Compra', variant: 'default', isPositive: true },
  sale: { label: 'Venta', variant: 'secondary', isPositive: false },
  adjustment: { label: 'Ajuste', variant: 'outline', isPositive: true },
  waste: { label: 'Merma', variant: 'destructive', isPositive: false },
  transfer_in: { label: 'Transfer. Entrada', variant: 'default', isPositive: true },
  transfer_out: { label: 'Transfer. Salida', variant: 'destructive', isPositive: false },
  count_adjust: { label: 'Ajuste Inventario', variant: 'outline', isPositive: true },
  production: { label: 'Producción', variant: 'secondary', isPositive: false },
};

export default function StockMovementHistory({ branchId, ingredientId, limit = 50 }: StockMovementHistoryProps) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    fetchMovements();
  }, [branchId, ingredientId]);

  async function fetchMovements() {
    setLoading(true);
    try {
      let query = supabase
        .from('stock_movements')
        .select(`
          id,
          ingredient_id,
          quantity,
          type,
          notes,
          unit_cost,
          created_at,
          ingredient:ingredients(name, unit)
        `)
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (ingredientId) {
        query = query.eq('ingredient_id', ingredientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMovements((data || []) as unknown as StockMovement[]);
    } catch (error) {
      console.error('Error fetching movements:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredMovements = movements.filter(m => {
    const matchesSearch = !search || 
      m.ingredient?.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.notes?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || m.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const formatNumber = (n: number) => new Intl.NumberFormat('es-AR').format(Math.abs(n));
  const formatCurrency = (n: number) => new Intl.NumberFormat('es-AR', { 
    style: 'currency', 
    currency: 'ARS',
    minimumFractionDigits: 0 
  }).format(n);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Historial de Movimientos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Historial de Movimientos
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchMovements}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar ingrediente o nota..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Todos los tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {Object.entries(MOVEMENT_TYPE_CONFIG).map(([value, config]) => (
                <SelectItem key={value} value={value}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Ingrediente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Costo Unit.</TableHead>
                <TableHead>Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMovements.map(movement => {
                const config = MOVEMENT_TYPE_CONFIG[movement.type] || { 
                  label: movement.type, 
                  variant: 'outline' as const, 
                  isPositive: movement.quantity > 0 
                };
                const isPositive = movement.quantity > 0;

                return (
                  <TableRow key={movement.id}>
                    <TableCell className="whitespace-nowrap">
                      <div className="text-sm">
                        {format(new Date(movement.created_at), 'dd/MM/yy', { locale: es })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(movement.created_at), 'HH:mm')}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {movement.ingredient?.name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={config.variant}>
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`flex items-center justify-end gap-1 font-mono ${
                        isPositive ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {isPositive ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {isPositive ? '+' : '-'}{formatNumber(movement.quantity)}
                        <span className="text-muted-foreground text-xs ml-1">
                          {movement.ingredient?.unit}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {movement.unit_cost ? formatCurrency(movement.unit_cost) : '-'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {movement.notes || '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredMovements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No se encontraron movimientos
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
