import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChefHat,
  Timer,
  Volume2,
  VolumeX,
  RefreshCw,
  LayoutGrid,
  Columns3
} from 'lucide-react';
import { toast } from 'sonner';
import type { Tables, Enums } from '@/integrations/supabase/types';
import KDSStationsView from './KDSStationsView';

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

type ViewMode = 'classic' | 'stations';

const STATUS_CONFIG: Record<Enums<'order_status'>, { label: string; colorClass: string }> = {
  draft: { label: 'Borrador', colorClass: 'bg-muted/50 border-muted text-muted-foreground' },
  pending: { label: 'Pendiente', colorClass: 'bg-warning/20 border-warning text-warning-foreground' },
  confirmed: { label: 'Confirmado', colorClass: 'bg-primary/20 border-primary text-primary' },
  preparing: { label: 'Preparando', colorClass: 'bg-accent/20 border-accent text-accent' },
  ready: { label: 'Listo', colorClass: 'bg-success/20 border-success text-success' },
  waiting_pickup: { label: 'Esperando cadete', colorClass: 'bg-purple-500/20 border-purple-500 text-purple-500' },
  in_transit: { label: 'En viaje', colorClass: 'bg-cyan-500/20 border-cyan-500 text-cyan-500' },
  delivered: { label: 'Entregado', colorClass: 'bg-muted border-border text-muted-foreground' },
  cancelled: { label: 'Cancelado', colorClass: 'bg-destructive/20 border-destructive text-destructive' },
};

const KITCHEN_STATUSES: Enums<'order_status'>[] = ['pending', 'confirmed', 'preparing', 'ready'];

export default function KDSView({ branch }: KDSViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('classic');
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

  const getNextStatus = (order: OrderWithItems): Enums<'order_status'> | null => {
    const currentStatus = order.status;
    const isDeliveryPropio = order.order_type === 'delivery' && 
      !['rappi', 'pedidos_ya', 'mercadopago_delivery'].includes(order.sales_channel || '');
    
    const statusFlow: Record<string, Enums<'order_status'>> = {
      pending: 'confirmed',
      confirmed: 'preparing',
      preparing: 'ready',
      ready: isDeliveryPropio ? 'waiting_pickup' : 'delivered',
      waiting_pickup: 'in_transit',
      in_transit: 'delivered',
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

  const getTimeColorClass = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 10) return 'text-success';
    if (minutes < 20) return 'text-warning';
    return 'text-destructive';
  };

  const groupedOrders = KITCHEN_STATUSES.reduce((acc, status) => {
    acc[status] = orders.filter(o => o.status === status);
    return acc;
  }, {} as Record<Enums<'order_status'>, OrderWithItems[]>);

  // If stations mode, render the stations view
  if (viewMode === 'stations') {
    return (
      <div className="h-[calc(100vh-120px)] -m-6 bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList className="bg-sidebar-accent">
                <TabsTrigger value="classic" className="gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  Clásico
                </TabsTrigger>
                <TabsTrigger value="stations" className="gap-2">
                  <Columns3 className="w-4 h-4" />
                  Estaciones
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        <div className="flex-1 m-6 -mb-0">
          <KDSStationsView branch={branch} />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-[calc(100vh-120px)] -m-6 p-4 bg-sidebar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-8 w-full bg-sidebar-accent" />
              <Skeleton className="h-48 w-full bg-sidebar-accent" />
              <Skeleton className="h-48 w-full bg-sidebar-accent" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] -m-6 bg-sidebar text-sidebar-foreground flex flex-col">
      {/* Audio element for notifications */}
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVxTu+/11rpWLx9Ik8bZx31YVJ/p+uC9YUA7aL/v6K5jQQAQaKr12r9xXHCf6vfbpF5DIluX2+rXrl5Lb7T16MFpUEMxYKbt5bpmUV+C0fDhtmNJMS9mtPLkuGpWh8/v376+//7" type="audio/wav" />
      </audio>

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Cocina - {branch.name}</h1>
              <p className="text-sidebar-foreground/60 text-sm">Kitchen Display System</p>
            </div>
          </div>
          
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="bg-sidebar-accent">
              <TabsTrigger value="classic" className="gap-2">
                <LayoutGrid className="w-4 h-4" />
                Clásico
              </TabsTrigger>
              <TabsTrigger value="stations" className="gap-2">
                <Columns3 className="w-4 h-4" />
                Estaciones
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchOrders()}
            className="border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`border-sidebar-border ${soundEnabled ? 'text-success' : 'text-sidebar-foreground/50'} hover:bg-sidebar-accent`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          <Badge className="bg-accent text-accent-foreground px-3 py-1">
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
              <div className={`p-2 rounded-t-lg border-2 ${config.colorClass}`}>
                <h2 className="font-bold text-center">
                  {config.label} ({statusOrders.length})
                </h2>
              </div>

              <ScrollArea className="flex-1 bg-sidebar-accent rounded-b-lg border border-t-0 border-sidebar-border">
                <div className="p-2 space-y-3">
                  {statusOrders.length === 0 ? (
                    <p className="text-center text-sidebar-foreground/50 py-8">Sin pedidos</p>
                  ) : (
                    statusOrders.map(order => {
                      const nextStatus = getNextStatus(order);
                      
                      return (
                        <Card key={order.id} className={`border-2 ${config.colorClass}`}>
                          <CardHeader className="py-2 px-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">
                                #{order.caller_number || order.id.slice(-4)}
                              </CardTitle>
                              <div className={`flex items-center gap-1 ${getTimeColorClass(order.created_at)}`}>
                                <Timer className="w-4 h-4" />
                                <span className="font-mono text-sm font-bold">
                                  {getTimeSinceOrder(order.created_at)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{order.order_type === 'delivery' ? '🚴 Delivery' : order.order_type === 'dine_in' ? '🍽️ Salón' : '🛍️ Mostrador'}</span>
                              <span>• {order.customer_name}</span>
                            </div>
                          </CardHeader>
                          <CardContent className="py-2 px-3">
                            <ul className="space-y-1">
                              {order.order_items.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm">
                                  <span className="font-bold text-accent">{item.quantity}x</span>
                                  <span className="flex-1">{item.products?.name}</span>
                                </li>
                              ))}
                            </ul>
                            {order.notes && (
                              <p className="mt-2 text-xs text-muted-foreground italic bg-muted/50 p-1 rounded">
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
                                {nextStatus === 'waiting_pickup' && '🚴 Listo para despacho'}
                                {nextStatus === 'in_transit' && '🛵 Cadete retiró'}
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
