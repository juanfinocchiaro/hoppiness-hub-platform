import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface LocalDashboardProps {
  branch: Branch;
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
}

type SalesChannel = {
  key: keyof Branch;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
};

const salesChannels: SalesChannel[] = [
  { key: 'delivery_enabled', label: 'Delivery', shortLabel: 'DEL', icon: <Truck className="w-3 h-3" /> },
  { key: 'takeaway_enabled', label: 'TakeAway', shortLabel: 'TA', icon: <ShoppingBag className="w-3 h-3" /> },
  { key: 'dine_in_enabled', label: 'Atención Presencial', shortLabel: 'AP', icon: <Users className="w-3 h-3" /> },
  { key: 'rappi_enabled', label: 'Rappi', shortLabel: 'RAP', icon: <Bike className="w-3 h-3" /> },
  { key: 'pedidosya_enabled', label: 'PedidosYa', shortLabel: 'PYA', icon: <Bike className="w-3 h-3" /> },
  { key: 'mercadopago_delivery_enabled', label: 'MP Delivery', shortLabel: 'MPD', icon: <Truck className="w-3 h-3" /> },
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
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [todayOrdersRes, monthOrdersRes, todayItemsRes, pendingRes] = await Promise.all([
        // Today's orders
        supabase
          .from('orders')
          .select('id, total')
          .eq('branch_id', branch.id)
          .gte('created_at', todayStart)
          .in('status', ['delivered', 'ready', 'preparing', 'confirmed']),
        
        // Monthly orders
        supabase
          .from('orders')
          .select('id, total')
          .eq('branch_id', branch.id)
          .gte('created_at', monthStart)
          .in('status', ['delivered', 'ready', 'preparing', 'confirmed']),
        
        // Today's items
        supabase
          .from('order_items')
          .select('quantity, orders!inner(branch_id, created_at)')
          .eq('orders.branch_id', branch.id)
          .gte('orders.created_at', todayStart),
        
        // Pending and preparing orders
        supabase
          .from('orders')
          .select('status')
          .eq('branch_id', branch.id)
          .in('status', ['pending', 'preparing', 'confirmed']),
      ]);

      const todayOrders = todayOrdersRes.data || [];
      const monthOrders = monthOrdersRes.data || [];
      const todayItems = todayItemsRes.data || [];
      const pendingOrders = pendingRes.data || [];

      const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
      const monthlyRevenue = monthOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
      const todayItemsCount = todayItems.reduce((sum, i) => sum + (i.quantity || 0), 0);

      setStats({
        todayRevenue,
        todayOrders: todayOrders.length,
        todayItems: todayItemsCount,
        avgTicket: todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0,
        monthlyRevenue,
        monthlyOrders: monthOrders.length,
        pendingOrders: pendingOrders.filter(o => o.status === 'pending').length,
        preparingOrders: pendingOrders.filter(o => o.status === 'preparing' || o.status === 'confirmed').length,
      });

      setLoading(false);
    }

    fetchStats();

    // Refresh every minute
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [branch.id]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(value);

  const getActiveChannels = () => salesChannels.filter(ch => branch[ch.key] as boolean);

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
      <div className="flex items-center justify-between">
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

      {/* Active Channels */}
      <div className="flex flex-wrap gap-2">
        {salesChannels.map(channel => {
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

      {/* Today's Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ventas Hoy
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
              Unidades Vendidas
            </CardTitle>
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Utensils className="w-5 h-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayItems}</div>
            <p className="text-xs text-muted-foreground mt-1">
              productos hoy
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

      {/* Monthly Stats */}
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
    </div>
  );
}
