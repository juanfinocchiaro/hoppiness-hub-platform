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
        .select('id, factura_fecha, factura_tipo, factura_numero, total, saldo_pendiente, estado_pago, fecha_vencimiento, items_factura(id)')
        .eq('branch_id', branchId!)
        .eq('proveedor_id', proveedorId!)
        .is('deleted_at', null)
        .order('factura_fecha', { ascending: true });
      if (fErr) throw fErr;

      // Get pagos
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
          referencia: p.referencia ?? undefined,
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
