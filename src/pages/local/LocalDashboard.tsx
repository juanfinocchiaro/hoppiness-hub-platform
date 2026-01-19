import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfDay, startOfWeek, startOfMonth, startOfYear, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  DollarSign, 
  Utensils, 
  Receipt, 
  Clock, 
  TrendingUp,
  ShoppingBag,
  Users,
  Truck,
  Store,
  Bike,
  CalendarIcon,
  Filter,
  CheckCircle2
} from 'lucide-react';
import OrdersHeatmap from '@/components/charts/OrdersHeatmap';
import type { Tables, Enums } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;
type SalesChannel = Enums<'sales_channel'>;

interface LocalDashboardProps {
  branch: Branch;
}

interface ChannelStats {
  channel: string;
  revenue: number;
  orders: number;
  label: string;
  icon: React.ReactNode;
}

interface DashboardStats {
  todayRevenue: number;
  todayOrders: number;
  todayItems: number;
  avgTicket: number;
  monthlyRevenue: number;
  monthlyOrders: number;
  pendingOrders: number;
  preparingOrders: number;
  channelStats: ChannelStats[];
}

interface RecentOrder {
  id: string;
  customer_name: string;
  total: number;
  created_at: string;
  sales_channel: string | null;
  order_type: string;
}

type BranchChannel = {
  key: keyof Branch;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
};

type PeriodFilter = 'today' | 'week' | 'month' | 'year' | 'custom';

const branchChannels: BranchChannel[] = [
  { key: 'delivery_enabled', label: 'Delivery', shortLabel: 'DEL', icon: <Truck className="w-3 h-3" /> },
  { key: 'takeaway_enabled', label: 'TakeAway', shortLabel: 'TA', icon: <ShoppingBag className="w-3 h-3" /> },
  { key: 'dine_in_enabled', label: 'Atención Presencial', shortLabel: 'AP', icon: <Users className="w-3 h-3" /> },
  { key: 'rappi_enabled', label: 'Rappi', shortLabel: 'RAP', icon: <Bike className="w-3 h-3" /> },
  { key: 'pedidosya_enabled', label: 'PedidosYa', shortLabel: 'PYA', icon: <Bike className="w-3 h-3" /> },
  { key: 'mercadopago_delivery_enabled', label: 'MP Delivery', shortLabel: 'MPD', icon: <Truck className="w-3 h-3" /> },
];

const channelLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  atencion_presencial: { label: 'Atención Presencial', icon: <Users className="w-4 h-4" /> },
  whatsapp: { label: 'WhatsApp', icon: <Store className="w-4 h-4" /> },
  mas_delivery: { label: 'MásDelivery', icon: <Truck className="w-4 h-4" /> },
  pedidos_ya: { label: 'PedidosYa', icon: <Bike className="w-4 h-4" /> },
  rappi: { label: 'Rappi', icon: <Bike className="w-4 h-4" /> },
  mercadopago_delivery: { label: 'MP Delivery', icon: <Truck className="w-4 h-4" /> },
  web_app: { label: 'Web App', icon: <Store className="w-4 h-4" /> },
  pos_local: { label: 'POS Local', icon: <Receipt className="w-4 h-4" /> },
};

const channelFilterOptions: { value: string; label: string }[] = [
  { value: 'all', label: 'Todos los canales' },
  { value: 'atencion_presencial', label: 'Atención Presencial' },
  { value: 'pos_local', label: 'POS Local' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'web_app', label: 'Web App' },
  { value: 'pedidos_ya', label: 'PedidosYa' },
  { value: 'rappi', label: 'Rappi' },
  { value: 'mercadopago_delivery', label: 'MP Delivery' },
  { value: 'mas_delivery', label: 'MásDelivery' },
];

const periodOptions: { value: PeriodFilter; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mes' },
  { value: 'year', label: 'Este año' },
  { value: 'custom', label: 'Personalizado' },
];

