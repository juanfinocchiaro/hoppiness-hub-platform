import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { FiltrosRdo, RdoMultivistaData } from './useRdoMultivista';
import type { RdoReportLine } from '@/types/rdo';

export interface RdoUnifiedCmv {
  cmv_auto: number;
  cmv_manual_ajuste: number;
  cmv_total: number;
  por_rubro: Array<{
    category_code: string;
    category_name: string;
    total: number;
    gastos: Array<{
      producto_id: string | null;
      producto_nombre: string;
      cantidad: number;
      total: number;
    }>;
  }>;
}

export interface RdoUnifiedFiscal {
  ventas_brutas_totales: number;
  ventas_facturadas_brutas_original: number;
  ventas_facturadas_brutas: number;
  notas_credito_brutas: number;
  ventas_facturadas_netas: number;
  ventas_no_facturadas_netas: number;
  ventas_netas_rdo: number;
  iva_ventas_bruto: number;
  iva_notas_credito: number;
  iva_ventas: number;
  compras_blanco_brutas: number;
  compras_blanco_netas: number;
  iva_compras: number;
  saldo_iva: number;
}

export interface RdoUnifiedDiagnosticoCostos {
  items_sin_costo_count: number;
  ventas_afectadas: number;
  productos_top_sin_costo: Array<{
    producto_id: string | null;
    producto_nombre: string;
    cantidad: number;
    ventas: number;
  }>;
}

export interface RdoUnifiedReportData {
  periodo: string;
  fecha_desde: string;
  fecha_hasta: string;
  multivista: RdoMultivistaData;
  rdo_lines: RdoReportLine[];
  cmv: RdoUnifiedCmv;
  fiscal: RdoUnifiedFiscal;
  diagnostico_costos: RdoUnifiedDiagnosticoCostos;
}

function asNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function useRdoUnifiedReport(
  branchId: string | undefined,
  periodo: string,
  filtros: Omit<FiltrosRdo, 'fechaDesde' | 'fechaHasta'>
) {
  return useQuery({
    queryKey: ['rdo-unified-report', branchId, periodo, filtros.canales, filtros.mediosPago, filtros.categorias, filtros.productos],
    queryFn: async (): Promise<RdoUnifiedReportData> => {
      if (!branchId) throw new Error('Branch ID requerido');

      const { data, error } = await supabase.rpc('get_rdo_unified_report', {
        _branch_id: branchId,
        _periodo: periodo,
        _canales: filtros.canales,
        _medios: filtros.mediosPago,
        _categorias: filtros.categorias,
        _productos: filtros.productos,
      } as any);

      if (error) throw error;

      const payload = (data || {}) as any;
      const mv = payload.multivista || {};

      const normalized: RdoUnifiedReportData = {
        periodo: String(payload.periodo || periodo),
        fecha_desde: String(payload.fecha_desde || ''),
        fecha_hasta: String(payload.fecha_hasta || ''),
        multivista: {
          totales: {
            total_ventas: asNumber(mv?.totales?.total_ventas),
            total_pedidos: asNumber(mv?.totales?.total_pedidos),
            ticket_promedio: asNumber(mv?.totales?.ticket_promedio),
            total_facturado: asNumber(mv?.totales?.total_facturado),
            total_no_facturado: asNumber(mv?.totales?.total_no_facturado),
          },
          por_canal: asArray<any>(mv?.por_canal).map((r) => ({
            canal: String(r.canal ?? 'desconocido'),
            pedidos: asNumber(r.pedidos),
            ventas: asNumber(r.ventas),
            porcentaje: asNumber(r.porcentaje),
            ticket_promedio: asNumber(r.ticket_promedio),
          })),
          por_medio_pago: asArray<any>(mv?.por_medio_pago).map((r) => ({
            medio_pago: String(r.medio_pago ?? 'otro'),
            pedidos: asNumber(r.pedidos),
            ventas: asNumber(r.ventas),
            porcentaje: asNumber(r.porcentaje),
            facturado: asNumber(r.facturado),
          })),
          por_categoria: asArray<any>(mv?.por_categoria).map((r) => ({
            categoria_id: r.categoria_id ? String(r.categoria_id) : null,
            categoria_nombre: String(r.categoria_nombre ?? 'Sin categoría'),
            cantidad: asNumber(r.cantidad),
            ventas: asNumber(r.ventas),
            porcentaje: asNumber(r.porcentaje),
            costo_total: asNumber(r.costo_total),
            food_cost: asNumber(r.food_cost),
          })),
          por_producto: asArray<any>(mv?.por_producto).map((r) => ({
            producto_id: r.producto_id ? String(r.producto_id) : null,
            producto_nombre: String(r.producto_nombre ?? 'Sin nombre'),
            categoria_id: r.categoria_id ? String(r.categoria_id) : null,
            categoria_nombre: String(r.categoria_nombre ?? 'Sin categoría'),
            cantidad: asNumber(r.cantidad),
            ventas: asNumber(r.ventas),
            porcentaje: asNumber(r.porcentaje),
            food_cost: asNumber(r.food_cost),
          })),
          opciones_filtros: {
            canales: asArray<any>(mv?.opciones_filtros?.canales).map((o) => ({ id: String(o.id), label: String(o.label ?? o.id) })),
            medios_pago: asArray<any>(mv?.opciones_filtros?.medios_pago).map((o) => ({ id: String(o.id), label: String(o.label ?? o.id) })),
            categorias: asArray<any>(mv?.opciones_filtros?.categorias).map((o) => ({ id: String(o.id), nombre: String(o.nombre ?? 'Sin categoría') })),
            productos: asArray<any>(mv?.opciones_filtros?.productos).map((o) => ({
              id: String(o.id),
              nombre: String(o.nombre ?? 'Sin nombre'),
              categoria_id: o.categoria_id ? String(o.categoria_id) : null,
              categoria_nombre: o.categoria_nombre ? String(o.categoria_nombre) : null,
            })),
          },
        },
        rdo_lines: asArray<RdoReportLine>(payload.rdo_lines),
        cmv: {
          cmv_auto: asNumber(payload?.cmv?.cmv_auto),
          cmv_manual_ajuste: asNumber(payload?.cmv?.cmv_manual_ajuste),
          cmv_total: asNumber(payload?.cmv?.cmv_total),
          por_rubro: asArray<any>(payload?.cmv?.por_rubro).map((r) => ({
            category_code: String(r?.category_code ?? ''),
            category_name: String(r?.category_name ?? 'Sin rubro'),
            total: asNumber(r?.total),
            gastos: asArray<any>(r?.gastos).map((g) => ({
              producto_id: g?.producto_id ? String(g.producto_id) : null,
              producto_nombre: String(g?.producto_nombre ?? 'Sin nombre'),
              cantidad: asNumber(g?.cantidad),
              total: asNumber(g?.total),
            })),
          })),
        },
        fiscal: {
          ventas_brutas_totales: asNumber(payload?.fiscal?.ventas_brutas_totales),
          ventas_facturadas_brutas_original: asNumber(payload?.fiscal?.ventas_facturadas_brutas_original),
          ventas_facturadas_brutas: asNumber(payload?.fiscal?.ventas_facturadas_brutas),
          notas_credito_brutas: asNumber(payload?.fiscal?.notas_credito_brutas),
          ventas_facturadas_netas: asNumber(payload?.fiscal?.ventas_facturadas_netas),
          ventas_no_facturadas_netas: asNumber(payload?.fiscal?.ventas_no_facturadas_netas),
          ventas_netas_rdo: asNumber(payload?.fiscal?.ventas_netas_rdo),
          iva_ventas_bruto: asNumber(payload?.fiscal?.iva_ventas_bruto),
          iva_notas_credito: asNumber(payload?.fiscal?.iva_notas_credito),
          iva_ventas: asNumber(payload?.fiscal?.iva_ventas),
          compras_blanco_brutas: asNumber(payload?.fiscal?.compras_blanco_brutas),
          compras_blanco_netas: asNumber(payload?.fiscal?.compras_blanco_netas),
          iva_compras: asNumber(payload?.fiscal?.iva_compras),
          saldo_iva: asNumber(payload?.fiscal?.saldo_iva),
        },
        diagnostico_costos: {
          items_sin_costo_count: asNumber(payload?.diagnostico_costos?.items_sin_costo_count),
          ventas_afectadas: asNumber(payload?.diagnostico_costos?.ventas_afectadas),
          productos_top_sin_costo: asArray<any>(payload?.diagnostico_costos?.productos_top_sin_costo).map((p) => ({
            producto_id: p.producto_id ? String(p.producto_id) : null,
            producto_nombre: String(p.producto_nombre ?? 'Sin nombre'),
            cantidad: asNumber(p.cantidad),
            ventas: asNumber(p.ventas),
          })),
        },
      };

      return normalized;
    },
    enabled: !!branchId && !!periodo,
  });
}
