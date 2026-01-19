import { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, ChefHat, CheckCircle, Truck, XCircle, RefreshCw, Phone, MapPin, User } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables, Enums } from '@/integrations/supabase/types';

type Order = Tables<'orders'> & {
  items?: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    notes: string | null;
    product: { name: string } | null;
  }>;
};

type OrderStatus = Enums<'order_status'>;

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-500', icon: <Clock className="h-4 w-4" /> },
  confirmed: { label: 'Confirmado', color: 'bg-blue-500', icon: <CheckCircle className="h-4 w-4" /> },
  preparing: { label: 'Preparando', color: 'bg-orange-500', icon: <ChefHat className="h-4 w-4" /> },
  ready: { label: 'Listo', color: 'bg-green-500', icon: <CheckCircle className="h-4 w-4" /> },
  delivered: { label: 'Entregado', color: 'bg-gray-500', icon: <Truck className="h-4 w-4" /> },
  cancelled: { label: 'Cancelado', color: 'bg-red-500', icon: <XCircle className="h-4 w-4" /> },
};

const ORDER_AREA_LABELS: Record<string, string> = {
  salon: 'Salón',
  mostrador: 'Mostrador',
  delivery: 'Delivery',
};

export default function LocalPedidos() {
  const { branchId } = useParams();
  const { branch } = useOutletContext<{ branch: Tables<'branches'> | null }>();
  const { isAdmin, isGerente, branchPermissions } = useUserRole();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  const currentPermissions = branchPermissions.find(p => p.branch_id === branchId);
  const canManageOrders = isAdmin || isGerente || currentPermissions?.can_manage_orders;

  const fetchOrders = async () => {
    if (!branchId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(
            id,
            quantity,
            unit_price,
            notes,
            product:products(name)
          )
        `)
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data as Order[]);
    } catch (error: any) {
      toast.error('Error al cargar pedidos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [branchId]);

  // Realtime subscription
  useEffect(() => {
    if (!branchId) return;

    const channel = supabase
      .channel(`orders-${branchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `branch_id=eq.${branchId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            toast.info('¡Nuevo pedido recibido!');
          }
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [branchId]);

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (!canManageOrders) {
      toast.error('No tenés permisos para cambiar el estado');
      return;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      toast.success(`Pedido actualizado a: ${STATUS_CONFIG[newStatus].label}`);
    } catch (error: any) {
      toast.error('Error al actualizar: ' + error.message);
    }
  };

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    const flow: Record<OrderStatus, OrderStatus | null> = {
      pending: 'confirmed',
      confirmed: 'preparing',
      preparing: 'ready',
      ready: 'delivered',
      delivered: null,
      cancelled: null,
    };
    return flow[currentStatus];
  };

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const completedOrders = orders.filter(o => ['delivered', 'cancelled'].includes(o.status));

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-AR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getTimeSince = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pedidos</h1>
          <p className="text-muted-foreground">{branch?.name}</p>
        </div>
        <Button variant="outline" onClick={fetchOrders} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active" className="relative">
            Activos
            {activeOrders.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 justify-center">
                {activeOrders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">Completados</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : activeOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No hay pedidos activos
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={updateOrderStatus}
                  getNextStatus={getNextStatus}
                  formatTime={formatTime}
                  getTimeSince={getTimeSince}
                  canEdit={canManageOrders}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {completedOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No hay pedidos completados hoy
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedOrders.slice(0, 20).map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={updateOrderStatus}
                  getNextStatus={getNextStatus}
                  formatTime={formatTime}
                  getTimeSince={getTimeSince}
                  canEdit={false}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface OrderCardProps {
  order: Order;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  getNextStatus: (status: OrderStatus) => OrderStatus | null;
  formatTime: (date: string) => string;
  getTimeSince: (date: string) => string;
  canEdit: boolean;
}

function OrderCard({ order, onStatusChange, getNextStatus, formatTime, getTimeSince, canEdit }: OrderCardProps) {
  const statusConfig = STATUS_CONFIG[order.status];
  const nextStatus = getNextStatus(order.status);

  return (
    <Card className="overflow-hidden">
      <CardHeader className={`${statusConfig.color} text-white py-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {statusConfig.icon}
            <span className="font-semibold">{statusConfig.label}</span>
          </div>
          <div className="text-sm opacity-90">
            #{order.caller_number || '---'}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 space-y-3">
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{order.customer_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{order.customer_phone}</span>
          </div>
          {order.delivery_address && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs">{order.delivery_address}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            {ORDER_AREA_LABELS[order.order_area || 'mostrador']}
          </Badge>
        </div>

        <div className="border-t pt-3">
          <p className="text-xs text-muted-foreground mb-2">Productos:</p>
          <ul className="space-y-1 text-sm">
            {order.items?.map((item) => (
              <li key={item.id} className="flex justify-between">
                <span>{item.quantity}x {item.product?.name || 'Producto'}</span>
                <span className="text-muted-foreground">${(item.quantity * item.unit_price).toFixed(0)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t pt-3 flex justify-between items-center">
          <div>
            <p className="text-lg font-bold">${order.total.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">
              {formatTime(order.created_at)} · hace {getTimeSince(order.created_at)}
            </p>
          </div>
        </div>

        {canEdit && (
          <div className="flex gap-2 pt-2">
            {nextStatus && (
              <Button 
                className="flex-1"
                onClick={() => onStatusChange(order.id, nextStatus)}
              >
                {STATUS_CONFIG[nextStatus].icon}
                <span className="ml-2">{STATUS_CONFIG[nextStatus].label}</span>
              </Button>
            )}
            {order.status !== 'cancelled' && order.status !== 'delivered' && (
              <Button 
                variant="destructive" 
                size="icon"
                onClick={() => onStatusChange(order.id, 'cancelled')}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
