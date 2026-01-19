import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Store, Package, Plus, MapPin, Clock, Settings, Truck, ShoppingBag, Users, Bike, DollarSign, Utensils, Receipt } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface Stats {
  products: number;
  categories: number;
}

interface BranchStats {
  branchId: string;
  totalRevenue: number;
  totalItems: number;
  orderCount: number;
  averageTicket: number;
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

export default function AdminHome() {
  const [stats, setStats] = useState<Stats>({ products: 0, categories: 0 });
  const [branchStats, setBranchStats] = useState<Map<string, BranchStats>>(new Map());
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // Get first day of current month
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [productsRes, categoriesRes, branchesRes, ordersRes, orderItemsRes] = await Promise.all([
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
      ]);

      setStats({
        products: productsRes.count || 0,
        categories: categoriesRes.count || 0,
      });
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
      
      // Calculate revenue and order count per branch
      orders.forEach(order => {
        const stats = statsMap.get(order.branch_id);
        if (stats) {
          stats.totalRevenue += Number(order.total || 0);
          stats.orderCount += 1;
        }
      });
      
      // Calculate items per branch
      orderItems.forEach(item => {
        const branchId = orderToBranch.get(item.order_id);
        if (branchId) {
          const stats = statsMap.get(branchId);
          if (stats) {
            stats.totalItems += item.quantity || 0;
          }
        }
      });
      
      // Calculate average ticket
      statsMap.forEach(stats => {
        stats.averageTicket = stats.orderCount > 0 ? stats.totalRevenue / stats.orderCount : 0;
      });

      setBranchStats(statsMap);
      setLoading(false);
    }
    fetchData();
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(value);

  // Determina si una sucursal está "abierta" basándose en si tiene algún canal activo
  const isBranchOperational = (branch: Branch): boolean => {
    if (!branch.is_active) return false;
    return salesChannels.some(ch => branch[ch.key] as boolean);
  };

  const getActiveChannelsCount = (branch: Branch): number => {
    return salesChannels.filter(ch => branch[ch.key] as boolean).length;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Administración Central</h1>
        <p className="text-muted-foreground">Gestión de productos y sucursales de Hoppiness Club</p>
      </div>

      {/* Stats */}
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

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Link to="/admin/productos/nuevo">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Producto
          </Button>
        </Link>
        <Link to="/admin/sucursales">
          <Button variant="outline">
            <Store className="w-4 h-4 mr-2" />
            Gestionar Sucursales
          </Button>
        </Link>
        <Link to="/admin/estado-sucursales">
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Modificar Estado
          </Button>
        </Link>
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
                        {salesChannels.map(channel => {
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
                      <div className="grid grid-cols-3 gap-3 pt-3 border-t">
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
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
