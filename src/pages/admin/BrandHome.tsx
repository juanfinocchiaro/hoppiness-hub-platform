import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Store, Clock, Users, DollarSign, Utensils, Receipt, BarChart3, MapPin } from 'lucide-react';
import { BrandDailySalesTable } from '@/components/admin/BrandDailySalesTable';
import { BrandAlertsCard } from '@/components/admin/BrandAlertsCard';
import { useRoleLandingV2 } from '@/hooks/useRoleLandingV2';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface Stats {
  globalRevenue: number;
  globalItems: number;
  globalOrders: number;
  globalAvgTicket: number;
  globalHours: number;
  globalProductivity: number;
}

export default function BrandHome() {
  const { avatarInfo } = useRoleLandingV2();
  const [stats, setStats] = useState<Stats>({ 
    globalRevenue: 0, 
    globalItems: 0, 
    globalOrders: 0, 
    globalAvgTicket: 0, 
    globalHours: 0, 
    globalProductivity: 0 
  });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const [branchesRes, ordersRes, orderItemsRes, attendanceRes] = await Promise.all([
        supabase.from('branches').select('*').order('name'),
        supabase
          .from('orders')
          .select('id, total, branch_id')
          .gte('created_at', firstDayOfMonth)
          .in('status', ['delivered', 'ready', 'preparing', 'confirmed']),
        supabase
          .from('order_items')
          .select('quantity, order_id')
          .gte('created_at', firstDayOfMonth),
        supabase
          .from('attendance_logs')
          .select('employee_id, branch_id, log_type, timestamp')
          .gte('timestamp', firstDayOfMonth)
          .lte('timestamp', lastDayOfMonth)
          .order('timestamp', { ascending: true }),
      ]);

      const branchesData = branchesRes.data || [];
      setBranches(branchesData);

      const orders = ordersRes.data || [];
      const orderItems = orderItemsRes.data || [];
      
      let globalRevenue = 0;
      let globalOrders = 0;
      let globalItems = 0;
      
      orders.forEach(order => {
        globalRevenue += Number(order.total || 0);
        globalOrders += 1;
      });
      
      orderItems.forEach(item => {
        globalItems += item.quantity || 0;
      });
      
      const globalAvgTicket = globalOrders > 0 ? globalRevenue / globalOrders : 0;

      // Calculate hours from attendance logs
      const attendanceLogs = attendanceRes.data || [];
      const employeeLogs = new Map<string, Date | null>();
      let globalTotalMinutes = 0;
      
      attendanceLogs.forEach(log => {
        const empId = log.employee_id;
        const timestamp = new Date(log.timestamp);
        
        if (log.log_type === 'IN') {
          employeeLogs.set(empId, timestamp);
        } else if (log.log_type === 'OUT') {
          const inTime = employeeLogs.get(empId);
          if (inTime) {
            const minutes = (timestamp.getTime() - inTime.getTime()) / (1000 * 60);
            if (minutes > 0 && minutes < 960) {
              globalTotalMinutes += minutes;
            }
            employeeLogs.set(empId, null);
          }
        }
      });
      
      const globalHours = Math.round(globalTotalMinutes / 60 * 10) / 10;
      const globalProductivity = globalHours > 0 ? Math.round(globalItems / globalHours * 10) / 10 : 0;

      setStats({
        globalRevenue,
        globalItems,
        globalOrders,
        globalAvgTicket,
        globalHours,
        globalProductivity,
      });
      setLoading(false);
    }
    fetchData();
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(value);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Panel Mi Marca</h1>
        <p className="text-muted-foreground">Gestión centralizada de todas las sucursales</p>
      </div>

      {/* Alerts */}
      <BrandAlertsCard />

      {/* Daily Sales Table */}
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
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                <Utensils className="w-4 h-4" />
                Unidades Vendidas
              </div>
              <div className="text-2xl font-bold text-primary">
                {loading ? <Skeleton className="h-8 w-16 mx-auto" /> : stats.globalItems.toLocaleString('es-AR')}
              </div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                <Receipt className="w-4 h-4" />
                Ticket Promedio
              </div>
              <div className="text-2xl font-bold text-primary">
                {loading ? <Skeleton className="h-8 w-20 mx-auto" /> : formatCurrency(stats.globalAvgTicket)}
              </div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                <Users className="w-4 h-4" />
                Total Pedidos
              </div>
              <div className="text-2xl font-bold text-primary">
                {loading ? <Skeleton className="h-8 w-16 mx-auto" /> : stats.globalOrders.toLocaleString('es-AR')}
              </div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                <Clock className="w-4 h-4" />
                Horas Registradas
              </div>
              <div className="text-2xl font-bold text-primary">
                {loading ? <Skeleton className="h-8 w-16 mx-auto" /> : `${stats.globalHours}h`}
              </div>
            </div>
            <div className="text-center p-4 bg-accent/20 rounded-lg border-2 border-accent">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                <BarChart3 className="w-4 h-4" />
                Productividad
              </div>
              <div className="text-2xl font-bold text-accent-foreground">
                {loading ? <Skeleton className="h-8 w-16 mx-auto" /> : stats.globalProductivity}
              </div>
              <p className="text-xs text-muted-foreground mt-1">unid/hora</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branches Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            Mis Sucursales
          </CardTitle>
          <CardDescription>
            Hacé clic en una sucursal para ver más detalles
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {branches.map(branch => (
                <Link key={branch.id} to={`/mimarca/locales/${branch.slug}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer hover:border-primary">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold">{branch.name}</h3>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <MapPin className="w-3 h-3" />
                            {branch.city}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
