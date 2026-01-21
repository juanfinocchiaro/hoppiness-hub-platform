import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
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
  Bike
} from 'lucide-react';
import OrdersHeatmap from '@/components/charts/OrdersHeatmap';
import DashboardFilterBar from '@/components/dashboard/DashboardFilterBar';
import RecentCompletedOrders from '@/components/dashboard/RecentCompletedOrders';
import { RoleWelcomeCard } from '@/components/dashboard/RoleWelcomeCard';
import { DashboardAlerts } from '@/components/dashboard/DashboardAlerts';
import { DashboardFilterProvider, useDashboardFilters } from '@/contexts/DashboardFilterContext';
import { useRoleLanding } from '@/hooks/useRoleLanding';
import { useAuth } from '@/hooks/useAuth';
import type { Tables, Enums } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

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
  filteredRevenue: number;
  filteredOrders: number;
  filteredItems: number;
  avgTicket: number;
  monthlyRevenue: number;
  monthlyOrders: number;
  pendingOrders: number;
  preparingOrders: number;
  channelStats: ChannelStats[];
}

type BranchChannel = {
  key: keyof Branch;
  label: string;
  icon: React.ReactNode;
};

// Tipos de servicio disponibles en sucursal
const branchServiceTypes: BranchChannel[] = [
  { key: 'delivery_enabled', label: 'Delivery', icon: <Truck className="w-3 h-3" /> },
  { key: 'takeaway_enabled', label: 'TakeAway', icon: <ShoppingBag className="w-3 h-3" /> },
  { key: 'dine_in_enabled', label: 'Salón', icon: <Users className="w-3 h-3" /> },
];

// Canales externos (Apps de Delivery)
const branchExternalChannels: BranchChannel[] = [
  { key: 'rappi_enabled', label: 'Rappi', icon: <Bike className="w-3 h-3" /> },
  { key: 'pedidosya_enabled', label: 'PedidosYa', icon: <Bike className="w-3 h-3" /> },
  { key: 'mercadopago_delivery_enabled', label: 'MP Delivery', icon: <Truck className="w-3 h-3" /> },
];

// Canales de venta: Mostrador, Web App, Rappi, PedidosYa, MP Delivery
const channelLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  mostrador: { label: 'Mostrador', icon: <Store className="w-4 h-4" /> },
  webapp: { label: 'Web App', icon: <Store className="w-4 h-4" /> },
  rappi: { label: 'Rappi', icon: <Bike className="w-4 h-4" /> },
  pedidosya: { label: 'PedidosYa', icon: <Bike className="w-4 h-4" /> },
  mp_delivery: { label: 'MP Delivery', icon: <Truck className="w-4 h-4" /> },
  // Legacy mappings for existing data
  pos: { label: 'Mostrador', icon: <Store className="w-4 h-4" /> },
  web: { label: 'Web App', icon: <Store className="w-4 h-4" /> },
};

interface HoursStats {
  monthlyHours: number;
  monthlyItems: number;
  productivity: number;
}

