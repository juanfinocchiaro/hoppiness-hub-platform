/**
 * PendingOrdersBar - Barra de pedidos activos sobre el POS
 * Muestra pedidos pendiente/en_preparacion/listo con acciones de cambio de estado
 * Siempre visible con altura consistente.
 */
import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, ChefHat, CheckCircle, Package } from 'lucide-react';
import { toast } from 'sonner';
import type { KitchenPedido } from '@/hooks/pos/useKitchen';
import { cn } from '@/lib/utils';
import { usePrintConfig } from '@/hooks/usePrintConfig';
import { useBranchPrinters } from '@/hooks/useBranchPrinters';
import { useAfipConfig } from '@/hooks/useAfipConfig';
import { printReadyTicketByPedidoId, printDeliveryTicketByPedidoId, extractErrorMessage } from '@/lib/ready-ticket';

interface Props {
  pedidos: KitchenPedido[];
  branchId: string;
  shiftOpenedAt: string | null;
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock; next: string; nextLabel: string }> = {
  pendiente: {
    label: 'Pendiente',
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    icon: Clock,
    next: 'en_preparacion',
    nextLabel: 'Preparar',
  },
  en_preparacion: {
    label: 'Preparando',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: ChefHat,
    next: 'listo',
    nextLabel: 'Listo',
  },
  listo: {
    label: 'Listo',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: CheckCircle,
    next: 'entregado',
    nextLabel: 'Entregar',
  },
};

