/**
 * FloatingOrderChat — Global floating chat bubble.
 * Appears when the user has an active webapp order (pendiente → en_camino).
 * Persists across pages (mounted in App.tsx).
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ActiveOrder {
  id: string;
  numero_pedido: number;
  estado: string;
  webapp_tracking_code: string;
  branch_name: string;
}

interface ChatMessage {
  id: string;
  sender_type: 'cliente' | 'local';
  sender_nombre: string;
  mensaje: string;
  leido: boolean;
  created_at: string;
}

const ACTIVE_STATES = ['pendiente', 'confirmado', 'en_preparacion', 'listo', 'listo_retiro', 'listo_mesa', 'listo_envio', 'en_camino'];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

export function FloatingOrderChat() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  // Find active order — logged in user or guest via localStorage
  const { data: activeOrder } = useQuery({
    queryKey: ['floating-chat-active-order', user?.id],
    queryFn: async (): Promise<ActiveOrder | null> => {
      if (user) {
        const { data } = await supabase
          .from('pedidos')
          .select('id, numero_pedido, estado, webapp_tracking_code, branch:branches!pedidos_branch_id_fkey(name)')
          .eq('cliente_user_id', user.id)
          .eq('origen', 'webapp')
          .in('estado', ACTIVE_STATES)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!data) return null;
        return {
          id: data.id,
          numero_pedido: data.numero_pedido,
          estado: data.estado,
          webapp_tracking_code: data.webapp_tracking_code,
          branch_name: (data.branch as any)?.name || '',
        };
      }
      // Guest: check localStorage
      const code = localStorage.getItem('hoppiness_last_tracking');
      if (!code) return null;
      try {
        const res = await fetch(
          `${baseUrl}/functions/v1/webapp-pedido-chat?code=${code}`,
          { headers: { apikey: apiKey } },
        );
        if (!res.ok) return null;
        const chatData = await res.json();
        if (!chatData?.pedido_id) return null;
        // Fetch the order info
        const { data: order } = await supabase
          .from('pedidos')
          .select('id, numero_pedido, estado, webapp_tracking_code, branch:branches!pedidos_branch_id_fkey(name)')
          .eq('webapp_tracking_code', code)
          .in('estado', ACTIVE_STATES)
          .maybeSingle();
        if (!order) return null;
        return {
          id: order.id,
          numero_pedido: order.numero_pedido,
          estado: order.estado,
          webapp_tracking_code: order.webapp_tracking_code,
          branch_name: (order.branch as any)?.name || '',
        };
      } catch {
        return null;
      }
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const trackingCode = activeOrder?.webapp_tracking_code;

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!trackingCode) return;
    try {
      const res = await fetch(
        `${baseUrl}/functions/v1/webapp-pedido-chat?code=${trackingCode}`,
        { headers: { apikey: apiKey } },
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data?.messages) {
        setMessages(data.messages);
      }
    } catch { /* ignore */ }
  }, [trackingCode, baseUrl, apiKey]);

  useEffect(() => {
    if (open && trackingCode) fetchMessages();
  }, [open, trackingCode, fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!activeOrder?.id) return;
    const channel = supabase
      .channel(`floating-chat-${activeOrder.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'webapp_pedido_mensajes',
        filter: `pedido_id=eq.${activeOrder.id}`,
      }, (payload) => {
        const msg = payload.new as ChatMessage;
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeOrder?.id]);

  // Auto-scroll
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const unreadCount = messages.filter(m => m.sender_type === 'local' && !m.leido).length;

  const handleSend = async () => {
    if (!input.trim() || !trackingCode || sending) return;
    setSending(true);
    try {
      await fetch(`${baseUrl}/functions/v1/webapp-pedido-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify({
          code: trackingCode,
          mensaje: input.trim(),
          sender_type: 'cliente',
          sender_nombre: user?.user_metadata?.full_name || 'Cliente',
        }),
      });
      setInput('');
      await fetchMessages();
    } catch { /* ignore */ }
    setSending(false);
  };

  if (!activeOrder) return null;

  // Don't render on POS/admin pages
  const path = window.location.pathname;
  if (path.startsWith('/milocal') || path.startsWith('/mimarca')) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="w-80 h-96 bg-background border rounded-xl shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="px-3 py-2 border-b bg-primary text-primary-foreground flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold">Pedido #{activeOrder.numero_pedido}</p>
              <p className="text-[10px] opacity-80">{activeOrder.branch_name}</p>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded-full hover:bg-primary-foreground/20">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
            {messages.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Escribí un mensaje al local
              </p>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender_type === 'cliente' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-xl px-3 py-1.5 ${
                  msg.sender_type === 'cliente'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}>
                  <p className="text-xs">{msg.mensaje}</p>
                  <p className={`text-[9px] mt-0.5 ${
                    msg.sender_type === 'cliente' ? 'text-primary-foreground/60' : 'text-muted-foreground'
                  }`}>{formatTime(msg.created_at)}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t px-2 py-2 flex gap-1.5">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Escribí un mensaje..."
              className="h-8 text-xs"
            />
            <Button size="sm" onClick={handleSend} disabled={!input.trim() || sending} className="h-8 w-8 p-0">
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Bubble */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform relative"
      >
        <MessageCircle className="w-5 h-5" />
        {unreadCount > 0 && !open && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
