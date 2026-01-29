/**
 * Types for the Shift Closure System
 * Hoppiness Hub Platform
 */

// Shift values
export type ShiftType = 'mañana' | 'mediodía' | 'noche' | 'trasnoche';

// Burger categories and types
export interface HamburguesasData {
  clasicas: number;
  originales: number;
  mas_sabor: number;
  veggies: {
    not_american: number;
    not_claudio: number;
  };
  ultrasmash: {
    ultra_cheese: number;
    ultra_bacon: number;
  };
  extras: {
    extra_carne: number;
    extra_not_burger: number;
    extra_not_chicken: number;
  };
}

// Local sales by channel and payment method
export interface ChannelPayments {
  efectivo: number;
  debito: number;
  credito: number;
  qr: number;
  transferencia: number;
}

export interface VentasLocalData {
  salon: ChannelPayments;
  takeaway: ChannelPayments;
  delivery_manual: ChannelPayments;
}

// App sales with their specific payment methods
export interface VentasAppsData {
  mas_delivery: {
    efectivo: number;
    mercadopago: number;
  };
  rappi: {
    app: number;
  };
  pedidosya: {
    efectivo: number;
    app: number;
  };
  mp_delivery: {
    app: number;
  };
}

// Full shift closure record
export interface ShiftClosure {
  id: string;
  branch_id: string;
  fecha: string; // DATE as string 'YYYY-MM-DD'
  turno: ShiftType;
  
  hamburguesas: HamburguesasData;
  ventas_local: VentasLocalData;
  ventas_apps: VentasAppsData;
  
  total_facturado: number;
  total_hamburguesas: number;
  total_vendido: number;
  total_efectivo: number;
  total_digital: number;
  
  facturacion_esperada: number;
  facturacion_diferencia: number;
  tiene_alerta_facturacion: boolean;
  
  notas: string | null;
  
  cerrado_por: string;
  cerrado_at: string;
  updated_at: string | null;
  updated_by: string | null;
}

// For creating/updating closures
export interface ShiftClosureInput {
  branch_id: string;
  fecha: string;
  turno: ShiftType;
  hamburguesas: HamburguesasData;
  ventas_local: VentasLocalData;
  ventas_apps: VentasAppsData;
  total_facturado: number;
  notas?: string;
}

// Configuration types
export type ConfigTipo = 'categoria_hamburguesa' | 'tipo_hamburguesa' | 'extra' | 'app_delivery';

export interface ClosureConfigItem {
  id: string;
  tipo: ConfigTipo;
  clave: string;
  etiqueta: string;
  categoria_padre: string | null;
  orden: number;
  activo: boolean;
}

export interface BranchClosureConfig {
  id: string;
  branch_id: string;
  config_id: string;
  habilitado: boolean;
}

// Helper functions to calculate totals
export function calcularTotalesHamburguesas(data: HamburguesasData): number {
  return (
    data.clasicas +
    data.originales +
    data.mas_sabor +
    data.veggies.not_american +
    data.veggies.not_claudio +
    data.ultrasmash.ultra_cheese +
    data.ultrasmash.ultra_bacon
    // Extras no cuentan como hamburguesas completas
  );
}

export function calcularTotalCanal(canal: ChannelPayments): number {
  return canal.efectivo + canal.debito + canal.credito + canal.qr + canal.transferencia;
}

export function calcularTotalesVentasLocal(data: VentasLocalData): { total: number; efectivo: number; digital: number } {
  const salonTotal = calcularTotalCanal(data.salon);
  const takeawayTotal = calcularTotalCanal(data.takeaway);
  const deliveryTotal = calcularTotalCanal(data.delivery_manual);
  
  const efectivo = data.salon.efectivo + data.takeaway.efectivo + data.delivery_manual.efectivo;
  const total = salonTotal + takeawayTotal + deliveryTotal;
  
  return {
    total,
    efectivo,
    digital: total - efectivo,
  };
}

export function calcularTotalesVentasApps(data: VentasAppsData): { total: number; efectivo: number; digital: number } {
  const masDeliveryTotal = data.mas_delivery.efectivo + data.mas_delivery.mercadopago;
  const rappiTotal = data.rappi.app;
  const pedidosyaTotal = data.pedidosya.efectivo + data.pedidosya.app;
  const mpDeliveryTotal = data.mp_delivery.app;
  
  const efectivo = data.mas_delivery.efectivo + data.pedidosya.efectivo;
  const total = masDeliveryTotal + rappiTotal + pedidosyaTotal + mpDeliveryTotal;
  
  return {
    total,
    efectivo,
    digital: total - efectivo,
  };
}

export function calcularFacturacionEsperada(
  ventasLocal: VentasLocalData,
  ventasApps: VentasAppsData
): number {
  const totalesLocal = calcularTotalesVentasLocal(ventasLocal);
  const totalesApps = calcularTotalesVentasApps(ventasApps);
  
  const totalVendido = totalesLocal.total + totalesApps.total;
  const efectivoLocal = totalesLocal.efectivo + ventasApps.pedidosya.efectivo; // PY efectivo se suma a local
  const efectivoMasDelivery = ventasApps.mas_delivery.efectivo;
  
  // Esperado = Total vendido - Efectivo local + Efectivo MásDelivery
  return totalVendido - efectivoLocal + efectivoMasDelivery;
}

export function getDefaultHamburguesas(): HamburguesasData {
  return {
    clasicas: 0,
    originales: 0,
    mas_sabor: 0,
    veggies: { not_american: 0, not_claudio: 0 },
    ultrasmash: { ultra_cheese: 0, ultra_bacon: 0 },
    extras: { extra_carne: 0, extra_not_burger: 0, extra_not_chicken: 0 },
  };
}

export function getDefaultVentasLocal(): VentasLocalData {
  return {
    salon: { efectivo: 0, debito: 0, credito: 0, qr: 0, transferencia: 0 },
    takeaway: { efectivo: 0, debito: 0, credito: 0, qr: 0, transferencia: 0 },
    delivery_manual: { efectivo: 0, debito: 0, credito: 0, qr: 0, transferencia: 0 },
  };
}

export function getDefaultVentasApps(): VentasAppsData {
  return {
    mas_delivery: { efectivo: 0, mercadopago: 0 },
    rappi: { app: 0 },
    pedidosya: { efectivo: 0, app: 0 },
    mp_delivery: { app: 0 },
  };
}
