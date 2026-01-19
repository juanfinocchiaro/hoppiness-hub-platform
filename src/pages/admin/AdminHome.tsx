import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Store, Package, Plus, MapPin, Clock, Settings, Truck, ShoppingBag, Users, Bike } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface Stats {
  products: number;
  categories: number;
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
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [productsRes, categoriesRes, branchesRes] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('product_categories').select('id', { count: 'exact', head: true }),
        supabase.from('branches').select('*').order('name'),
      ]);

      setStats({
        products: productsRes.count || 0,
        categories: categoriesRes.count || 0,
      });
      setBranches(branchesRes.data || []);
      setLoading(false);
    }
    fetchData();
  }, []);

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
                      <div className="flex flex-wrap gap-2">
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
