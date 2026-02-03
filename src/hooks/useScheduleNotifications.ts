/**
 * useScheduleNotifications - Helper for sending schedule notifications
 * 
 * Exported separately from useSchedules to allow usage in InlineScheduleEditor
 */
import { supabase } from '@/integrations/supabase/client';

export interface NotificationInput {
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

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Send schedule notification to an employee
 * Creates internal communication and/or sends email
 */
export async function sendScheduleNotification(input: NotificationInput): Promise<void> {
  const monthName = monthNames[input.month - 1];
  
  // Create internal communication
  if (input.notify_communication) {
    const title = input.is_modification
      ? `📅 Tu horario de ${monthName} fue modificado`
      : `📅 Tu horario de ${monthName} ya está disponible`;
    
    const body = input.is_modification
      ? `Tu encargado modificó tu horario. ${input.modification_reason ? `Motivo: ${input.modification_reason}` : ''} Revisalo en 'Mi Horario'.`
      : `Tu encargado publicó el horario del mes. Revisalo en 'Mi Horario'.`;
    
    try {
      await supabase.from('communications').insert({
        title,
        body,
        type: 'info',
        source_type: 'local',
        source_branch_id: input.branch_id,
        target_branch_ids: [input.branch_id],
        target_roles: null, // Will be filtered by target_user logic below
        is_published: true,
        published_at: new Date().toISOString(),
        created_by: input.sender_id,
      });
      
      // Since communications doesn't have target_user_id, we'll skip individual targeting
      // The employee will see it via branch-level communications
    } catch (e) {
      console.error('Failed to create communication:', e);
    }
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
 * Send notifications to multiple employees at once
 */
export async function sendBulkScheduleNotifications(
  employees: Array<{ id: string; name: string }>,
  params: Omit<NotificationInput, 'user_id'>
): Promise<void> {
  // For communications, we create one message targeting the branch
  if (params.notify_communication) {
    const monthName = monthNames[params.month - 1];
    const title = params.is_modification
      ? `📅 Los horarios de ${monthName} fueron modificados`
      : `📅 Los horarios de ${monthName} ya están disponibles`;
    
    const body = params.is_modification
      ? `Se modificaron los horarios del equipo. ${params.modification_reason ? `Motivo: ${params.modification_reason}` : ''} Revisá tu horario en 'Mi Cuenta'.`
      : `Se publicaron los horarios del mes. Revisá tu horario en 'Mi Cuenta'.`;
    
    try {
      await supabase.from('communications').insert({
        title,
        body,
        type: 'info',
        source_type: 'local',
        source_branch_id: params.branch_id,
        target_branch_ids: [params.branch_id],
        is_published: true,
        published_at: new Date().toISOString(),
        created_by: params.sender_id,
      });
    } catch (e) {
      console.error('Failed to create bulk communication:', e);
    }
  }
  
  // For emails, send to each employee
  if (params.notify_email) {
    for (const employee of employees) {
      try {
        await supabase.functions.invoke('send-schedule-notification', {
          body: {
            user_id: employee.id,
            month: params.month,
            year: params.year,
            is_modification: params.is_modification,
            modification_reason: params.modification_reason,
          },
        });
      } catch (e) {
        console.error(`Failed to send email to ${employee.name}:`, e);
        // Continue with other employees
      }
    }
  }
}
