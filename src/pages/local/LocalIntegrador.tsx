import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useShiftStatus } from '@/hooks/useShiftStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Settings,
  Volume2,
  VolumeX,
  Clock,
  MapPin,
  User,
  Phone,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Globe,
  Inbox,
  CreditCard,
  Timer,
  Banknote,
} from 'lucide-react';
import { toast } from 'sonner';
import { OpenCashModal } from '@/components/local/OpenCashModal';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface PendingOrder {
  id: string;
  created_at: string;
  customer_name: string;
  customer_phone: string | null;
  delivery_address: string | null;
  order_type: string | null;
  sales_channel: string | null;
  payment_method: string | null;
  payment_status: string | null;
  notes: string | null;
  subtotal: number;
  delivery_fee: number | null;
  total: number;
  items: Array<{
    id: string;
    product_name_snapshot: string | null;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
  waitingMinutes: number;
}

interface IntegratorSettings {
  auto_accept_channels: Record<string, boolean>;
  max_wait_minutes: Record<string, number>;
  sound_enabled: boolean;
  alert_after_minutes: number;
  prep_time_counter: number;
  prep_time_takeaway: number;
  prep_time_delivery: number;
}

const REJECT_REASONS = [
  { id: 'closed', label: 'Local cerrado / fuera de horario' },
  { id: 'no_stock', label: 'Sin stock de ingredientes' },
  { id: 'no_zone', label: 'Zona de delivery no disponible' },
  { id: 'too_big', label: 'Pedido muy grande / no podemos cumplir' },
  { id: 'bad_data', label: 'Datos del cliente incorrectos' },
  { id: 'other', label: 'Otro motivo' },
];

const CHANNEL_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  web: { label: 'Web App', icon: '🌐', color: 'bg-blue-500' },
  pos: { label: 'POS (Mostrador)', icon: '🖥️', color: 'bg-gray-500' },
  mostrador: { label: 'Mostrador', icon: '🏪', color: 'bg-gray-500' },
  pedidosya: { label: 'PedidosYa', icon: '🟡', color: 'bg-yellow-500' },
  rappi: { label: 'Rappi', icon: '🟠', color: 'bg-orange-500' },
  mp_delivery: { label: 'MP Delivery', icon: '🔵', color: 'bg-blue-600' },
  whatsapp: { label: 'WhatsApp', icon: '💬', color: 'bg-green-500' },
  telefono: { label: 'Teléfono', icon: '📞', color: 'bg-purple-500' },
};

