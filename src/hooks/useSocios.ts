import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface SocioFormData {
  branch_id: string;
  nombre: string;
  cuit?: string;
  email?: string;
  telefono?: string;
  user_id?: string | null;
  porcentaje_participacion: number;
  fecha_ingreso: string;
  limite_retiro_mensual?: number | null;
}

export interface MovimientoSocioFormData {
  branch_id: string;
  socio_id: string;
  tipo: string;
  monto: number;
  fecha: string;
  periodo?: string;
  observaciones?: string;
}

export const TIPO_MOVIMIENTO_OPTIONS = [
  { value: 'retiro', label: 'Retiro' },
  { value: 'aporte', label: 'Aporte' },
  { value: 'distribucion', label: 'Distribución de Utilidades' },
  { value: 'prestamo', label: 'Préstamo' },
  { value: 'devolucion_prestamo', label: 'Devolución de Préstamo' },
  { value: 'ajuste', label: 'Ajuste' },
] as const;

export function useSocios(branchId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['socios', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('socios')
        .select('*')
        .eq('branch_id', branchId)
        .is('deleted_at', null)
        .order('porcentaje_participacion', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!branchId,
  });
}

export function useMovimientosSocio(branchId: string, socioId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['movimientos_socio', branchId, socioId],
    queryFn: async () => {
      let q = supabase
        .from('movimientos_socio')
        .select('*')
        .eq('branch_id', branchId)
        .is('deleted_at', null)
        .order('fecha', { ascending: false });

      if (socioId) q = q.eq('socio_id', socioId);

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!branchId,
  });
}

export function useSocioMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const createSocio = useMutation({
    mutationFn: async (data: SocioFormData) => {
      const { data: result, error } = await supabase
        .from('socios')
        .insert({ ...data, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['socios'] });
      toast.success('Socio creado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const updateSocio = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SocioFormData> }) => {
      const { error } = await supabase.from('socios').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['socios'] });
      toast.success('Socio actualizado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const createMovimiento = useMutation({
    mutationFn: async (data: MovimientoSocioFormData) => {
      const { data: result, error } = await supabase
        .from('movimientos_socio')
        .insert({ ...data, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movimientos_socio'] });
      qc.invalidateQueries({ queryKey: ['socios'] });
      toast.success('Movimiento registrado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { createSocio, updateSocio, createMovimiento };
}
