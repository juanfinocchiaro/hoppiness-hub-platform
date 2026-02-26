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
  device_id: string | null;
  device_name: string | null;
  device_operating_mode: 'PDV' | 'STANDALONE' | null;
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

export function usePointDevices(branchId: string | undefined) {
  return useQuery({
    queryKey: ['mp-point-devices', branchId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('mp-point-devices', {
        body: { branch_id: branchId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return (data?.devices ?? []) as Array<{
        id: string;
        pos_id: number | null;
        operating_mode: string;
        external_pos_id: string | null;
      }>;
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
          { onConflict: 'branch_id' },
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
      // Some Supabase client versions put HTTP error bodies in `data` instead of `error`
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['mp-config', branchId] });
      toast.success('Conexión exitosa', {
        description: `Collector ID: ${data?.collector_id ?? 'N/A'}`,
      });
    },
    onError: (err: Error) => {
      const msg = err.message || 'Token inválido o sin permisos';
      toast.error('Error de conexión', { description: msg });
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

  const saveDevice = useMutation({
    mutationFn: async (values: { device_id: string; device_name: string }) => {
      if (!branchId) throw new Error('branch_id requerido');

      // Save device to DB
      const { error } = await (supabase.from as any)('mercadopago_config')
        .update({
          device_id: values.device_id,
          device_name: values.device_name,
          device_operating_mode: null,
          updated_at: new Date().toISOString(),
        })
        .eq('branch_id', branchId);
      if (error) throw error;

      // Auto-activate PDV mode after linking
      const { data, error: modeErr } = await supabase.functions.invoke('mp-point-setup', {
        body: { branch_id: branchId, terminal_id: values.device_id, operating_mode: 'PDV' },
      });
      if (modeErr) throw modeErr;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mp-config', branchId] });
      toast.success('Dispositivo vinculado en modo PDV', {
        description: 'Listo para recibir cobros desde el POS.',
      });
    },
    onError: (err: Error) => {
      qc.invalidateQueries({ queryKey: ['mp-config', branchId] });
      // Device was saved, only mode change failed — show actionable message
      toast.warning('Dispositivo guardado, pero no se pudo activar modo PDV', {
        description:
          err.message || 'Activalo manualmente: Más opciones → Ajustes → Modo de vinculación.',
      });
    },
  });

  const changeDeviceMode = useMutation({
    mutationFn: async (operating_mode: 'PDV' | 'STANDALONE') => {
      if (!branchId) throw new Error('branch_id requerido');
      const { data: cfg } = await (supabase.from as any)('mercadopago_config')
        .select('device_id')
        .eq('branch_id', branchId)
        .single();
      if (!cfg?.device_id) throw new Error('No hay dispositivo vinculado');

      const { data, error } = await supabase.functions.invoke('mp-point-setup', {
        body: { branch_id: branchId, terminal_id: cfg.device_id, operating_mode },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return operating_mode;
    },
    onSuccess: (mode) => {
      qc.invalidateQueries({ queryKey: ['mp-config', branchId] });
      toast.success(mode === 'PDV' ? 'Modo PDV activado' : 'Modo Standalone activado', {
        description:
          mode === 'PDV'
            ? 'El dispositivo está listo para integrarse con el POS.'
            : 'El dispositivo volvió al modo independiente.',
      });
    },
    onError: (err: Error) => {
      toast.error('Error al cambiar modo', { description: err.message });
    },
  });

  const removeDevice = useMutation({
    mutationFn: async () => {
      if (!branchId) throw new Error('branch_id requerido');
      const { error } = await (supabase.from as any)('mercadopago_config')
        .update({
          device_id: null,
          device_name: null,
          updated_at: new Date().toISOString(),
        })
        .eq('branch_id', branchId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mp-config', branchId] });
      toast.success('Dispositivo desvinculado');
    },
  });

  return { upsert, testConnection, disconnect, saveDevice, removeDevice, changeDeviceMode };
}
