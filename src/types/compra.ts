import type { Tables } from '@/integrations/supabase/types';

export type FacturaProveedor = Tables<'facturas_proveedores'>;
export type ItemFactura = Tables<'items_factura'>;
export type PagoProveedor = Tables<'pagos_proveedores'>;
export type Gasto = Tables<'gastos'>;

// Form types
export interface FacturaFormData {
  branch_id: string;
  proveedor_id: string;
  factura_tipo?: string;
  factura_numero: string;
  factura_fecha: string;
  condicion_pago: string;
  fecha_vencimiento?: string;
  medio_pago?: string;
  iva: number;
  otros_impuestos: number;
  tipo: string;
  motivo_extraordinaria?: string;
  periodo: string;
  observaciones?: string;
  items: ItemFacturaFormData[];
}

export interface ItemFacturaFormData {
  insumo_id: string;
  cantidad: number;
  unidad: string;
  precio_unitario: number;
  subtotal: number;
  afecta_costo_base?: boolean;
  categoria_pl?: string;
  observaciones?: string;
}

export interface PagoProveedorFormData {
  factura_id: string;
  proveedor_id: string;
  branch_id: string;
  monto: number;
  fecha_pago: string;
  medio_pago: string;
  referencia?: string;
  observaciones?: string;
}

export interface GastoFormData {
  branch_id: string;
  fecha: string;
  periodo: string;
  categoria_principal: string;
  subcategoria?: string;
  concepto: string;
  monto: number;
  medio_pago?: string;
  referencia_pago?: string;
  observaciones?: string;
  estado?: string;
}

// Constants
export const CONDICION_PAGO_OPTIONS = [
  { value: 'contado', label: 'Contado' },
  { value: 'cuenta_corriente', label: 'Cuenta Corriente' },
] as const;

export const MEDIO_PAGO_OPTIONS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'cuenta_corriente', label: 'Cuenta Corriente' },
] as const;

export const FACTURA_TIPO_OPTIONS = [
  { value: 'A', label: 'Factura A' },
  { value: 'B', label: 'Factura B' },
  { value: 'C', label: 'Factura C' },
] as const;

export const CATEGORIA_GASTO_OPTIONS = [
  { value: 'servicios', label: 'Servicios (Luz, Gas, Internet)' },
  { value: 'alquileres', label: 'Alquileres' },
  { value: 'sueldos', label: 'Sueldos y Cargas Sociales' },
  { value: 'impuestos', label: 'Impuestos' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'logistica', label: 'Logística' },
  { value: 'administrativos', label: 'Administrativos' },
  { value: 'varios', label: 'Varios' },
] as const;

export const ESTADO_GASTO_OPTIONS = [
  { value: 'pagado', label: 'Pagado' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'parcial', label: 'Parcial' },
] as const;

export function getCurrentPeriodo(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
