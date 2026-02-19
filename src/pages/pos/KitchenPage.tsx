/**
 * KitchenPage - KDS profesional (Kitchen Display System)
 */
import { useParams } from 'react-router-dom';
import { ChefHat, UtensilsCrossed, ShoppingBag, Truck, Check, Clock } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { useKitchen, type KitchenPedido, type KitchenItem } from '@/hooks/pos/useKitchen';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states/empty-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

// ─── Timer Component ────────────────────────────────────────
function KitchenTimer({ createdAt }: { createdAt: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(createdAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  const minutes = Math.floor(elapsed / 60);
  const urgency = minutes < 5 ? 'ok' : minutes < 10 ? 'warn' : 'urgent';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5',
        urgency === 'ok' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
        urgency === 'warn' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        urgency === 'urgent' && 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 animate-pulse'
      )}
    >
      <Clock className="w-3 h-3" />
      {minutes} min
    </span>
  );
}

// ─── Service Type Icon ──────────────────────────────────────
function ServiceIcon({ tipo }: { tipo: string | null }) {
  switch (tipo) {
    case 'comer_aca':
      return <UtensilsCrossed className="w-4 h-4" />;
    case 'delivery':
      return <Truck className="w-4 h-4" />;
    default:
      return <ShoppingBag className="w-4 h-4" />;
  }
}

function serviceLabel(tipo: string | null) {
  switch (tipo) {
    case 'comer_aca': return 'Comer acá';
    case 'delivery': return 'Delivery';
    default: return 'Takeaway';
  }
}