function DashboardContent({ branch }: { branch: Branch }) {
  const { filters, dateRange, periodLabel } = useDashboardFilters();
  const { avatarInfo } = useRoleLanding();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    filteredRevenue: 0,
    filteredOrders: 0,
    filteredItems: 0,
    avgTicket: 0,
    monthlyRevenue: 0,
    monthlyOrders: 0,
    pendingOrders: 0,
    preparingOrders: 0,
    channelStats: [],
  });
  const [hoursStats, setHoursStats] = useState<HoursStats>({
    monthlyHours: 0,
    monthlyItems: 0,
    productivity: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      // Build base query for orders with filters
      let ordersQuery = supabase
        .from('orders')
        .select('id, total, sales_channel')
        .eq('branch_id', branch.id)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .in('status', ['delivered', 'ready', 'preparing', 'confirmed']);

      if (filters.channel !== 'all') {
        ordersQuery = ordersQuery.eq('sales_channel', filters.channel as Enums<'sales_channel'>);
      }

      const [filteredOrdersRes, monthOrdersRes, itemsRes, pendingRes, monthItemsRes, attendanceRes] = await Promise.all([
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
          .gte('orders.created_at', dateRange.from.toISOString())
          .lte('orders.created_at', dateRange.to.toISOString()),
        
        // Pending and preparing orders (always current)
        supabase
          .from('orders')
          .select('status')
          .eq('branch_id', branch.id)
          .in('status', ['pending', 'preparing', 'confirmed']),
        
        // Monthly items for productivity calculation
        supabase
          .from('order_items')
          .select('quantity, orders!inner(branch_id, created_at)')
          .eq('orders.branch_id', branch.id)
          .gte('orders.created_at', monthStart)
          .lte('orders.created_at', monthEnd),
        
        // Monthly attendance logs for hours calculation
        supabase
          .from('attendance_logs')
          .select('employee_id, log_type, timestamp')
          .eq('branch_id', branch.id)
          .gte('timestamp', monthStart)
          .lte('timestamp', monthEnd)
          .order('timestamp', { ascending: true }),
      ]);

      const filteredOrders = filteredOrdersRes.data || [];
      const monthOrders = monthOrdersRes.data || [];
      let filteredItems = itemsRes.data || [];
      const pendingOrders = pendingRes.data || [];

      // Filter items by channel if needed
      if (filters.channel !== 'all') {
        filteredItems = filteredItems.filter((item: any) => 
          item.orders?.sales_channel === filters.channel
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

      const channelStatsArr: ChannelStats[] = Array.from(channelMap.entries())
        .map(([channel, data]) => ({
          channel,
          revenue: data.revenue,
          orders: data.orders,
          label: channelLabels[channel]?.label || channel,
          icon: channelLabels[channel]?.icon || <Store className="w-4 h-4" />,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      // Calculate monthly hours from attendance logs
      const attendanceLogs = attendanceRes.data || [];
      const monthlyItemsTotal = (monthItemsRes.data || []).reduce((sum, i) => sum + (i.quantity || 0), 0);
      
      // Group logs by employee and calculate hours
      const employeeLogs = new Map<string, { in: Date | null }>();
      let totalMinutes = 0;
      
      attendanceLogs.forEach(log => {
        const empId = log.employee_id;
        const timestamp = new Date(log.timestamp);
        
        if (log.log_type === 'IN') {
          employeeLogs.set(empId, { in: timestamp });
        } else if (log.log_type === 'OUT') {
          const empData = employeeLogs.get(empId);
          if (empData?.in) {
            const minutes = (timestamp.getTime() - empData.in.getTime()) / (1000 * 60);
            if (minutes > 0 && minutes < 960) { // Max 16 hours shift
              totalMinutes += minutes;
            }
            employeeLogs.set(empId, { in: null });
          }
        }
      });
      
      const monthlyHours = Math.round(totalMinutes / 60 * 10) / 10;
      const productivity = monthlyHours > 0 ? Math.round(monthlyItemsTotal / monthlyHours * 10) / 10 : 0;

      setStats({
        filteredRevenue,
        filteredOrders: filteredOrders.length,
        filteredItems: itemsCount,
        avgTicket: filteredOrders.length > 0 ? filteredRevenue / filteredOrders.length : 0,
        monthlyRevenue,
        monthlyOrders: monthOrders.length,
        pendingOrders: pendingOrders.filter(o => o.status === 'pending').length,
        preparingOrders: pendingOrders.filter(o => o.status === 'preparing' || o.status === 'confirmed').length,
        channelStats: channelStatsArr,
      });
      
      setHoursStats({
        monthlyHours,
        monthlyItems: monthlyItemsTotal,
        productivity,
      });

      setLoading(false);
    }

    fetchStats();

    // Refresh every minute
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [branch.id, filters.channel, dateRange]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(value);

  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky Filter Bar */}
      <DashboardFilterBar />

      {/* Dashboard Content */}
      <div className="flex-1 p-6 space-y-6">
        {/* Role Welcome Card */}
        <RoleWelcomeCard 
          avatarType={avatarInfo.type}
          avatarLabel={avatarInfo.label}
          branchId={branch.id}
          userName={user?.user_metadata?.full_name?.split(' ')[0]}
        />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{branch.name}</h1>
            <p className="text-muted-foreground">{branch.address}, {branch.city}</p>
          </div>
          {(() => {
            // Calcular estado efectivo: admin puede forzar, sino local_open_state
            const isForced = branch.admin_force_state && branch.admin_force_state !== 'none';
            const effectiveOpen = isForced 
              ? branch.admin_force_state === 'open'
              : branch.local_open_state ?? false;
            
            return (
              <Badge 
                variant={effectiveOpen ? 'default' : 'secondary'}
                className={effectiveOpen ? 'bg-success text-success-foreground' : 'bg-destructive/20 text-destructive'}
              >
                {effectiveOpen ? 'Abierto' : 'Cerrado'}
              </Badge>
            );
          })()}
        </div>

        {/* Active Service Types & Channels */}
        <div className="flex flex-wrap gap-2">
          {/* Tipos de servicio */}
          {branchServiceTypes.map(channel => {
            const isForced = branch.admin_force_state && branch.admin_force_state !== 'none';
            const effectiveOpen = isForced 
              ? branch.admin_force_state === 'open'
              : branch.local_open_state ?? false;
            
            const isEnabled = effectiveOpen && (branch[channel.key] as boolean ?? false);
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
          {/* Canales externos */}
          {branchExternalChannels.map(channel => {
            const isForced = branch.admin_force_state && branch.admin_force_state !== 'none';
            const effectiveOpen = isForced 
              ? branch.admin_force_state === 'open'
              : branch.local_open_state ?? false;
            
            const isEnabled = effectiveOpen && (branch[channel.key] as boolean ?? false);
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

        {/* Alerts */}
        <DashboardAlerts branchId={branch.id} variant="local" />

        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <HoppinessLoader size="md" text="Cargando dashboard" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Ventas - {periodLabel}
                  </CardTitle>
                  <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-success" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats.filteredRevenue)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.filteredOrders} pedidos
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Unidades - {periodLabel}
                  </CardTitle>
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Utensils className="w-5 h-5 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.filteredItems}</div>
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
                  Ventas por Canal - {periodLabel}
                </CardTitle>
                <CardDescription>
                  Desglose de ventas por canal de venta
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats.channelStats.length > 0 ? (
                  <div className="space-y-3">
                    {stats.channelStats.map((channel) => {
                      const percentage = stats.filteredRevenue > 0 
                        ? (channel.revenue / stats.filteredRevenue) * 100 
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

            {/* Monthly Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Resumen del Mes
                </CardTitle>
                <CardDescription>
                  Estadísticas desde el 1° del mes actual (sin filtros)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
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
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                      <Clock className="w-4 h-4" />
                      Horas Registradas
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {hoursStats.monthlyHours.toLocaleString('es-AR')}h
                    </div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                      <Utensils className="w-4 h-4" />
                      Unidades Vendidas
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {hoursStats.monthlyItems.toLocaleString('es-AR')}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-accent/20 rounded-lg border-2 border-accent">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                      <TrendingUp className="w-4 h-4" />
                      Productividad
                    </div>
                    <div className="text-2xl font-bold text-accent-foreground">
                      {hoursStats.productivity.toLocaleString('es-AR')}
                    </div>
                    <p className="text-xs text-muted-foreground">unid/hora</p>
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
            <RecentCompletedOrders branchId={branch.id} />

            {/* Orders Heatmap */}
            <OrdersHeatmap branchId={branch.id} />
          </>
        )}
      </div>
    </div>
  );
}

export default function LocalDashboard({ branch }: LocalDashboardProps) {
  return (
    <DashboardFilterProvider>
      <DashboardContent branch={branch} />
    </DashboardFilterProvider>
  );
}