export default function LocalIntegrador() {
  const { branchId } = useParams();
  const { branch } = useOutletContext<{ branch: Branch }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const shiftStatus = useShiftStatus(branchId);
  
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PendingOrder | null>(null);
  const [rejectReason, setRejectReason] = useState('closed');
  const [rejectOtherText, setRejectOtherText] = useState('');
  
  // Open cash modal for cash orders
  const [showOpenCashModal, setShowOpenCashModal] = useState(false);
  const [pendingCashOrderId, setPendingCashOrderId] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const db = supabase as any;

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio('/sounds/notification.mp3');
    audioRef.current.volume = 0.5;
  }, []);

  const playNotificationSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [soundEnabled]);

  // Fetch pending orders
  const { data: pendingOrders, isLoading, refetch } = useQuery({
    queryKey: ['pending-orders', branchId],
    queryFn: async (): Promise<PendingOrder[]> => {
      const { data, error } = await db
        .from('orders')
        .select(`
          id,
          created_at,
          customer_name,
          customer_phone,
          delivery_address,
          order_type,
          sales_channel,
          payment_method,
          payment_status,
          notes,
          subtotal,
          delivery_fee,
          total,
          order_items (
            id,
            product_name_snapshot,
            quantity,
            unit_price
          )
        `)
        .eq('branch_id', branchId)
        .eq('integration_status', 'pending')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      const now = new Date();
      return (data || []).map((order: any) => ({
        ...order,
        items: order.order_items || [],
        waitingMinutes: Math.floor((now.getTime() - new Date(order.created_at).getTime()) / (1000 * 60)),
      }));
    },
    enabled: !!branchId,
    refetchInterval: 15000,
  });

  // Fetch settings
  const { data: settings } = useQuery({
    queryKey: ['integrator-settings', branchId],
    queryFn: async (): Promise<IntegratorSettings | null> => {
      const { data, error } = await db
        .from('branch_integrator_settings')
        .select('*')
        .eq('branch_id', branchId)
        .maybeSingle();
      
      if (error) throw error;
      
      // Return defaults if no settings exist
      if (!data) {
        return {
          auto_accept_channels: { mostrador: true, pos: true },
          max_wait_minutes: { web: 10, pedidosya: 5, rappi: 5, mp_delivery: 10 },
          sound_enabled: true,
          alert_after_minutes: 5,
          prep_time_counter: 15,
          prep_time_takeaway: 15,
          prep_time_delivery: 35,
        };
      }
      
      return data as IntegratorSettings;
    },
    enabled: !!branchId,
  });

  // Realtime subscription for new orders
  useEffect(() => {
    if (!branchId) return;

    const channel = supabase
      .channel(`integrator-orders-${branchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `branch_id=eq.${branchId}`,
        },
        (payload: any) => {
          if (payload.new.integration_status === 'pending') {
            playNotificationSound();
            refetch();
            toast.info('¡Nuevo pedido pendiente!');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `branch_id=eq.${branchId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [branchId, playNotificationSound, refetch]);

  // Accept order mutation
  const acceptMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await db
        .from('orders')
        .update({
          integration_status: 'accepted',
          integration_accepted_at: new Date().toISOString(),
          integration_accepted_by: user?.id,
          status: 'confirmed',
        })
        .eq('id', orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Pedido aceptado');
      queryClient.invalidateQueries({ queryKey: ['pending-orders', branchId] });
    },
    onError: () => {
      toast.error('Error al aceptar el pedido');
    },
  });

  // Reject order mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      const { error } = await db
        .from('orders')
        .update({
          integration_status: 'rejected',
          integration_rejected_at: new Date().toISOString(),
          integration_rejected_by: user?.id,
          integration_rejection_reason: reason,
          status: 'cancelled',
        })
        .eq('id', orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Pedido rechazado');
      setShowRejectDialog(false);
      setSelectedOrder(null);
      setRejectReason('closed');
      setRejectOtherText('');
      queryClient.invalidateQueries({ queryKey: ['pending-orders', branchId] });
    },
    onError: () => {
      toast.error('Error al rechazar el pedido');
    },
  });

  const handleReject = (order: PendingOrder) => {
    setSelectedOrder(order);
    setShowRejectDialog(true);
  };

  // Handle accepting order - check if cash payment needs open cash register
  const handleAcceptOrder = (order: PendingOrder) => {
    const isCashPayment = order.payment_method === 'efectivo' || 
                          order.payment_method === 'cash' ||
                          order.payment_status !== 'paid';
    
    if (isCashPayment && !shiftStatus.hasCashOpen) {
      // Need to open cash first
      setPendingCashOrderId(order.id);
      setShowOpenCashModal(true);
      return;
    }
    
    // Accept directly
    acceptMutation.mutate(order.id);
  };

  // After opening cash, accept the pending order
  const handleCashOpenedForOrder = () => {
    if (pendingCashOrderId) {
      acceptMutation.mutate(pendingCashOrderId);
      setPendingCashOrderId(null);
    }
  };

  const confirmReject = () => {
    if (!selectedOrder) return;
    
    const reason = rejectReason === 'other' 
      ? rejectOtherText 
      : REJECT_REASONS.find(r => r.id === rejectReason)?.label || rejectReason;
    
    rejectMutation.mutate({ orderId: selectedOrder.id, reason });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getChannelInfo = (channel: string | null) => {
    if (!channel) return CHANNEL_CONFIG.web;
    return CHANNEL_CONFIG[channel.toLowerCase()] || CHANNEL_CONFIG.web;
  };

  const alertThreshold = settings?.alert_after_minutes || 5;
  const oldOrders = pendingOrders?.filter(o => o.waitingMinutes >= alertThreshold) || [];
  const newOrders = pendingOrders?.filter(o => o.waitingMinutes < alertThreshold) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <HoppinessLoader size="md" text="Buscando pedidos" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Inbox className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Integrador de Pedidos</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            {pendingOrders?.length || 0} pedidos esperando
            {oldOrders.length > 0 && (
              <span className="text-destructive ml-2">
                · {oldOrders.length} hace más de {alertThreshold} min ⚠️
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4 mr-2" />
            ) : (
              <VolumeX className="h-4 w-4 mr-2" />
            )}
            Sonido: {soundEnabled ? 'Sí' : 'No'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettingsDialog(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configurar
          </Button>
        </div>
      </div>

      {/* No orders state */}
      {(!pendingOrders || pendingOrders.length === 0) && (
        <Card className="p-12">
          <div className="text-center">
            <CheckCircle2 className="h-16 w-16 text-primary/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium">Sin pedidos pendientes</h3>
            <p className="text-muted-foreground mt-1">
              Todos los pedidos han sido procesados
            </p>
          </div>
        </Card>
      )}

      {/* Old orders (waiting too long) */}
      {oldOrders.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">ESPERANDO HACE MÁS DE {alertThreshold} MIN</span>
          </div>
          {oldOrders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              isUrgent
              onAccept={() => handleAcceptOrder(order)}
              onReject={() => handleReject(order)}
              formatCurrency={formatCurrency}
              formatTime={formatTime}
              getChannelInfo={getChannelInfo}
              isLoading={acceptMutation.isPending || rejectMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* New orders */}
      {newOrders.length > 0 && (
        <div className="space-y-4">
          {oldOrders.length > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-5 w-5" />
              <span className="font-medium">NUEVOS</span>
            </div>
          )}
          {newOrders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onAccept={() => handleAcceptOrder(order)}
              onReject={() => handleReject(order)}
              formatCurrency={formatCurrency}
              formatTime={formatTime}
              getChannelInfo={getChannelInfo}
              isLoading={acceptMutation.isPending || rejectMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Auto-accept notice */}
      {settings?.auto_accept_channels && Object.entries(settings.auto_accept_channels).some(([_, v]) => v) && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-sm text-primary">
              <CheckCircle2 className="h-4 w-4" />
              <span>
                Sin pedidos pendientes de los canales con auto-aceptación: {' '}
                {Object.entries(settings.auto_accept_channels)
                  .filter(([_, enabled]) => enabled)
                  .map(([channel]) => getChannelInfo(channel).label)
                  .join(', ')}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Pedido #{selectedOrder?.id.slice(0, 8)}</DialogTitle>
            <DialogDescription>
              ¿Por qué rechazás este pedido?
            </DialogDescription>
          </DialogHeader>
          
          <RadioGroup value={rejectReason} onValueChange={setRejectReason} className="space-y-2">
            {REJECT_REASONS.map(reason => (
              <div key={reason.id} className="flex items-center space-x-2">
                <RadioGroupItem value={reason.id} id={reason.id} />
                <Label htmlFor={reason.id}>{reason.label}</Label>
              </div>
            ))}
          </RadioGroup>
          
          {rejectReason === 'other' && (
            <Textarea
              placeholder="Motivo del rechazo..."
              value={rejectOtherText}
              onChange={(e) => setRejectOtherText(e.target.value)}
            />
          )}

          <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm">
            <p className="text-warning-foreground">
              ⚠️ Se notificará al cliente el rechazo del pedido.
              Si el pago ya fue procesado, se iniciará reembolso.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmReject}
              disabled={rejectReason === 'other' && !rejectOtherText.trim()}
            >
              Confirmar Rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <SettingsDialog
        open={showSettingsDialog}
        onOpenChange={setShowSettingsDialog}
        branchId={branchId!}
        settings={settings}
        getChannelInfo={getChannelInfo}
      />

      {/* Open Cash Modal for cash orders */}
      <OpenCashModal
        open={showOpenCashModal}
        onOpenChange={setShowOpenCashModal}
        branchId={branchId!}
        onCashOpened={() => shiftStatus.refetch()}
        pendingOrderMessage="💵 Este pedido se paga en efectivo. Necesitás abrir la caja para aceptarlo."
        onCashOpenedWithOrder={handleCashOpenedForOrder}
      />
    </div>
  );
}

// Order Card Component
interface OrderCardProps {
  order: PendingOrder;
  isUrgent?: boolean;
  onAccept: () => void;
  onReject: () => void;
  formatCurrency: (amount: number) => string;
  formatTime: (dateStr: string) => string;
  getChannelInfo: (channel: string | null) => { label: string; icon: string; color: string };
  isLoading: boolean;
}

function OrderCard({
  order,
  isUrgent,
  onAccept,
  onReject,
  formatCurrency,
  formatTime,
  getChannelInfo,
  isLoading,
}: OrderCardProps) {
  const channelInfo = getChannelInfo(order.sales_channel);
  
  return (
    <Card className={isUrgent ? 'border-destructive bg-destructive/5' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{channelInfo.icon}</span>
            <Badge variant={isUrgent ? 'destructive' : 'secondary'}>
              {channelInfo.label}
            </Badge>
            <span className="font-mono text-sm text-muted-foreground">
              #{order.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Timer className="h-4 w-4" />
            {order.waitingMinutes > 0 
              ? `Hace ${order.waitingMinutes} min`
              : 'Ahora'
            }
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Customer Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{order.customer_name}</span>
            {order.customer_phone && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{order.customer_phone}</span>
              </>
            )}
          </div>
          
          {order.order_type && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="capitalize">{order.order_type}</span>
              {order.delivery_address && (
                <span className="text-muted-foreground">· {order.delivery_address}</span>
              )}
            </div>
          )}
          
          {order.notes && (
            <div className="flex items-start gap-2 bg-muted/50 p-2 rounded text-sm">
              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span>"{order.notes}"</span>
            </div>
          )}
        </div>

        {/* Order Items */}
        <div className="border-t border-b py-3 space-y-1">
          {order.items.map(item => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>{item.quantity}x {item.product_name_snapshot}</span>
              <span className="text-muted-foreground">{formatCurrency(item.subtotal)}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal:</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          {(order.delivery_fee ?? 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Envío:</span>
              <span>{formatCurrency(order.delivery_fee || 0)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base">
            <span>TOTAL:</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>

        {/* Payment */}
        <div className="flex items-center gap-2 text-sm">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span className="capitalize">{order.payment_method || 'No especificado'}</span>
          {order.payment_status === 'paid' && (
            <Badge variant="outline" className="text-primary border-primary">
              Pagado
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={onReject}
            disabled={isLoading}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Rechazar
          </Button>
          <Button 
            className="flex-1"
            onClick={onAccept}
            disabled={isLoading}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Aceptar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Settings Dialog Component
interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  settings: IntegratorSettings | null | undefined;
  getChannelInfo: (channel: string | null) => { label: string; icon: string; color: string };
}

function SettingsDialog({ open, onOpenChange, branchId, settings, getChannelInfo }: SettingsDialogProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [autoAccept, setAutoAccept] = useState<Record<string, boolean>>(
    settings?.auto_accept_channels || { mostrador: true, pos: true }
  );
  const [maxWait, setMaxWait] = useState<Record<string, number>>(
    settings?.max_wait_minutes || { web: 10, pedidosya: 5, rappi: 5, mp_delivery: 10 }
  );
  const [soundEnabled, setSoundEnabled] = useState(settings?.sound_enabled ?? true);
  const [alertAfter, setAlertAfter] = useState(settings?.alert_after_minutes || 5);
  const [prepCounter, setPrepCounter] = useState(settings?.prep_time_counter || 15);
  const [prepTakeaway, setPrepTakeaway] = useState(settings?.prep_time_takeaway || 15);
  const [prepDelivery, setPrepDelivery] = useState(settings?.prep_time_delivery || 35);

  const db = supabase as any;
  
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await db
        .from('branch_integrator_settings')
        .upsert({
          branch_id: branchId,
          auto_accept_channels: autoAccept,
          max_wait_minutes: maxWait,
          sound_enabled: soundEnabled,
          alert_after_minutes: alertAfter,
          prep_time_counter: prepCounter,
          prep_time_takeaway: prepTakeaway,
          prep_time_delivery: prepDelivery,
          updated_by: user?.id,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Configuración guardada');
      queryClient.invalidateQueries({ queryKey: ['integrator-settings', branchId] });
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Error al guardar');
    },
  });

  const channels = ['mostrador', 'web', 'pedidosya', 'rappi', 'mp_delivery'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configuración del Integrador</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Auto-accept by channel */}
          <div className="space-y-3">
            <h4 className="font-medium">Auto-aceptación por canal</h4>
            <p className="text-sm text-muted-foreground">
              Elegí qué canales aceptan pedidos automáticamente
            </p>
            <div className="space-y-2">
              {channels.map(channel => {
                const info = getChannelInfo(channel);
                return (
                  <div key={channel} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <span>{info.icon}</span>
                      <span>{info.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={autoAccept[channel] ?? false}
                        onCheckedChange={(checked) => 
                          setAutoAccept(prev => ({ ...prev, [channel]: checked }))
                        }
                      />
                      {!autoAccept[channel] && (
                        <Select
                          value={String(maxWait[channel] || 10)}
                          onValueChange={(v) => 
                            setMaxWait(prev => ({ ...prev, [channel]: Number(v) }))
                          }
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[5, 10, 15, 20, 30].map(min => (
                              <SelectItem key={min} value={String(min)}>
                                {min} min
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Los pedidos de canales sin auto-aceptación esperarán en el integrador
            </p>
          </div>

          {/* Notifications */}
          <div className="space-y-3">
            <h4 className="font-medium">Notificaciones</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Sonido al recibir pedido</Label>
                <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Alerta visual después de</Label>
                <Select
                  value={String(alertAfter)}
                  onValueChange={(v) => setAlertAfter(Number(v))}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 5, 7, 10, 15].map(min => (
                      <SelectItem key={min} value={String(min)}>
                        {min} min
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Prep times */}
          <div className="space-y-3">
            <h4 className="font-medium">Tiempo estimado de preparación</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Mostrador</Label>
                <Select
                  value={String(prepCounter)}
                  onValueChange={(v) => setPrepCounter(Number(v))}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 15, 20, 25, 30].map(min => (
                      <SelectItem key={min} value={String(min)}>
                        {min} min
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>Take away</Label>
                <Select
                  value={String(prepTakeaway)}
                  onValueChange={(v) => setPrepTakeaway(Number(v))}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 15, 20, 25, 30].map(min => (
                      <SelectItem key={min} value={String(min)}>
                        {min} min
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>Delivery</Label>
                <Select
                  value={String(prepDelivery)}
                  onValueChange={(v) => setPrepDelivery(Number(v))}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[25, 30, 35, 40, 45, 50, 60].map(min => (
                      <SelectItem key={min} value={String(min)}>
                        {min} min
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
