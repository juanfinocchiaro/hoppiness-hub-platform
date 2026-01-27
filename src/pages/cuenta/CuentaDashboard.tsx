import { useAuth } from '@/hooks/useAuth';
import { usePermissionsV2 } from '@/hooks/usePermissionsV2';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, MapPin, User, Clock, Store, ArrowRight, Repeat, Loader2, Briefcase } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { useState } from 'react';
import MyScheduleCard from '@/components/cuenta/MyScheduleCard';
import MyClockInsCard from '@/components/cuenta/MyClockInsCard';
import MySalaryAdvancesCard from '@/components/cuenta/MySalaryAdvancesCard';
import MyWarningsCard from '@/components/cuenta/MyWarningsCard';
import MyCashClosingsCard from '@/components/cuenta/MyCashClosingsCard';
import MyCommunicationsCard from '@/components/cuenta/MyCommunicationsCard';

export default function CuentaDashboard() {
  const { user, signOut } = useAuth();
  const { localRole, canAccessLocalPanel, branchIds, loading: rolesLoading } = usePermissionsV2();
  const navigate = useNavigate();
  const { addItem, clearCart, setBranch } = useCart();
  const [isRepeating, setIsRepeating] = useState(false);

  // Check if user is an employee (has local role)
  const isEmployee = !!localRole;

  // Fetch profile data
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!user,
  });

  // Fetch user's orders with items for repeat functionality
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['user-orders', user?.id],
    queryFn: async () => {
      if (!user) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (supabase as any)
        .from('orders')
        .select(`
          id,
          status,
          total,
          created_at,
          order_type,
          tracking_token,
          branch_id,
          branches:branch_id (id, name, address, is_open)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (result.error) throw result.error;
      return result.data;
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

  // Fetch branch names for employee section
  const { data: employeeBranches } = useQuery({
    queryKey: ['employee-branches', branchIds],
    queryFn: async () => {
      if (!branchIds || branchIds.length === 0) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (supabase as any)
        .from('branches')
        .select('id, name')
        .in('id', branchIds);
      if (result.error) throw result.error;
      return result.data as { id: string; name: string }[];
    },
    enabled: !!branchIds && branchIds.length > 0,
  });

  // Get active order (if any)
  const activeOrder = orders?.find((o: any) => 
    ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)
  );

  // Get last completed order for "repeat" feature
  const lastOrder = orders?.find((o: any) => o.status === 'delivered');

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

  const handleRepeatOrder = async () => {
    if (!lastOrder) return;
    
    setIsRepeating(true);
    try {
      // Fetch order items with product details
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const itemsResult = await (supabase as any)
        .from('order_items')
        .select(`
          id,
          product_id,
          quantity,
          unit_price,
          notes,
          products:product_id (
            id, name, price, description, image_url, is_active
          )
        `)
        .eq('order_id', lastOrder.id);

      if (itemsResult.error) throw itemsResult.error;
      const orderItems = itemsResult.data;

      if (!orderItems?.length) {
        toast.error('No se encontraron productos en el pedido');
        return;
      }

      // Fetch the branch
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const branchResult = await (supabase as any)
        .from('branches')
        .select('*')
        .eq('id', lastOrder.branch_id)
        .single();

      if (branchResult.error || !branchResult.data) {
        toast.error('La sucursal ya no está disponible');
        return;
      }
      const branch = branchResult.data;

      // Check branch is open
      if (!branch.is_open) {
        toast.error('La sucursal está cerrada en este momento');
        return;
      }

      // Clear current cart and set branch
      clearCart();
      setBranch(branch);

      // Fetch modifiers for each item
      const itemsWithModifiers = await Promise.all(
        orderItems.map(async (item: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const modResult = await (supabase as any)
            .from('order_item_modifiers')
            .select('modifier_option_id, option_name, price_adjustment')
            .eq('order_item_id', item.id);

          return { ...item, modifiers: modResult.data || [] };
        })
      );

      // Add items to cart
      let addedCount = 0;
      for (const item of itemsWithModifiers) {
        if (!item.products || !item.products.is_active) continue;

        const product = item.products;
        
        // Build modifiers object
        const modifiersObj: Record<string, string[]> = {};
        const modifierNames: string[] = [];
        let modifiersTotal = 0;

        for (const mod of item.modifiers) {
          if (mod.modifier_option_id) {
            modifierNames.push(mod.option_name);
            modifiersTotal += Number(mod.price_adjustment) || 0;
          }
        }

        addItem({
          product: {
            ...product,
            finalPrice: product.price,
          },
          quantity: item.quantity,
          modifiers: modifiersObj,
          modifiersTotal,
          modifierNames,
          notes: item.notes || undefined,
        });
        addedCount++;
      }

      if (addedCount > 0) {
        toast.success(`${addedCount} producto(s) agregados al carrito`);
        navigate(`/pedir/${branch.slug}`);
      } else {
        toast.error('No se pudieron agregar productos al carrito');
      }
    } catch (error) {
      console.error('Error repeating order:', error);
      toast.error('Error al repetir el pedido');
    } finally {
      setIsRepeating(false);
    }
  };

  const getRoleLabel = (role: string | null) => {
    if (!role) return '';
    const labels: Record<string, string> = {
      franquiciado: 'Franquiciado',
      encargado: 'Encargado',
      contador_local: 'Contador',
      cajero: 'Cajero',
      empleado: 'Empleado',
    };
    return labels[role] || role;
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
                      {activeOrder.branches?.name || 'Sucursal'} · {getStatusLabel(activeOrder.status)}
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

          {/* Employee Section - Only if user has local role */}
          {isEmployee && (
            <>
              <div className="border-t pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Mi Trabajo</h2>
                  {localRole && (
                    <span className="text-sm bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {getRoleLabel(localRole)}
                    </span>
                  )}
                </div>
              </div>

              {/* Branch Cards */}
              {employeeBranches && employeeBranches.length > 0 && (
                <div className="grid gap-4">
                  {employeeBranches.map((branch) => (
                    <Card key={branch.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <Store className="w-5 h-5 text-muted-foreground" />
                          <CardTitle className="text-lg">{branch.name}</CardTitle>
                        </div>
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
                </div>
              )}

              {/* Employee Cards - Communications, Schedule, Clock-ins, Advances, Warnings, Cash Closings */}
              <div className="grid gap-4">
                <MyCommunicationsCard />
                <MyScheduleCard />
                <MyClockInsCard />
                <MySalaryAdvancesCard />
                <MyWarningsCard />
                <MyCashClosingsCard />
              </div>
            </>
          )}

          {/* Customer Section - Always visible */}
          <div className={isEmployee ? 'border-t pt-6' : ''}>
            {isEmployee && (
              <h2 className="text-lg font-semibold text-muted-foreground mb-4">Como Cliente</h2>
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
                      {format(new Date(lastOrder.created_at), "d 'de' MMMM", { locale: es })} · {lastOrder.branches?.name}
                    </p>
                    <p className="font-medium">{formatCurrency(lastOrder.total)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/cuenta/pedidos/${lastOrder.id}`}>
                      <Button variant="outline" size="sm">Ver detalle</Button>
                    </Link>
                    <Button 
                      size="sm" 
                      onClick={handleRepeatOrder}
                      disabled={isRepeating}
                    >
                      {isRepeating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Agregando...
                        </>
                      ) : (
                        'Repetir pedido'
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
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
