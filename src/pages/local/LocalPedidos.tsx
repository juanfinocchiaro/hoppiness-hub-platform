import { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePermissionsV2 } from '@/hooks/usePermissionsV2';
import { useAuth } from '@/hooks/useAuth';
import { useExportToExcel } from '@/hooks/useExportToExcel';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, ChefHat, CheckCircle, Truck, XCircle, RefreshCw, Phone, MapPin, User, Search, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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
  draft: { label: 'Borrador', color: 'bg-slate-400', icon: <Clock className="h-4 w-4" /> },
  pending: { label: 'Pendiente', color: 'bg-yellow-500', icon: <Clock className="h-4 w-4" /> },
  confirmed: { label: 'Confirmado', color: 'bg-blue-500', icon: <CheckCircle className="h-4 w-4" /> },
  preparing: { label: 'Preparando', color: 'bg-orange-500', icon: <ChefHat className="h-4 w-4" /> },
  ready: { label: 'Listo', color: 'bg-green-500', icon: <CheckCircle className="h-4 w-4" /> },
  waiting_pickup: { label: 'Esperando cadete', color: 'bg-purple-500', icon: <Clock className="h-4 w-4" /> },
  in_transit: { label: 'En viaje', color: 'bg-cyan-500', icon: <Truck className="h-4 w-4" /> },
  delivered: { label: 'Entregado', color: 'bg-gray-500', icon: <Truck className="h-4 w-4" /> },
  cancelled: { label: 'Cancelado', color: 'bg-red-500', icon: <XCircle className="h-4 w-4" /> },
};

const ORDER_AREA_LABELS: Record<string, string> = {
  salon: 'Salón',
  mostrador: 'Mostrador',
  delivery: 'Delivery',
};

const CANCEL_REASONS = [
  { value: 'cliente_no_responde', label: 'Cliente no responde' },
  { value: 'cliente_cancela', label: 'Cliente cancela' },
  { value: 'sin_stock', label: 'Sin stock' },
  { value: 'error_pedido', label: 'Error en pedido' },
  { value: 'demora_excesiva', label: 'Demora excesiva' },
  { value: 'problema_pago', label: 'Problema de pago' },
  { value: 'otro', label: 'Otro' },
];

interface LocalPedidosProps {
  defaultTab?: string;
}

