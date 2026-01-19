import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronRight, 
  Clock, 
  CreditCard, 
  Package, 
  Truck, 
  Store,
  ShoppingBag,
  Bike
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Tables, Enums } from '@/integrations/supabase/types';

type Order = Tables<'orders'>;
type OrderStatus = Enums<'order_status'>;

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
  product: { name: string } | null;
  modifiers?: Array<{
    option_name: string;
    price_adjustment: number;
  }>;
}

interface OrderPayment {
  id: string;
  payment_method: string;
  amount: number;
  reference: string | null;
}

interface KDSTime {
  station_type: string;
  started_at: string | null;
  completed_at: string | null;
  status: string;
}

interface ExpandableOrderRowProps {
  order: Order & { items?: OrderItem[] };
  statusConfig: Record<OrderStatus, { label: string; color: string }>;
}

const CHANNEL_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  delivery: { label: 'Delivery', icon: <Truck className="w-3 h-3" /> },
  takeaway: { label: 'Take Away', icon: <ShoppingBag className="w-3 h-3" /> },
  mostrador: { label: 'Mostrador', icon: <Store className="w-3 h-3" /> },
  atencion_presencial: { label: 'Mostrador', icon: <Store className="w-3 h-3" /> },
  rappi: { label: 'Rappi', icon: <Bike className="w-3 h-3" /> },
  pedidos_ya: { label: 'PedidosYa', icon: <Bike className="w-3 h-3" /> },
  mercadopago_delivery: { label: 'MP Delivery', icon: <Truck className="w-3 h-3" /> },
  pos_local: { label: 'POS', icon: <Store className="w-3 h-3" /> },
};

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta_credito: 'Tarjeta Crédito',
  tarjeta_debito: 'Tarjeta Débito',
  mercadopago: 'MercadoPago',
  transferencia: 'Transferencia',
  otro: 'Otro',
};

