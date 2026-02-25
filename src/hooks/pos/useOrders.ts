/**
 * useOrders - CRUD de pedidos
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { normalizePhone } from '@/lib/normalizePhone';
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
  promo_descuento?: number;
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
  /** Override estado inicial (e.g. 'pendiente_pago' for Point Smart payments) */
  estadoInicial?: 'pendiente' | 'pendiente_pago';
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
      const promoDesc = params.items.reduce((s, i) => s + (i.promo_descuento ?? 0) * i.cantidad, 0);
      const descuentoPlat = params.orderConfig?.descuentoPlataforma ?? 0;
      const descuentoRestRaw = params.orderConfig?.descuentoRestaurante ?? 0;
      const descuentoRest = params.orderConfig?.descuentoModo === 'porcentaje'
        ? Math.round(subtotal * descuentoRestRaw / 100)
        : descuentoRestRaw;
      const descuento = params.descuento ?? (descuentoPlat + descuentoRest + promoDesc);
      const costoDelivery = params.orderConfig?.costoDelivery ?? 0;
      const totalOrder = subtotal - descuento + costoDelivery;
      const propina = params.propina ?? 0;
      const totalToPay = totalOrder + propina;

      const cfg = params.orderConfig;
      const tipo = resolveTipo(cfg);

      const insertPayload: Record<string, unknown> = {
        branch_id: branchId,
        numero_pedido: numeroPedido,
        tipo,
        estado: params.estadoInicial ?? 'pendiente',
        subtotal,
        descuento,
        total: totalOrder,
        propina,
        created_by: user.id,
      };

      if (costoDelivery > 0) insertPayload.costo_delivery = costoDelivery;

      const descuentoPlataforma = cfg?.descuentoPlataforma ?? 0;
      const descuentoRestaurante = cfg?.descuentoModo === 'porcentaje'
        ? Math.round(subtotal * (cfg?.descuentoRestaurante ?? 0) / 100)
        : (cfg?.descuentoRestaurante ?? 0);
      if (descuentoPlataforma > 0) insertPayload.descuento_plataforma = descuentoPlataforma;
      if (descuentoRestaurante > 0) insertPayload.descuento_restaurante = descuentoRestaurante;

      if (cfg) {
        if (cfg.numeroLlamador) insertPayload.numero_llamador = parseInt(cfg.numeroLlamador, 10);
        if (cfg.clienteNombre) insertPayload.cliente_nombre = cfg.clienteNombre;
        if (cfg.clienteTelefono) {
          const normalized = normalizePhone(cfg.clienteTelefono);
          insertPayload.cliente_telefono = normalized || cfg.clienteTelefono;
        }
        if (cfg.clienteDireccion) insertPayload.cliente_direccion = cfg.clienteDireccion;
        // Vincular pedido al usuario identificado por teléfono
        if (cfg.clienteUserId) insertPayload.cliente_user_id = cfg.clienteUserId;
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

      // Si el pedido es delivery con cliente identificado, guardar la dirección en su perfil
      if (
        cfg?.tipoServicio === 'delivery' &&
        cfg.clienteUserId &&
        cfg.clienteDireccion?.trim()
      ) {
        supabase
          .from('cliente_direcciones')
          .insert({
            user_id: cfg.clienteUserId,
            etiqueta: 'Otro',
            direccion: cfg.clienteDireccion.trim(),
            ciudad: 'Córdoba',
            es_principal: false,
          } as any)
          .then(() => {})
          .catch(() => {});
      }

      const itemRows = params.items.map(it => ({
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
      }));
      const { error: errItems } = await supabase.from('pedido_items').insert(itemRows as any);
      if (errItems) throw errItems;

      // Apps orders: payment handled by platform, no manual payment needed
      const isAppsOrder = cfg?.canalVenta === 'apps';
      // pendiente_pago orders skip payment insertion (webhook handles it)
      const isPendientePago = params.estadoInicial === 'pendiente_pago';
      const useSplit = params.payments && params.payments.length > 0;
      if (!isPendientePago && !isAppsOrder && !useSplit && !params.metodoPago) {
        throw new Error('Se requiere un método de pago');
      }
      const paymentRows = (isPendientePago || isAppsOrder)
        ? []
        : useSplit
          ? params.payments!
          : [
              {
                method: params.metodoPago!,
                amount: totalToPay,
                montoRecibido: params.montoRecibido ?? totalToPay,
              },
            ];

      if (paymentRows.length > 0) {
        const pagoRows = paymentRows.map(row => {
          const montoRecibido = row.montoRecibido ?? row.amount;
          return {
            pedido_id: pedido.id,
            metodo: row.method,
            monto: row.amount,
            monto_recibido: montoRecibido,
            vuelto: montoRecibido - row.amount,
            created_by: user.id,
          };
        });
        const { error: errPago } = await supabase.from('pedido_pagos').insert(pagoRows);
        if (errPago) throw errPago;
      }

      // Fase 3: registrar en caja cada pago en efectivo (solo en Caja de Ventas)
      // Primero buscar la caja de ventas, luego el turno abierto de esa caja
      const { data: ventasRegisters } = await supabase
        .from('cash_registers')
        .select('id')
        .eq('branch_id', branchId)
        .eq('register_type', 'ventas')
        .eq('is_active', true);

      const ventasRegisterIds = (ventasRegisters || []).map(r => r.id);

      let openShift: { id: string } | null = null;
      if (ventasRegisterIds.length > 0) {
        const { data: shiftData } = await supabase
          .from('cash_register_shifts')
          .select('id')
          .eq('branch_id', branchId)
          .eq('status', 'open')
          .in('cash_register_id', ventasRegisterIds)
          .limit(1)
          .maybeSingle();
        openShift = shiftData;
      }

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
          if (errMov) {
            console.error('Error registrando movimiento de caja:', errMov);
            toast.warning('Pedido creado pero no se registró en caja. Ajustá manualmente.');
          }
        }
      }

      return pedido;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['kitchen-pedidos', branchId] });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-orders', branchId] });
      qc.invalidateQueries({ queryKey: ['kitchen-pedidos', branchId] });
    },
  });
}
