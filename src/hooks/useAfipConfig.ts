import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ReglasFacturacion {
  canales_internos: {
    efectivo: boolean;
    debito: boolean;
    credito: boolean;
    qr: boolean;
    transferencia: boolean;
  };
  canales_externos: {
    rappi: boolean;
    pedidosya: boolean;
    mas_delivery_efectivo: boolean;
    mas_delivery_digital: boolean;
    mp_delivery: boolean;
  };
}

export const DEFAULT_REGLAS_FACTURACION: ReglasFacturacion = {
  canales_internos: {
    efectivo: false,
    debito: true,
    credito: true,
    qr: true,
    transferencia: true,
  },
  canales_externos: {
    rappi: true,
    pedidosya: true,
    mas_delivery_efectivo: false,
    mas_delivery_digital: true,
    mp_delivery: true,
  },
};

export interface AfipConfig {
  id: string;
  branch_id: string;
  cuit: string | null;
  razon_social: string | null;
  direccion_fiscal: string | null;
  inicio_actividades: string | null;
  punto_venta: number | null;
  certificado_crt: string | null;
  clave_privada_enc: string | null;
  estado_conexion: string;
  ultimo_error: string | null;
  ultima_verificacion: string | null;
  ultimo_nro_factura_a: number;
  ultimo_nro_factura_b: number;
  ultimo_nro_factura_c: number;
  es_produccion: boolean;
  estado_certificado: string;
  csr_pem: string | null;
  reglas_facturacion: ReglasFacturacion;
  created_at: string;
  updated_at: string;
}

export function useAfipConfig(branchId: string | undefined) {
  return useQuery({
    queryKey: ['afip-config', branchId],
    queryFn: async () => {
      if (!branchId) return null;
      const { data, error } = await (supabase
        .from('afip_config' as any)
        .select('*')
        .eq('branch_id', branchId)
        .maybeSingle() as any);
      if (error) throw error;
      return (data as AfipConfig | null);
    },
    enabled: !!branchId,
  });
}

interface SaveAfipConfigInput {
  branch_id: string;
  cuit?: string;
  razon_social?: string;
  direccion_fiscal?: string;
  inicio_actividades?: string;
  punto_venta?: number;
  certificado_crt?: string;
  clave_privada_enc?: string;
  es_produccion?: boolean;
}

export function useAfipConfigMutations(branchId: string | undefined) {
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: async (input: SaveAfipConfigInput) => {
      const { data: existing } = await (supabase
        .from('afip_config' as any)
        .select('id')
        .eq('branch_id', input.branch_id)
        .maybeSingle() as any);

      if (existing) {
        const { error } = await (supabase
          .from('afip_config' as any)
          .update(input)
          .eq('branch_id', input.branch_id) as any);
        if (error) throw error;
      } else {
        const { error } = await (supabase
          .from('afip_config' as any)
          .insert(input) as any);
        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['afip-config', variables.branch_id] });
      toast.success('Configuración ARCA guardada');
    },
    onError: (err: Error) => {
      toast.error(`Error al guardar: ${err.message}`);
    },
  });

  const saveKeyAndCSR = useMutation({
    mutationFn: async (input: { branch_id: string; privateKeyPem: string; csrPem: string }) => {
      const payload = {
        branch_id: input.branch_id,
        clave_privada_enc: btoa(input.privateKeyPem),
        csr_pem: input.csrPem,
        estado_certificado: 'csr_generado',
      };

      const { data: existing } = await (supabase
        .from('afip_config' as any)
        .select('id')
        .eq('branch_id', input.branch_id)
        .maybeSingle() as any);

      if (existing) {
        const { error } = await (supabase
          .from('afip_config' as any)
          .update(payload)
          .eq('branch_id', input.branch_id) as any);
        if (error) throw error;
      } else {
        const { error } = await (supabase
          .from('afip_config' as any)
          .insert(payload) as any);
        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['afip-config', variables.branch_id] });
      toast.success('Clave privada y solicitud generadas correctamente');
    },
    onError: (err: Error) => {
      toast.error(`Error al guardar certificado: ${err.message}`);
    },
  });

  const saveCertificate = useMutation({
    mutationFn: async (input: { branch_id: string; certificado_crt: string }) => {
      const { error } = await (supabase
        .from('afip_config' as any)
        .update({
          certificado_crt: input.certificado_crt,
          estado_certificado: 'certificado_subido',
        })
        .eq('branch_id', input.branch_id) as any);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['afip-config', variables.branch_id] });
    },
    onError: (err: Error) => {
      toast.error(`Error al guardar certificado: ${err.message}`);
    },
  });

  const testConnection = useMutation({
    mutationFn: async () => {
      if (!branchId) throw new Error('Branch ID requerido');
      const { data, error } = await supabase.functions.invoke('probar-conexion-afip', {
        body: { branch_id: branchId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['afip-config', branchId] });
      if (data?.success) {
        toast.success(data.mensaje || 'Conexión exitosa');
      } else {
        toast.warning(data?.mensaje || 'No se pudo conectar');
      }
    },
    onError: (err: Error) => {
      toast.error(`Error al probar conexión: ${err.message}`);
    },
  });

  return { save, saveKeyAndCSR, saveCertificate, testConnection };
}

interface EmitirFacturaInput {
  branch_id: string;
  pedido_id?: string;
  tipo_factura: 'A' | 'B';
  receptor_cuit?: string;
  receptor_razon_social?: string;
  receptor_condicion_iva?: string;
  items: { descripcion: string; cantidad: number; precio_unitario: number }[];
  total: number;
}

export function useEmitirFactura() {
  return useMutation({
    mutationFn: async (input: EmitirFacturaInput) => {
      const { data, error } = await supabase.functions.invoke('emitir-factura', {
        body: input,
      });
      if (error) {
        const bodyError = (data as Record<string, unknown> | null)?.error;
        if (typeof bodyError === 'string') {
          throw new Error(bodyError);
        }
        throw error;
      }
      if (data?.error) {
        throw new Error(data.error);
      }
      return data;
    },
    onSuccess: (data) => {
      if (data?.simulado) {
        toast.success(`Factura ${data.tipo} simulada: ${data.numero} (homologación)`);
      } else {
        toast.success(`Factura ${data.tipo} emitida: CAE ${data.cae}`);
      }
    },
    onError: (err: Error) => {
      toast.error(`Error al emitir factura: ${err.message}`);
    },
  });
}