export default function LocalDashboard({ branch }: LocalDashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0,
    todayOrders: 0,
    todayItems: 0,
    avgTicket: 0,
    monthlyRevenue: 0,
    monthlyOrders: 0,
    pendingOrders: 0,
    preparingOrders: 0,
    channelStats: [],
  });
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('today');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  // Calculate date range based on period filter
  const dateRange = useMemo(() => {
    const now = new Date();
    let from: Date;
    let to = now;

    switch (periodFilter) {
      case 'today':
        from = startOfDay(now);
        break;
      case 'week':
        from = startOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        from = startOfMonth(now);
        break;
      case 'year':
        from = startOfYear(now);
        break;
      case 'custom':
        from = customDateRange.from;
        to = customDateRange.to;
        break;
      default:
        from = startOfDay(now);
    }

    return { from: from.toISOString(), to: to.toISOString() };
  }, [periodFilter, customDateRange]);

  useEffect(() => {
    async function fetchStats() {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Build base query for orders with filters
      let ordersQuery = supabase
        .from('orders')
        .select('id, total, sales_channel')
        .eq('branch_id', branch.id)
        .gte('created_at', dateRange.from)
        .lte('created_at', dateRange.to)
        .in('status', ['delivered', 'ready', 'preparing', 'confirmed']);

      if (channelFilter !== 'all') {
        ordersQuery = ordersQuery.eq('sales_channel', channelFilter as SalesChannel);
      }

      const [filteredOrdersRes, monthOrdersRes, itemsRes, pendingRes, recentOrdersRes] = await Promise.all([
        // Filtered orders
        ordersQuery,
        
        // Monthly orders (always full month for comparison)
        supabase
          .from('orders')
          .select('id, total')
          .eq('branch_id', branch.id)
          .gte('created_at', monthStart)
          .in('status', ['delivered', 'ready', 'preparing', 'confirmed']),
        
        // Items for the filtered period
        supabase
          .from('order_items')
          .select('quantity, orders!inner(branch_id, created_at, sales_channel)')
          .eq('orders.branch_id', branch.id)
          .gte('orders.created_at', dateRange.from)
          .lte('orders.created_at', dateRange.to),
        
        // Pending and preparing orders
        supabase
          .from('orders')
          .select('status')
          .eq('branch_id', branch.id)
          .in('status', ['pending', 'preparing', 'confirmed']),

        // Recent completed orders
        (() => {
          let recentQuery = supabase
            .from('orders')
            .select('id, customer_name, total, created_at, sales_channel, order_type')
            .eq('branch_id', branch.id)
            .eq('status', 'delivered')
            .order('created_at', { ascending: false })
            .limit(10);
          
          if (channelFilter !== 'all') {
            recentQuery = recentQuery.eq('sales_channel', channelFilter as SalesChannel);
          }
          return recentQuery;
        })(),
      ]);

      const filteredOrders = filteredOrdersRes.data || [];
      const monthOrders = monthOrdersRes.data || [];
      let filteredItems = itemsRes.data || [];
      const pendingOrders = pendingRes.data || [];

      // Filter items by channel if needed
      if (channelFilter !== 'all') {
        filteredItems = filteredItems.filter((item: any) => 
          item.orders?.sales_channel === channelFilter
        );
      }

      const filteredRevenue = filteredOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
      const monthlyRevenue = monthOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
      const itemsCount = filteredItems.reduce((sum, i) => sum + (i.quantity || 0), 0);

      // Calculate channel stats
      const channelMap = new Map<string, { revenue: number; orders: number }>();
      filteredOrders.forEach(order => {
        const channel = order.sales_channel || 'atencion_presencial';
        const current = channelMap.get(channel) || { revenue: 0, orders: 0 };
        channelMap.set(channel, {
          revenue: current.revenue + Number(order.total || 0),
          orders: current.orders + 1,
        });
      });

      const channelStats: ChannelStats[] = Array.from(channelMap.entries())
        .map(([channel, data]) => ({
          channel,
          revenue: data.revenue,
          orders: data.orders,
          label: channelLabels[channel]?.label || channel,
          icon: channelLabels[channel]?.icon || <Store className="w-4 h-4" />,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      setStats({
        todayRevenue: filteredRevenue,
        todayOrders: filteredOrders.length,
        todayItems: itemsCount,
        avgTicket: filteredOrders.length > 0 ? filteredRevenue / filteredOrders.length : 0,
        monthlyRevenue,
        monthlyOrders: monthOrders.length,
        pendingOrders: pendingOrders.filter(o => o.status === 'pending').length,
        preparingOrders: pendingOrders.filter(o => o.status === 'preparing' || o.status === 'confirmed').length,
        channelStats,
      });

      setRecentOrders(recentOrdersRes.data || []);
      setLoading(false);
    }

    fetchStats();

    // Refresh every minute
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [branch.id, dateRange, channelFilter]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(value);

  const getPeriodLabel = () => {
    switch (periodFilter) {
      case 'today': return 'Hoy';
      case 'week': return 'Esta Semana';
      case 'month': return 'Este Mes';
      case 'year': return 'Este Año';
      case 'custom': return `${format(customDateRange.from, 'dd/MM')} - ${format(customDateRange.to, 'dd/MM')}`;
      default: return 'Hoy';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{branch.name}</h1>
          <p className="text-muted-foreground">{branch.address}, {branch.city}</p>
        </div>
        <Badge 
          variant={branch.is_active ? 'default' : 'secondary'}
          className={branch.is_active ? 'bg-success text-success-foreground' : ''}
        >
          {branch.is_active ? 'Abierto' : 'Cerrado'}
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            
            {/* Channel Filter */}
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Canal de venta" />
              </SelectTrigger>
              <SelectContent>
                {channelFilterOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Period Filter */}
            <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Custom Date Range Picker */}
            {periodFilter === 'custom' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    {format(customDateRange.from, 'dd/MM/yy', { locale: es })} - {format(customDateRange.to, 'dd/MM/yy', { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{ from: customDateRange.from, to: customDateRange.to }}
                    onSelect={(range) => {
                      if (range?.from && range?.to) {
                        setCustomDateRange({ from: range.from, to: range.to });
                      }
                    }}
                    locale={es}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Channels */}
      <div className="flex flex-wrap gap-2">
        {branchChannels.map(channel => {
          const isEnabled = branch[channel.key] as boolean ?? false;
          return (
            <Badge 
              key={channel.key}
              variant={isEnabled ? 'default' : 'outline'}
              className={isEnabled ? 'bg-primary' : 'text-muted-foreground'}
            >
              {channel.icon}
              <span className="ml-1">{channel.label}</span>
            </Badge>
          );
        })}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ventas - {getPeriodLabel()}
            </CardTitle>
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.todayRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.todayOrders} pedidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unidades - {getPeriodLabel()}
            </CardTitle>
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Utensils className="w-5 h-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayItems}</div>
            <p className="text-xs text-muted-foreground mt-1">
              productos vendidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ticket Promedio
            </CardTitle>
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.avgTicket)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              por pedido
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pedidos Activos
            </CardTitle>
            <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders + stats.preparingOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.pendingOrders} pendientes, {stats.preparingOrders} preparando
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sales by Channel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Ventas por Canal - {getPeriodLabel()}
          </CardTitle>
          <CardDescription>
            Desglose de ventas por canal de venta
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.channelStats.length > 0 ? (
            <div className="space-y-3">
              {stats.channelStats.map((channel) => {
                const percentage = stats.todayRevenue > 0 
                  ? (channel.revenue / stats.todayRevenue) * 100 
                  : 0;
                return (
                  <div key={channel.channel} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      {channel.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm truncate">{channel.label}</span>
                        <span className="text-sm font-semibold">{formatCurrency(channel.revenue)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-16 text-right">
                          {channel.orders} pedidos
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Sin ventas en este período</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Resumen del Mes
          </CardTitle>
          <CardDescription>
            Estadísticas desde el 1° del mes actual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                <DollarSign className="w-4 h-4" />
                Facturación
              </div>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(stats.monthlyRevenue)}
              </div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                <ShoppingBag className="w-4 h-4" />
                Total Pedidos
              </div>
              <div className="text-2xl font-bold text-primary">
                {stats.monthlyOrders.toLocaleString('es-AR')}
              </div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                <Receipt className="w-4 h-4" />
                Ticket Promedio
              </div>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(stats.monthlyOrders > 0 ? stats.monthlyRevenue / stats.monthlyOrders : 0)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branch Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            Información del Local
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Horario de Atención</p>
              <p className="font-medium">
                {branch.opening_time?.slice(0, 5)} - {branch.closing_time?.slice(0, 5)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tiempo de Preparación Est.</p>
              <p className="font-medium">{branch.estimated_prep_time_min || 20} minutos</p>
            </div>
            {branch.phone && (
              <div>
                <p className="text-sm text-muted-foreground">Teléfono</p>
                <p className="font-medium">{branch.phone}</p>
              </div>
            )}
            {branch.email && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{branch.email}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Completed Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Últimos 10 Pedidos Completados
          </CardTitle>
          <CardDescription>
            Pedidos entregados más recientes {channelFilter !== 'all' ? `(${channelFilterOptions.find(o => o.value === channelFilter)?.label})` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentOrders.length > 0 ? (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    </div>
                    <div>
                      <p className="font-medium">{order.customer_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{format(new Date(order.created_at), 'dd/MM HH:mm', { locale: es })}</span>
                        <Badge variant="outline" className="text-xs">
                          {channelLabels[order.sales_channel || 'atencion_presencial']?.label || order.sales_channel}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(order.total)}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {order.order_type === 'dine_in' ? 'Salón' : order.order_type === 'takeaway' ? 'TakeAway' : 'Delivery'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Sin pedidos completados</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orders Heatmap */}
      <OrdersHeatmap branchId={branch.id} />
    </div>
  );
}
