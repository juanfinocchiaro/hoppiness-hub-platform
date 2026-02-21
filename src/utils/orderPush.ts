import { supabase } from '@/integrations/supabase/client';

/**
 * Fire-and-forget: sends a push notification to the customer
 * when their order status changes. Silently fails if VAPID is
 * not configured or the customer has no subscriptions.
 */
export function sendOrderPushNotification(params: {
  pedidoId: string;
  estado: string;
  numeroPedido?: number;
  clienteUserId?: string | null;
}) {
  if (!params.clienteUserId) return;

  supabase.functions.invoke('send-order-push', {
    body: {
      pedido_id: params.pedidoId,
      estado: params.estado,
      numero_pedido: params.numeroPedido,
      cliente_user_id: params.clienteUserId,
    },
  }).catch(() => {
    // Silently ignore — push is best-effort
  });
}
