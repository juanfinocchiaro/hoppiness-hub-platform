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
        .select('*, proveedores(razon_social), items_factura(*, insumos(nombre), conceptos_servicio(nombre))')
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

export function useFacturaById(facturaId?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['factura', facturaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('facturas_proveedores')
        .select('*')
        .eq('id', facturaId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!facturaId,
  });
}

export function useFacturaMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const create = useMutation({
    mutationFn: async (data: FacturaFormData & {
      subtotal_bruto?: number;
      total_descuentos?: number;
      subtotal_neto?: number;
      imp_internos?: number;
      iva_21?: number;
      iva_105?: number;
      perc_iva?: number;
      perc_provincial?: number;
      perc_municipal?: number;
      total_factura?: number;
    }) => {
      const subtotalItems = data.items.reduce((s, i) => s + i.subtotal, 0);
      const total = (data.total_factura != null) ? data.total_factura : subtotalItems + (data.iva || 0) + (data.otros_impuestos || 0);
      const estadoPago = data.condicion_pago === 'contado' ? 'pagado' : 'pendiente';

      // Build factura JSON for the transactional RPC
      const facturaPayload = {
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
        created_by: user?.id || null,
        subtotal_bruto: data.subtotal_bruto ?? null,
        total_descuentos: data.total_descuentos ?? 0,
        subtotal_neto: data.subtotal_neto ?? null,
        imp_internos: data.imp_internos ?? 0,
        iva_21: data.iva_21 ?? 0,
        iva_105: data.iva_105 ?? 0,
        perc_iva: data.perc_iva ?? 0,
        perc_provincial: data.perc_provincial ?? 0,
        perc_municipal: data.perc_municipal ?? 0,
        total_factura: data.total_factura ?? null,
      };

      const itemsPayload = data.items.map((item: any) => ({
        tipo_item: item.tipo_item || 'insumo',
        insumo_id: item.tipo_item === 'servicio' ? null : (item.insumo_id || null),
        concepto_servicio_id: item.tipo_item === 'servicio' ? item.concepto_servicio_id : null,
        cantidad: item.tipo_item === 'servicio' ? 1 : item.cantidad,
        unidad: item.tipo_item === 'servicio' ? null : (item.unidad || null),
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal,
        afecta_costo_base: item.afecta_costo_base ?? true,
        categoria_pl: item.categoria_pl || null,
        alicuota_iva: item.alicuota_iva ?? null,
        iva_monto: item.iva_monto ?? null,
        precio_unitario_bruto: item.precio_unitario_bruto ?? null,
      }));

      // Single atomic call — if items fail, the factura is rolled back too
      const { data: facturaId, error } = await supabase.rpc('insert_factura_completa', {
        p_factura: facturaPayload,
        p_items: itemsPayload,
      });

      if (error) throw error;
      return { id: facturaId };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facturas'] });
      qc.invalidateQueries({ queryKey: ['cuenta-corriente'] });
      toast.success('Factura registrada');
    },
    onError: (e) => toast.error(`Error al registrar factura: ${e.message}`),
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
      // Fetch pagos linked to this factura via the junction table
      const { data, error } = await supabase
        .from('pago_factura')
        .select('monto_aplicado, pagos_proveedores(*)')
        .eq('factura_id', facturaId);

      if (error) {
        // Fallback: try legacy query with direct factura_id column
        const { data: legacyData, error: legacyErr } = await supabase
          .from('pagos_proveedores')
          .select('*')
          .eq('factura_id', facturaId)
          .is('deleted_at', null)
          .order('fecha_pago', { ascending: false });
        if (legacyErr) throw legacyErr;
        return legacyData;
      }

      return (data || []).map(row => ({
        ...row.pagos_proveedores,
        monto_aplicado: row.monto_aplicado,
      }));
    },
    enabled: !!user && !!facturaId,
  });
}

export function usePagoProveedorMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const create = useMutation({
    mutationFn: async (data: PagoProveedorFormData) => {
      // 1. Insert the payment
      const { data: pago, error: pagoErr } = await supabase
        .from('pagos_proveedores')
        .insert({
          proveedor_id: data.proveedor_id,
          branch_id: data.branch_id,
          monto: data.monto,
          fecha_pago: data.fecha_pago,
          medio_pago: data.medio_pago,
          referencia: data.referencia || null,
          fecha_vencimiento_pago: data.fecha_vencimiento_pago || null,
          observaciones: data.observaciones || null,
          created_by: user?.id,
        } as any)
        .select()
        .single();
      if (pagoErr) throw pagoErr;

      // 2. Link payment to invoices via pago_factura junction
      if (data.aplicaciones && data.aplicaciones.length > 0) {
        const junctionRows = data.aplicaciones.map(app => ({
          pago_id: pago.id,
          factura_id: app.factura_id,
          monto_aplicado: app.monto_aplicado,
        }));

        const { error: junctionErr } = await supabase
          .from('pago_factura')
          .insert(junctionRows);
        if (junctionErr) throw junctionErr;

        // 3. Update saldo_pendiente on each affected invoice
        for (const app of data.aplicaciones) {
          const { data: factura, error: facturaErr } = await supabase
            .from('facturas_proveedores')
            .select('saldo_pendiente')
            .eq('id', app.factura_id)
            .single();

          if (facturaErr) throw facturaErr;

          const nuevoSaldo = Math.max(0, (factura.saldo_pendiente || 0) - app.monto_aplicado);
          const { error: updateErr } = await supabase
            .from('facturas_proveedores')
            .update({
              saldo_pendiente: nuevoSaldo,
              estado_pago: nuevoSaldo === 0 ? 'pagado' : 'parcial',
            })
            .eq('id', app.factura_id);

          if (updateErr) throw updateErr;
        }
      }

      return pago;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pagos-proveedor'] });
      qc.invalidateQueries({ queryKey: ['facturas'] });
      qc.invalidateQueries({ queryKey: ['movimientos-proveedor'] });
      qc.invalidateQueries({ queryKey: ['saldo-proveedor'] });
      qc.invalidateQueries({ queryKey: ['resumen-proveedor'] });
      qc.invalidateQueries({ queryKey: ['cuenta-corriente'] });
      toast.success('Pago registrado');
    },
    onError: (e) => toast.error(`Error al registrar pago: ${e.message}`),
  });

  const softDeletePago = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pagos_proveedores')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pagos-proveedor'] });
      qc.invalidateQueries({ queryKey: ['facturas'] });
      qc.invalidateQueries({ queryKey: ['movimientos-proveedor'] });
      qc.invalidateQueries({ queryKey: ['saldo-proveedor'] });
      qc.invalidateQueries({ queryKey: ['resumen-proveedor'] });
      toast.success('Pago eliminado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create, softDeletePago };
}
