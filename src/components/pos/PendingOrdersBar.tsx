/**
 * PendingOrdersBar - Barra de pedidos activos sobre el POS
 * Muestra pedidos pendiente/en_preparacion/listo con acciones de cambio de estado
 */
import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Clock, ChefHat, CheckCircle, Package } from 'lucide-react';
import { toast } from 'sonner';
import type { KitchenPedido } from '@/hooks/pos/useKitchen';
import { cn } from '@/lib/utils';

interface Props {
  pedidos: KitchenPedido[];
  branchId: string;
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

export function PendingOrdersBar({ pedidos, branchId }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const qc = useQueryClient();

  const updateEstado = useMutation({
    mutationFn: async ({ pedidoId, estado }: { pedidoId: string; estado: string }) => {
      const updateData: Record<string, unknown> = { estado };
      if (estado === 'en_preparacion') updateData.tiempo_inicio_prep = new Date().toISOString();
      if (estado === 'listo') updateData.tiempo_listo = new Date().toISOString();
      const { error } = await supabase.from('pedidos').update(updateData).eq('id', pedidoId);
      if (error) throw error;
    },
    onSuccess: (_, { estado }) => {
      qc.invalidateQueries({ queryKey: ['pos-kitchen', branchId] });
      if (estado === 'listo') toast.success('Pedido marcado como listo');
      if (estado === 'entregado') toast.success('Pedido entregado');
      setSelectedId(null);
    },
    onError: () => toast.error('Error al actualizar estado'),
  });

  const handleAdvance = useCallback((pedidoId: string, nextEstado: string) => {
    updateEstado.mutate({ pedidoId, estado: nextEstado });
  }, [updateEstado]);

  if (pedidos.length === 0) return null;

  const pendientes = pedidos.filter(p => p.estado === 'pendiente');
  const preparando = pedidos.filter(p => p.estado === 'en_preparacion');
  const listos = pedidos.filter(p => p.estado === 'listo');

  return (
    <div className="border-b bg-background">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Pedidos activos</span>
          <div className="flex gap-1.5">
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
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {/* Chips */}
      {expanded && (
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          {pedidos.map(pedido => {
            const config = ESTADO_CONFIG[pedido.estado];
            if (!config) return null;
            const Icon = config.icon;
            const mins = getElapsedMin(pedido.created_at);
            const isSelected = selectedId === pedido.id;
            const isUrgent = pedido.estado === 'pendiente' && mins >= 10;

            return (
              <div key={pedido.id} className="flex-shrink-0">
                <button
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all',
                    config.color,
                    isUrgent && 'ring-2 ring-red-400 animate-pulse',
                    isSelected && 'ring-2 ring-primary'
                  )}
                  onClick={() => setSelectedId(isSelected ? null : pedido.id)}
                >
                  <span>{serviceIcon(pedido.tipo_servicio)}</span>
                  <span className="font-bold">#{String(pedido.numero_pedido).slice(-3)}</span>
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-xs opacity-75">{mins}m</span>
                </button>

                {isSelected && (
                  <div className="mt-1 flex gap-1">
                    <Button
                      size="sm"
                      className="h-7 text-xs w-full"
                      onClick={() => handleAdvance(pedido.id, config.next)}
                      disabled={updateEstado.isPending}
                    >
                      {config.nextLabel}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