function getElapsedMin(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

function serviceIcon(tipo: string | null) {
  switch (tipo) {
    case 'delivery': return '🛵';
    case 'comer_aca': return '🍽️';
    default: return '🛍️';
  }
}

function useHamburguesasCount(branchId: string, shiftOpenedAt: string | null) {
  return useQuery({
    queryKey: ['shift-hamburguesas', branchId, shiftOpenedAt],
    queryFn: async () => {
      if (!shiftOpenedAt) return 0;

      const { data: cats } = await supabase
        .from('menu_categorias')
        .select('id')
        .ilike('nombre', '%hamburguesa%');
      const catIds = (cats ?? []).map(c => c.id);
      if (catIds.length === 0) return 0;

      const { data: validPedidos } = await supabase
        .from('pedidos')
        .select('id')
        .eq('branch_id', branchId)
        .gte('created_at', shiftOpenedAt)
        .not('estado', 'eq', 'cancelado');

      const pedidoIds = (validPedidos ?? []).map(p => p.id);
      if (pedidoIds.length === 0) return 0;

      const { data: items } = await supabase
        .from('pedido_items')
        .select('cantidad')
        .in('categoria_carta_id', catIds)
        .in('pedido_id', pedidoIds);

      if (!items || items.length === 0) return 0;

      return items.reduce((sum, i) => sum + (i.cantidad ?? 0), 0);
    },
    enabled: !!branchId && !!shiftOpenedAt,
    refetchInterval: 30000,
  });
}

export function PendingOrdersBar({ pedidos, branchId, shiftOpenedAt }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const qc = useQueryClient();
  const { data: printConfig } = usePrintConfig(branchId);
  const { data: printersData } = useBranchPrinters(branchId);
  const { data: afipConfig } = useAfipConfig(branchId);
  const allPrinters = printersData ?? [];
  const { data: branchInfo } = useQuery({
    queryKey: ['branch-name', branchId],
    queryFn: async () => {
      const { data } = await supabase.from('branches').select('name').eq('id', branchId).single();
      return data;
    },
    enabled: !!branchId,
  });

  const { data: hamburguesasCount = 0 } = useHamburguesasCount(branchId, shiftOpenedAt);

  const updateEstado = useMutation({
    mutationFn: async ({ pedidoId, estado }: { pedidoId: string; estado: string }) => {
      const updateData: Record<string, unknown> = { estado };
      if (estado === 'en_preparacion') updateData.tiempo_inicio_prep = new Date().toISOString();
      if (estado === 'listo') updateData.tiempo_listo = new Date().toISOString();
      const { error } = await supabase.from('pedidos').update(updateData).eq('id', pedidoId);
      if (error) throw error;
    },
    onSuccess: async (_, { pedidoId, estado }) => {
      qc.invalidateQueries({ queryKey: ['pos-kitchen', branchId] });
      qc.invalidateQueries({ queryKey: ['shift-hamburguesas', branchId] });
      if (estado === 'listo') toast.success('Pedido marcado como listo');
      if (estado === 'entregado') toast.success('Pedido entregado');
      setSelectedId(null);

      if (estado === 'listo') {
        const pedido = pedidos.find((p) => p.id === pedidoId);
        const isDelivery = pedido?.tipo_servicio === 'delivery' || pedido?.canal_venta === 'apps';

        if (isDelivery) {
          try {
            await printDeliveryTicketByPedidoId({
              branchId,
              pedidoId,
              branchName: branchInfo?.name || 'Hoppiness',
              printConfig,
              printers: allPrinters,
            });
            toast.success('Ticket delivery impreso');
          } catch (err) {
            console.error('[PendingOrdersBar] delivery ticket error:', err);
            toast.error('Error al imprimir ticket delivery', { description: extractErrorMessage(err) });
          }
        }

        if (printConfig?.ticket_trigger === 'on_ready') {
          try {
            await printReadyTicketByPedidoId({
              branchId,
              pedidoId,
              branchName: branchInfo?.name || 'Hoppiness',
              printConfig,
              printers: allPrinters,
              afipConfig: afipConfig as unknown as { razon_social?: string | null; cuit?: string | null; direccion_fiscal?: string | null; inicio_actividades?: string | null; iibb?: string | null; condicion_iva?: string | null } | null,
            });
            toast.success('Ticket impreso al marcar listo');
          } catch (err) {
            console.error('[PendingOrdersBar] on_ready ticket error:', err);
            toast.error('Error al imprimir ticket on_ready', { description: extractErrorMessage(err) });
          }
        }
      }
    },
    onError: () => toast.error('Error al actualizar estado'),
  });

  const handleAdvance = useCallback((pedidoId: string, nextEstado: string) => {
    updateEstado.mutate({ pedidoId, estado: nextEstado });
  }, [updateEstado]);

  const pendientes = pedidos.filter(p => p.estado === 'pendiente');
  const preparando = pedidos.filter(p => p.estado === 'en_preparacion');
  const listos = pedidos.filter(p => p.estado === 'listo');

  return (
    <div className="border-b bg-background min-h-[72px]">
      {/* Header with status counters */}
      <div className="flex items-center gap-3 px-4 py-2">
        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium whitespace-nowrap">Pedidos activos</span>
        <div className="flex gap-1.5 flex-wrap">
          {pendientes.length > 0 && (
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
              {pendientes.length} pendiente{pendientes.length > 1 ? 's' : ''}
            </Badge>
          )}
          {preparando.length > 0 && (
            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 text-xs">
              {preparando.length} preparando
            </Badge>
          )}
          {listos.length > 0 && (
            <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs">
              {listos.length} listo{listos.length > 1 ? 's' : ''}
            </Badge>
          )}
          {pedidos.length === 0 && (
            <span className="text-xs text-muted-foreground">Sin pedidos activos</span>
          )}
        </div>

        {/* Hamburguesas counter — right-aligned */}
        <div className="ml-auto flex items-center gap-1.5 text-sm font-semibold tabular-nums whitespace-nowrap">
          <span>🍔</span>
          <span>{hamburguesasCount}</span>
        </div>
      </div>

      {/* Chips — scrollable on desktop, wrapping on mobile */}
      {pedidos.length > 0 && (
        <div className="px-4 pb-3 flex gap-2 flex-wrap sm:flex-nowrap sm:overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {pedidos.map(pedido => {
            const config = ESTADO_CONFIG[pedido.estado];
            if (!config) return null;
            const Icon = config.icon;
            const mins = getElapsedMin(pedido.created_at);
            const isSelected = selectedId === pedido.id;
            const isUrgent = pedido.estado === 'pendiente' && mins >= 10;

            return (
              <div key={pedido.id} className="flex-shrink-0 min-w-0 flex items-center gap-1">
                <button
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm transition-all whitespace-nowrap',
                    config.color,
                    isUrgent && 'ring-2 ring-red-400 animate-pulse',
                    isSelected && 'ring-2 ring-primary'
                  )}
                  onClick={() => setSelectedId(isSelected ? null : pedido.id)}
                >
                  <span className="text-xs">{serviceIcon(pedido.tipo_servicio)}</span>
                  <span className="font-bold">#{String(pedido.numero_pedido).slice(-3)}</span>
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-xs opacity-75">{mins}m</span>
                </button>

                {isSelected && (
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleAdvance(pedido.id, config.next)}
                    disabled={updateEstado.isPending}
                  >
                    {config.nextLabel}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
