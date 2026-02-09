import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { ProveedorFormData } from '@/types/financial';

export function useProveedores(branchId?: string) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['proveedores', branchId],
    queryFn: async () => {
      let q = supabase
        .from('proveedores')
        .select('*')
        .is('deleted_at', null)
        .order('razon_social');

      // If branchId provided, show marca-level + that branch's local proveedores
      if (branchId) {
        q = q.or(`ambito.eq.marca,branch_id.eq.${branchId}`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return query;
}

export function useProveedorMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const create = useMutation({
    mutationFn: async (data: ProveedorFormData) => {
      const { data: result, error } = await supabase
        .from('proveedores')
        .insert({
          ...data,
          medios_pago_aceptados: data.medios_pago_aceptados || null,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proveedores'] });
      toast.success('Proveedor creado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProveedorFormData> }) => {
      const { error } = await supabase
        .from('proveedores')
        .update({
          ...data,
          medios_pago_aceptados: data.medios_pago_aceptados || undefined,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proveedores'] });
      toast.success('Proveedor actualizado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('proveedores')
        .update({ deleted_at: new Date().toISOString(), activo: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proveedores'] });
      toast.success('Proveedor eliminado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create, update, softDelete };
}
