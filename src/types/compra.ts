import type { Tables } from '@/integrations/supabase/types';

export type Compra = Tables<'compras'>;
export type PagoProveedor = Tables<'pagos_proveedores'>;
export type Gasto = Tables<'gastos'>;

// Form types
export interface CompraFormData {
  branch_id: string;
  proveedor_id: string;
  insumo_id: string;
  cantidad: number;
  unidad: string;
  precio_unitario: number;
  fecha: string;
  periodo: string;
  tipo_compra?: 'regular' | 'extraordinaria';
  motivo_extraordinaria?: string;
  condicion_pago?: string;
  medio_pago?: string;
  factura_tipo?: string;
  factura_numero?: string;
  factura_fecha?: string;
  categoria_pl?: string;
  afecta_costo_base?: boolean;
  observaciones?: string;
}

export interface PagoProveedorFormData {
  compra_id: string;
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
export const TIPO_COMPRA_OPTIONS = [
  { value: 'regular', label: 'Regular' },
  { value: 'extraordinaria', label: 'Extraordinaria' },
] as const;

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
  { value: 'ticket', label: 'Ticket' },
  { value: 'sin_factura', label: 'Sin Factura' },
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