// ─── Item Row ───────────────────────────────────────────────
function KitchenItemRow({
  item,
  onToggle,
}: {
  item: KitchenItem;
  onToggle: (itemId: string, nextEstado: string) => void;
}) {
  const done = item.estado === 'listo';
  const inProgress = item.estado === 'en_preparacion';
  const next = done ? 'pendiente' : inProgress ? 'listo' : 'en_preparacion';

  return (
    <button
      type="button"
      onClick={() => onToggle(item.id, next)}
      className={cn(
        'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all border',
        done && 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800',
        inProgress && 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
        !done && !inProgress && 'bg-background border-border hover:bg-muted/50'
      )}
    >
      {/* Status indicator */}
      <div
        className={cn(
          'mt-0.5 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors',
          done && 'bg-emerald-500 border-emerald-500',
          inProgress && 'bg-amber-400 border-amber-400',
          !done && !inProgress && 'border-muted-foreground/30'
        )}
      >
        {done && <Check className="w-4 h-4 text-white" />}
        {inProgress && <div className="w-2 h-2 bg-white rounded-full" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className={cn('font-bold text-base', done && 'line-through text-muted-foreground')}>
          {item.cantidad}× {item.nombre || 'Producto'}
        </div>

        {/* Modificadores */}
        {item.pedido_item_modificadores?.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {item.pedido_item_modificadores.map((mod) => (
              <div key={mod.id} className="text-xs text-muted-foreground">
                {mod.tipo === 'sin' ? '🚫 ' : mod.tipo === 'extra' ? '➕ ' : '🔄 '}
                {mod.descripcion}
              </div>
            ))}
          </div>
        )}

        {/* Notas */}
        {item.notas && (
          <div className="mt-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded px-2 py-1 italic">
            📝 {item.notas}
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Order Card ─────────────────────────────────────────────
function KitchenOrderCard({
  pedido,
  onItemToggle,
  onPedidoListo,
}: {
  pedido: KitchenPedido;
  onItemToggle: (itemId: string, estado: string) => void;
  onPedidoListo: (pedidoId: string) => void;
}) {
  const allItemsDone = pedido.pedido_items.length > 0 && pedido.pedido_items.every((i) => i.estado === 'listo');
  const elapsed = Math.floor((Date.now() - new Date(pedido.created_at).getTime()) / 1000 / 60);
  const urgency = elapsed < 5 ? 'ok' : elapsed < 10 ? 'warn' : 'urgent';

  return (
    <Card className="overflow-hidden">
      {/* Header with urgency color */}
      <div
        className={cn(
          'px-4 py-3 flex items-center justify-between gap-2',
          urgency === 'ok' && 'bg-emerald-500/10 dark:bg-emerald-900/30',
          urgency === 'warn' && 'bg-amber-500/10 dark:bg-amber-900/30',
          urgency === 'urgent' && 'bg-red-500/10 dark:bg-red-900/30'
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-foreground">#{pedido.numero_pedido}</span>
          <Badge variant="secondary" className="gap-1 text-xs">
            <ServiceIcon tipo={pedido.tipo_servicio} />
            {serviceLabel(pedido.tipo_servicio)}
          </Badge>
        </div>
        <KitchenTimer createdAt={pedido.created_at} />
      </div>

      {/* Llamador / Cliente */}
      {(pedido.numero_llamador || pedido.cliente_nombre) && (
        <div className="px-4 py-2 border-b text-sm text-muted-foreground flex gap-3">
          {pedido.numero_llamador && (
            <span className="font-semibold text-foreground">🔔 Llamador #{pedido.numero_llamador}</span>
          )}
          {pedido.cliente_nombre && <span>{pedido.cliente_nombre}</span>}
        </div>
      )}

      {/* Items */}
      <CardContent className="p-3 space-y-2">
        {pedido.pedido_items.map((item) => (
          <KitchenItemRow key={item.id} item={item} onToggle={onItemToggle} />
        ))}
      </CardContent>

      {/* Footer: Marcar pedido listo */}
      {allItemsDone && pedido.estado !== 'listo' && (
        <div className="p-3 pt-0">
          <Button
            className="w-full h-12 text-lg font-bold"
            onClick={() => onPedidoListo(pedido.id)}
          >
            <Check className="w-5 h-5 mr-2" />
            PEDIDO LISTO
          </Button>
        </div>
      )}
    </Card>
  );
}

// ─── Column ─────────────────────────────────────────────────
function KitchenColumn({
  title,
  pedidos,
  count,
  colorClass,
  onItemToggle,
  onPedidoListo,
}: {
  title: string;
  pedidos: KitchenPedido[];
  count: number;
  colorClass: string;
  onItemToggle: (itemId: string, estado: string) => void;
  onPedidoListo: (pedidoId: string) => void;
}) {
  return (
    <div className="flex flex-col min-h-0">
      <div className={cn('rounded-lg px-3 py-2 mb-3 flex items-center justify-between', colorClass)}>
        <span className="font-bold text-sm">{title}</span>
        <Badge variant="secondary" className="text-xs">{count}</Badge>
      </div>
      <div className="space-y-3 overflow-y-auto flex-1 pb-4">
        {pedidos.map((p) => (
          <KitchenOrderCard key={p.id} pedido={p} onItemToggle={onItemToggle} onPedidoListo={onPedidoListo} />
        ))}
        {pedidos.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Sin pedidos</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────
export default function KitchenPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const { data: pedidos, isLoading, consumeNewOrderAlert } = useKitchen(branchId!);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sound alert for new orders
  useEffect(() => {
    audioRef.current = new Audio('/sounds/notification.mp3');
    audioRef.current.volume = 0.7;
  }, []);

  useEffect(() => {
    if (consumeNewOrderAlert()) {
      audioRef.current?.play().catch(() => {});
      toast('🔔 Nuevo pedido!', { duration: 3000 });
    }
  }, [pedidos, consumeNewOrderAlert]);

  const updateItemEstado = useMutation({
    mutationFn: async ({ itemId, estado }: { itemId: string; estado: string }) => {
      const { error } = await supabase
        .from('pedido_items')
        .update({ estado })
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-kitchen', branchId] });
    },
  });

  const updatePedidoEstado = useMutation({
    mutationFn: async ({ pedidoId, estado }: { pedidoId: string; estado: string }) => {
      const { error } = await supabase.from('pedidos').update({ estado }).eq('id', pedidoId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-kitchen', branchId] });
      toast.success('Pedido marcado como listo');
    },
  });

  const handleItemToggle = useCallback(
    (itemId: string, estado: string) => updateItemEstado.mutate({ itemId, estado }),
    [updateItemEstado]
  );

  const handlePedidoListo = useCallback(
    (pedidoId: string) => updatePedidoEstado.mutate({ pedidoId, estado: 'listo' }),
    [updatePedidoEstado]
  );

  const { pendientes, enPreparacion, listos } = useMemo(() => {
    const list = pedidos ?? [];
    return {
      pendientes: list.filter((p) => p.estado === 'pendiente'),
      enPreparacion: list.filter((p) => p.estado === 'en_preparacion'),
      listos: list.filter((p) => p.estado === 'listo'),
    };
  }, [pedidos]);

  const totalActivos = (pendientes.length + enPreparacion.length);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const isEmpty = (pedidos ?? []).length === 0;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Cocina"
        subtitle={isEmpty ? 'Sin pedidos activos' : `${totalActivos} pedido${totalActivos !== 1 ? 's' : ''} activo${totalActivos !== 1 ? 's' : ''}`}
        icon={<ChefHat className="w-5 h-5" />}
      />

      {isEmpty ? (
        <EmptyState
          icon={ChefHat}
          title="Todo en orden 👨‍🍳"
          description="No hay pedidos pendientes. Cuando llegue uno nuevo, aparecerá aquí automáticamente con una alerta sonora."
          className="mt-12"
        />
      ) : isMobile ? (
        /* ── Mobile: Tabs ── */
        <Tabs defaultValue="pendientes" className="mt-4 flex-1 flex flex-col min-h-0">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="pendientes">
              Pendientes {pendientes.length > 0 && `(${pendientes.length})`}
            </TabsTrigger>
            <TabsTrigger value="preparacion">
              Preparando {enPreparacion.length > 0 && `(${enPreparacion.length})`}
            </TabsTrigger>
            <TabsTrigger value="listos">
              Listos {listos.length > 0 && `(${listos.length})`}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pendientes" className="flex-1 overflow-y-auto space-y-3 mt-3">
            {pendientes.map((p) => (
              <KitchenOrderCard key={p.id} pedido={p} onItemToggle={handleItemToggle} onPedidoListo={handlePedidoListo} />
            ))}
            {pendientes.length === 0 && <p className="text-center text-muted-foreground py-8">Sin pendientes</p>}
          </TabsContent>
          <TabsContent value="preparacion" className="flex-1 overflow-y-auto space-y-3 mt-3">
            {enPreparacion.map((p) => (
              <KitchenOrderCard key={p.id} pedido={p} onItemToggle={handleItemToggle} onPedidoListo={handlePedidoListo} />
            ))}
            {enPreparacion.length === 0 && <p className="text-center text-muted-foreground py-8">Nada en preparación</p>}
          </TabsContent>
          <TabsContent value="listos" className="flex-1 overflow-y-auto space-y-3 mt-3">
            {listos.map((p) => (
              <KitchenOrderCard key={p.id} pedido={p} onItemToggle={handleItemToggle} onPedidoListo={handlePedidoListo} />
            ))}
            {listos.length === 0 && <p className="text-center text-muted-foreground py-8">Sin pedidos listos</p>}
          </TabsContent>
        </Tabs>
      ) : (
        /* ── Desktop: Kanban 3 columnas ── */
        <div className="mt-4 grid grid-cols-3 gap-4 flex-1 min-h-0">
          <KitchenColumn
            title="🔴 Pendientes"
            pedidos={pendientes}
            count={pendientes.length}
            colorClass="bg-red-100/60 dark:bg-red-900/20 text-red-800 dark:text-red-200"
            onItemToggle={handleItemToggle}
            onPedidoListo={handlePedidoListo}
          />
          <KitchenColumn
            title="🟡 En preparación"
            pedidos={enPreparacion}
            count={enPreparacion.length}
            colorClass="bg-amber-100/60 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200"
            onItemToggle={handleItemToggle}
            onPedidoListo={handlePedidoListo}
          />
          <KitchenColumn
            title="🟢 Listos"
            pedidos={listos}
            count={listos.length}
            colorClass="bg-emerald-100/60 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200"
            onItemToggle={handleItemToggle}
            onPedidoListo={handlePedidoListo}
          />
        </div>
      )}
    </div>
  );
}
