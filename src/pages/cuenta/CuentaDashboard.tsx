import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, MapPin, User, Clock, Store, ArrowRight, Repeat } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function CuentaDashboard() {
  const { user, signOut } = useAuth();
  const { branchRoles, canUseLocalPanel, loading: rolesLoading } = useUserRoles();

  // Fetch profile data
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch user's orders
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['user-orders', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          total,
          created_at,
          order_type,
          tracking_token,
          branches:branch_id (name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch user's addresses count
  const { data: addressCount } = useQuery({
    queryKey: ['user-addresses-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from('user_addresses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  // Get active order (if any)
  const activeOrder = orders?.find(o => 
    ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)
  );

  // Get last completed order for "repeat" feature
  const lastOrder = orders?.find(o => o.status === 'delivered');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      confirmed: 'Confirmado',
      preparing: 'Preparando',
      ready: 'Listo',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-orange-100 text-orange-800',
      ready: 'bg-green-100 text-green-800',
      delivered: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <PublicHeader />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Welcome */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                Hola, {profile?.full_name?.split(' ')[0] || 'Usuario'}! 👋
              </h1>
              <p className="text-muted-foreground">
                Bienvenido a tu cuenta de Hoppiness Club
              </p>
            </div>
            <Button variant="outline" onClick={signOut}>
              Cerrar sesión
            </Button>
          </div>

          {/* Active Order Banner */}
          {activeOrder && (
            <Card className="border-primary bg-primary/5">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary animate-pulse" />
                  <CardTitle className="text-lg">Pedido en curso</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      Pedido #{activeOrder.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {(activeOrder.branches as any)?.name || 'Sucursal'} · {getStatusLabel(activeOrder.status)}
                    </p>
                  </div>
                  <Link to={`/pedido/${activeOrder.tracking_token}`}>
                    <Button>
                      Ver seguimiento
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mis Pedidos */}
            <Link to="/cuenta/pedidos">
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <Package className="w-8 h-8 text-primary mb-2" />
                  <CardTitle>Mis Pedidos</CardTitle>
                  <CardDescription>
                    {profile?.total_orders || 0} pedidos · {formatCurrency(profile?.total_spent || 0)} total
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="link" className="p-0">
                    Ver historial <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            </Link>

            {/* Mis Direcciones */}
            <Link to="/cuenta/direcciones">
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <MapPin className="w-8 h-8 text-primary mb-2" />
                  <CardTitle>Mis Direcciones</CardTitle>
                  <CardDescription>
                    {addressCount || 0} direcciones guardadas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="link" className="p-0">
                    Gestionar <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Repeat Last Order */}
          {lastOrder && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Repeat className="w-5 h-5 text-muted-foreground" />
                  <CardTitle className="text-lg">Repetir último pedido</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(lastOrder.created_at), "d 'de' MMMM", { locale: es })} · {(lastOrder.branches as any)?.name}
                    </p>
                    <p className="font-medium">{formatCurrency(lastOrder.total)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/cuenta/pedidos/${lastOrder.id}`}>
                      <Button variant="outline" size="sm">Ver detalle</Button>
                    </Link>
                    <Button size="sm" disabled>Repetir pedido</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Work Section - Only if user has branch roles */}
          {canUseLocalPanel && branchRoles.length > 0 && (
            <>
              <div className="border-t pt-6">
                <h2 className="text-lg font-semibold text-muted-foreground mb-4">Mi Trabajo</h2>
              </div>
              
              {branchRoles.map((br) => (
                <Card key={br.branch_id}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Store className="w-5 h-5 text-muted-foreground" />
                      <CardTitle className="text-lg">{br.branch_name}</CardTitle>
                    </div>
                    <CardDescription>
                      {br.roles.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(', ')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link to="/local">
                      <Button variant="outline">
                        Ir a Mi Local
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </>
          )}

          {/* Profile & Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link to="/cuenta/perfil">
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <User className="w-8 h-8 text-primary mb-2" />
                  <CardTitle>Mi Perfil</CardTitle>
                  <CardDescription>
                    {profile?.full_name}<br />
                    {profile?.email}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="link" className="p-0">
                    Editar <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </main>
      
      <PublicFooter />
    </div>
  );
}
