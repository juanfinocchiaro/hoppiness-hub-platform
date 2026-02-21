import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface RdoFinancieroData {
  ingresos: {
    por_metodo: Record<string, number>;
    total: number;
    aportes_socios: number;
  };
  egresos: {
    proveedores: number;
    gastos_por_categoria: Record<string, number>;
    gastos_total: number;
    adelantos_sueldo: number;
    retiros_socios: number;
    inversiones_capex: number;
  };
  resultado_financiero: number;
  flujo_neto: number;
}

export function useRdoFinanciero(branchId: string, periodo: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['rdo-financiero', branchId, periodo],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_rdo_financiero', {
        _branch_id: branchId,
        _periodo: periodo,
      });
      if (error) throw error;
      return data as unknown as RdoFinancieroData;
    },
    enabled: !!user && !!branchId && !!periodo,
  });
}
