import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, 
  CheckCircle, 
  ChefHat,
  Timer,
  Volume2,
  VolumeX
} from 'lucide-react';
import { toast } from 'sonner';
import type { Tables, Enums } from '@/integrations/supabase/types';

type Order = Tables<'orders'>;
type OrderItem = Tables<'order_items'>;
type Product = Tables<'products'>;
type Branch = Tables<'branches'>;

interface OrderWithItems extends Order {
  order_items: (OrderItem & { products: Product })[];
}

interface KDSViewProps {
  branch: Branch;
}

const STATUS_CONFIG: Record<Enums<'order_status'>, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pendiente', color: 'text-yellow-700', bgColor: 'bg-yellow-100 border-yellow-300' },
  confirmed: { label: 'Confirmado', color: 'text-blue-700', bgColor: 'bg-blue-100 border-blue-300' },
  preparing: { label: 'Preparando', color: 'text-orange-700', bgColor: 'bg-orange-100 border-orange-300' },
  ready: { label: 'Listo', color: 'text-green-700', bgColor: 'bg-green-100 border-green-300' },
  delivered: { label: 'Entregado', color: 'text-gray-700', bgColor: 'bg-gray-100 border-gray-300' },
  cancelled: { label: 'Cancelado', color: 'text-red-700', bgColor: 'bg-red-100 border-red-300' },
};

const KITCHEN_STATUSES: Enums<'order_status'>[] = ['pending', 'confirmed', 'preparing', 'ready'];

export default function KDSView({ branch }: KDSViewProps) {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchOrders = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          *,
          products(*)
        )
      `)
      .eq('branch_id', branch.id)
      .in('status', KITCHEN_STATUSES)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching orders:', error);
      toast.error('Error al cargar pedidos');
      return;
    }

    setOrders(data as OrderWithItems[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`kds-orders-${branch.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `branch_id=eq.${branch.id}`,
        },
        (payload) => {
          console.log('Order change:', payload);
          if (payload.eventType === 'INSERT' && soundEnabled) {
            playNotificationSound();
          }
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [branch.id, soundEnabled]);

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: Enums<'order_status'>) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      toast.error('Error al actualizar el pedido');
      return;
    }

    toast.success(`Pedido marcado como ${STATUS_CONFIG[newStatus].label}`);
  };

  const getNextStatus = (currentStatus: Enums<'order_status'>): Enums<'order_status'> | null => {
    const statusFlow: Record<string, Enums<'order_status'>> = {
      pending: 'confirmed',
      confirmed: 'preparing',
      preparing: 'ready',
      ready: 'delivered',
    };
    return statusFlow[currentStatus] || null;
  };

  const getTimeSinceOrder = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const getTimeColor = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 10) return 'text-green-600';
    if (minutes < 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  const groupedOrders = KITCHEN_STATUSES.reduce((acc, status) => {
    acc[status] = orders.filter(o => o.status === status);
    return acc;
  }, {} as Record<Enums<'order_status'>, OrderWithItems[]>);

  if (loading) {
    return (
      <div className="h-[calc(100vh-120px)] -m-6 p-4 bg-gray-900">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-8 w-full bg-gray-700" />
              <Skeleton className="h-48 w-full bg-gray-800" />
              <Skeleton className="h-48 w-full bg-gray-800" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] -m-6 bg-gray-900 text-white flex flex-col">
      {/* Audio element for notifications */}
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVxTu+/11rpWLx9Ik8bZx31YVJ/p+uC9YUA7aL/v6K5jQQAQaKr12r9xXHCf6vfbpF5DIluX2+rXrl5Lb7T16MFpUEMxYKbt5bpmUV+C0fDhtmNJMS9mtPLkuGpWh8/v376+//7" type="audio/wav" />
      </audio>

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <ChefHat className="w-8 h-8 text-orange-500" />
          <div>
            <h1 className="text-2xl font-bold">Cocina - {branch.name}</h1>
            <p className="text-gray-400 text-sm">Kitchen Display System</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={soundEnabled ? 'border-green-500 text-green-500' : 'border-gray-500 text-gray-500'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          <Badge variant="outline" className="text-lg px-3 py-1">
            {orders.length} pedidos activos
          </Badge>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 overflow-hidden">
        {KITCHEN_STATUSES.map(status => {
          const statusOrders = groupedOrders[status];
          const config = STATUS_CONFIG[status];

          return (
            <div key={status} className="flex flex-col h-full">
              <div className={`p-2 rounded-t-lg ${config.bgColor} border-b-2`}>
                <h2 className={`font-bold text-center ${config.color}`}>
                  {config.label} ({statusOrders.length})
                </h2>
              </div>

              <ScrollArea className="flex-1 bg-gray-800 rounded-b-lg">
                <div className="p-2 space-y-3">
                  {statusOrders.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">Sin pedidos</p>
                  ) : (
                    statusOrders.map(order => {
                      const nextStatus = getNextStatus(order.status);
                      
                      return (
                        <Card key={order.id} className={`${config.bgColor} border-2`}>
                          <CardHeader className="py-2 px-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className={`text-lg ${config.color}`}>
                                #{order.caller_number || order.id.slice(-4)}
                              </CardTitle>
                              <div className={`flex items-center gap-1 ${getTimeColor(order.created_at)}`}>
                                <Timer className="w-4 h-4" />
                                <span className="font-mono text-sm font-bold">
                                  {getTimeSinceOrder(order.created_at)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <span>{order.order_type === 'delivery' ? '🚴 Delivery' : order.order_type === 'dine_in' ? '🍽️ Salón' : '🛍️ Mostrador'}</span>
                              <span>• {order.customer_name}</span>
                            </div>
                          </CardHeader>
                          <CardContent className="py-2 px-3">
                            <ul className="space-y-1">
                              {order.order_items.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm text-gray-800">
                                  <span className="font-bold text-orange-600">{item.quantity}x</span>
                                  <span className="flex-1">{item.products?.name}</span>
                                </li>
                              ))}
                            </ul>
                            {order.notes && (
                              <p className="mt-2 text-xs text-gray-600 italic bg-white/50 p-1 rounded">
                                📝 {order.notes}
                              </p>
                            )}

                            {nextStatus && (
                              <Button
                                className="w-full mt-3"
                                size="sm"
                                onClick={() => updateOrderStatus(order.id, nextStatus)}
                              >
                                {nextStatus === 'confirmed' && '✓ Confirmar'}
                                {nextStatus === 'preparing' && '🍳 Empezar'}
                                {nextStatus === 'ready' && '✅ Listo'}
                                {nextStatus === 'delivered' && '📦 Entregado'}
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>
    </div>
  );
}
