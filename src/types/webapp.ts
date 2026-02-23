/**
 * Tipos para la WebApp pública de pedidos
 */

export type TipoServicioWebapp = 'retiro' | 'delivery';

export interface WebappConfig {
  id: string;
  branch_id: string;
  webapp_activa: boolean;
  estado: 'abierto' | 'pausado' | 'cerrado';
  delivery_habilitado: boolean;
  delivery_radio_km: number;
  delivery_costo: number;
  delivery_pedido_minimo: number;
  retiro_habilitado: boolean;
  comer_aca_habilitado: boolean;
  recepcion_modo: 'auto' | 'manual';
  tiempo_estimado_retiro_min: number;
  tiempo_estimado_delivery_min: number;
  horarios: any[];
  mensaje_pausa: string | null;
}

export interface WebappMenuItem {
  id: string;
  nombre: string;
  nombre_corto: string | null;
  descripcion: string | null;
  imagen_url: string | null;
  precio_base: number;
  precio_promo: number | null;
  promo_etiqueta: string | null;
  categoria_carta_id: string | null;
  categoria_nombre: string | null;
  categoria_orden: number | null;
  orden: number | null;
  disponible_delivery: boolean;
  disponible_webapp: boolean;
  tipo: string;
}

export interface CartItemModifier {
  id: string;
  nombre: string;
  precio: number;
  tipo: 'extra' | 'sin';
}

export interface CartItem {
  cartId: string; // unique per cart entry
  itemId: string;
  nombre: string;
  imagen_url: string | null;
  precioUnitario: number;
  cantidad: number;
  extras: CartItemModifier[];
  removidos: string[];
  notas: string;
}

export interface WebappCart {
  tipoServicio: TipoServicioWebapp;
  items: CartItem[];
  clienteNombre: string;
  clienteTelefono: string;
  clienteEmail: string;
  clienteDireccion: string;
  clientePiso: string;
  clienteReferencia: string;
}
