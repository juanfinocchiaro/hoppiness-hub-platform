import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Store, Package, Plus, MapPin, Clock, Power } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface Stats {
  products: number;
  categories: number;
}

export default function AdminHome() {
  const [stats, setStats] = useState<Stats>({ products: 0, categories: 0 });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingBranch, setUpdatingBranch] = useState<string | null>(null);

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

  const toggleBranchActive = async (branch: Branch) => {
    setUpdatingBranch(branch.id);
    try {
      const { error } = await supabase
        .from('branches')
        .update({ is_active: !branch.is_active })
        .eq('id', branch.id);

      if (error) throw error;

      setBranches(branches.map(b => 
        b.id === branch.id ? { ...b, is_active: !b.is_active } : b
      ));
      toast.success(`${branch.name} ${!branch.is_active ? 'activada' : 'desactivada'}`);
    } catch (error) {
      toast.error('Error al actualizar sucursal');
    } finally {
      setUpdatingBranch(null);
    }
  };

  const toggleBranchOpen = async (branch: Branch) => {
    setUpdatingBranch(branch.id);
    try {
      const { error } = await supabase
        .from('branches')
        .update({ is_open: !branch.is_open })
        .eq('id', branch.id);

      if (error) throw error;

      setBranches(branches.map(b => 
        b.id === branch.id ? { ...b, is_open: !b.is_open } : b
      ));
      toast.success(`${branch.name} ahora está ${!branch.is_open ? 'abierta' : 'cerrada'}`);
    } catch (error) {
      toast.error('Error al actualizar sucursal');
    } finally {
      setUpdatingBranch(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Administración Central</h1>
        <p className="text-muted-foreground">Gestión de productos y sucursales de Hoppiness Club</p>
      </div>

      {/* Stats - Solo Productos */}
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
              {loading ? <Skeleton className="h-9 w-16" /> : branches.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {branches.filter(b => b.is_active && b.is_open).length} abiertas ahora
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action */}
      <div className="flex gap-2">
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
      </div>

      {/* Branch Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Power className="w-5 h-5" />
            Control de Sucursales
          </CardTitle>
          <CardDescription>
            Activa/desactiva sucursales y controla si están abiertas o cerradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {branches.map(branch => (
                <div 
                  key={branch.id} 
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    !branch.is_active ? 'bg-muted/50 opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      branch.is_active && branch.is_open ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'
                    }`}>
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{branch.name}</span>
                        {branch.is_active && branch.is_open && (
                          <Badge className="bg-green-500 text-white text-xs">Abierto</Badge>
                        )}
                        {branch.is_active && !branch.is_open && (
                          <Badge variant="secondary" className="text-xs">Cerrado</Badge>
                        )}
                        {!branch.is_active && (
                          <Badge variant="destructive" className="text-xs">Desactivado</Badge>
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

                  <div className="flex items-center gap-6">
                    {/* Toggle Abierto/Cerrado */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Abierto</span>
                      <Switch
                        checked={branch.is_open ?? false}
                        onCheckedChange={() => toggleBranchOpen(branch)}
                        disabled={!branch.is_active || updatingBranch === branch.id}
                      />
                    </div>
                    
                    {/* Toggle Activo/Inactivo */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Activo</span>
                      <Switch
                        checked={branch.is_active}
                        onCheckedChange={() => toggleBranchActive(branch)}
                        disabled={updatingBranch === branch.id}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