export default function ExpandableOrderRow({ order, statusConfig }: ExpandableOrderRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [payments, setPayments] = useState<OrderPayment[]>([]);
  const [kdsTimes, setKdsTimes] = useState<KDSTime[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchDetails = async () => {
    if (!isOpen) return;
    
    setLoadingDetails(true);
    try {
      // Fetch payments
      const { data: paymentsData } = await supabase
        .from('order_payments')
        .select('*')
        .eq('order_id', order.id);
      
      // Fetch KDS times via order_items -> order_item_stations
      const { data: itemsWithStations } = await supabase
        .from('order_items')
        .select(`
          id,
          order_item_stations(station_type, started_at, completed_at, status)
        `)
        .eq('order_id', order.id);

      if (paymentsData) setPayments(paymentsData);
      
      // Aggregate KDS times by station
      if (itemsWithStations) {
        const stationMap = new Map<string, KDSTime>();
        itemsWithStations.forEach((item: any) => {
          item.order_item_stations?.forEach((station: any) => {
            const existing = stationMap.get(station.station_type);
            if (!existing || (station.completed_at && !existing.completed_at)) {
              stationMap.set(station.station_type, station);
            }
          });
        });
        setKdsTimes(Array.from(stationMap.values()));
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDetails();
    }
  }, [isOpen]);

  const calculateStationTime = (station: KDSTime): string => {
    if (!station.started_at) return '-';
    const start = new Date(station.started_at);
    const end = station.completed_at ? new Date(station.completed_at) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return '< 1m';
    return `${diffMins}m`;
  };

  const channel = order.sales_channel || 'atencion_presencial';
  const channelInfo = CHANNEL_CONFIG[channel] || CHANNEL_CONFIG.mostrador;

  // If no split payments, show single payment from order
  const displayPayments = payments.length > 0 
    ? payments 
    : order.payment_method 
      ? [{ id: 'legacy', payment_method: order.payment_method, amount: Number(order.total), reference: null }]
      : [];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <tr className="border-t hover:bg-muted/50 transition-colors">
        <td className="p-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="p-1 h-6 w-6">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </td>
        <td className="p-3 text-sm">
          <div>{format(new Date(order.created_at), 'dd/MM/yy')}</div>
          <div className="text-muted-foreground text-xs">
            {format(new Date(order.created_at), 'HH:mm')}
          </div>
        </td>
        <td className="p-3">
          <div className="font-medium text-sm">{order.customer_name}</div>
          <div className="text-muted-foreground text-xs">{order.customer_phone}</div>
        </td>
        <td className="p-3">
          <Badge variant="outline" className="text-xs gap-1">
            {channelInfo.icon}
            {channelInfo.label}
          </Badge>
        </td>
        <td className="p-3">
          <Badge className={`text-xs ${statusConfig[order.status]?.color || ''} text-white`}>
            {statusConfig[order.status]?.label || order.status}
          </Badge>
        </td>
        <td className="p-3 text-right font-medium">
          ${Number(order.total).toLocaleString('es-AR', { minimumFractionDigits: 0 })}
        </td>
      </tr>
      
      <CollapsibleContent asChild>
        <tr className="bg-muted/30">
          <td colSpan={6} className="p-0">
            <div className="p-4 space-y-4">
              {/* Products */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Productos ({order.items?.length || 0})
                </h4>
                <div className="bg-background rounded-lg border p-3 space-y-2">
                  {order.items?.map((item) => (
                    <div key={item.id} className="flex justify-between items-start text-sm">
                      <div>
                        <span className="font-medium">{item.quantity}x</span>{' '}
                        {item.product?.name || 'Producto'}
                        {item.modifiers && item.modifiers.length > 0 && (
                          <div className="text-xs text-muted-foreground ml-4">
                            {item.modifiers.map((m, i) => (
                              <span key={i}>
                                + {m.option_name}
                                {m.price_adjustment > 0 && ` (+$${m.price_adjustment})`}
                                {i < item.modifiers!.length - 1 && ', '}
                              </span>
                            ))}
                          </div>
                        )}
                        {item.notes && (
                          <div className="text-xs text-muted-foreground italic ml-4">
                            "{item.notes}"
                          </div>
                        )}
                      </div>
                      <span className="text-muted-foreground">
                        ${(item.quantity * Number(item.unit_price)).toLocaleString('es-AR')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Payment Methods */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Formas de Pago
                  </h4>
                  <div className="bg-background rounded-lg border p-3 space-y-1">
                    {displayPayments.length > 0 ? (
                      displayPayments.map((payment) => (
                        <div key={payment.id} className="flex justify-between text-sm">
                          <span>{PAYMENT_LABELS[payment.payment_method] || payment.payment_method}</span>
                          <span className="font-medium">
                            ${Number(payment.amount).toLocaleString('es-AR')}
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-sm">Sin datos de pago</span>
                    )}
                  </div>
                </div>

                {/* KDS Times */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Tiempos por Estación
                  </h4>
                  <div className="bg-background rounded-lg border p-3 space-y-1">
                    {loadingDetails ? (
                      <span className="text-muted-foreground text-sm">Cargando...</span>
                    ) : kdsTimes.length > 0 ? (
                      kdsTimes.map((station, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="capitalize">{station.station_type.replace('_', ' ')}</span>
                          <Badge variant={station.status === 'completed' ? 'default' : 'secondary'}>
                            {calculateStationTime(station)}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-sm">Sin datos KDS</span>
                    )}
                    
                    {/* Total time from order */}
                    {order.updated_at && order.status !== 'pending' && (
                      <div className="pt-2 mt-2 border-t flex justify-between text-sm font-medium">
                        <span>Tiempo Total</span>
                        <span>
                          {Math.round((new Date(order.updated_at).getTime() - new Date(order.created_at).getTime()) / 60000)}m
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      </CollapsibleContent>
    </Collapsible>
  );
}
