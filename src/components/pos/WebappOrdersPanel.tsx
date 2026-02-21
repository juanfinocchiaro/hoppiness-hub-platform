/**
 * WebappOrdersPanel — Panel de pedidos webapp entrantes
 *
 * Se integra en la sección OPERAR para recibir y confirmar
 * pedidos que llegan desde la tienda online.
 */
import { useState, useCallback } from 'react';
import { sendOrderPushNotification } from '@/utils/orderPush';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Globe, Check, X, Printer, Clock, ShoppingBag, Truck, Utensils,
  Bell,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { OrderChatDialog } from './OrderChatDialog';

const SERVICIO_ICONS: Record<string, typeof ShoppingBag> = {
  retiro: ShoppingBag,
  delivery: Truck,
  comer_aca: Utensils,
};

const SERVICIO_LABELS: Record<string, string> = {
  retiro: 'Retiro',
  delivery: 'Delivery',
  comer_aca: 'Comer acá',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n);

interface WebappOrder {
  id: string;
  numero_pedido: number;
  tipo_servicio: string | null;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  cliente_direccion: string | null;
  cliente_user_id: string | null;
  total: number;
  estado: string;
  created_at: string;
  webapp_tracking_code: string | null;
  pedido_items: Array<{
    id: string;
    nombre: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }>;
}

export function WebappOrdersPanel({ branchId }: { branchId: string }) {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  // Fetch branch name for chat
  const { data: branchData } = useQuery({
    queryKey: ['branch-name', branchId],
    queryFn: async () => {
      const { data } = await supabase.from('branches').select('name').eq('id', branchId).single();
      return data;
    },
    enabled: !!branchId,
    staleTime: Infinity,
  });
  const branchName = branchData?.name ?? 'Local';

  const { data: orders, isLoading } = useQuery({
    queryKey: ['webapp-pending-orders', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          id, numero_pedido, tipo_servicio, cliente_nombre,
          cliente_telefono, cliente_direccion, cliente_user_id, total, estado,
          created_at, webapp_tracking_code,
          pedido_items(id, nombre, cantidad, precio_unitario, subtotal)
        `)
        .eq('branch_id', branchId)
        .eq('origen', 'webapp')
        .in('estado', ['pendiente'])
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as WebappOrder[];
    },
    refetchInterval: 10000,
  });

  const { data: recentOrders } = useQuery({
    queryKey: ['webapp-recent-orders', branchId],
    queryFn: async () => {
      const since = new Date(Date.now() - 3600000).toISOString();
      const { data, error } = await supabase
        .from('pedidos')
        .select('id, numero_pedido, tipo_servicio, total, estado, created_at, cliente_nombre')
        .eq('branch_id', branchId)
        .eq('origen', 'webapp')
        .neq('estado', 'pendiente')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  const acceptOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from('pedidos')
        .update({ estado: 'confirmado', tiempo_confirmado: new Date().toISOString() } as any)
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['webapp-pending-orders', branchId] });
      queryClient.invalidateQueries({ queryKey: ['webapp-recent-orders', branchId] });
      toast.success('Pedido aceptado');
      const order = orders?.find(o => o.id === orderId);
      if (order) sendOrderPushNotification({ pedidoId: orderId, estado: 'confirmado', numeroPedido: order.numero_pedido, clienteUserId: order.cliente_user_id });
    },
  });

  const rejectOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from('pedidos')
        .update({ estado: 'cancelado' })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['webapp-pending-orders', branchId] });
      queryClient.invalidateQueries({ queryKey: ['webapp-recent-orders', branchId] });
      toast.success('Pedido rechazado');
      const order = orders?.find(o => o.id === orderId);
      if (order) sendOrderPushNotification({ pedidoId: orderId, estado: 'cancelado', numeroPedido: order.numero_pedido, clienteUserId: order.cliente_user_id });
    },
  });

  const pendingCount = orders?.length || 0;

  // Auto-expand when there are pending orders
  if (pendingCount > 0 && !expanded) {
    setExpanded(true);
  }

  return (
    <Card className="mx-4 mt-2">
      <CardHeader className="pb-2 py-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Pedidos WebApp
            {pendingCount > 0 && (
              <Badge variant="destructive" className="animate-pulse text-xs">
                {pendingCount}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
            {expanded ? 'Ocultar' : 'Mostrar'}
          </Button>
        </div>
      </CardHeader>
      {expanded && <CardContent className="space-y-3 pt-0">
        {isLoading && <Skeleton className="h-24 w-full" />}

        {!isLoading && pendingCount === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Globe className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Sin pedidos pendientes</p>
          </div>
        )}

        {orders?.map(order => {
          const ServiceIcon = SERVICIO_ICONS[order.tipo_servicio || ''] || ShoppingBag;
          const minutesAgo = Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000);

          return (
            <div key={order.id} className="border rounded-lg p-3 space-y-2 bg-amber-50/50 border-amber-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">#{order.numero_pedido}</Badge>
                  <Badge variant="secondary" className="gap-1">
                    <ServiceIcon className="w-3 h-3" />
                    {SERVICIO_LABELS[order.tipo_servicio || ''] || 'Retiro'}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    hace {minutesAgo} min
                  </span>
                </div>
                <span className="font-bold text-sm">{fmt(order.total)}</span>
              </div>

              {order.cliente_nombre && (
                <p className="text-sm">{order.cliente_nombre}</p>
              )}
              {order.cliente_direccion && (
                <p className="text-xs text-muted-foreground">{order.cliente_direccion}</p>
              )}

              <div className="text-xs text-muted-foreground">
                {order.pedido_items.map(item => (
                  <span key={item.id} className="mr-2">
                    {item.cantidad}x {item.nombre}
                  </span>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => acceptOrder.mutate(order.id)}
                  disabled={acceptOrder.isPending}
                >
                  <Check className="w-4 h-4 mr-1" /> Aceptar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => rejectOrder.mutate(order.id)}
                  disabled={rejectOrder.isPending}
                >
                  <X className="w-4 h-4 mr-1" /> Rechazar
                </Button>
                <OrderChatDialog
                  pedidoId={order.id}
                  branchId={branchId}
                  branchName={branchName}
                  numeroPedido={order.numero_pedido}
                  clienteNombre={order.cliente_nombre}
                />
              </div>
            </div>
          );
        })}

        {recentOrders && recentOrders.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">Últimos procesados</p>
            {recentOrders.map(o => (
              <div key={o.id} className="flex items-center justify-between text-xs py-1">
                <span>#{o.numero_pedido} {o.cliente_nombre || ''}</span>
                <div className="flex items-center gap-2">
                  <span>{fmt(o.total)}</span>
                  <Badge variant={o.estado === 'cancelado' ? 'destructive' : 'secondary'} className="text-[10px]">
                    {o.estado}
                  </Badge>
                  <OrderChatDialog
                    pedidoId={o.id}
                    branchId={branchId}
                    branchName={branchName}
                    numeroPedido={o.numero_pedido}
                    clienteNombre={o.cliente_nombre}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>}
    </Card>
  );
}
