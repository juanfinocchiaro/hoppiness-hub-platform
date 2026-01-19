import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  ChefHat, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Utensils,
  Store,
  Bike,
  Volume2,
  VolumeX,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import type { Tables, Enums } from '@/integrations/supabase/types';

type Order = Tables<'orders'>;
type OrderItem = Tables<'order_items'>;
type Product = Tables<'products'>;
type Branch = Tables<'branches'>;

interface OrderWithItems extends Order {
  items: (OrderItem & { product: Product })[];
}

type OrderStatus = Enums<'order_status'>;

const STATUS_COLORS: Record<OrderStatus, string> = {
  draft: 'bg-slate-400',
  pending: 'bg-yellow-500',
  confirmed: 'bg-blue-500',
  preparing: 'bg-orange-500',
  ready: 'bg-green-500',
  delivered: 'bg-gray-500',
  cancelled: 'bg-red-500',
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  draft: 'Borrador',
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const ORDER_AREA_ICONS = {
  salon: Utensils,
  mostrador: Store,
  delivery: Bike,
};

export default function KDS() {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const { accessibleBranches, loading: roleLoading } = useUserRole();
  
  const [branch, setBranch] = useState<Branch | null>(null);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [products, setProducts] = useState<Map<string, Product>>(new Map());
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastOrderCount, setLastOrderCount] = useState(0);

  // Find branch
  useEffect(() => {
    if (!roleLoading && branchId) {
      const found = accessibleBranches.find(b => b.id === branchId);
      if (found) {
        setBranch(found);
      } else if (accessibleBranches.length > 0) {
        // Redirect to first accessible branch
        navigate(`/pos/${accessibleBranches[0].id}/kds`, { replace: true });
      }
    }
  }, [roleLoading, branchId, accessibleBranches, navigate]);

  // Fetch products (for item names)
  useEffect(() => {
    async function fetchProducts() {
      const { data } = await supabase.from('products').select('*');
      if (data) {
        setProducts(new Map(data.map(p => [p.id, p])));
      }
    }
    fetchProducts();
  }, []);

  // Fetch orders and set up realtime subscription
  useEffect(() => {
    if (!branch) return;

    async function fetchOrders() {
      setLoading(true);
      
      // Get orders for this branch that are not delivered or cancelled
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('*')
        .eq('branch_id', branch!.id)
        .in('status', ['pending', 'confirmed', 'preparing', 'ready'])
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching orders:', error);
        setLoading(false);
        return;
      }

      if (ordersData) {
        // Fetch items for all orders
        const orderIds = ordersData.map(o => o.id);
        
        if (orderIds.length > 0) {
          const { data: itemsData } = await supabase
            .from('order_items')
            .select('*')
            .in('order_id', orderIds);

          const itemsByOrder = new Map<string, OrderItem[]>();
          (itemsData || []).forEach(item => {
            const existing = itemsByOrder.get(item.order_id) || [];
            existing.push(item);
            itemsByOrder.set(item.order_id, existing);
          });

          const ordersWithItems: OrderWithItems[] = ordersData.map(order => ({
            ...order,
            items: (itemsByOrder.get(order.id) || []).map(item => ({
              ...item,
              product: products.get(item.product_id) || { name: 'Producto', price: 0 } as Product,
            })),
          }));

          setOrders(ordersWithItems);
          setLastOrderCount(ordersWithItems.length);
        } else {
          setOrders([]);
        }
      }
      
      setLoading(false);
    }

    fetchOrders();

    // Set up realtime subscription
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
          
          if (payload.eventType === 'INSERT') {
            // Play sound for new orders
            if (soundEnabled) {
              playNewOrderSound();
            }
            toast.info('🔔 ¡Nuevo pedido!', { duration: 5000 });
          }
          
          // Refetch orders
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [branch, products, soundEnabled]);

  const playNewOrderSound = () => {
    try {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      
      setTimeout(() => {
        oscillator.frequency.value = 1000;
      }, 150);
      
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 300);
    } catch (e) {
      console.log('Could not play sound:', e);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;
      
      // Update local state
      setOrders(prev => 
        prev.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        ).filter(order => !['delivered', 'cancelled'].includes(order.status))
      );
      
      toast.success(`Pedido marcado como ${STATUS_LABELS[newStatus]}`);
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Error al actualizar el pedido');
    }
  };

  const getTimeSinceOrder = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `${minutes} min`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  const getTimeColor = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 10) return 'text-green-600';
    if (minutes < 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    switch (currentStatus) {
      case 'pending': return 'confirmed';
      case 'confirmed': return 'preparing';
      case 'preparing': return 'ready';
      case 'ready': return 'delivered';
      default: return null;
    }
  };

  const getNextAction = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'Confirmar';
      case 'confirmed': return 'Preparar';
      case 'preparing': return '¡Listo!';
      case 'ready': return 'Entregar';
      default: return null;
    }
  };

  if (roleLoading || !branch) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 flex items-center justify-center">
        <Skeleton className="h-32 w-32" />
      </div>
    );
  }

  // Group orders by status
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const confirmedOrders = orders.filter(o => o.status === 'confirmed');
  const preparingOrders = orders.filter(o => o.status === 'preparing');
  const readyOrders = orders.filter(o => o.status === 'ready');

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/pos')}
              className="text-gray-300 hover:text-white hover:bg-gray-700"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
                <ChefHat className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Kitchen Display</h1>
                <p className="text-sm text-gray-400">{branch.name}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge className="bg-orange-500 text-lg px-3 py-1">
              {orders.length} pedidos activos
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-gray-300 hover:text-white hover:bg-gray-700"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.location.reload()}
              className="text-gray-300 hover:text-white hover:bg-gray-700"
            >
              <RefreshCw className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Orders Grid */}
      <div className="p-4">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-64 bg-gray-800" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
            <ChefHat className="w-24 h-24 mb-4 opacity-30" />
            <p className="text-2xl font-medium">Sin pedidos pendientes</p>
            <p className="text-gray-600 mt-2">Los nuevos pedidos aparecerán aquí automáticamente</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status Sections */}
            {[
              { title: '🔴 Pendientes', orders: pendingOrders, color: 'border-yellow-500' },
              { title: '🟡 Confirmados', orders: confirmedOrders, color: 'border-blue-500' },
              { title: '🟠 Preparando', orders: preparingOrders, color: 'border-orange-500' },
              { title: '🟢 Listos', orders: readyOrders, color: 'border-green-500' },
            ].filter(section => section.orders.length > 0).map(section => (
              <div key={section.title}>
                <h2 className="text-lg font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  {section.title}
                  <Badge variant="outline" className="text-gray-400">{section.orders.length}</Badge>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {section.orders.map(order => {
                    const AreaIcon = ORDER_AREA_ICONS[order.order_area || 'mostrador'];
                    const nextStatus = getNextStatus(order.status);
                    const nextAction = getNextAction(order.status);
                    
                    return (
                      <Card 
                        key={order.id} 
                        className={`bg-gray-800 border-2 ${section.color} border-opacity-50`}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className={`${STATUS_COLORS[order.status]} text-white`}>
                                #{order.caller_number || order.id.slice(0, 4).toUpperCase()}
                              </Badge>
                              <AreaIcon className="w-4 h-4 text-gray-400" />
                            </div>
                            <div className={`flex items-center gap-1 text-sm font-medium ${getTimeColor(order.created_at)}`}>
                              <Clock className="w-4 h-4" />
                              {getTimeSinceOrder(order.created_at)}
                            </div>
                          </div>
                          <CardTitle className="text-white text-base mt-2">
                            {order.customer_name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {/* Order Items */}
                          <div className="bg-gray-900 rounded-lg p-3 space-y-2">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center">
                                <span className="text-gray-200">
                                  <span className="font-bold text-orange-400 mr-2">{item.quantity}x</span>
                                  {item.product?.name || 'Producto'}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Notes */}
                          {order.notes && (
                            <div className="flex items-start gap-2 text-sm text-yellow-400 bg-yellow-900/20 rounded p-2">
                              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                              <span>{order.notes}</span>
                            </div>
                          )}

                          {/* Action Button */}
                          {nextStatus && nextAction && (
                            <Button
                              className={`w-full text-lg font-bold py-6 ${
                                order.status === 'preparing' 
                                  ? 'bg-green-600 hover:bg-green-500' 
                                  : 'bg-orange-600 hover:bg-orange-500'
                              }`}
                              onClick={() => updateOrderStatus(order.id, nextStatus)}
                            >
                              {order.status === 'preparing' && <CheckCircle2 className="w-5 h-5 mr-2" />}
                              {nextAction}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}