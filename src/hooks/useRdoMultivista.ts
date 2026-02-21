import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FiltrosRdo {
  fechaDesde: string;
  fechaHasta: string;
  canales: string[];
  mediosPago: string[];
  categorias: string[];
  productos: string[];
}

export interface OpcionSimple {
  id: string;
  label: string;
}

export interface OpcionCategoria {
  id: string;
  nombre: string;
}

export interface OpcionProducto {
  id: string;
  nombre: string;
  categoria_id: string | null;
  categoria_nombre: string | null;
}

export interface RdoTotales {
  total_ventas: number;
  total_pedidos: number;
  ticket_promedio: number;
  total_facturado: number;
  total_no_facturado: number;
}

export interface RdoPorCanalRow {
  canal: string;
  pedidos: number;
  ventas: number;
  porcentaje: number;
  ticket_promedio: number;
}

export interface RdoPorMedioRow {
  medio_pago: string;
  pedidos: number;
  ventas: number;
  porcentaje: number;
  facturado: number;
}

export interface RdoPorCategoriaRow {
  categoria_id: string | null;
  categoria_nombre: string;
  cantidad: number;
  ventas: number;
  porcentaje: number;
  costo_total: number;
  food_cost: number;
}

export interface RdoPorProductoRow {
  producto_id: string | null;
  producto_nombre: string;
  categoria_id: string | null;
  categoria_nombre: string;
  cantidad: number;
  ventas: number;
  porcentaje: number;
  food_cost: number;
}

export interface RdoMultivistaData {
  totales: RdoTotales;
  por_canal: RdoPorCanalRow[];
  por_medio_pago: RdoPorMedioRow[];
  por_categoria: RdoPorCategoriaRow[];
  por_producto: RdoPorProductoRow[];
  opciones_filtros: {
    canales: OpcionSimple[];
    medios_pago: OpcionSimple[];
    categorias: OpcionCategoria[];
    productos: OpcionProducto[];
  };
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizePayload(payload: any): RdoMultivistaData {
  const totales = payload?.totales ?? {};
  const opciones = payload?.opciones_filtros ?? {};

  return {
    totales: {
      total_ventas: toNumber(totales.total_ventas),
      total_pedidos: toNumber(totales.total_pedidos),
      ticket_promedio: toNumber(totales.ticket_promedio),
      total_facturado: toNumber(totales.total_facturado),
      total_no_facturado: toNumber(totales.total_no_facturado),
    },
    por_canal: toArray<any>(payload?.por_canal).map((row) => ({
      canal: String(row.canal ?? 'desconocido'),
      pedidos: toNumber(row.pedidos),
      ventas: toNumber(row.ventas),
      porcentaje: toNumber(row.porcentaje),
      ticket_promedio: toNumber(row.ticket_promedio),
    })),
    por_medio_pago: toArray<any>(payload?.por_medio_pago).map((row) => ({
      medio_pago: String(row.medio_pago ?? 'otro'),
      pedidos: toNumber(row.pedidos),
      ventas: toNumber(row.ventas),
      porcentaje: toNumber(row.porcentaje),
      facturado: toNumber(row.facturado),
    })),
    por_categoria: toArray<any>(payload?.por_categoria).map((row) => ({
      categoria_id: row.categoria_id ? String(row.categoria_id) : null,
      categoria_nombre: String(row.categoria_nombre ?? 'Sin categoría'),
      cantidad: toNumber(row.cantidad),
      ventas: toNumber(row.ventas),
      porcentaje: toNumber(row.porcentaje),
      costo_total: toNumber(row.costo_total),
      food_cost: toNumber(row.food_cost),
    })),
    por_producto: toArray<any>(payload?.por_producto).map((row) => ({
      producto_id: row.producto_id ? String(row.producto_id) : null,
      producto_nombre: String(row.producto_nombre ?? 'Sin nombre'),
      categoria_id: row.categoria_id ? String(row.categoria_id) : null,
      categoria_nombre: String(row.categoria_nombre ?? 'Sin categoría'),
      cantidad: toNumber(row.cantidad),
      ventas: toNumber(row.ventas),
      porcentaje: toNumber(row.porcentaje),
      food_cost: toNumber(row.food_cost),
    })),
    opciones_filtros: {
      canales: toArray<any>(opciones.canales).map((o) => ({
        id: String(o.id),
        label: String(o.label ?? o.id),
      })),
      medios_pago: toArray<any>(opciones.medios_pago).map((o) => ({
        id: String(o.id),
        label: String(o.label ?? o.id),
      })),
      categorias: toArray<any>(opciones.categorias).map((o) => ({
        id: String(o.id),
        nombre: String(o.nombre ?? 'Sin categoría'),
      })),
      productos: toArray<any>(opciones.productos).map((o) => ({
        id: String(o.id),
        nombre: String(o.nombre ?? 'Sin nombre'),
        categoria_id: o.categoria_id ? String(o.categoria_id) : null,
        categoria_nombre: o.categoria_nombre ? String(o.categoria_nombre) : null,
      })),
    },
  };
}

export function useRdoMultivista(branchId: string | undefined, filtros: FiltrosRdo) {
  return useQuery({
    queryKey: ['rdo-multivista', branchId, filtros.fechaDesde, filtros.fechaHasta, filtros.canales, filtros.mediosPago, filtros.categorias, filtros.productos],
    queryFn: async (): Promise<RdoMultivistaData> => {
      if (!branchId) {
        throw new Error('Branch ID requerido');
      }

      const { data, error } = await supabase.rpc('get_rdo_multivista', {
        _branch_id: branchId,
        _fecha_desde: filtros.fechaDesde,
        _fecha_hasta: filtros.fechaHasta,
        _canales: filtros.canales,
        _medios: filtros.mediosPago,
        _categorias: filtros.categorias,
        _productos: filtros.productos,
      } as any);

      if (error) throw error;
      return normalizePayload(data);
    },
    enabled: !!branchId,
  });
}
