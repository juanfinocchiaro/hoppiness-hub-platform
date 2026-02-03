import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  Coaching, 
  CoachingWithDetails, 
  CoachingFormData,
  CoachingStationScore,
  CoachingCompetencyScore 
} from '@/types/coaching';

interface CoachingFilters {
  branchId?: string;
  userId?: string;
  month?: number;
  year?: number;
}

/**
 * Hook para obtener coachings con filtros
 */
export function useCoachings(filters: CoachingFilters = {}) {
  const { branchId, userId, month, year } = filters;

  return useQuery({
    queryKey: ['coachings', filters],
    queryFn: async (): Promise<CoachingWithDetails[]> => {
      let query = supabase
        .from('coachings')
        .select('*')
        .order('coaching_date', { ascending: false });

      if (branchId) {
        query = query.eq('branch_id', branchId);
      }
      if (userId) {
        query = query.eq('user_id', userId);
      }
      if (month) {
        query = query.eq('coaching_month', month);
      }
      if (year) {
        query = query.eq('coaching_year', year);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Obtener perfiles de empleados y evaluadores
      const userIds = [...new Set([
        ...data.map(c => c.user_id),
        ...data.map(c => c.evaluated_by)
      ])];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? []);

      return data.map(coaching => ({
        ...coaching,
        employee: profileMap.get(coaching.user_id),
        evaluator: profileMap.get(coaching.evaluated_by),
      })) as CoachingWithDetails[];
    },
    enabled: !!branchId || !!userId,
  });
}

/**
 * Hook para obtener un coaching específico con todos sus detalles
 */
export function useCoachingDetails(coachingId: string | null) {
  return useQuery({
    queryKey: ['coaching-details', coachingId],
    queryFn: async (): Promise<CoachingWithDetails | null> => {
      if (!coachingId) return null;

      // Obtener coaching
      const { data: coaching, error: coachingError } = await supabase
        .from('coachings')
        .select('*')
        .eq('id', coachingId)
        .single();

      if (coachingError) throw coachingError;

      // Obtener scores de estaciones
      const { data: stationScores } = await supabase
        .from('coaching_station_scores')
        .select('*')
        .eq('coaching_id', coachingId);

      // Obtener scores de competencias
      const { data: competencyScores } = await supabase
        .from('coaching_competency_scores')
        .select('*')
        .eq('coaching_id', coachingId);

      // Obtener perfiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', [coaching.user_id, coaching.evaluated_by]);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? []);

      return {
        ...coaching,
        employee: profileMap.get(coaching.user_id),
        evaluator: profileMap.get(coaching.evaluated_by),
        station_scores: stationScores as CoachingStationScore[],
        competency_scores: competencyScores as CoachingCompetencyScore[],
      };
    },
    enabled: !!coachingId,
  });
}

/**
 * Hook para obtener coachings de un empleado
 */
