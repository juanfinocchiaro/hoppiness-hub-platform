import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ReconciliationSummary {
  totalConciliado: number;
  totalManual: number;
  pagosConciliados: number;
  pagosManual: number;
  byMetodo: Record<string, { conciliado: number; manual: number }>;
}

/**
 * Fetches reconciliation summary for a branch within a date range.
 * Compares auto-conciliated payments (from webhook) vs manually registered ones.
 */
export function usePointReconciliation(
  branchId: string | undefined,
  desde: string | null,
  hasta: string | null,
) {
  return useQuery({
    queryKey: ['point-reconciliation', branchId, desde, hasta],
    queryFn: async () => {
      let query = supabase
        .from('pedido_pagos')
        .select('metodo, monto, conciliado, mp_payment_id, pedidos!inner(branch_id)')
        .eq('pedidos.branch_id', branchId!);

      if (desde) query = query.gte('created_at', desde);
      if (hasta) query = query.lte('created_at', hasta);

      const { data, error } = await (query as any);
      if (error) throw error;

      const summary: ReconciliationSummary = {
        totalConciliado: 0,
        totalManual: 0,
        pagosConciliados: 0,
        pagosManual: 0,
        byMetodo: {},
      };

      for (const pago of data ?? []) {
        const metodo = pago.metodo as string;
        const monto = Number(pago.monto);
        const isConciliado = pago.conciliado === true;

        if (!summary.byMetodo[metodo]) {
          summary.byMetodo[metodo] = { conciliado: 0, manual: 0 };
        }

        if (isConciliado) {
          summary.totalConciliado += monto;
          summary.pagosConciliados++;
          summary.byMetodo[metodo].conciliado += monto;
        } else {
          summary.totalManual += monto;
          summary.pagosManual++;
          summary.byMetodo[metodo].manual += monto;
        }
      }

      return summary;
    },
    enabled: !!branchId,
  });
}
