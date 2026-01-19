import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  RefreshCw, Calendar, TrendingUp, TrendingDown, 
  DollarSign, ShoppingBag, Receipt, Users,
  ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

type PeriodType = 'current' | 'previous' | 'quarter';

interface BranchKPI {
  id: string;
  name: string;
  totalRevenue: number;
  totalOrders: number;
  avgTicket: number;
  totalUnits: number;
  deliveryPercent: number;
  cancelRate: number;
}

export default function BranchPerformance() {
  const { accessibleBranches, loading: roleLoading } = useUserRole();
  const [period, setPeriod] = useState<PeriodType>('current');
  const [loading, setLoading] = useState(true);
  const [branchKPIs, setBranchKPIs] = useState<BranchKPI[]>([]);
  const [totals, setTotals] = useState({ revenue: 0, orders: 0, avgTicket: 0, units: 0 });

  const getPeriodDates = (p: PeriodType): { start: Date; end: Date } => {
    const now = new Date();
    switch (p) {
      case 'current':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'previous':
        const prevMonth = subMonths(now, 1);
        return { start: startOfMonth(prevMonth), end: endOfMonth(prevMonth) };
      case 'quarter':
        const threeMonthsAgo = subMonths(now, 3);
        return { start: startOfMonth(threeMonthsAgo), end: endOfMonth(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      const { start, end } = getPeriodDates(period);
      
      // Fetch orders for all branches
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          branch_id,
          total,
          status,
          order_type,
          order_items(quantity)
        `)
        .gte('created_at', format(start, 'yyyy-MM-dd'))
        .lte('created_at', format(end, 'yyyy-MM-dd'));

      if (error) throw error;

      // Process data by branch
      const branchData: Record<string, BranchKPI> = {};
      
      accessibleBranches.forEach(branch => {
        branchData[branch.id] = {
          id: branch.id,
          name: branch.name,
          totalRevenue: 0,
          totalOrders: 0,
          avgTicket: 0,
          totalUnits: 0,
          deliveryPercent: 0,
          cancelRate: 0
        };
      });

      let globalRevenue = 0;
      let globalOrders = 0;
      let globalUnits = 0;

      (orders || []).forEach(order => {
        if (!branchData[order.branch_id]) return;
        
        const isDelivered = order.status === 'delivered';
        const isCancelled = order.status === 'cancelled';
        const isDelivery = order.order_type === 'delivery';
        const units = order.order_items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

        branchData[order.branch_id].totalOrders += 1;
        
        if (isDelivered) {
          branchData[order.branch_id].totalRevenue += order.total || 0;
          branchData[order.branch_id].totalUnits += units;
          globalRevenue += order.total || 0;
          globalUnits += units;
        }
        
        if (isCancelled) {
          branchData[order.branch_id].cancelRate += 1;
        }
        
        if (isDelivery) {
          branchData[order.branch_id].deliveryPercent += 1;
        }
        
        globalOrders += 1;
      });

      // Calculate averages and percentages
      const processedBranches = Object.values(branchData).map(branch => {
        const deliveredOrders = (orders || []).filter(
          o => o.branch_id === branch.id && o.status === 'delivered'
        ).length;
        
        return {
          ...branch,
          avgTicket: deliveredOrders > 0 ? branch.totalRevenue / deliveredOrders : 0,
          deliveryPercent: branch.totalOrders > 0 
            ? (branch.deliveryPercent / branch.totalOrders) * 100 
            : 0,
          cancelRate: branch.totalOrders > 0 
            ? (branch.cancelRate / branch.totalOrders) * 100 
            : 0
        };
      }).sort((a, b) => b.totalRevenue - a.totalRevenue);

      setBranchKPIs(processedBranches);
      setTotals({
        revenue: globalRevenue,
        orders: globalOrders,
        avgTicket: globalOrders > 0 ? globalRevenue / globalOrders : 0,
        units: globalUnits
      });

    } catch (error: any) {
      console.error('Error fetching performance:', error);
      toast.error('Error al cargar datos de performance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!roleLoading && accessibleBranches.length > 0) {
      fetchPerformanceData();
    }
  }, [period, roleLoading, accessibleBranches]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(value);

  const getPercentageOfTotal = (value: number, total: number) => {
    if (total === 0) return 0;
    return (value / total) * 100;
  };

  const { start, end } = getPeriodDates(period);
  const periodLabel = `${format(start, "d 'de' MMMM", { locale: es })} - ${format(end, "d 'de' MMMM, yyyy", { locale: es })}`;

  if (roleLoading) {
    return (
      <div className="flex justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Performance Locales</h1>
          <p className="text-muted-foreground">{periodLabel}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Este mes</SelectItem>
              <SelectItem value="previous">Mes anterior</SelectItem>
              <SelectItem value="quarter">Último trimestre</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={fetchPerformanceData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Global Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Facturación Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.revenue)}</div>
            <p className="text-xs text-muted-foreground">
              {branchKPIs.length} sucursales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.orders.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.avgTicket)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Unidades Vendidas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.units.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Branch Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Comparativo por Sucursal</CardTitle>
          <CardDescription>Ranking de performance ordenado por facturación</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : branchKPIs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay datos para el período seleccionado
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead className="text-right">Facturación</TableHead>
                  <TableHead className="text-right">% del Total</TableHead>
                  <TableHead className="text-right">Pedidos</TableHead>
                  <TableHead className="text-right">Ticket Prom.</TableHead>
                  <TableHead className="text-right">Delivery %</TableHead>
                  <TableHead className="text-right">Cancel. %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branchKPIs.map((branch, index) => {
                  const percentOfTotal = getPercentageOfTotal(branch.totalRevenue, totals.revenue);
                  return (
                    <TableRow key={branch.id}>
                      <TableCell>
                        <Badge variant={index === 0 ? 'default' : index < 3 ? 'secondary' : 'outline'}>
                          {index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{branch.name}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(branch.totalRevenue)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Progress value={percentOfTotal} className="w-16 h-2" />
                          <span className="text-xs text-muted-foreground w-12">
                            {percentOfTotal.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{branch.totalOrders}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(branch.avgTicket)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="text-xs">
                          {branch.deliveryPercent.toFixed(0)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          variant={branch.cancelRate > 5 ? 'destructive' : 'outline'} 
                          className="text-xs"
                        >
                          {branch.cancelRate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
