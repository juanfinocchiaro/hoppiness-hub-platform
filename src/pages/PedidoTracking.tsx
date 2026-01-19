import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  CheckCircle, 
  ChefHat, 
  Truck, 
  Package,
  MapPin,
  Phone,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import type { Enums } from '@/integrations/supabase/types';

type OrderStatus = Enums<'order_status'>;

interface OrderData {
  id: string;
  status: OrderStatus;
  order_type: string;
  subtotal: number;
  delivery_fee: number | null;
  total: number;
  created_at: string;
  updated_at: string;
  estimated_time: string | null;
  delivery_address: string | null;
  caller_number: number | null;
}

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  product: { name: string } | null;
}

interface BranchData {
  name: string;
  address: string;
  city: string;
  phone: string | null;
}

interface TrackingResponse {
  order: OrderData;
  items: OrderItem[];
  branch: BranchData | null;
}

const STATUS_STEPS: { status: OrderStatus; label: string; icon: React.ReactNode }[] = [
  { status: 'pending', label: 'Recibido', icon: <Clock className="w-5 h-5" /> },
  { status: 'confirmed', label: 'Confirmado', icon: <CheckCircle className="w-5 h-5" /> },
  { status: 'preparing', label: 'Preparando', icon: <ChefHat className="w-5 h-5" /> },
  { status: 'ready', label: 'Listo', icon: <Package className="w-5 h-5" /> },
  { status: 'delivered', label: 'Entregado', icon: <Truck className="w-5 h-5" /> },
];

export default function PedidoTracking() {
  // Now uses tracking token instead of order ID
  const { trackingToken } = useParams();
  const [orderData, setOrderData] = useState<TrackingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = async () => {
    if (!trackingToken) return;
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/order-tracking?token=${trackingToken}`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Order not found');
      }

      const data: TrackingResponse = await response.json();
      setOrderData(data);
    } catch (err: any) {
      setError('Pedido no encontrado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [trackingToken]);

  // Poll for updates every 30 seconds (since realtime requires auth)
  useEffect(() => {
    if (!trackingToken || error) return;

    const interval = setInterval(fetchOrder, 30000);
    return () => clearInterval(interval);
  }, [trackingToken, error]);

  const getCurrentStepIndex = () => {
    if (!orderData?.order) return 0;
    if (orderData.order.status === 'cancelled') return -1;
    return STATUS_STEPS.findIndex(s => s.status === orderData.order.status);
  };

  const formatPrice = (price: number) => 
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(price);

  const formatTime = (dateString: string) => 
    new Date(dateString).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <div className="container mx-auto px-4 py-12">
          <Skeleton className="h-64 max-w-2xl mx-auto" />
        </div>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <PublicHeader />
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md mx-4">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">{error || 'Pedido no encontrado'}</p>
              <Link to="/pedir">
                <Button>Hacer un nuevo pedido</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
        <PublicFooter />
      </div>
    );
  }

  const { order, items, branch } = orderData;
  const currentStep = getCurrentStepIndex();
  const progress = order.status === 'cancelled' ? 0 : ((currentStep + 1) / STATUS_STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicHeader />

      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Link to="/pedir">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Seguí tu pedido</h1>
              <p className="text-muted-foreground text-sm">
                Pedido #{order.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="ml-auto" onClick={fetchOrder}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Status Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Estado del pedido</CardTitle>
                {order.status === 'cancelled' ? (
                  <Badge variant="destructive">Cancelado</Badge>
                ) : (
                  <Badge className="bg-primary">{STATUS_STEPS[currentStep]?.label}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {order.status === 'cancelled' ? (
                <p className="text-center text-muted-foreground py-4">
                  Este pedido fue cancelado
                </p>
              ) : (
                <>
                  <Progress value={progress} className="mb-6" />
                  
                  <div className="flex justify-between">
                    {STATUS_STEPS.map((step, index) => {
                      const isCompleted = index <= currentStep;
                      const isCurrent = index === currentStep;
                      
                      return (
                        <div 
                          key={step.status}
                          className={`flex flex-col items-center text-center ${
                            isCompleted ? 'text-primary' : 'text-muted-foreground'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                            isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          } ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
                            {step.icon}
                          </div>
                          <span className="text-xs font-medium hidden sm:block">{step.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle>Detalle del pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Items */}
              <div className="space-y-2">
                {items?.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.quantity}x {item.product?.name || 'Producto'}</span>
                    <span className="text-muted-foreground">{formatPrice(item.quantity * item.unit_price)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                {(order.delivery_fee || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Envío</span>
                    <span>{formatPrice(order.delivery_fee || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(order.total)}</span>
                </div>
              </div>

              {/* Order Info */}
              <div className="border-t pt-4 text-sm space-y-2">
                <p className="text-muted-foreground">
                  Pedido realizado a las {formatTime(order.created_at)}
                </p>
                <p className="flex items-center gap-2">
                  <Badge variant="outline">
                    {order.order_type === 'delivery' ? 'Delivery' : 'Retiro en local'}
                  </Badge>
                </p>
                {order.delivery_address && (
                  <p className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    {order.delivery_address}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Branch Info */}
          {branch && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sucursal</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p className="font-medium">Hoppiness {branch.name}</p>
                <p className="text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {branch.address}, {branch.city}
                </p>
                {branch.phone && (
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {branch.phone}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