export default function LocalPedidos({ defaultTab = 'active' }: LocalPedidosProps) {
  const { branchId } = useParams();
  const { branch } = useOutletContext<{ branch: Tables<'branches'> | null }>();
  const { isSuperadmin, isEncargado, isFranquiciado, local } = usePermissionsV2(branchId);
  const { user } = useAuth();
  const { exportToExcel } = useExportToExcel();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(defaultTab === 'historial' ? 'history' : defaultTab);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Cancel dialog state
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; orderId: string | null }>({ open: false, orderId: null });
  const [cancelReason, setCancelReason] = useState('');
  const [cancelNotes, setCancelNotes] = useState('');

  const canManageOrders = isSuperadmin || isFranquiciado || isEncargado || local.canManageOrders;

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

  const handleCancelOrder = async () => {
    if (!cancelDialog.orderId || !cancelReason) {
      toast.error('Seleccioná un motivo de cancelación');
      return;
    }

    try {
      // 1. Update order status
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', cancelDialog.orderId);

      if (orderError) throw orderError;

      // 2. Log cancellation for audit
      const { error: auditError } = await supabase
        .from('order_cancellations')
        .insert({
          order_id: cancelDialog.orderId,
          cancelled_by: user?.id,
          cancel_reason: cancelReason,
          cancel_notes: cancelNotes || null,
        });

      if (auditError) console.error('Error logging cancellation:', auditError);

      toast.success('Pedido cancelado');
      setCancelDialog({ open: false, orderId: null });
      setCancelReason('');
      setCancelNotes('');
    } catch (error: any) {
      toast.error('Error al cancelar: ' + error.message);
    }
  };

  const getNextStatus = (order: Order): OrderStatus | null => {
    const currentStatus = order.status;
    const isDeliveryPropio = order.order_type === 'delivery' && 
      !['rappi', 'pedidos_ya', 'mercadopago_delivery'].includes(order.sales_channel || '');
    
    // For delivery propio: ready → waiting_pickup → in_transit → delivered
    // For others: ready → delivered directly
    const flow: Record<OrderStatus, OrderStatus | null> = {
      draft: 'pending',
      pending: 'confirmed',
      confirmed: 'preparing',
      preparing: 'ready',
      ready: isDeliveryPropio ? 'waiting_pickup' : 'delivered',
      waiting_pickup: 'in_transit',
      in_transit: 'delivered',
      delivered: null,
      cancelled: null,
    };
    return flow[currentStatus];
  };

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const completedOrders = orders.filter(o => ['delivered', 'cancelled'].includes(o.status));
  
  // Search/History filtering
  const filteredHistoryOrders = orders.filter(o =>
    o.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customer_phone.includes(searchTerm) ||
    o.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const handleExport = () => {
    exportToExcel(
      filteredHistoryOrders,
      [
        { key: 'created_at', label: 'Fecha', format: (v: string) => format(new Date(v), 'dd/MM/yyyy HH:mm', { locale: es }) },
        { key: 'customer_name', label: 'Cliente' },
        { key: 'customer_phone', label: 'Teléfono' },
        { key: 'order_type', label: 'Tipo' },
        { key: 'sales_channel', label: 'Canal' },
        { key: 'status', label: 'Estado', format: (v: string) => STATUS_CONFIG[v as OrderStatus]?.label || v },
        { key: 'total', label: 'Total', format: (v: number) => Number(v) },
      ],
      { filename: 'historial_pedidos', sheetName: 'Pedidos' }
    );
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
          <TabsTrigger value="history">
            <Search className="h-4 w-4 mr-1" />
            Buscar / Historial
          </TabsTrigger>
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
                  onCancelClick={() => setCancelDialog({ open: true, orderId: order.id })}
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
                  onCancelClick={() => {}}
                  getNextStatus={getNextStatus}
                  formatTime={formatTime}
                  getTimeSince={getTimeSince}
                  canEdit={false}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* New History/Search Tab */}
        <TabsContent value="history" className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, teléfono o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={filteredHistoryOrders.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium">Fecha</th>
                      <th className="text-left p-3 text-sm font-medium">Cliente</th>
                      <th className="text-left p-3 text-sm font-medium">Tipo</th>
                      <th className="text-left p-3 text-sm font-medium">Estado</th>
                      <th className="text-right p-3 text-sm font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistoryOrders.slice(0, 100).map((order) => (
                      <tr key={order.id} className="border-t">
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
                          <Badge variant="outline" className="text-xs capitalize">
                            {order.order_type.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge className={`text-xs ${STATUS_CONFIG[order.status]?.color || ''} text-white`}>
                            {STATUS_CONFIG[order.status]?.label || order.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-right font-medium">
                          ${order.total.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ))}
                    {filteredHistoryOrders.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-muted-foreground">
                          No se encontraron pedidos
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cancel Order Dialog */}
      <Dialog open={cancelDialog.open} onOpenChange={(open) => setCancelDialog({ open, orderId: open ? cancelDialog.orderId : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Pedido</DialogTitle>
            <DialogDescription>
              Seleccioná el motivo de la cancelación. Esta acción quedará registrada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Motivo *</Label>
              <Select value={cancelReason} onValueChange={setCancelReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar motivo" />
                </SelectTrigger>
                <SelectContent>
                  {CANCEL_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notas adicionales</Label>
              <Textarea
                placeholder="Detalle opcional..."
                value={cancelNotes}
                onChange={(e) => setCancelNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog({ open: false, orderId: null })}>
              Volver
            </Button>
            <Button variant="destructive" onClick={handleCancelOrder}>
              Confirmar Cancelación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface OrderCardProps {
  order: Order;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  onCancelClick: () => void;
  getNextStatus: (order: Order) => OrderStatus | null;
  formatTime: (date: string) => string;
  getTimeSince: (date: string) => string;
  canEdit: boolean;
}

function OrderCard({ order, onStatusChange, onCancelClick, getNextStatus, formatTime, getTimeSince, canEdit }: OrderCardProps) {
  const statusConfig = STATUS_CONFIG[order.status];
  const nextStatus = getNextStatus(order);

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
            {/* Only allow cancel before preparing */}
            {['draft', 'pending', 'confirmed'].includes(order.status) && (
              <Button 
                variant="destructive" 
                size="icon"
                onClick={onCancelClick}
                title="Cancelar pedido"
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