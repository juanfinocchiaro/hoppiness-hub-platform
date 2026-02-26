/**
 * useSchedules - Hook for employee monthly schedules management
 *
 * Uses employee_schedules table with the new schedule_date column
 * for specific day scheduling (monthly system)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, endOfMonth } from 'date-fns';
import { toast } from 'sonner';
import type { WorkPositionType } from '@/types/workPosition';

export interface ScheduleEntry {
  id: string;
  user_id: string;
  branch_id: string;
  schedule_date: string;
  start_time: string;
  end_time: string;
  is_day_off: boolean;
  schedule_month: number;
  schedule_year: number;
  published_at: string | null;
  published_by: string | null;
  modified_at: string | null;
  modified_by: string | null;
  modification_reason: string | null;
  notification_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DaySchedule {
  date: string;
  start_time: string | null;
  end_time: string | null;
  is_day_off: boolean;
  is_holiday?: boolean;
  holiday_description?: string;
  is_approved_request?: boolean;
  request_reason?: string;
  work_position?: WorkPositionType | null;
}

export interface SaveScheduleInput {
  user_id: string;
  branch_id: string;
  month: number;
  year: number;
  days: DaySchedule[];
  notify_email: boolean;
  notify_communication: boolean;
}

export interface ModifyScheduleInput {
  schedule_id: string;
  start_time?: string;
  end_time?: string;
  is_day_off?: boolean;
  modification_reason?: string;
  notify_email: boolean;
  notify_communication: boolean;
}

/**
 * Fetch monthly schedules for a specific branch
 */
export function useMonthlySchedules(branchId: string | undefined, month: number, year: number) {
  return useQuery({
    queryKey: ['monthly-schedules', branchId, year, month],
    queryFn: async () => {
      if (!branchId) return [];

      const startDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('employee_schedules')
        .select('*')
        .eq('branch_id', branchId)
        .gte('schedule_date', startDate)
        .lte('schedule_date', endDate)
        .order('schedule_date', { ascending: true });

      if (error) throw error;
      return (data || []) as ScheduleEntry[];
    },
    enabled: !!branchId,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch schedules for a specific employee for a month
 */
export function useEmployeeMonthSchedule(userId: string | undefined, month: number, year: number) {
  return useQuery({
    queryKey: ['employee-schedule', userId, year, month],
    queryFn: async () => {
      if (!userId) return [];

      const startDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('employee_schedules')
        .select('*')
        .eq('user_id', userId)
        .gte('schedule_date', startDate)
        .lte('schedule_date', endDate)
        .order('schedule_date', { ascending: true });

      if (error) throw error;
      return (data || []) as ScheduleEntry[];
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

/**
 * Check if an employee has published schedule for a month
 */
export function useHasPublishedSchedule(userId: string | undefined, month: number, year: number) {
  return useQuery({
    queryKey: ['has-published-schedule', userId, year, month],
    queryFn: async () => {
      if (!userId) return false;

      const startDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('employee_schedules')
        .select('id, published_at')
        .eq('user_id', userId)
        .gte('schedule_date', startDate)
        .lte('schedule_date', endDate)
        .not('published_at', 'is', null)
        .limit(1);

      if (error) throw error;
      return (data?.length || 0) > 0;
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

/**
 * Save monthly schedule for an employee
 * Creates or updates schedule entries for each day
 */
export function useSaveMonthlySchedule() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: SaveScheduleInput) => {
      if (!user) throw new Error('Not authenticated');

      const now = new Date().toISOString();

      // Filter out days without schedule (empty days)
      const validDays = input.days.filter(
        (day) => day.is_day_off || (day.start_time && day.end_time),
      );

      // Build upsert records
      const records = validDays.map((day) => ({
        user_id: input.user_id,
        branch_id: input.branch_id,
        schedule_date: day.date,
        schedule_month: input.month,
        schedule_year: input.year,
        start_time: day.is_day_off ? null : day.start_time,
        end_time: day.is_day_off ? null : day.end_time,
        is_day_off: day.is_day_off,
        work_position: day.work_position || null,
        published_at: now,
        published_by: user.id,
        shift_number: 1, // Default shift
        // Parse as local date (Argentina UTC-3) to get correct day of week
        day_of_week: (() => {
          const [y, m, d] = day.date.split('-').map(Number);
          return new Date(y, m - 1, d).getDay();
        })(),
        employee_id: input.user_id, // Legacy compatibility
      }));

      // Delete existing entries for this user/month first
      const startDate = format(new Date(input.year, input.month - 1, 1), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(input.year, input.month - 1, 1)), 'yyyy-MM-dd');

      const { error: deleteError } = await supabase
        .from('employee_schedules')
        .delete()
        .eq('user_id', input.user_id)
        .gte('schedule_date', startDate)
        .lte('schedule_date', endDate);

      if (deleteError) throw deleteError;

      // Insert new entries
      const { data, error } = await supabase.from('employee_schedules').insert(records).select();

      if (error) throw error;

      // Send notifications if requested
      if (input.notify_email || input.notify_communication) {
        await sendScheduleNotification({
          user_id: input.user_id,
          branch_id: input.branch_id,
          month: input.month,
          year: input.year,
          is_modification: false,
          notify_email: input.notify_email,
          notify_communication: input.notify_communication,
          sender_id: user.id,
        });
      }

      return data as ScheduleEntry[];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['monthly-schedules', variables.branch_id] });
      queryClient.invalidateQueries({ queryKey: ['employee-schedule', variables.user_id] });
      queryClient.invalidateQueries({ queryKey: ['has-published-schedule', variables.user_id] });
      toast.success('Horario guardado');
    },
    onError: (e: Error) => toast.error(`Error al guardar horario: ${e.message}`),
  });
}

/**
 * Modify a single schedule entry (after publication)
 */
export function useModifySchedule() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: ModifyScheduleInput) => {
      if (!user) throw new Error('Not authenticated');

      const now = new Date().toISOString();

      // First get the existing entry
      const { data: existing, error: fetchError } = await supabase
        .from('employee_schedules')
        .select('*')
        .eq('id', input.schedule_id)
        .single();

      if (fetchError) throw fetchError;

      // Update the entry
      const { data, error } = await supabase
        .from('employee_schedules')
        .update({
          start_time: input.start_time ?? existing.start_time,
          end_time: input.end_time ?? existing.end_time,
          is_day_off: input.is_day_off ?? existing.is_day_off,
          modified_at: now,
          modified_by: user.id,
          modification_reason: input.modification_reason,
        })
        .eq('id', input.schedule_id)
        .select()
        .single();

      if (error) throw error;

      // Send notifications if requested
      if (input.notify_email || input.notify_communication) {
        await sendScheduleNotification({
          user_id: existing.user_id,
          branch_id: existing.branch_id ?? '',
          month: existing.schedule_month ?? 0,
          year: existing.schedule_year ?? 0,
          is_modification: true,
          modification_reason: input.modification_reason,
          modified_date: existing.schedule_date,
          notify_email: input.notify_email,
          notify_communication: input.notify_communication,
          sender_id: user.id,
        });
      }

      return data as ScheduleEntry;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['monthly-schedules', data.branch_id] });
      queryClient.invalidateQueries({ queryKey: ['employee-schedule', data.user_id] });
      toast.success('Horario modificado');
    },
    onError: (e: Error) => toast.error(`Error al modificar horario: ${e.message}`),
  });
}

