import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface CondicionesLocal {
  id: string;
  proveedor_id: string;
  branch_id: string;
  permite_cuenta_corriente: boolean;
  dias_pago_habitual: number | null;
  descuento_pago_contado: number | null;
  observaciones: string | null;
}

export interface CondicionesFormData {
  permite_cuenta_corriente: boolean;
  dias_pago_habitual?: number | null;
  descuento_pago_contado?: number | null;
  observaciones?: string | null;
}

/** Fetch all condiciones for a branch (keyed by proveedor_id) */
export function useCondicionesByBranch(branchId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['proveedor-condiciones', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proveedor_condiciones_local')
        .select('*')
        .eq('branch_id', branchId!);
      if (error) throw error;
      const map: Record<string, CondicionesLocal> = {};
      data?.forEach((r: any) => {
        map[r.proveedor_id] = r;
      });
      return map;
    },
    enabled: !!user && !!branchId,
  });
}

/** Fetch condiciones for a single proveedor+branch */
export function useCondicionesProveedor(branchId?: string, proveedorId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['proveedor-condiciones', branchId, proveedorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proveedor_condiciones_local')
        .select('*')
        .eq('branch_id', branchId!)
        .eq('proveedor_id', proveedorId!)
        .maybeSingle();
      if (error) throw error;
      return data as CondicionesLocal | null;
    },
    enabled: !!user && !!branchId && !!proveedorId,
  });
}

export function useCondicionesMutations() {
  const qc = useQueryClient();

  const upsert = useMutation({
    mutationFn: async ({
      proveedorId,
      branchId,
      data,
    }: {
      proveedorId: string;
      branchId: string;
      data: CondicionesFormData;
    }) => {
      const { error } = await supabase.from('proveedor_condiciones_local').upsert(
        {
          proveedor_id: proveedorId,
          branch_id: branchId,
          permite_cuenta_corriente: data.permite_cuenta_corriente,
          dias_pago_habitual: data.dias_pago_habitual ?? null,
          descuento_pago_contado: data.descuento_pago_contado ?? null,
          observaciones: data.observaciones ?? null,
        },
        { onConflict: 'proveedor_id,branch_id' },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proveedor-condiciones'] });
      toast.success('Condiciones guardadas');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { upsert };
}
