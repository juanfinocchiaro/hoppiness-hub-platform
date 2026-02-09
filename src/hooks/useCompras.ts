import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { CompraFormData, PagoProveedorFormData } from '@/types/compra';

export function useCompras(branchId: string, periodo?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['compras', branchId, periodo],
    queryFn: async () => {
      let q = supabase
        .from('compras')
        .select('*, proveedores!compras_proveedor_id_fkey(razon_social), insumos!compras_insumo_id_fkey(nombre)')
        .eq('branch_id', branchId)
        .is('deleted_at', null)
        .order('fecha', { ascending: false });

      if (periodo) q = q.eq('periodo', periodo);

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!branchId,
  });
}

export function useCompraMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const create = useMutation({
    mutationFn: async (data: CompraFormData) => {
      const subtotal = data.cantidad * data.precio_unitario;
      const estadoPago = data.condicion_pago === 'contado' ? 'pagado' : 'pendiente';
      const insertData: Record<string, unknown> = {
        branch_id: data.branch_id,
        proveedor_id: data.proveedor_id,
        insumo_id: data.insumo_id,
        cantidad: data.cantidad,
        unidad: data.unidad,
        precio_unitario: data.precio_unitario,
        subtotal,
        fecha: data.fecha,
        periodo: data.periodo,
        tipo_compra: data.tipo_compra || 'regular',
        condicion_pago: data.condicion_pago,
        medio_pago: data.medio_pago,
        factura_tipo: data.factura_tipo,
        factura_numero: data.factura_numero,
        categoria_pl: data.categoria_pl,
        afecta_costo_base: data.afecta_costo_base,
        motivo_extraordinaria: data.motivo_extraordinaria,
        observaciones: data.observaciones,
        saldo_pendiente: estadoPago === 'pagado' ? 0 : subtotal,
        estado_pago: estadoPago,
        created_by: user?.id,
      };
      const { data: result, error } = await supabase
        .from('compras')
        .insert(insertData as any)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compras'] });
      toast.success('Compra registrada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('compras')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compras'] });
      toast.success('Compra eliminada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create, softDelete };
}

export function usePagosProveedor(compraId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pagos-proveedor', compraId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pagos_proveedores')
        .select('*')
        .eq('compra_id', compraId)
        .is('deleted_at', null)
        .order('fecha_pago', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!compraId,
  });
}

export function usePagoProveedorMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const create = useMutation({
    mutationFn: async (data: PagoProveedorFormData) => {
      const { data: result, error } = await supabase
        .from('pagos_proveedores')
        .insert({
          compra_id: data.compra_id,
          proveedor_id: data.proveedor_id,
          branch_id: data.branch_id,
          monto: data.monto,
          fecha_pago: data.fecha_pago,
          medio_pago: data.medio_pago,
          referencia: data.referencia,
          observaciones: data.observaciones,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['pagos-proveedor', vars.compra_id] });
      qc.invalidateQueries({ queryKey: ['compras'] });
      toast.success('Pago registrado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create };
}
