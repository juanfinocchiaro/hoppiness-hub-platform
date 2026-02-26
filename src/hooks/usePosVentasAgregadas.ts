import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface VentasAgregadas {
  fc: number; // online / digital
  ft: number; // efectivo
  total: number;
}

/**
 * Agrega ventas del POS (pedidos + pedido_pagos) para un branch y periodo.
 * Solo se activa cuando posEnabled = true.
 */
export function usePosVentasAgregadas(branchId: string, periodo: string, enabled: boolean = false) {
  const { user } = useAuth();

  return useQuery<VentasAgregadas>({
    queryKey: ['pos-ventas-agregadas', branchId, periodo],
    queryFn: async () => {
      // periodo is "YYYY-MM", build date range
      const [year, month] = periodo.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 1).toISOString();

      // Get all completed/delivered orders for the branch in this period
      const { data: pedidos, error: pedidosError } = await supabase
        .from('pedidos')
        .select('id, total')
        .eq('branch_id', branchId)
        .in('estado', ['entregado', 'listo'])
        .gte('created_at', startDate)
        .lt('created_at', endDate);

      if (pedidosError) throw pedidosError;
      if (!pedidos || pedidos.length === 0) {
        return { fc: 0, ft: 0, total: 0 };
      }

      const ventaTotal = pedidos.reduce((sum, p) => sum + Number(p.total || 0), 0);

      // Get cash payments for these orders
      const pedidoIds = pedidos.map((p) => p.id);

      // Query in batches of 100 to avoid URL length limits
      let totalEfectivo = 0;
      for (let i = 0; i < pedidoIds.length; i += 100) {
        const batch = pedidoIds.slice(i, i + 100);
        const { data: pagos, error: pagosError } = await supabase
          .from('pedido_pagos')
          .select('monto, metodo')
          .in('pedido_id', batch)
          .eq('metodo', 'efectivo');

        if (pagosError) throw pagosError;
        totalEfectivo += (pagos || []).reduce((sum, p) => sum + Number(p.monto || 0), 0);
      }

      return {
        fc: ventaTotal - totalEfectivo,
        ft: totalEfectivo,
        total: ventaTotal,
      };
    },
    enabled: !!user && !!branchId && !!periodo && enabled,
  });
}