export function useEmployeeCoachings(userId: string | null, branchId: string | null) {
  return useQuery({
    queryKey: ['employee-coachings', userId, branchId],
    queryFn: async (): Promise<CoachingWithDetails[]> => {
      if (!userId) return [];

      let query = supabase
        .from('coachings')
        .select('*')
        .eq('user_id', userId)
        .order('coaching_year', { ascending: false })
        .order('coaching_month', { ascending: false });

      if (branchId) {
        query = query.eq('branch_id', branchId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Obtener evaluadores
      const evaluatorIds = [...new Set(data.map(c => c.evaluated_by))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', evaluatorIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? []);

      return data.map(coaching => ({
        ...coaching,
        evaluator: profileMap.get(coaching.evaluated_by),
      })) as CoachingWithDetails[];
    },
    enabled: !!userId,
  });
}

/**
 * Hook para crear un coaching completo
 */
export function useCreateCoaching() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: CoachingFormData) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error('No autenticado');
      }

      const coachingDate = formData.coachingDate;
      const month = coachingDate.getMonth() + 1;
      const year = coachingDate.getFullYear();

      // Calcular scores
      const stationAvg = formData.stationScores.length > 0
        ? formData.stationScores.reduce((sum, s) => sum + s.score, 0) / formData.stationScores.length
        : null;

      const generalAvg = formData.generalScores.length > 0
        ? formData.generalScores.reduce((sum, s) => sum + s.score, 0) / formData.generalScores.length
        : null;

      const overallAvg = stationAvg && generalAvg 
        ? (stationAvg + generalAvg) / 2 
        : stationAvg || generalAvg;

      // 1. Crear coaching principal
      const { data: coaching, error: coachingError } = await supabase
        .from('coachings')
        .insert({
          user_id: formData.userId,
          branch_id: formData.branchId,
          evaluated_by: session.session.user.id,
          coaching_date: coachingDate.toISOString().split('T')[0],
          coaching_month: month,
          coaching_year: year,
          station_score: stationAvg ? Number(stationAvg.toFixed(2)) : null,
          general_score: generalAvg ? Number(generalAvg.toFixed(2)) : null,
          overall_score: overallAvg ? Number(overallAvg.toFixed(2)) : null,
          strengths: formData.strengths || null,
          areas_to_improve: formData.areasToImprove || null,
          action_plan: formData.actionPlan || null,
          manager_notes: formData.managerNotes || null,
        })
        .select()
        .single();

      if (coachingError) throw coachingError;

      // 2. Crear scores de estaciones
      if (formData.stationScores.length > 0) {
        const stationScoresData = formData.stationScores.map(s => ({
          coaching_id: coaching.id,
          station_id: s.stationId,
          score: s.score,
        }));

        const { error: stationError } = await supabase
          .from('coaching_station_scores')
          .insert(stationScoresData);

        if (stationError) throw stationError;

        // 3. Crear scores de competencias de estación
        const competencyScoresData = formData.stationScores.flatMap(s => 
          s.competencyScores.map(c => ({
            coaching_id: coaching.id,
            competency_type: 'station' as const,
            competency_id: c.competencyId,
            score: c.score,
          }))
        );

        if (competencyScoresData.length > 0) {
          const { error: compError } = await supabase
            .from('coaching_competency_scores')
            .insert(competencyScoresData);

          if (compError) throw compError;
        }
      }

      // 4. Crear scores de competencias generales
      if (formData.generalScores.length > 0) {
        const generalScoresData = formData.generalScores.map(g => ({
          coaching_id: coaching.id,
          competency_type: 'general' as const,
          competency_id: g.competencyId,
          score: g.score,
        }));

        const { error: generalError } = await supabase
          .from('coaching_competency_scores')
          .insert(generalScoresData);

        if (generalError) throw generalError;
      }

      // 5. Actualizar certificaciones si hay cambios
      if (formData.certificationChanges.length > 0) {
        const certUpdates = formData.certificationChanges.map(c => ({
          user_id: formData.userId,
          branch_id: formData.branchId,
          station_id: c.stationId,
          level: c.newLevel,
          certified_by: session.session.user.id,
          certified_at: c.newLevel >= 2 ? new Date().toISOString() : null,
        }));

        const { error: certError } = await supabase
          .from('employee_certifications')
          .upsert(certUpdates, {
            onConflict: 'user_id,branch_id,station_id',
          });

        if (certError) throw certError;
      }

      return coaching;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['coachings'] });
      queryClient.invalidateQueries({ queryKey: ['employee-coachings', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['coaching-stats'] });
      queryClient.invalidateQueries({ queryKey: ['certifications'] });
      queryClient.invalidateQueries({ queryKey: ['team-certifications'] });
      toast.success('Coaching guardado correctamente');
    },
    onError: (error: Error) => {
      console.error('Error creating coaching:', error);
      if (error.message?.includes('unique constraint')) {
        toast.error('Ya existe un coaching para este empleado en este mes');
      } else {
        toast.error('Error al guardar el coaching');
      }
    },
  });
}

/**
 * Hook para que el empleado confirme lectura del coaching
 */
export function useAcknowledgeCoaching() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ coachingId, notes }: { coachingId: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('coachings')
        .update({
          acknowledged_at: new Date().toISOString(),
          acknowledged_notes: notes || null,
        })
        .eq('id', coachingId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['coachings'] });
      queryClient.invalidateQueries({ queryKey: ['employee-coachings', data.user_id] });
      queryClient.invalidateQueries({ queryKey: ['coaching-details', data.id] });
      toast.success('Coaching confirmado');
    },
    onError: (error) => {
      console.error('Error acknowledging coaching:', error);
      toast.error('Error al confirmar el coaching');
    },
  });
}
