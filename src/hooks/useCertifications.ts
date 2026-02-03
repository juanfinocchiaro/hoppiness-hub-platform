import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { EmployeeCertification, CertificationLevel, EmployeeCertificationWithStation } from '@/types/coaching';

interface CertificationFilters {
  branchId?: string;
  userId?: string;
  stationId?: string;
}

/**
 * Hook para obtener certificaciones con filtros
 */
export function useCertifications(filters: CertificationFilters = {}) {
  const { branchId, userId, stationId } = filters;

  return useQuery({
    queryKey: ['certifications', filters],
    queryFn: async (): Promise<EmployeeCertificationWithStation[]> => {
      let query = supabase
        .from('employee_certifications')
        .select(`
          *,
          station:work_stations(*)
        `)
        .order('created_at', { ascending: false });

      if (branchId) {
        query = query.eq('branch_id', branchId);
      }
      if (userId) {
        query = query.eq('user_id', userId);
      }
      if (stationId) {
        query = query.eq('station_id', stationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EmployeeCertificationWithStation[];
    },
    enabled: !!branchId || !!userId,
  });
}

/**
 * Hook para obtener certificaciones de un empleado específico
 */
export function useEmployeeCertifications(userId: string | null, branchId: string | null) {
  return useQuery({
    queryKey: ['employee-certifications', userId, branchId],
    queryFn: async (): Promise<EmployeeCertificationWithStation[]> => {
      if (!userId || !branchId) return [];

      const { data, error } = await supabase
        .from('employee_certifications')
        .select(`
          *,
          station:work_stations(*)
        `)
        .eq('user_id', userId)
        .eq('branch_id', branchId)
        .order('created_at');

      if (error) throw error;
      return data as EmployeeCertificationWithStation[];
    },
    enabled: !!userId && !!branchId,
  });
}

/**
 * Hook para obtener matriz de certificaciones de un equipo
 */
export function useTeamCertifications(branchId: string | null) {
  return useQuery({
    queryKey: ['team-certifications', branchId],
    queryFn: async () => {
      if (!branchId) return { certifications: [], byUser: {} };

      const { data, error } = await supabase
        .from('employee_certifications')
        .select(`
          *,
          station:work_stations(*)
        `)
        .eq('branch_id', branchId)
        .order('user_id')
        .order('station_id');

      if (error) throw error;

      // Agrupar por usuario
      const byUser = (data as EmployeeCertificationWithStation[]).reduce((acc, cert) => {
        if (!acc[cert.user_id]) {
          acc[cert.user_id] = {};
        }
        acc[cert.user_id][cert.station_id] = cert;
        return acc;
      }, {} as Record<string, Record<string, EmployeeCertificationWithStation>>);

      return {
        certifications: data as EmployeeCertificationWithStation[],
        byUser,
      };
    },
    enabled: !!branchId,
  });
}

interface UpsertCertificationData {
  userId: string;
  branchId: string;
  stationId: string;
  level: CertificationLevel;
  notes?: string;
}

/**
 * Hook para crear o actualizar una certificación
 */
export function useUpsertCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpsertCertificationData) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error('No autenticado');
      }

      const certificationData = {
        user_id: data.userId,
        branch_id: data.branchId,
        station_id: data.stationId,
        level: data.level,
        notes: data.notes || null,
        certified_by: session.session.user.id,
        certified_at: data.level >= 2 ? new Date().toISOString() : null,
      };

      const { data: result, error } = await supabase
        .from('employee_certifications')
        .upsert(certificationData, {
          onConflict: 'user_id,branch_id,station_id',
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['certifications'] });
      queryClient.invalidateQueries({ queryKey: ['employee-certifications', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['team-certifications', variables.branchId] });
      toast.success('Certificación actualizada');
    },
    onError: (error) => {
      console.error('Error updating certification:', error);
      toast.error('Error al actualizar certificación');
    },
  });
}

/**
 * Hook para actualizar múltiples certificaciones a la vez
 */
export function useBatchUpdateCertifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: UpsertCertificationData[]) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error('No autenticado');
      }

      const certificationsData = updates.map(data => ({
        user_id: data.userId,
        branch_id: data.branchId,
        station_id: data.stationId,
        level: data.level,
        notes: data.notes || null,
        certified_by: session.session.user.id,
        certified_at: data.level >= 2 ? new Date().toISOString() : null,
      }));

      const { data: result, error } = await supabase
        .from('employee_certifications')
        .upsert(certificationsData, {
          onConflict: 'user_id,branch_id,station_id',
        })
        .select();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certifications'] });
      queryClient.invalidateQueries({ queryKey: ['employee-certifications'] });
      queryClient.invalidateQueries({ queryKey: ['team-certifications'] });
      toast.success('Certificaciones actualizadas');
    },
    onError: (error) => {
      console.error('Error batch updating certifications:', error);
      toast.error('Error al actualizar certificaciones');
    },
  });
}
