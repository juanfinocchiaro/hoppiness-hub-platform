import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle2, Eye, Store, Users, Truck, Bike, Receipt, MessageCircle, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardFilters, SalesChannelFilter } from '@/contexts/DashboardFilterContext';
import type { Enums } from '@/integrations/supabase/types';

interface RecentOrder {
  id: string;
  customer_name: string;
  total: number;
  created_at: string;
  closed_at: string | null;
  sales_channel: string | null;
  order_type: string;
  caller_number: number | null;
}

interface Props {
  branchId: string;
}

// Canales de venta: Mostrador, Web App, Rappi, PedidosYa, MP Delivery
const channelIcons: Record<string, React.ReactNode> = {
  mostrador: <Receipt className="w-3 h-3" />,
  webapp: <Globe className="w-3 h-3" />,
  rappi: <Bike className="w-3 h-3" />,
  pedidosya: <Bike className="w-3 h-3" />,
  mp_delivery: <Truck className="w-3 h-3" />,
};

const channelLabels: Record<string, string> = {
  mostrador: 'Mostrador',
  webapp: 'Web App',
  rappi: 'Rappi',
  pedidosya: 'PedidosYa',
  mp_delivery: 'MP Delivery',
};

export default function RecentCompletedOrders({ branchId }: Props) {
  const { filters, dateRange } = useDashboardFilters();
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);

      let query = supabase
        .from('orders')
        .select('id, customer_name, total, created_at, updated_at, sales_channel, order_type, caller_number')
        .eq('branch_id', branchId)
        .eq('status', 'delivered')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .order('updated_at', { ascending: false })
        .limit(10);

      if (filters.channel !== 'all') {
        query = query.eq('sales_channel', filters.channel as Enums<'sales_channel'>);
      }

      const { data, error } = await query;

      if (!error && data) {
        setOrders(data.map(o => ({
          ...o,
          closed_at: o.updated_at,
        })));
      }

      setLoading(false);
    }

    fetchOrders();
  }, [branchId, filters.channel, dateRange]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(value);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Últimos Pedidos Completados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-success" />
          Últimos Pedidos Completados
        </CardTitle>
        <CardDescription>
          Los 10 pedidos entregados más recientes
          {filters.channel !== 'all' && ` (${channelLabels[filters.channel] || filters.channel})`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {orders.length > 0 ? (
          <div className="space-y-2">
            {/* Compact Table Header */}
            <div className="hidden md:grid grid-cols-[60px_1fr_80px_100px_60px] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
              <span>Hora</span>
              <span>Cliente / #Pedido</span>
              <span>Canal</span>
              <span className="text-right">Total</span>
              <span></span>
            </div>

            {/* Orders List */}
            {orders.map((order) => {
              const channel = order.sales_channel || 'atencion_presencial';
              const closedTime = order.closed_at ? new Date(order.closed_at) : new Date(order.created_at);

              return (
                <div 
                  key={order.id} 
                  className="grid grid-cols-1 md:grid-cols-[60px_1fr_80px_100px_60px] gap-2 items-center p-3 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors"
                >
                  {/* Time */}
                  <div className="text-sm font-mono">
                    {format(closedTime, 'HH:mm', { locale: es })}
                  </div>

                  {/* Customer & Order ID */}
                  <div className="flex flex-col md:flex-row md:items-center gap-1">
                    <span className="font-medium truncate">{order.customer_name}</span>
                    <span className="text-xs text-muted-foreground">
                      #{order.caller_number || order.id.slice(0, 6)}
                    </span>
                  </div>

                  {/* Channel Badge */}
                  <div>
                    <Badge variant="outline" className="gap-1 text-xs">
                      {channelIcons[channel] || <Store className="w-3 h-3" />}
                      <span className="hidden sm:inline">{channelLabels[channel] || channel}</span>
                    </Badge>
                  </div>

                  {/* Total */}
                  <div className="text-right font-semibold">
                    {formatCurrency(order.total)}
                  </div>

                  {/* Action */}
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No hay pedidos completados</p>
            <p className="text-sm mt-1">en el rango seleccionado</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
