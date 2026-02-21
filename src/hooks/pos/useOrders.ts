/**
 * useOrders - CRUD de pedidos
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { OrderConfig } from '@/types/pos';

export interface PedidoItemInput {
  item_carta_id: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  notas?: string;
  estacion?: string;
  precio_referencia?: number;
  categoria_carta_id?: string | null;
}

/** Una línea de pago (pago dividido) */
export interface PaymentLineInput {
  method: string;
  amount: number;
  montoRecibido?: number;
}

export interface CreatePedidoParams {
  items: PedidoItemInput[];
  tipo?: 'mostrador' | 'delivery' | 'webapp';
  descuento?: number;
  /** Pago único (ignorado si se usa payments) */
  metodoPago?: string;
  montoRecibido?: number;
  /** Pago dividido (Fase 4). Si se envía, suma debe ser total + propina */
  payments?: PaymentLineInput[];
  /** Propina opcional (Fase 4) */
  propina?: number;
  /** Configuración de canal, tipo servicio y cliente (Fase 1) */
  orderConfig?: OrderConfig;
}

export function useOrders(branchId: string) {
  return useQuery({
    queryKey: ['pos-orders', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!branchId,
  });
}

/** Determina tipo de pedido para DB según orderConfig */
function resolveTipo(orderConfig?: OrderConfig): 'mostrador' | 'delivery' | 'webapp' {
  if (!orderConfig) return 'mostrador';
  if (orderConfig.canalVenta === 'apps') return 'webapp';
  if (orderConfig.tipoServicio === 'delivery') return 'delivery';
  return 'mostrador';
}

export function useCreatePedido(branchId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreatePedidoParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      const { data: numero, error: errNum } = await supabase.rpc('generar_numero_pedido', { p_branch_id: branchId });
      if (errNum) throw errNum;
      const numeroPedido = (numero as number) ?? 1;

      const subtotal = params.items.reduce((s, i) => s + i.subtotal, 0);
      const descuento = params.descuento ?? 0;
      const totalOrder = subtotal - descuento;
      const propina = params.propina ?? 0;
      const totalToPay = totalOrder + propina;

      const cfg = params.orderConfig;
      const tipo = resolveTipo(cfg);

      const insertPayload: Record<string, unknown> = {
        branch_id: branchId,
        numero_pedido: numeroPedido,
        tipo,
        estado: 'pendiente',
        subtotal,
        descuento,
        total: totalOrder,
        propina,
        created_by: user.id,
      };

      if (cfg) {
        if (cfg.numeroLlamador) insertPayload.numero_llamador = parseInt(cfg.numeroLlamador, 10);
        if (cfg.clienteNombre) insertPayload.cliente_nombre = cfg.clienteNombre;
        if (cfg.clienteTelefono) insertPayload.cliente_telefono = cfg.clienteTelefono;
        if (cfg.clienteDireccion) insertPayload.cliente_direccion = cfg.clienteDireccion;
        insertPayload.canal_venta = cfg.canalVenta;
        insertPayload.tipo_servicio = cfg.tipoServicio;
        if (cfg.canalVenta === 'apps') {
          insertPayload.canal_app = cfg.canalApp;
          if (cfg.referenciaApp) insertPayload.referencia_app = cfg.referenciaApp;
        }
      }

      const { data: pedido, error: errPedido } = await supabase
        .from('pedidos')
        .insert(insertPayload as any)
        .select('id, numero_pedido')
        .single();

      if (errPedido) throw errPedido;
      if (!pedido) throw new Error('No se creó el pedido');

      for (const it of params.items) {
        const { error: errItem } = await supabase.from('pedido_items').insert({
          pedido_id: pedido.id,
          item_carta_id: it.item_carta_id,
          nombre: it.nombre,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario,
          subtotal: it.subtotal,
          notas: it.notas ?? null,
          estacion: it.estacion ?? 'armado',
          precio_referencia: it.precio_referencia ?? null,
          categoria_carta_id: it.categoria_carta_id ?? null,
        } as any);
        if (errItem) throw errItem;
      }

      const useSplit = params.payments && params.payments.length > 0;
      if (!useSplit && !params.metodoPago) {
        throw new Error('Se requiere un método de pago');
      }
      const paymentRows = useSplit
        ? params.payments!
        : [
            {
              method: params.metodoPago!,
              amount: totalToPay,
              montoRecibido: params.montoRecibido ?? totalToPay,
            },
          ];

      for (const row of paymentRows) {
        const montoRecibido = row.montoRecibido ?? row.amount;
        const vuelto = montoRecibido - row.amount;
        const { error: errPago } = await supabase.from('pedido_pagos').insert({
          pedido_id: pedido.id,
          metodo: row.method,
          monto: row.amount,
          monto_recibido: montoRecibido,
          vuelto: vuelto,
          created_by: user.id,
        });
        if (errPago) throw errPago;
      }

      // Fase 3: registrar en caja cada pago en efectivo
      const { data: openShift } = await supabase
        .from('cash_register_shifts')
        .select('id')
        .eq('branch_id', branchId)
        .eq('status', 'open')
        .limit(1)
        .maybeSingle();

      for (const row of paymentRows) {
        const isCash = String(row.method).toLowerCase() === 'efectivo';
        if (isCash && row.amount > 0 && openShift) {
          const { error: errMov } = await supabase.from('cash_register_movements').insert({
            shift_id: openShift.id,
            branch_id: branchId,
            type: 'income',
            payment_method: row.method,
            amount: row.amount,
            concept: `Venta pedido #${numeroPedido}`,
            order_id: pedido.id,
            recorded_by: user.id,
          });
          if (errMov) console.error('Error registrando movimiento de caja:', errMov);
        }
      }

      return pedido;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-orders', branchId] });
    },
  });
}
