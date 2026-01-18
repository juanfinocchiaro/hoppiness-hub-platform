import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Store, Package, Truck, Users, Plus, ArrowRight } from 'lucide-react';

interface Stats {
  branches: number;
  products: number;
  suppliers: number;
  categories: number;
}

export default function AdminHome() {
  const [stats, setStats] = useState<Stats>({ branches: 0, products: 0, suppliers: 0, categories: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const [branchesRes, productsRes, suppliersRes, categoriesRes] = await Promise.all([
        supabase.from('branches').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('suppliers').select('id', { count: 'exact', head: true }),
        supabase.from('product_categories').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        branches: branchesRes.count || 0,
        products: productsRes.count || 0,
        suppliers: suppliersRes.count || 0,
        categories: categoriesRes.count || 0,
      });
      setLoading(false);
    }
    fetchStats();
  }, []);

  const statsCards = [
    { title: 'Sucursales', value: stats.branches, icon: Store, href: '/admin/sucursales', color: 'bg-blue-500' },
    { title: 'Productos', value: stats.products, icon: Package, href: '/admin/productos', color: 'bg-green-500' },
    { title: 'Proveedores', value: stats.suppliers, icon: Truck, href: '/admin/proveedores', color: 'bg-orange-500' },
    { title: 'Categorías', value: stats.categories, icon: Package, href: '/admin/productos', color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Gestión centralizada de Hoppiness Club</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Link key={stat.title} to={stat.href}>
            <Card className="hover:shadow-elevated transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-4 h-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : stat.value}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/admin/sucursales/nueva">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Sucursal
              </Button>
            </Link>
            <Link to="/admin/productos/nuevo">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Producto
              </Button>
            </Link>
            <Link to="/admin/proveedores/nuevo">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Proveedor
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Cómo funciona</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-primary font-bold text-sm">1</span>
              </div>
              <div>
                <p className="font-medium">Catálogo Maestro de Productos</p>
                <p className="text-sm text-muted-foreground">
                  Los productos se gestionan de forma centralizada. Todas las sucursales los heredan automáticamente.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-primary font-bold text-sm">2</span>
              </div>
              <div>
                <p className="font-medium">Auto-configuración de Sucursales</p>
                <p className="text-sm text-muted-foreground">
                  Al crear una sucursal, automáticamente tiene acceso a todos los productos disponibles.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-primary font-bold text-sm">3</span>
              </div>
              <div>
                <p className="font-medium">Proveedores por Sucursal</p>
                <p className="text-sm text-muted-foreground">
                  Cada sucursal puede tener sus propios proveedores asignados según su ubicación.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
