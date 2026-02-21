import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface MercadoPagoConfig {
  id: string;
  branch_id: string;
  access_token: string;
  public_key: string;
  estado_conexion: 'conectado' | 'desconectado' | 'error';
  webhook_secret: string | null;
  collector_id: string | null;
  ultimo_test: string | null;
  ultimo_test_ok: boolean | null;
}

/**
 * Reads MP config for authenticated users (admin panel).
 * For public pages use `useMercadoPagoStatus` instead.
 */
export function useMercadoPagoConfig(branchId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['mp-config', branchId],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)('mercadopago_config')
        .select('*')
        .eq('branch_id', branchId!)
        .maybeSingle();
      if (error) throw error;
      return data as MercadoPagoConfig | null;
    },
    enabled: !!user && !!branchId,
  });
}

/**
 * Lightweight public query — only checks if MP is connected for a branch.
 * Does not require authentication. Only reads `estado_conexion`.
 */
export function useMercadoPagoStatus(branchId: string | undefined) {
  return useQuery({
    queryKey: ['mp-status', branchId],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)('mercadopago_config')
        .select('estado_conexion')
        .eq('branch_id', branchId!)
        .maybeSingle();
      if (error) return null;
      return data as { estado_conexion: string } | null;
    },
    enabled: !!branchId,
  });
}

export function useMercadoPagoConfigMutations(branchId: string | undefined) {
  const qc = useQueryClient();

  const upsert = useMutation({
    mutationFn: async (values: { access_token: string; public_key: string }) => {
      if (!branchId) throw new Error('branch_id requerido');
      const { data, error } = await (supabase.from as any)('mercadopago_config')
        .upsert(
          {
            branch_id: branchId,
            access_token: values.access_token,
            public_key: values.public_key,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'branch_id' }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mp-config', branchId] });
      toast.success('Configuración guardada');
    },
    onError: (err: Error) => {
      toast.error('Error al guardar', { description: err.message });
    },
  });

  const testConnection = useMutation({
    mutationFn: async () => {
      if (!branchId) throw new Error('branch_id requerido');
      const { data: config } = await (supabase.from as any)('mercadopago_config')
        .select('access_token')
        .eq('branch_id', branchId)
        .single();

      if (!config?.access_token) throw new Error('No hay access token configurado');

      const { data, error } = await supabase.functions.invoke('mp-test-connection', {
        body: { branch_id: branchId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['mp-config', branchId] });
      toast.success('Conexión exitosa', { description: `Collector ID: ${data?.collector_id ?? 'N/A'}` });
    },
    onError: (err: Error) => {
      toast.error('Error de conexión', { description: err.message });
    },
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      if (!branchId) throw new Error('branch_id requerido');
      const { error } = await (supabase.from as any)('mercadopago_config')
        .update({
          access_token: '',
          public_key: '',
          estado_conexion: 'desconectado',
          collector_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('branch_id', branchId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mp-config', branchId] });
      toast.success('Desconectado de MercadoPago');
    },
  });

  return { upsert, testConnection, disconnect };
}
