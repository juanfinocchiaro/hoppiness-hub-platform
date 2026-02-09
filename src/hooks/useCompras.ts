import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { FacturaFormData, PagoProveedorFormData } from '@/types/compra';

export function useFacturas(branchId: string, periodo?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['facturas', branchId, periodo],
    queryFn: async () => {
      let q = supabase
        .from('facturas_proveedores')
        .select('*, proveedores(razon_social), items_factura(*)')
        .eq('branch_id', branchId)
        .is('deleted_at', null)
        .order('factura_fecha', { ascending: false });

      if (periodo) q = q.eq('periodo', periodo);

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!branchId,
  });
}

export function useFacturaMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const create = useMutation({
    mutationFn: async (data: FacturaFormData) => {
      // 1. Create factura header
      const subtotalItems = data.items.reduce((s, i) => s + i.subtotal, 0);
      const total = subtotalItems + (data.iva || 0) + (data.otros_impuestos || 0);
      const estadoPago = data.condicion_pago === 'contado' ? 'pagado' : 'pendiente';

      const { data: factura, error: fErr } = await supabase
        .from('facturas_proveedores')
        .insert({
          branch_id: data.branch_id,
          proveedor_id: data.proveedor_id,
          factura_tipo: data.factura_tipo || null,
          factura_numero: data.factura_numero,
          factura_fecha: data.factura_fecha,
          subtotal: subtotalItems,
          iva: data.iva || 0,
          otros_impuestos: data.otros_impuestos || 0,
          total,
          condicion_pago: data.condicion_pago,
          fecha_vencimiento: data.fecha_vencimiento || null,
          estado_pago: estadoPago,
          saldo_pendiente: estadoPago === 'pagado' ? 0 : total,
          tipo: data.tipo || 'normal',
          motivo_extraordinaria: data.motivo_extraordinaria || null,
          periodo: data.periodo,
          observaciones: data.observaciones || null,
          created_by: user?.id,
        })
        .select()
        .single();
      if (fErr) throw fErr;

      // 2. Create items
      if (data.items.length > 0) {
        const itemsToInsert = data.items.map((item: any) => ({
          factura_id: factura.id,
          tipo_item: item.tipo_item || 'insumo',
          insumo_id: item.tipo_item === 'servicio' ? null : (item.insumo_id || null),
          concepto_servicio_id: item.tipo_item === 'servicio' ? item.concepto_servicio_id : null,
          cantidad: item.tipo_item === 'servicio' ? 1 : item.cantidad,
          unidad: item.tipo_item === 'servicio' ? null : (item.unidad || null),
          precio_unitario: item.precio_unitario,
          subtotal: item.subtotal,
          afecta_costo_base: item.afecta_costo_base ?? true,
          categoria_pl: item.categoria_pl || null,
        }));

        const { error: iErr } = await supabase
          .from('items_factura')
          .insert(itemsToInsert);
        if (iErr) throw iErr;
      }

      return factura;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facturas'] });
      qc.invalidateQueries({ queryKey: ['cuenta-corriente'] });
      toast.success('Factura registrada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('facturas_proveedores')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facturas'] });
      toast.success('Factura eliminada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create, softDelete };
}

export function usePagosProveedor(facturaId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pagos-proveedor', facturaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pagos_proveedores')
        .select('*')
        .eq('factura_id', facturaId)
        .is('deleted_at', null)
        .order('fecha_pago', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!facturaId,
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
          factura_id: data.factura_id,
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
      qc.invalidateQueries({ queryKey: ['pagos-proveedor', vars.factura_id] });
      qc.invalidateQueries({ queryKey: ['facturas'] });
      toast.success('Pago registrado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create };
}
