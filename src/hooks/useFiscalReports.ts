import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { FiscalXData, FiscalZData, FiscalAuditData, FiscalReportBranchData } from '@/lib/escpos';

export function useFiscalBranchData(branchId: string | undefined) {
  return useQuery({
    queryKey: ['fiscal-branch-data', branchId],
    queryFn: async (): Promise<FiscalReportBranchData | null> => {
      if (!branchId) return null;
      const [branchRes, afipRes] = await Promise.all([
        supabase.from('branches').select('name, address').eq('id', branchId).single(),
        supabase.from('afip_config').select('cuit, punto_venta, direccion_fiscal').eq('branch_id', branchId).single(),
      ]);
      if (!branchRes.data || !afipRes.data) return null;
      return {
        name: branchRes.data.name,
        cuit: afipRes.data.cuit || '',
        address: afipRes.data.direccion_fiscal || branchRes.data.address || '',
        punto_venta: afipRes.data.punto_venta || 0,
      };
    },
    enabled: !!branchId,
  });
}

export function useFiscalXReport(branchId: string | undefined) {
  return useMutation({
    mutationFn: async (date?: string): Promise<FiscalXData> => {
      const { data, error } = await (supabase.rpc as any)('get_fiscal_x_report', {
        p_branch_id: branchId!,
        p_date: date || new Date().toISOString().slice(0, 10),
      });
      if (error) throw new Error(error.message);
      return data as unknown as FiscalXData;
    },
  });
}

export function useGenerateZClosing(branchId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (date?: string): Promise<FiscalZData> => {
      const { data, error } = await (supabase.rpc as any)('generate_z_closing', {
        p_branch_id: branchId!,
        p_date: date || new Date().toISOString().slice(0, 10),
      });
      if (error) throw new Error(error.message);
      return data as unknown as FiscalZData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-z-closings', branchId] });
      queryClient.invalidateQueries({ queryKey: ['fiscal-last-z', branchId] });
    },
  });
}

export function useLastZClosing(branchId: string | undefined) {
  return useQuery({
    queryKey: ['fiscal-last-z', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fiscal_z_closings' as any)
        .select('*')
        .eq('branch_id', branchId!)
        .order('z_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as FiscalZData | null;
    },
    enabled: !!branchId,
  });
}

export function useZClosings(branchId: string | undefined) {
  return useQuery({
    queryKey: ['fiscal-z-closings', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fiscal_z_closings' as any)
        .select('*')
        .eq('branch_id', branchId!)
        .order('z_number', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as unknown as FiscalZData[];
    },
    enabled: !!branchId,
  });
}

export function useFiscalAuditReport(branchId: string | undefined) {
  return useMutation({
    mutationFn: async (params: {
      mode: 'date' | 'z';
      fromDate?: string;
      toDate?: string;
      fromZ?: number;
      toZ?: number;
    }): Promise<FiscalAuditData> => {
      const { data, error } = await (supabase.rpc as any)('get_fiscal_audit_report', {
        p_branch_id: branchId!,
        p_from_date: params.mode === 'date' ? params.fromDate : null,
        p_to_date: params.mode === 'date' ? params.toDate : null,
        p_from_z: params.mode === 'z' ? params.fromZ : null,
        p_to_z: params.mode === 'z' ? params.toZ : null,
      });
      if (error) throw new Error(error.message);
      return data as unknown as FiscalAuditData;
    },
  });
}
