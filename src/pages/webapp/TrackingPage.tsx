import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, Clock, Flame, Package, Truck, PartyPopper, XCircle, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SEO } from '@/components/SEO';

interface TrackingData {
  pedido: {
    numero_pedido: number;
    estado: string;
    tipo_servicio: string | null;
    subtotal: number;
    costo_delivery: number | null;
    descuento: number | null;
    total: number;
    pago_estado: string | null;
    tiempo_prometido: string | null;
    created_at: string;
  };
  items: Array<{
    nombre: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    notas: string | null;
    modificadores: Array<{ tipo: string; descripcion: string; precio_extra: number | null }>;
  }>;
  branch: { name: string; address: string | null; city: string | null; phone: string | null } | null;
  timeline: Array<{ estado: string; timestamp: string | null }>;
}

const ESTADO_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pendiente: { label: 'Recibido', icon: <Clock className="w-5 h-5" />, color: 'text-blue-500' },
  confirmado: { label: 'Confirmado', icon: <Clock className="w-5 h-5" />, color: 'text-blue-500' },
  en_preparacion: { label: 'Preparando', icon: <Flame className="w-5 h-5" />, color: 'text-orange-500' },
  listo: { label: 'Listo', icon: <Package className="w-5 h-5" />, color: 'text-green-500' },
  en_camino: { label: 'En camino', icon: <Truck className="w-5 h-5" />, color: 'text-purple-500' },
  entregado: { label: 'Entregado', icon: <PartyPopper className="w-5 h-5" />, color: 'text-green-600' },
  cancelado: { label: 'Cancelado', icon: <XCircle className="w-5 h-5" />, color: 'text-red-500' },
};

const ESTADO_ORDER = ['pendiente', 'confirmado', 'en_preparacion', 'listo', 'entregado'];

function formatPrice(n: number) {
  return `$${n.toLocaleString('es-AR')}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

export default function TrackingPage() {
  const { trackingCode } = useParams<{ trackingCode: string }>();
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTracking = async () => {
    if (!trackingCode) return;
    try {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const url = `${baseUrl}/functions/v1/webapp-order-tracking?code=${trackingCode}`;
      const res = await fetch(url, {
        headers: { apikey: apiKey },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Pedido no encontrado');
      }

      setData(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
  }, [trackingCode]);

  // Realtime: subscribe to pedido changes
  useEffect(() => {
    if (!trackingCode) return;

    const channel = supabase
      .channel(`tracking-${trackingCode}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'pedidos',
        filter: `webapp_tracking_code=eq.${trackingCode}`,
      }, () => {
        fetchTracking();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [trackingCode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4 max-w-sm">
          <XCircle className="w-12 h-12 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-bold">Pedido no encontrado</h1>
          <p className="text-muted-foreground text-sm">{error || 'Verificá el link e intentá de nuevo.'}</p>
          <Link to="/pedir">
            <Button>Hacer un pedido</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { pedido, items, branch, timeline } = data;
  const currentEstado = ESTADO_CONFIG[pedido.estado] ?? ESTADO_CONFIG.pendiente;
  const isFinal = pedido.estado === 'entregado' || pedido.estado === 'cancelado';

  const tiempoRestante = pedido.tiempo_prometido
    ? Math.max(0, Math.round((new Date(pedido.tiempo_prometido).getTime() - Date.now()) / 60_000))
    : null;

  const whatsappLink = branch?.phone
    ? `https://wa.me/549${branch.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola! Consulta por mi pedido #${pedido.numero_pedido}`)}`
    : null;

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`Pedido #${pedido.numero_pedido} | Hoppiness`} path={`/pedido/${trackingCode}`} />

      {/* Header */}
      <div className="bg-primary text-primary-foreground px-5 pt-8 pb-6">
        <p className="text-sm opacity-80">{branch?.name ?? 'Hoppiness'}</p>
        <h1 className="text-2xl font-black mt-1">Pedido #{pedido.numero_pedido}</h1>
        <div className={`mt-3 flex items-center gap-2 ${currentEstado.color} bg-white/90 rounded-xl px-4 py-2.5 w-fit`}>
          {currentEstado.icon}
          <span className="font-bold text-sm">{currentEstado.label}</span>
        </div>
      </div>

      <div className="px-5 py-6 space-y-6 max-w-lg mx-auto">
        {/* Estimated time */}
        {!isFinal && tiempoRestante !== null && (
          <div className="bg-accent/10 rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground">Tiempo estimado</p>
            <p className="text-2xl font-black text-accent mt-1">
              {tiempoRestante > 0 ? `~${tiempoRestante} min` : 'En cualquier momento'}
            </p>
          </div>
        )}

        {/* Timeline */}
        <div className="space-y-1">
          {ESTADO_ORDER.map((estado, i) => {
            const timelineEntry = timeline.find(t => t.estado === estado);
            const isPast = timeline.some(t => t.estado === estado);
            const isCurrent = pedido.estado === estado;
            const cfg = ESTADO_CONFIG[estado];

            return (
              <div key={estado} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    isPast ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  } ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
                    {isPast ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  {i < ESTADO_ORDER.length - 1 && (
                    <div className={`w-0.5 h-8 ${isPast ? 'bg-primary' : 'bg-muted'}`} />
                  )}
                </div>
                <div className="pt-1">
                  <p className={`text-sm font-semibold ${isPast ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {cfg.label}
                  </p>
                  {timelineEntry?.timestamp && (
                    <p className="text-xs text-muted-foreground">{formatTime(timelineEntry.timestamp)}</p>
                  )}
                </div>
              </div>
            );
          })}

          {pedido.estado === 'cancelado' && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-destructive text-destructive-foreground shrink-0">
                <XCircle className="w-4 h-4" />
              </div>
              <div className="pt-1">
                <p className="text-sm font-semibold text-destructive">Cancelado</p>
              </div>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="space-y-2 rounded-xl border p-4">
          <h3 className="text-sm font-bold">Tu pedido</h3>
          {items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm py-1">
              <div className="flex-1 min-w-0">
                <span className="text-muted-foreground">{item.cantidad}x </span>
                <span>{item.nombre}</span>
                {item.modificadores.length > 0 && (
                  <p className="text-xs text-muted-foreground ml-4">
                    {item.modificadores.map(m =>
                      m.tipo === 'extra' ? `+ ${m.descripcion}` : `Sin ${m.descripcion}`,
                    ).join(', ')}
                  </p>
                )}
              </div>
              <span className="font-medium shrink-0 ml-2">{formatPrice(item.subtotal)}</span>
            </div>
          ))}
          <div className="border-t pt-2 mt-2 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatPrice(pedido.subtotal)}</span>
            </div>
            {(pedido.costo_delivery ?? 0) > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Envío</span>
                <span>{formatPrice(pedido.costo_delivery!)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold pt-1">
              <span>Total</span>
              <span>{formatPrice(pedido.total)}</span>
            </div>
          </div>
        </div>

        {/* Branch info */}
        {branch && (
          <div className="rounded-xl border p-4 space-y-1">
            <h3 className="text-sm font-bold">{branch.name}</h3>
            {branch.address && (
              <p className="text-xs text-muted-foreground">{branch.address}{branch.city ? `, ${branch.city}` : ''}</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          {whatsappLink && (
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="block">
              <Button variant="outline" className="w-full gap-2">
                <MessageCircle className="w-4 h-4" />
                Contactar al local
              </Button>
            </a>
          )}
          <Link to="/pedir" className="block">
            <Button variant="ghost" className="w-full text-muted-foreground">
              Volver al menú
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
