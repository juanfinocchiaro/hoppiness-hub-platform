import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Eye, X, Volume2, VolumeX, Bell } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface PendingOrder {
  id: string;
  created_at: string;
  customer_name: string;
  customer_phone: string | null;
  sales_channel: string | null;
  total: number;
  order_type: string | null;
  notes: string | null;
}

interface OrderNotificationContextType {
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  browserNotificationsEnabled: boolean;
  requestBrowserPermission: () => void;
}

const OrderNotificationContext = createContext<OrderNotificationContextType | null>(null);

export function useOrderNotifications() {
  const context = useContext(OrderNotificationContext);
  if (!context) {
    throw new Error('useOrderNotifications must be used within OrderNotificationProvider');
  }
  return context;
}

const CHANNEL_LABELS: Record<string, { label: string; icon: string }> = {
  web_app: { label: 'Web App', icon: '🌐' },
  web: { label: 'Web App', icon: '🌐' },
  pos: { label: 'Mostrador', icon: '🖥️' },
  mostrador: { label: 'Mostrador', icon: '🏪' },
  pedidosya: { label: 'PedidosYa', icon: '🟡' },
  rappi: { label: 'Rappi', icon: '🟠' },
  mp_delivery: { label: 'MP Delivery', icon: '🔵' },
};

interface Props {
  branchId: string;
  children: ReactNode;
}

export function OrderNotificationProvider({ branchId, children }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);
  const [pendingNotifications, setPendingNotifications] = useState<PendingOrder[]>([]);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio('/sounds/notification.mp3');
    audioRef.current.volume = 0.7;
    
    // Check browser notification permission
    if ('Notification' in window) {
      setBrowserNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const playSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [soundEnabled]);

  const showBrowserNotification = useCallback((order: PendingOrder) => {
    if (!browserNotificationsEnabled || !('Notification' in window)) return;
    
    const channelInfo = CHANNEL_LABELS[order.sales_channel || 'web'] || CHANNEL_LABELS.web;
    
    const notification = new Notification('🔔 Nuevo Pedido', {
      body: `${channelInfo.icon} ${channelInfo.label} · $${order.total.toLocaleString()} · ${order.customer_name}`,
      icon: '/favicon.ico',
      tag: order.id,
      requireInteraction: true,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }, [browserNotificationsEnabled]);

  const requestBrowserPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    
    const permission = await Notification.requestPermission();
    setBrowserNotificationsEnabled(permission === 'granted');
    
    if (permission === 'granted') {
      toast.success('Notificaciones activadas');
    } else {
      toast.error('Notificaciones denegadas');
    }
  }, []);

  // Accept order mutation
  const acceptMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await (supabase as any)
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
    onSuccess: (_, orderId) => {
      toast.success('Pedido aceptado');
      setPendingNotifications(prev => prev.filter(o => o.id !== orderId));
      queryClient.invalidateQueries({ queryKey: ['pending-orders', branchId] });
      queryClient.invalidateQueries({ queryKey: ['pending-orders-count', branchId] });
    },
    onError: () => {
      toast.error('Error al aceptar el pedido');
    },
  });

  // Reject order mutation
  const rejectMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await (supabase as any)
        .from('orders')
        .update({
          integration_status: 'rejected',
          integration_rejected_at: new Date().toISOString(),
          integration_rejected_by: user?.id,
          integration_rejection_reason: 'Rechazado desde notificación',
          status: 'cancelled',
        })
        .eq('id', orderId);
      
      if (error) throw error;
    },
    onSuccess: (_, orderId) => {
      toast.success('Pedido rechazado');
      setPendingNotifications(prev => prev.filter(o => o.id !== orderId));
      queryClient.invalidateQueries({ queryKey: ['pending-orders', branchId] });
      queryClient.invalidateQueries({ queryKey: ['pending-orders-count', branchId] });
    },
    onError: () => {
      toast.error('Error al rechazar el pedido');
    },
  });

  const dismissNotification = (orderId: string) => {
    setPendingNotifications(prev => prev.filter(o => o.id !== orderId));
  };

  // Realtime subscription for new pending orders
  useEffect(() => {
    if (!branchId) return;

    const channel = supabase
      .channel(`global-order-notifications-${branchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `branch_id=eq.${branchId}`,
        },
        (payload: any) => {
          const newOrder = payload.new;
          
          // Only notify for pending orders
          if (newOrder.integration_status === 'pending') {
            const order: PendingOrder = {
              id: newOrder.id,
              created_at: newOrder.created_at,
              customer_name: newOrder.customer_name,
              customer_phone: newOrder.customer_phone,
              sales_channel: newOrder.sales_channel,
              total: newOrder.total,
              order_type: newOrder.order_type,
              notes: newOrder.notes,
            };

            // Play sound
            playSound();
            
            // Show browser notification if tab is hidden
            if (document.hidden) {
              showBrowserNotification(order);
            }
            
            // Add to pending notifications for in-app display
            setPendingNotifications(prev => [order, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [branchId, playSound, showBrowserNotification]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <OrderNotificationContext.Provider 
      value={{ 
        soundEnabled, 
        setSoundEnabled, 
        browserNotificationsEnabled,
        requestBrowserPermission,
      }}
    >
      {children}

      {/* Floating Notifications Stack */}
      {pendingNotifications.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 space-y-3 max-w-sm w-full">
          {pendingNotifications.slice(0, 3).map((order) => {
            const channelInfo = CHANNEL_LABELS[order.sales_channel || 'web'] || CHANNEL_LABELS.web;
            
            return (
              <Card 
                key={order.id} 
                className="p-4 shadow-lg border-l-4 border-l-primary animate-in slide-in-from-right duration-300"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{channelInfo.icon}</span>
                    <div>
                      <div className="font-medium text-sm">
                        Nuevo Pedido #{order.id.slice(0, 6).toUpperCase()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {channelInfo.label} · {order.customer_name}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => dismissNotification(order.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <Badge variant="secondary" className="text-xs">
                    {order.order_type === 'delivery' ? '🚚 Delivery' : '🏪 Retiro'}
                  </Badge>
                  <span className="font-bold">{formatCurrency(order.total)}</span>
                </div>

                {order.notes && (
                  <div className="text-xs text-muted-foreground bg-muted p-2 rounded mb-3 line-clamp-2">
                    💬 {order.notes}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => rejectMutation.mutate(order.id)}
                    disabled={rejectMutation.isPending || acceptMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Rechazar
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => acceptMutation.mutate(order.id)}
                    disabled={rejectMutation.isPending || acceptMutation.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Aceptar
                  </Button>
                </div>
              </Card>
            );
          })}

          {pendingNotifications.length > 3 && (
            <div className="text-center text-sm text-muted-foreground">
              +{pendingNotifications.length - 3} pedidos más
            </div>
          )}
        </div>
      )}

      {/* Browser Notification Permission Banner */}
      {!browserNotificationsEnabled && 'Notification' in window && Notification.permission === 'default' && (
        <div className="fixed bottom-4 left-4 z-40">
          <Card className="p-3 flex items-center gap-3 max-w-xs shadow-lg">
            <Bell className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Activar notificaciones</p>
              <p className="text-xs text-muted-foreground">Para recibir alertas de pedidos</p>
            </div>
            <Button size="sm" onClick={requestBrowserPermission}>
              Activar
            </Button>
          </Card>
        </div>
      )}
    </OrderNotificationContext.Provider>
  );
}
