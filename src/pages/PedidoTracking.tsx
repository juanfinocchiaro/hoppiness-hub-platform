import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  CheckCircle, 
  ChefHat, 
  Truck, 
  Package,
  MapPin,
  Phone,
  ArrowLeft,
  RefreshCw,
  ShoppingBag,
  Timer,
  XCircle,
  Copy,
  Check
} from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { RegisterBanner } from '@/components/store/RegisterBanner';
import type { Enums } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

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

const STATUS_STEPS: { status: OrderStatus; label: string; description: string; icon: React.ReactNode }[] = [
  { status: 'pending', label: 'Recibido', description: 'Tu pedido fue recibido', icon: <Clock className="w-5 h-5" /> },
  { status: 'confirmed', label: 'Confirmado', description: 'El local confirmó tu pedido', icon: <CheckCircle className="w-5 h-5" /> },
  { status: 'preparing', label: 'Preparando', description: 'Estamos preparando tu pedido', icon: <ChefHat className="w-5 h-5" /> },
  { status: 'ready', label: 'Listo', description: 'Tu pedido está listo', icon: <Package className="w-5 h-5" /> },
  { status: 'delivered', label: 'Entregado', description: '¡Disfrutá tu pedido!', icon: <Truck className="w-5 h-5" /> },
];

