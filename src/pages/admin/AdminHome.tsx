import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import { Store, Package, MapPin, Clock, Settings, Truck, ShoppingBag, Users, Bike, DollarSign, Utensils, Receipt, BarChart3 } from 'lucide-react';
import OrdersHeatmap from '@/components/charts/OrdersHeatmap';
import { RoleWelcomeCard } from '@/components/dashboard/RoleWelcomeCard';
import { BrandAlerts } from '@/components/dashboard/DashboardAlerts';

import { BrandDailySalesTable } from '@/components/admin/BrandDailySalesTable';
import { BrandAlertsCard } from '@/components/admin/BrandAlertsCard';
import { useRoleLandingV2 } from '@/hooks/useRoleLandingV2';
import { useAuth } from '@/hooks/useAuth';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface Stats {
  products: number;
  categories: number;
  globalRevenue: number;
  globalItems: number;
  globalOrders: number;
  globalAvgTicket: number;
  globalHours: number;
  globalProductivity: number;
}

interface BranchHoursStats {
  branchId: string;
  totalHours: number;
  totalItems: number;
  productivity: number;
}

interface BranchStats {
  branchId: string;
  totalRevenue: number;
  totalItems: number;
  orderCount: number;
  averageTicket: number;
}

// Tipos de servicio disponibles en cada sucursal
type ServiceType = {
  key: keyof Branch;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
};

const serviceTypes: ServiceType[] = [
  { key: 'delivery_enabled', label: 'Delivery', shortLabel: 'DEL', icon: <Truck className="w-3 h-3" /> },
  { key: 'takeaway_enabled', label: 'TakeAway', shortLabel: 'TA', icon: <ShoppingBag className="w-3 h-3" /> },
  { key: 'dine_in_enabled', label: 'Salón', shortLabel: 'SAL', icon: <Users className="w-3 h-3" /> },
];

// Canales de venta externos (Apps de Delivery)
type ExternalChannel = {
  key: keyof Branch;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
};

const externalChannels: ExternalChannel[] = [
  { key: 'rappi_enabled', label: 'Rappi', shortLabel: 'RAP', icon: <Bike className="w-3 h-3" /> },
  { key: 'pedidosya_enabled', label: 'PedidosYa', shortLabel: 'PYA', icon: <Bike className="w-3 h-3" /> },
  { key: 'mercadopago_delivery_enabled', label: 'MP Delivery', shortLabel: 'MPD', icon: <Truck className="w-3 h-3" /> },
];

