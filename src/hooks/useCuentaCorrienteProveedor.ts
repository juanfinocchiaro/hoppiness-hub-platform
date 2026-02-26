import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface MovimientoCuenta {
  id: string;
  fecha: string;
  tipo: 'factura' | 'pago';
  factura_numero?: string;
  medio_pago?: string;
  referencia?: string;
  monto: number;
  estado?: string;
  fecha_vencimiento?: string;
  items_count?: number;
  saldo_acumulado: number;
  verificado?: boolean;
}

export interface ResumenCuenta {
  /** Running total of all invoices */
  total_facturado: number;
  /** Sum of ALL payments (verified + unverified) */
  total_pagado: number;
  /** Sum of only verified payments */
  total_pagado_verificado: number;
  /** Sum of unverified payments */
  total_pagado_pendiente_verif: number;
  /** Count of unverified payments */
  pagos_pendientes_verif: number;
  /** Net balance: facturado - pagado (negative = saldo a favor) */
  saldo_actual: number;
  /** Sum of overpayments from invoices with negative saldo_pendiente */
  saldo_a_favor_facturas: number;
  /** Total overdue amount (from invoices past due) */
  monto_vencido: number;
  /** Count of overdue invoices */
  facturas_vencidas: number;
  /** Total not-yet-due amount */
  monto_por_vencer: number;
  /** Next due date, or null */
  proximo_vencimiento: string | null;
  /** Whether all pending invoices are overdue */
  todas_vencidas: boolean;
}

/** Parse YYYY-MM-DD as local date to avoid UTC→local shift */
function parseLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function useResumenProveedor(branchId?: string, proveedorId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['resumen-proveedor', branchId, proveedorId],
    queryFn: async () => {
      // Get all invoices
      const { data: facturas, error: fErr } = await supabase
        .from('facturas_proveedores')
        .select('id, total, saldo_pendiente, estado_pago, fecha_vencimiento')
        .eq('branch_id', branchId!)
        .eq('proveedor_id', proveedorId!)
        .is('deleted_at', null);
      if (fErr) throw fErr;

      // Get all payments
      const { data: pagos, error: pErr } = await supabase
        .from('pagos_proveedores')
        .select('id, monto, verificado')
        .eq('branch_id', branchId!)
        .eq('proveedor_id', proveedorId!)
        .is('deleted_at', null);
      if (pErr) throw pErr;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let total_facturado = 0;
      let monto_vencido = 0;
      let monto_por_vencer = 0;
      let facturas_vencidas = 0;
      let proximo_vencimiento: string | null = null;
      let facturas_pendientes = 0;
      let saldo_a_favor_facturas = 0;

      for (const f of facturas || []) {
        total_facturado += Number(f.total);
        const sp = Number(f.saldo_pendiente);
        if (sp < 0) {
          saldo_a_favor_facturas += Math.abs(sp);
        }
        if (f.estado_pago === 'pendiente') {
          facturas_pendientes++;
          const venc = f.fecha_vencimiento ? parseLocalDate(f.fecha_vencimiento) : null;
          if (venc && venc < today) {
            monto_vencido += Number(f.saldo_pendiente);
            facturas_vencidas++;
          } else {
            monto_por_vencer += Number(f.saldo_pendiente);
            if (f.fecha_vencimiento) {
              if (!proximo_vencimiento || f.fecha_vencimiento < proximo_vencimiento) {
                proximo_vencimiento = f.fecha_vencimiento;
              }
            }
          }
        }
      }

      let total_pagado = 0;
      let total_pagado_verificado = 0;
      let total_pagado_pendiente_verif = 0;
      let pagos_pendientes_verif = 0;

      for (const p of pagos || []) {
        const m = Number(p.monto);
        total_pagado += m;
        if (p.verificado) {
          total_pagado_verificado += m;
        } else {
          total_pagado_pendiente_verif += m;
          pagos_pendientes_verif++;
        }
      }

      const saldo_actual = total_facturado - total_pagado;

      const resumen: ResumenCuenta = {
        total_facturado,
        total_pagado,
        total_pagado_verificado,
        total_pagado_pendiente_verif,
        pagos_pendientes_verif,
        saldo_actual,
        saldo_a_favor_facturas,
        monto_vencido,
        facturas_vencidas,
        monto_por_vencer,
        proximo_vencimiento,
        todas_vencidas: facturas_pendientes > 0 && facturas_vencidas === facturas_pendientes,
      };

      return resumen;
    },
    enabled: !!user && !!branchId && !!proveedorId,
  });
}

/** @deprecated Use useResumenProveedor instead for summary data */
export function useSaldoProveedor(branchId?: string, proveedorId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['saldo-proveedor', branchId, proveedorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cuenta_corriente_proveedores')
        .select('*')
        .eq('proveedor_id', proveedorId!)
        .eq('branch_id', branchId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!branchId && !!proveedorId,
  });
}

export function useMovimientosProveedor(branchId?: string, proveedorId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['movimientos-proveedor', branchId, proveedorId],
    queryFn: async () => {
      // Get facturas
      const { data: facturas, error: fErr } = await supabase
        .from('facturas_proveedores')
        .select(
          'id, factura_fecha, factura_tipo, factura_numero, total, saldo_pendiente, estado_pago, fecha_vencimiento, items_factura(id)',
        )
        .eq('branch_id', branchId!)
        .eq('proveedor_id', proveedorId!)
        .is('deleted_at', null)
        .order('factura_fecha', { ascending: true });
      if (fErr) throw fErr;

      // Get pagos (both invoice-linked and account-level)
      const { data: pagos, error: pErr } = await supabase
        .from('pagos_proveedores')
        .select('id, fecha_pago, monto, medio_pago, referencia, factura_id, verificado')
        .eq('branch_id', branchId!)
        .eq('proveedor_id', proveedorId!)
        .is('deleted_at', null)
        .order('fecha_pago', { ascending: true });
      if (pErr) throw pErr;

      // Merge and sort chronologically, compute running balance
      const movimientos: MovimientoCuenta[] = [];

      for (const f of facturas || []) {
        movimientos.push({
          id: f.id,
          fecha: f.factura_fecha,
          tipo: 'factura',
          factura_numero: `${f.factura_tipo ? f.factura_tipo + '-' : ''}${f.factura_numero}`,
          monto: Number(f.total),
          estado: f.estado_pago ?? undefined,
          fecha_vencimiento: f.fecha_vencimiento ?? undefined,
          items_count: f.items_factura?.length || 0,
          saldo_acumulado: 0,
        });
      }

      for (const p of pagos || []) {
        movimientos.push({
          id: p.id,
          fecha: p.fecha_pago,
          tipo: 'pago',
          medio_pago: p.medio_pago ?? undefined,
          referencia: !p.factura_id ? 'Pago a cuenta' : (p.referencia ?? undefined),
          monto: Number(p.monto),
          saldo_acumulado: 0,
          verificado: p.verificado ?? true,
        });
      }

      // Sort by date asc, facturas first on same date
      movimientos.sort((a, b) => {
        const d = a.fecha.localeCompare(b.fecha);
        if (d !== 0) return d;
        return a.tipo === 'factura' ? -1 : 1;
      });

      // Compute running balance
      let saldo = 0;
      for (const m of movimientos) {
        saldo += m.tipo === 'factura' ? m.monto : -m.monto;
        m.saldo_acumulado = saldo;
      }

      // Return in reverse chronological order for display
      return movimientos.reverse();
    },
    enabled: !!user && !!branchId && !!proveedorId,
  });
}
