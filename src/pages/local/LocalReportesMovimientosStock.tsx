import { useState } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Search, Download, Calendar, Package, ArrowUpCircle, ArrowDownCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface StockMovement {
  id: string;
  created_at: string;
  ingredient_id: string;
  ingredient_name: string;
  type: string;
  quantity: number;
  unit_cost: number | null;
  notes: string | null;
  user_name: string | null;
}

const MOVEMENT_TYPES = [
  { value: 'purchase', label: 'Compra', icon: ArrowUpCircle, color: 'text-primary' },
  { value: 'sale', label: 'Venta', icon: ArrowDownCircle, color: 'text-muted-foreground' },
  { value: 'adjustment', label: 'Ajuste', icon: RefreshCw, color: 'text-warning' },
  { value: 'waste', label: 'Merma', icon: AlertTriangle, color: 'text-destructive' },
  { value: 'count_adjust', label: 'Conteo', icon: Package, color: 'text-primary' },
  { value: 'transfer_in', label: 'Transferencia (entrada)', icon: ArrowUpCircle, color: 'text-primary' },
  { value: 'transfer_out', label: 'Transferencia (salida)', icon: ArrowDownCircle, color: 'text-warning' },
];

export default function LocalReportesMovimientosStock() {
  const { branchId } = useParams();
  const { branch } = useOutletContext<{ branch: Branch }>();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [ingredientFilter, setIngredientFilter] = useState<string>('all');
  const [period, setPeriod] = useState<string>('this_month');

  // Get date range
  const getDateRange = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    switch (period) {
      case 'today':
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return { start: today, end: now };
      case 'this_week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        return { start: startOfWeek, end: now };
      case 'this_month':
        return { start: startOfMonth, end: now };
      case 'last_month':
        return { start: startOfLastMonth, end: endOfLastMonth };
      default:
        return { start: startOfMonth, end: now };
    }
  };

  // Fetch ingredients for filter
  const { data: ingredients } = useQuery({
    queryKey: ['ingredients-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ingredients')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
  });

  // Fetch movements
  const { data: movements, isLoading } = useQuery({
    queryKey: ['stock-movements', branchId, period, typeFilter, ingredientFilter],
    queryFn: async () => {
      const dateRange = getDateRange();
      
      let query = supabase
        .from('stock_movements')
        .select(`
          id,
          created_at,
          ingredient_id,
          type,
          quantity,
          unit_cost,
          notes,
          ingredients!inner(name)
        `)
        .eq('branch_id', branchId)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .order('created_at', { ascending: false });
      
      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter as any);
      }
      
      if (ingredientFilter !== 'all') {
        query = query.eq('ingredient_id', ingredientFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map((mov: any) => ({
        id: mov.id,
        created_at: mov.created_at,
        ingredient_id: mov.ingredient_id,
        ingredient_name: mov.ingredients?.name || 'Desconocido',
        type: mov.type,
        quantity: mov.quantity,
        unit_cost: mov.unit_cost,
        notes: mov.notes,
        user_name: null,
      })) as StockMovement[];
    },
    enabled: !!branchId,
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeInfo = (type: string) => {
    return MOVEMENT_TYPES.find(t => t.value === type) || {
      value: type,
      label: type,
      icon: Package,
      color: 'text-muted-foreground',
    };
  };

  // Filter by search
  const filteredMovements = movements?.filter(mov => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      mov.ingredient_name.toLowerCase().includes(q) ||
      mov.notes?.toLowerCase().includes(q)
    );
  }) || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Movimientos de Stock</h1>
          <p className="text-muted-foreground">{branch?.name}</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoy</SelectItem>
            <SelectItem value="this_week">Esta semana</SelectItem>
            <SelectItem value="this_month">Este mes</SelectItem>
            <SelectItem value="last_month">Mes anterior</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {MOVEMENT_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={ingredientFilter} onValueChange={setIngredientFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Ingrediente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {ingredients?.map(ing => (
              <SelectItem key={ing.id} value={ing.id}>{ing.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        {MOVEMENT_TYPES.slice(0, 4).map(t => {
          const Icon = t.icon;
          return (
            <div key={t.value} className="flex items-center gap-1">
              <Icon className={`h-4 w-4 ${t.color}`} />
              <span>{t.label}</span>
            </div>
          );
        })}
      </div>

      {/* Movements Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            Movimientos ({filteredMovements.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Ingrediente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead>Usuario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No hay movimientos en este período
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMovements.map(mov => {
                    const typeInfo = getTypeInfo(mov.type);
                    const Icon = typeInfo.icon;
                    const isPositive = ['purchase', 'transfer_in', 'count_adjust'].includes(mov.type) || 
                      (mov.type === 'adjustment' && mov.quantity > 0);
                    
                    return (
                      <TableRow key={mov.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(mov.created_at)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {mov.ingredient_name}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${typeInfo.color}`} />
                            <span>{typeInfo.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className={`text-right font-medium ${
                          isPositive ? 'text-primary' : 'text-destructive'
                        }`}>
                          {isPositive ? '+' : '-'}{Math.abs(mov.quantity)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {mov.user_name || '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
