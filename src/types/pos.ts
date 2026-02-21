/**
 * Tipos para el módulo POS
 */
export type PedidoTipo = 'mostrador' | 'delivery' | 'webapp';

/** Canal de venta: mostrador (local) o apps (Rappi, PeYa, MP) */
export type CanalVenta = 'mostrador' | 'apps';

/** Tipo de servicio cuando canal = mostrador */
export type TipoServicio = 'takeaway' | 'comer_aca' | 'delivery';

/** App de delivery cuando canal = apps */
export type CanalApp = 'rappi' | 'pedidos_ya' | 'mp_delivery';

/** Tipo de comprobante fiscal (RI emite A o B, nunca C) */
export type TipoFactura = 'B' | 'A';

export interface OrderConfig {
  canalVenta: CanalVenta;
  tipoServicio: TipoServicio;
  canalApp: CanalApp;
  numeroLlamador: string;
  clienteNombre: string;
  clienteTelefono: string;
  clienteDireccion: string;
  /** Identificador del pedido en la plataforma (Rappi: 6 dígitos, MP: 3 dígitos, PeYa: nombre) */
  referenciaApp: string;
  /** Tipo de comprobante fiscal */
  tipoFactura: TipoFactura;
  /** CUIT del receptor (requerido para A/B) */
  receptorCuit: string;
  /** Razón social del receptor (requerido para A/B) */
  receptorRazonSocial: string;
  /** Email para envío de factura (opcional) */
  receptorEmail: string;
}

export const DEFAULT_ORDER_CONFIG: OrderConfig = {
  canalVenta: 'mostrador',
  tipoServicio: 'takeaway',
  canalApp: 'rappi',
  numeroLlamador: '',
  clienteNombre: '',
  clienteTelefono: '',
  clienteDireccion: '',
  referenciaApp: '',
  tipoFactura: 'B',
  receptorCuit: '',
  receptorRazonSocial: '',
  receptorEmail: '',
};

export type PedidoEstado =
  | 'pendiente'
  | 'en_preparacion'
  | 'listo'
  | 'en_camino'
  | 'entregado'
  | 'cancelado';

export type PedidoItemEstacion = 'parrilla' | 'armado' | 'fritura' | 'entrega' | 'bebidas';

export type ModificadorTipo = 'extra' | 'sin' | 'cambio';

export type MetodoPago =
  | 'efectivo'
  | 'tarjeta_debito'
  | 'tarjeta_credito'
  | 'mercadopago_qr'
  | 'transferencia';

/** Pago registrado localmente antes de enviar a cocina */
export interface LocalPayment {
  id: string;
  method: MetodoPago;
  amount: number;
  montoRecibido?: number;
  vuelto?: number;
  createdAt: number;
}
