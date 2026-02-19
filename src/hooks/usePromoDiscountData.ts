import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface PromoDiscountSummary {
  ventaTeorica: number;
  ventaReal: number;
  descuentoTotal: number;
  pedidosConPromo: number;
  pedidosTotales: number;
  descuentoPromedio: number;
}

/**
 * Calcula el descuento de promociones (precio_referencia > precio_unitario)
 * para un branch y período dado, desde pedido_items.
 */
export function usePromoDiscountData(branchId: string, periodo: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['promo-discount', branchId, periodo],
    queryFn: async () => {
      // periodo is "YYYY-MM", build date range
      const [year, month] = periodo.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 1).toISOString();

      // Get all items from orders in this branch/period
      const { data: items, error } = await supabase
        .from('pedido_items')
        .select('precio_unitario, precio_referencia, cantidad, subtotal, pedido_id, pedidos!inner(branch_id, created_at)')
        .gte('pedidos.created_at', startDate)
        .lt('pedidos.created_at', endDate)
        .eq('pedidos.branch_id', branchId);

      if (error) throw error;

      const allItems = items || [];
      let ventaTeorica = 0;
      let ventaReal = 0;
      let descuentoTotal = 0;
      const pedidoIdsConPromo = new Set<string>();
      const pedidoIds = new Set<string>();

      for (const item of allItems) {
        const qty = Number(item.cantidad) || 0;
        const precioUnit = Number(item.precio_unitario) || 0;
        const precioRef = Number(item.precio_referencia) || 0;
        const sub = Number(item.subtotal) || 0;

        pedidoIds.add(item.pedido_id);

        if (precioRef > precioUnit) {
          ventaTeorica += precioRef * qty;
          ventaReal += sub;
          descuentoTotal += (precioRef - precioUnit) * qty;
          pedidoIdsConPromo.add(item.pedido_id);
        } else {
          ventaTeorica += sub;
          ventaReal += sub;
        }
      }

      const pedidosConPromo = pedidoIdsConPromo.size;
      const pedidosTotales = pedidoIds.size;

      return {
        ventaTeorica,
        ventaReal,
        descuentoTotal,
        pedidosConPromo,
        pedidosTotales,
        descuentoPromedio: pedidosConPromo > 0 ? descuentoTotal / pedidosConPromo : 0,
      } as PromoDiscountSummary;
    },
    enabled: !!user && !!branchId && !!periodo,
  });
}