export default function PedidoTracking() {
  const { trackingToken } = useParams();
  const [orderData, setOrderData] = useState<TrackingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchOrder = async (showRefresh = false, isInitial = false) => {
    if (!trackingToken) return;
    
    if (showRefresh) setIsRefreshing(true);
    
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
      setError(null); // Clear any previous error on success
    } catch (err: unknown) {
      // Only set error on initial load, not on polling failures
      if (isInitial && !orderData) {
        setError('Pedido no encontrado');
      }
      // Silently ignore polling failures if we already have data
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrder(false, true);
  }, [trackingToken]);

  // Poll for updates every 30 seconds
  useEffect(() => {
    if (!trackingToken || error) return;
    const interval = setInterval(() => fetchOrder(false), 30000);
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

  const formatDate = (dateString: string) => 
    new Date(dateString).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' });

  const copyOrderId = async () => {
    if (!orderData?.order) return;
    await navigator.clipboard.writeText(orderData.order.id.slice(0, 8).toUpperCase());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getEstimatedTimeRemaining = () => {
    if (!orderData?.order?.estimated_time) return null;
    const estimated = new Date(orderData.order.estimated_time);
    const now = new Date();
    const diffMs = estimated.getTime() - now.getTime();
    if (diffMs <= 0) return 'Pronto';
    const diffMins = Math.ceil(diffMs / 60000);
    return `~${diffMins} min`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <PublicHeader />
        <div className="container mx-auto px-4 py-8 max-w-lg">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-64 w-full rounded-2xl mb-4" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="min-h-screen bg-muted/30 flex flex-col">
        <PublicHeader />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-sm w-full rounded-2xl shadow-lg">
            <CardContent className="py-12 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Pedido no encontrado</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  El link de seguimiento no es válido o expiró
                </p>
              </div>
              <Link to="/pedir">
                <Button className="w-full rounded-xl">
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Hacer un nuevo pedido
                </Button>
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
  const isCancelled = order.status === 'cancelled';
  const isDelivered = order.status === 'delivered';
  const estimatedTime = getEstimatedTimeRemaining();

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <PublicHeader />

      <div className="container mx-auto px-4 py-6 flex-1 max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to="/pedir">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-bold text-lg">Seguimiento</h1>
              <button 
                onClick={copyOrderId}
                className="text-muted-foreground text-xs flex items-center gap-1 hover:text-foreground transition-colors"
              >
                #{order.id.slice(0, 8).toUpperCase()}
                {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full"
            onClick={() => fetchOrder(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>

        <div className="space-y-4">
          {/* Status Hero Card */}
          <Card className={cn(
            "rounded-2xl overflow-hidden border-0 shadow-lg",
            isCancelled && "bg-destructive/5",
            isDelivered && "bg-green-500/5"
          )}>
            <CardContent className="p-6">
              {isCancelled ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                    <XCircle className="w-8 h-8 text-destructive" />
                  </div>
                  <h2 className="font-bold text-lg text-destructive">Pedido cancelado</h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Este pedido fue cancelado
                  </p>
                </div>
              ) : (
                <>
                  {/* Current Status Display */}
                  <div className="text-center mb-6">
                    <div className={cn(
                      "w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 transition-all",
                      isDelivered 
                        ? "bg-green-500 text-white" 
                        : "bg-primary text-primary-foreground animate-pulse"
                    )}>
                      {STATUS_STEPS[currentStep]?.icon}
                    </div>
                    <h2 className="font-bold text-xl">{STATUS_STEPS[currentStep]?.label}</h2>
                    <p className="text-muted-foreground text-sm mt-1">
                      {STATUS_STEPS[currentStep]?.description}
                    </p>
                    
                    {/* Estimated Time */}
                    {!isDelivered && estimatedTime && (
                      <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full">
                        <Timer className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">{estimatedTime}</span>
                      </div>
                    )}
                  </div>

                  {/* Progress Steps */}
                  <div className="relative">
                    {/* Progress Line */}
                    <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted">
                      <div 
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` }}
                      />
                    </div>
                    
                    {/* Step Indicators */}
                    <div className="relative flex justify-between">
                      {STATUS_STEPS.map((step, index) => {
                        const isCompleted = index <= currentStep;
                        const isCurrent = index === currentStep;
                        
                        return (
                          <div key={step.status} className="flex flex-col items-center">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center transition-all z-10",
                              isCompleted 
                                ? "bg-primary text-primary-foreground" 
                                : "bg-muted text-muted-foreground",
                              isCurrent && "ring-4 ring-primary/20 scale-110"
                            )}>
                              {step.icon}
                            </div>
                            <span className={cn(
                              "text-[10px] mt-2 font-medium text-center",
                              isCompleted ? "text-foreground" : "text-muted-foreground"
                            )}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Order Details Card */}
          <Card className="rounded-2xl border-0 shadow-md">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Tu pedido</h3>
                <Badge variant="outline" className="rounded-full">
                  {order.order_type === 'delivery' ? '🛵 Delivery' : '🏃 Retiro'}
                </Badge>
              </div>
              
              {/* Items */}
              <div className="space-y-3">
                {items?.map(item => (
                  <div key={item.id} className="flex justify-between items-start">
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-medium bg-muted px-2 py-0.5 rounded">
                        {item.quantity}x
                      </span>
                      <span className="text-sm">{item.product?.name || 'Producto'}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatPrice(item.quantity * item.unit_price)}
                    </span>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              {/* Totals */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                {(order.delivery_fee || 0) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Envío</span>
                    <span>{formatPrice(order.delivery_fee || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-2">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery/Pickup Info */}
          {(order.delivery_address || branch) && (
            <Card className="rounded-2xl border-0 shadow-md">
              <CardContent className="p-5 space-y-4">
                {order.delivery_address && (
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Dirección de entrega</p>
                      <p className="text-sm font-medium">{order.delivery_address}</p>
                    </div>
                  </div>
                )}
                
                {branch && (
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <ShoppingBag className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">
                        {order.order_type === 'delivery' ? 'Preparado en' : 'Retirá en'}
                      </p>
                      <p className="text-sm font-medium">Hoppiness {branch.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {branch.address}, {branch.city}
                      </p>
                      {branch.phone && (
                        <a 
                          href={`tel:${branch.phone}`} 
                          className="text-xs text-primary flex items-center gap-1 mt-1 hover:underline"
                        >
                          <Phone className="w-3 h-3" />
                          {branch.phone}
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Registration CTA Banner */}
          <RegisterBanner />

          {/* Order Time */}
          <div className="text-center text-xs text-muted-foreground py-2">
            Pedido realizado el {formatDate(order.created_at)} a las {formatTime(order.created_at)}
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