export default function AdminHome() {
  const { avatarInfo } = useRoleLandingV2();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ products: 0, categories: 0, globalRevenue: 0, globalItems: 0, globalOrders: 0, globalAvgTicket: 0, globalHours: 0, globalProductivity: 0 });
  const [branchStats, setBranchStats] = useState<Map<string, BranchStats>>(new Map());
  const [branchHoursStats, setBranchHoursStats] = useState<Map<string, BranchHoursStats>>(new Map());
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // Get first day of current month
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const [productsRes, categoriesRes, branchesRes, ordersRes, orderItemsRes, attendanceRes] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('product_categories').select('id', { count: 'exact', head: true }),
        supabase.from('branches').select('*').order('name'),
        // Get monthly orders with branch_id
        supabase
          .from('orders')
          .select('id, total, branch_id')
          .gte('created_at', firstDayOfMonth)
          .in('status', ['delivered', 'ready', 'preparing', 'confirmed']),
        // Get total items sold this month
        supabase
          .from('order_items')
          .select('quantity, order_id')
          .gte('created_at', firstDayOfMonth),
        // Get attendance logs for all branches
        supabase
          .from('attendance_logs')
          .select('employee_id, branch_id, log_type, timestamp')
          .gte('timestamp', firstDayOfMonth)
          .lte('timestamp', lastDayOfMonth)
          .order('timestamp', { ascending: true }),
      ]);

      const branchesData = branchesRes.data || [];
      setBranches(branchesData);

      // Calculate stats per branch
      const orders = ordersRes.data || [];
      const orderItems = orderItemsRes.data || [];
      
      // Create a map of order_id to branch_id
      const orderToBranch = new Map(orders.map(o => [o.id, o.branch_id]));
      
      const statsMap = new Map<string, BranchStats>();
      
      // Initialize stats for all branches
      branchesData.forEach(branch => {
        statsMap.set(branch.id, {
          branchId: branch.id,
          totalRevenue: 0,
          totalItems: 0,
          orderCount: 0,
          averageTicket: 0,
        });
      });
      
      // Calculate global totals
      let globalRevenue = 0;
      let globalOrders = 0;
      
      // Calculate revenue and order count per branch
      orders.forEach(order => {
        const branchStat = statsMap.get(order.branch_id);
        if (branchStat) {
          branchStat.totalRevenue += Number(order.total || 0);
          branchStat.orderCount += 1;
        }
        globalRevenue += Number(order.total || 0);
        globalOrders += 1;
      });
      
      // Calculate items per branch and global
      let globalItems = 0;
      orderItems.forEach(item => {
        const branchId = orderToBranch.get(item.order_id);
        if (branchId) {
          const branchStat = statsMap.get(branchId);
          if (branchStat) {
            branchStat.totalItems += item.quantity || 0;
          }
        }
        globalItems += item.quantity || 0;
      });
      
      // Calculate average ticket
      statsMap.forEach(stat => {
        stat.averageTicket = stat.orderCount > 0 ? stat.totalRevenue / stat.orderCount : 0;
      });

      const globalAvgTicket = globalOrders > 0 ? globalRevenue / globalOrders : 0;

      // Calculate hours per branch from attendance logs
      const attendanceLogs = attendanceRes.data || [];
      const hoursStatsMap = new Map<string, BranchHoursStats>();
      
      // Initialize hours stats for all branches
      branchesData.forEach(branch => {
        hoursStatsMap.set(branch.id, {
          branchId: branch.id,
          totalHours: 0,
          totalItems: statsMap.get(branch.id)?.totalItems || 0,
          productivity: 0,
        });
      });
      
      // Group logs by branch and employee
      const branchEmployeeLogs = new Map<string, Map<string, { in: Date | null }>>();
      let globalTotalMinutes = 0;
      
      attendanceLogs.forEach(log => {
        const branchId = log.branch_id;
        const empId = log.employee_id;
        const timestamp = new Date(log.timestamp);
        
        if (!branchEmployeeLogs.has(branchId)) {
          branchEmployeeLogs.set(branchId, new Map());
        }
        const branchLogs = branchEmployeeLogs.get(branchId)!;
        
        if (log.log_type === 'IN') {
          branchLogs.set(empId, { in: timestamp });
        } else if (log.log_type === 'OUT') {
          const empData = branchLogs.get(empId);
          if (empData?.in) {
            const minutes = (timestamp.getTime() - empData.in.getTime()) / (1000 * 60);
            if (minutes > 0 && minutes < 960) { // Max 16 hours shift
              const branchHours = hoursStatsMap.get(branchId);
              if (branchHours) {
                branchHours.totalHours += minutes / 60;
              }
              globalTotalMinutes += minutes;
            }
            branchLogs.set(empId, { in: null });
          }
        }
      });
      
      // Calculate productivity for each branch
      hoursStatsMap.forEach(stat => {
        stat.totalHours = Math.round(stat.totalHours * 10) / 10;
        stat.productivity = stat.totalHours > 0 ? Math.round(stat.totalItems / stat.totalHours * 10) / 10 : 0;
      });
      
      const globalHours = Math.round(globalTotalMinutes / 60 * 10) / 10;
      const globalProductivity = globalHours > 0 ? Math.round(globalItems / globalHours * 10) / 10 : 0;

      setStats({
        products: productsRes.count || 0,
        categories: categoriesRes.count || 0,
        globalRevenue,
        globalItems,
        globalOrders,
        globalAvgTicket,
        globalHours,
        globalProductivity,
      });
      setBranchStats(statsMap);
      setBranchHoursStats(hoursStatsMap);
      setLoading(false);
    }
    fetchData();
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(value);

  // Determina si una sucursal está "abierta" basándose en si tiene algún tipo de servicio o canal externo activo
  const isBranchOperational = (branch: Branch): boolean => {
    if (!branch.is_active) return false;
    const hasServiceType = serviceTypes.some(ch => branch[ch.key] as boolean);
    const hasExternalChannel = externalChannels.some(ch => branch[ch.key] as boolean);
    return hasServiceType || hasExternalChannel;
  };

  const getActiveChannelsCount = (branch: Branch): number => {
    const serviceCount = serviceTypes.filter(ch => branch[ch.key] as boolean).length;
    const externalCount = externalChannels.filter(ch => branch[ch.key] as boolean).length;
    return serviceCount + externalCount;
  };

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-3xl font-bold">Administración Central</h1>
        <p className="text-muted-foreground">Gestión de productos y sucursales de Hoppiness Club</p>
      </div>

      {/* Alerts Grid */}
      <div className="grid gap-4 md:grid-cols-1">
        <BrandAlertsCard />
      </div>

      {/* Daily Sales Table - Consolidated by Branch & Shift */}
      <BrandDailySalesTable />

      {/* Global Monthly Stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Resumen del Mes</CardTitle>
          <CardDescription>Totales de todas las sucursales</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                <DollarSign className="w-4 h-4" />
                Facturación Total
              </div>
              <div className="text-2xl font-bold text-primary">
                {loading ? <Skeleton className="h-8 w-24 mx-auto" /> : formatCurrency(stats.globalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.globalOrders} pedidos
              </p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                <Utensils className="w-4 h-4" />
                Unidades Vendidas
              </div>
              <div className="text-2xl font-bold text-primary">
                {loading ? <Skeleton className="h-8 w-16 mx-auto" /> : stats.globalItems.toLocaleString('es-AR')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                productos
              </p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                <Receipt className="w-4 h-4" />
                Ticket Promedio
              </div>
              <div className="text-2xl font-bold text-primary">
                {loading ? <Skeleton className="h-8 w-20 mx-auto" /> : formatCurrency(stats.globalAvgTicket)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                por pedido
              </p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                <ShoppingBag className="w-4 h-4" />
                Total Pedidos
              </div>
              <div className="text-2xl font-bold text-primary">
                {loading ? <Skeleton className="h-8 w-16 mx-auto" /> : stats.globalOrders.toLocaleString('es-AR')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                este mes
              </p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                <Clock className="w-4 h-4" />
                Horas Registradas
              </div>
              <div className="text-2xl font-bold text-primary">
                {loading ? <Skeleton className="h-8 w-16 mx-auto" /> : `${stats.globalHours.toLocaleString('es-AR')}h`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                este mes
              </p>
            </div>
            <div className="text-center p-4 bg-accent/20 rounded-lg border-2 border-accent">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                <BarChart3 className="w-4 h-4" />
                Productividad
              </div>
              <div className="text-2xl font-bold text-accent-foreground">
                {loading ? <Skeleton className="h-8 w-16 mx-auto" /> : stats.globalProductivity.toLocaleString('es-AR')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                unid/hora
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products & Branches Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link to="/admin/productos">
          <Card className="hover:shadow-elevated transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Productos
              </CardTitle>
              <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {loading ? <Skeleton className="h-9 w-16" /> : stats.products}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                en {stats.categories} categorías
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sucursales
            </CardTitle>
            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loading ? <Skeleton className="h-9 w-16" /> : branches.filter(b => b.is_active).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {branches.filter(b => isBranchOperational(b)).length} operativas ahora
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Branch Status Panel - Read Only */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5" />
                Estado de las Sucursales
              </CardTitle>
              <CardDescription>
                Vista en tiempo real del estado operativo de cada sucursal
              </CardDescription>
            </div>
            <Link to="/admin/estado-sucursales">
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Modificar
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {branches.map(branch => {
                const isOperational = isBranchOperational(branch);
                const activeChannels = getActiveChannelsCount(branch);
                
                return (
                  <div 
                    key={branch.id} 
                    className={`p-4 rounded-lg border ${
                      !branch.is_active ? 'bg-muted/50 opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isOperational 
                            ? 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          <Store className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{branch.name}</span>
                            {!branch.is_active ? (
                              <Badge variant="destructive" className="text-xs">Desactivada</Badge>
                            ) : isOperational ? (
                              <Badge className="bg-green-500 text-white text-xs">
                                Abierto • {activeChannels} canal{activeChannels !== 1 ? 'es' : ''}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Cerrado</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {branch.city}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {branch.opening_time?.slice(0, 5)} - {branch.closing_time?.slice(0, 5)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Channels Status - Read Only */}
                    {branch.is_active && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {/* Tipos de servicio */}
                        {serviceTypes.map(channel => {
                          const isEnabled = branch[channel.key] as boolean ?? false;
                          
                          return (
                            <div 
                              key={channel.key}
                              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
                                isEnabled 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' 
                                  : 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400'
                              }`}
                              title={channel.label}
                            >
                              {channel.icon}
                              <span>{channel.shortLabel}</span>
                            </div>
                          );
                        })}
                        {/* Canales externos (Apps) */}
                        {externalChannels.map(channel => {
                          const isEnabled = branch[channel.key] as boolean ?? false;
                          
                          return (
                            <div 
                              key={channel.key}
                              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
                                isEnabled 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' 
                                  : 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400'
                              }`}
                              title={channel.label}
                            >
                              {channel.icon}
                              <span>{channel.shortLabel}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Monthly Stats per Branch */}
                    {branch.is_active && (
                      <div className="grid grid-cols-5 gap-3 pt-3 border-t">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                            <DollarSign className="w-3 h-3" />
                            Facturación
                          </div>
                          <div className="font-semibold text-sm">
                            {formatCurrency(branchStats.get(branch.id)?.totalRevenue || 0)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                            <Utensils className="w-3 h-3" />
                            Unidades
                          </div>
                          <div className="font-semibold text-sm">
                            {(branchStats.get(branch.id)?.totalItems || 0).toLocaleString('es-AR')}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                            <Receipt className="w-3 h-3" />
                            Ticket Prom.
                          </div>
                          <div className="font-semibold text-sm">
                            {formatCurrency(branchStats.get(branch.id)?.averageTicket || 0)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                            <Clock className="w-3 h-3" />
                            Horas
                          </div>
                          <div className="font-semibold text-sm">
                            {(branchHoursStats.get(branch.id)?.totalHours || 0).toLocaleString('es-AR')}h
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                            <BarChart3 className="w-3 h-3" />
                            Productividad
                          </div>
                          <div className="font-semibold text-sm text-accent-foreground">
                            {(branchHoursStats.get(branch.id)?.productivity || 0).toLocaleString('es-AR')}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orders Heatmap - All Branches with selector */}
      <OrdersHeatmap 
        title="Pedidos por horario (canal propio)" 
        description="Distribución de pedidos en intervalos de 30 minutos"
        showBranchSelector={true}
        availableBranches={branches.map(b => ({ id: b.id, name: b.name }))}
      />
    </div>
  );
}
