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
  alicuota_iva?: number | null;
  iva_monto?: number;
  precio_unitario_bruto?: number;
}

export const IVA_OPTIONS = [
  { value: 21, label: '21%' },
  { value: 10.5, label: '10.5%' },
  { value: 27, label: '27%' },
  { value: 0, label: 'Exento (0%)' },
  { value: null, label: 'Sin factura' },
] as const;

export interface PagoProveedorFormData {
  factura_id?: string;
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
  estado?: string;
  fecha_vencimiento?: string | null;
  fecha_pago?: string | null;
  medio_pago?: string;
  referencia_pago?: string;
  gasto_relacionado_id?: string | null;
  observaciones?: string;
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

export const MEDIO_PAGO_OPTIONS_WITH_IMPUTACION = [
  ...MEDIO_PAGO_OPTIONS,
  { value: 'imputacion_saldo', label: 'Imputación saldo a favor' },
] as const;

export const FACTURA_TIPO_OPTIONS = [
  { value: 'A', label: 'Factura A' },
  { value: 'B', label: 'Factura B' },
  { value: 'C', label: 'Factura C' },
] as const;

export const CATEGORIA_GASTO_OPTIONS = [
  { value: 'caja_chica', label: 'Caja chica' },
  { value: 'propinas', label: 'Propinas / Gratificaciones' },
  { value: 'movilidad', label: 'Movilidad / Transporte' },
  { value: 'mantenimiento_express', label: 'Mantenimiento express' },
  { value: 'insumos_menores', label: 'Insumos menores (sin factura)' },
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