/**
 * Delete all schedule entries for an employee for a month
 */
export function useDeleteMonthSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      branchId,
      month,
      year,
    }: {
      userId: string;
      branchId: string;
      month: number;
      year: number;
    }) => {
      const startDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd');

      const { error } = await supabase
        .from('employee_schedules')
        .delete()
        .eq('user_id', userId)
        .eq('branch_id', branchId)
        .gte('schedule_date', startDate)
        .lte('schedule_date', endDate);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['monthly-schedules', variables.branchId] });
      queryClient.invalidateQueries({ queryKey: ['employee-schedule', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['has-published-schedule', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['my-schedules-v2', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['my-schedules-v2'] });
      toast.success('Horario eliminado');
    },
    onError: (e: Error) => toast.error(`Error al eliminar horario: ${e.message}`),
  });
}

// ============= Helper functions =============

interface NotificationInput {
  user_id: string;
  branch_id: string;
  month: number;
  year: number;
  is_modification: boolean;
  modification_reason?: string;
  modified_date?: string;
  notify_email: boolean;
  notify_communication: boolean;
  sender_id: string;
}

async function sendScheduleNotification(input: NotificationInput) {
  const monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];
  const monthName = monthNames[input.month - 1];

  // Create internal communication
  if (input.notify_communication) {
    const title = input.is_modification
      ? `📅 Tu horario de ${monthName} fue modificado`
      : `📅 Tu horario de ${monthName} ya está disponible`;

    let body = input.is_modification
      ? `Tu encargado modificó tu horario. ${input.modification_reason ? `Motivo: ${input.modification_reason}` : ''} Revisalo en 'Mi Horario'.`
      : `Tu encargado publicó el horario del mes. Revisalo en 'Mi Horario'.`;

    await supabase.from('communications').insert({
      title,
      body,
      type: 'info',
      source_type: 'local',
      source_branch_id: input.branch_id,
      target_user_id: input.user_id,
      is_published: true,
      published_at: new Date().toISOString(),
      created_by: input.sender_id,
    });
  }

  // Send email notification
  if (input.notify_email) {
    try {
      await supabase.functions.invoke('send-schedule-notification', {
        body: {
          user_id: input.user_id,
          month: input.month,
          year: input.year,
          is_modification: input.is_modification,
          modification_reason: input.modification_reason,
        },
      });
    } catch (e) {
      if (import.meta.env.DEV) console.error('Failed to send email notification:', e);
      // Don't throw - email failure shouldn't block the save
    }
  }
}

/**
 * Get schedule requests for an employee for a specific month
 */
export function useEmployeeScheduleRequests(
  userId: string | undefined,
  month: number,
  year: number,
) {
  return useQuery({
    queryKey: ['employee-schedule-requests', userId, year, month],
    queryFn: async () => {
      if (!userId) return [];

      const startDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('schedule_requests')
        .select('*')
        .eq('user_id', userId)
        .gte('request_date', startDate)
        .lte('request_date', endDate)
        .order('request_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

/**
 * Approve a schedule request
 */
export function useApproveScheduleRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ requestId, notes }: { requestId: string; notes?: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('schedule_requests')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          notes,
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-schedule-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-schedule-requests'] });
      toast.success('Solicitud aprobada');
    },
    onError: (e: Error) => toast.error(`Error al aprobar solicitud: ${e.message}`),
  });
}

/**
 * Reject a schedule request
 */
export function useRejectScheduleRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ requestId, notes }: { requestId: string; notes?: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('schedule_requests')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          notes,
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-schedule-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-schedule-requests'] });
      toast.success('Solicitud rechazada');
    },
    onError: (e: Error) => toast.error(`Error al rechazar solicitud: ${e.message}`),
  });
}
