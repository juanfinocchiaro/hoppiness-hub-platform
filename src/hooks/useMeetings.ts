/**
 * useMeetings - Hook para gestión de reuniones v2.0
 * Flujo de 2 fases: Convocatoria → Ejecución
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useEffectiveUser } from './useEffectiveUser';
import type { 
  Meeting, 
  MeetingWithDetails, 
  MeetingConveneData,
  MeetingExecutionData,
  MeetingWizardData,
  MeetingStats,
  MeetingStatus,
  TeamMember,
} from '@/types/meeting';

// ============================================
// QUERIES - Lectura de datos
// ============================================

// Fetch meetings for a branch
export function useBranchMeetings(branchId: string | undefined) {
  return useQuery({
    queryKey: ['branch-meetings', branchId],
    queryFn: async () => {
      if (!branchId) return [];
      
      const { data, error } = await supabase
        .from('meetings')
        .select(`
          *,
          participants:meeting_participants(
            id,
            user_id,
            attended,
            was_present,
            read_at
          )
        `)
        .eq('branch_id', branchId)
        .order('scheduled_at', { ascending: false, nullsFirst: false });
      
      if (error) throw error;
      return (data || []) as (Meeting & { participants: any[] })[];
    },
    enabled: !!branchId,
  });
}

// Fetch meetings where current user is participant
export function useMyMeetings() {
  const effectiveUser = useEffectiveUser();
  const userId = effectiveUser.id;

  return useQuery({
    queryKey: ['my-meetings', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      // First get participant records for this user
      const { data: participantRecords, error: pError } = await supabase
        .from('meeting_participants')
        .select('meeting_id, attended, was_present, read_at')
        .eq('user_id', userId);
      
      if (pError) throw pError;
      if (!participantRecords?.length) return [];
      
      const meetingIds = participantRecords.map(p => p.meeting_id);
      
      // Then get the meetings
      const { data: meetings, error: mError } = await supabase
        .from('meetings')
        .select('*, branches(id, name)')
        .in('id', meetingIds)
        .order('scheduled_at', { ascending: false, nullsFirst: false });
      
      if (mError) throw mError;
      
      // Merge with participant data
      return meetings?.map(m => ({
        ...m,
        myParticipation: participantRecords.find(p => p.meeting_id === m.id),
      })) || [];
    },
    enabled: !!userId,
  });
}

// Fetch unread meetings count for dashboard
export function useUnreadMeetingsCount(branchId?: string) {
  const effectiveUser = useEffectiveUser();
  const userId = effectiveUser.id;

  return useQuery({
    queryKey: ['unread-meetings-count', branchId, userId],
    queryFn: async (): Promise<MeetingStats> => {
      if (!userId) return { totalMeetings: 0, unreadCount: 0 };
      
      // Get participant records where read_at is null
      let query = supabase
        .from('meeting_participants')
        .select('id, meeting_id, read_at')
        .eq('user_id', userId);
      
      const { data: participations, error } = await query;
      
      if (error) throw error;
      
      const unreadCount = participations?.filter(p => !p.read_at).length || 0;
      const totalMeetings = participations?.length || 0;
      
      return {
        totalMeetings,
        unreadCount,
      };
    },
    enabled: !!userId,
  });
}

// Fetch ALL meetings for brand view (coordinators/superadmins)
export function useBrandMeetings() {
  return useQuery({
    queryKey: ['brand-meetings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select(`
          *,
          branches(id, name, slug),
          participants:meeting_participants(id, user_id, attended, was_present, read_at)
        `)
        .order('scheduled_at', { ascending: false, nullsFirst: false });
      
      if (error) throw error;
      return data || [];
    },
  });
}

// Fetch brand meetings stats for dashboard metrics
export function useBrandMeetingsStats() {
  return useQuery({
    queryKey: ['brand-meetings-stats'],
    queryFn: async () => {
      // Get start of current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { data: meetings, error } = await supabase
        .from('meetings')
        .select(`
          id,
          status,
          branch_id,
          branches(id, name),
          participants:meeting_participants(id, read_at)
        `)
        .gte('scheduled_at', startOfMonth.toISOString());
      
      if (error) throw error;
      
      const totalMeetings = meetings?.length || 0;
      
      // Count by status
      const convocadas = meetings?.filter(m => m.status === 'convocada').length || 0;
      const enCurso = meetings?.filter(m => m.status === 'en_curso').length || 0;
      const cerradas = meetings?.filter(m => m.status === 'cerrada').length || 0;
      
      // Calculate read percentage (only for closed meetings)
      const closedMeetings = meetings?.filter(m => m.status === 'cerrada') || [];
      let totalParticipants = 0;
      let readParticipants = 0;
      
      // Track pending by branch
      const pendingByBranch: Record<string, { name: string; pending: number }> = {};
      
      closedMeetings.forEach(meeting => {
        const participants = meeting.participants || [];
        totalParticipants += participants.length;
        
        const readCount = participants.filter((p: any) => p.read_at).length;
        readParticipants += readCount;
        
        const pendingCount = participants.length - readCount;
        if (pendingCount > 0 && meeting.branch_id && meeting.branches) {
          const branchName = (meeting.branches as any).name;
          if (!pendingByBranch[meeting.branch_id]) {
            pendingByBranch[meeting.branch_id] = { name: branchName, pending: 0 };
          }
          pendingByBranch[meeting.branch_id].pending += pendingCount;
        }
      });
      
      const readPercentage = totalParticipants > 0 
        ? Math.round((readParticipants / totalParticipants) * 100) 
        : 100;
      
      const alertCount = Object.keys(pendingByBranch).length;
      
      return {
        totalMeetings,
        readPercentage,
        alertCount,
        pendingByBranch,
        convocadas,
        enCurso,
        cerradas,
      };
    },
  });
}

// Fetch meeting detail with all relations
export function useMeetingDetail(meetingId: string | undefined) {
  return useQuery({
    queryKey: ['meeting-detail', meetingId],
    queryFn: async () => {
      if (!meetingId) return null;
      
      // Get meeting
      const { data: meeting, error: mError } = await supabase
        .from('meetings')
        .select('*, branches(id, name, slug)')
        .eq('id', meetingId)
        .single();
      
      if (mError) throw mError;
      
      // Get participants with profiles
      const { data: participants } = await supabase
        .from('meeting_participants')
        .select('*')
        .eq('meeting_id', meetingId);
      
      // Get profiles for participants
      const participantIds = participants?.map(p => p.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', [...participantIds, meeting.created_by]);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      // Get agreements (only if meeting is in_progress or closed)
      const shouldFetchAgreements = meeting.status !== 'convocada';
      let agreements: any[] = [];
      let assignees: any[] = [];
      
      if (shouldFetchAgreements) {
        const { data: agreementData } = await supabase
          .from('meeting_agreements')
          .select('*')
          .eq('meeting_id', meetingId)
          .order('sort_order');
        
        agreements = agreementData || [];
        
        // Get assignees for agreements
        const agreementIds = agreements.map(a => a.id);
        if (agreementIds.length > 0) {
          const { data: assigneeData } = await supabase
            .from('meeting_agreement_assignees')
            .select('*')
            .in('agreement_id', agreementIds);
          assignees = assigneeData || [];
        }
      }
      
      // Build response
      const result: MeetingWithDetails = {
        ...meeting,
        area: meeting.area as MeetingWithDetails['area'],
        status: (meeting.status || 'cerrada') as MeetingStatus,
        source: (meeting.source || 'mi_local') as MeetingWithDetails['source'],
        branches: meeting.branches,
        creator: profileMap.get(meeting.created_by),
        participants: (participants || []).map(p => ({
          ...p,
          profile: profileMap.get(p.user_id),
        })),
        agreements: agreements.map(a => ({
          ...a,
          assignees: assignees
            .filter(as => as.agreement_id === a.id)
            .map(as => ({
              ...as,
              profile: profileMap.get(as.user_id),
            })),
        })),
      };
      
      return result;
    },
    enabled: !!meetingId,
  });
}

// ============================================
// MUTATIONS - Fase 1: Convocatoria
// ============================================

// Convocar una reunión (crear en estado CONVOCADA)
export function useConveneMeeting() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: MeetingConveneData) => {
      if (!user?.id) throw new Error('No authenticated user');
      
      // Combine date and time
      const [hours, minutes] = data.time.split(':').map(Number);
      const meetingDate = new Date(data.date);
      meetingDate.setHours(hours, minutes, 0, 0);
      
      // Create meeting in CONVOCADA state
      const { data: meeting, error: mError } = await supabase
        .from('meetings')
        .insert({
          title: data.title,
          date: meetingDate.toISOString(),
          scheduled_at: meetingDate.toISOString(),
          area: data.area,
          branch_id: data.branchId || null,
          created_by: user.id,
          notes: null,
          status: 'convocada',
          source: data.branchId ? 'mi_local' : 'mi_marca',
        })
        .select()
        .single();
      
      if (mError) throw mError;
      
      // Create participants (was_present = null, not yet taken)
      const participantInserts = data.participantIds.map(userId => ({
        meeting_id: meeting.id,
        user_id: userId,
        attended: false,
        was_present: null,
        notified_at: new Date().toISOString(),
      }));
      
      if (participantInserts.length > 0) {
        const { error: pError } = await supabase
          .from('meeting_participants')
          .insert(participantInserts);
        
        if (pError) throw pError;
      }
      
      return meeting;
    },
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: ['branch-meetings', data.branchId] });
      queryClient.invalidateQueries({ queryKey: ['brand-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['my-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['brand-meetings-stats'] });
    },
  });
}

// Editar reunión CONVOCADA (antes de iniciar)
export function useUpdateConvokedMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ meetingId, data }: { meetingId: string; data: Partial<MeetingConveneData> }) => {
      const updates: any = {};
      
      if (data.title) updates.title = data.title;
      if (data.area) updates.area = data.area;
      
      if (data.date && data.time) {
        const [hours, minutes] = data.time.split(':').map(Number);
        const meetingDate = new Date(data.date);
        meetingDate.setHours(hours, minutes, 0, 0);
        updates.date = meetingDate.toISOString();
        updates.scheduled_at = meetingDate.toISOString();
      }
      
      const { data: meeting, error } = await supabase
        .from('meetings')
        .update(updates)
        .eq('id', meetingId)
        .eq('status', 'convocada') // Solo se puede editar si está convocada
        .select()
        .single();
      
      if (error) throw error;
      
      // Update participants if provided
      if (data.participantIds) {
        // Delete existing and recreate
        await supabase
          .from('meeting_participants')
          .delete()
          .eq('meeting_id', meetingId);
        
        const participantInserts = data.participantIds.map(userId => ({
          meeting_id: meetingId,
          user_id: userId,
          attended: false,
          was_present: null,
        }));
        
        if (participantInserts.length > 0) {
          await supabase
            .from('meeting_participants')
            .insert(participantInserts);
        }
      }
      
      return meeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-detail'] });
      queryClient.invalidateQueries({ queryKey: ['branch-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['brand-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['my-meetings'] });
    },
  });
}

// Cancelar reunión CONVOCADA
export function useCancelMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (meetingId: string) => {
      // First delete participants
      await supabase
        .from('meeting_participants')
        .delete()
        .eq('meeting_id', meetingId);
      
      // Then delete meeting
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meetingId)
        .eq('status', 'convocada'); // Solo se puede cancelar si está convocada
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['brand-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['my-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['brand-meetings-stats'] });
    },
  });
}

// ============================================
// MUTATIONS - Fase 2: Ejecución
// ============================================

// Iniciar reunión (pasar de CONVOCADA a EN_CURSO)
export function useStartMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (meetingId: string) => {
      const { data, error } = await supabase
        .from('meetings')
        .update({
          status: 'en_curso',
          started_at: new Date().toISOString(),
        })
        .eq('id', meetingId)
        .eq('status', 'convocada')
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-detail'] });
      queryClient.invalidateQueries({ queryKey: ['branch-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['brand-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['brand-meetings-stats'] });
    },
  });
}

// Actualizar asistencia durante la ejecución
export function useUpdateAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      meetingId, 
      attendance 
    }: { 
      meetingId: string; 
      attendance: Record<string, boolean> 
    }) => {
      // Update each participant
      const updates = Object.entries(attendance).map(([userId, wasPresent]) =>
        supabase
          .from('meeting_participants')
          .update({ 
            was_present: wasPresent,
            attended: wasPresent, // Keep legacy field in sync
          })
          .eq('meeting_id', meetingId)
          .eq('user_id', userId)
      );
      
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-detail'] });
    },
  });
}

// Guardar notas durante la ejecución
export function useSaveMeetingNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ meetingId, notes }: { meetingId: string; notes: string }) => {
      const { error } = await supabase
        .from('meetings')
        .update({ notes })
        .eq('id', meetingId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-detail'] });
    },
  });
}

// Agregar acuerdo durante la ejecución
export function useAddAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      meetingId, 
      description, 
      assigneeIds,
      sortOrder,
    }: { 
      meetingId: string; 
      description: string;
      assigneeIds: string[];
      sortOrder?: number;
    }) => {
      // Create agreement
      const { data: agreement, error: aError } = await supabase
        .from('meeting_agreements')
        .insert({
          meeting_id: meetingId,
          description,
          sort_order: sortOrder ?? 0,
        })
        .select()
        .single();
      
      if (aError) throw aError;
      
      // Create assignees
      if (assigneeIds.length > 0) {
        const assigneeInserts = assigneeIds.map(userId => ({
          agreement_id: agreement.id,
          user_id: userId,
        }));
        
        const { error: asError } = await supabase
          .from('meeting_agreement_assignees')
          .insert(assigneeInserts);
        
        if (asError) throw asError;
      }
      
      return agreement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-detail'] });
    },
  });
}

// Eliminar acuerdo
export function useDeleteAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (agreementId: string) => {
      // Delete assignees first
      await supabase
        .from('meeting_agreement_assignees')
        .delete()
        .eq('agreement_id', agreementId);
      
      // Then delete agreement
      const { error } = await supabase
        .from('meeting_agreements')
        .delete()
        .eq('id', agreementId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-detail'] });
    },
  });
}

// Cerrar reunión (pasar de EN_CURSO a CERRADA)
export function useCloseMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      meetingId, 
      notes,
      attendance,
      agreements,
    }: { 
      meetingId: string; 
      notes: string;
      attendance: Record<string, boolean>;
      agreements?: { description: string; assigneeIds: string[] }[];
    }) => {
      // 1. Update meeting to closed
      const { error: mError } = await supabase
        .from('meetings')
        .update({
          status: 'cerrada',
          closed_at: new Date().toISOString(),
          notes,
        })
        .eq('id', meetingId);
      
      if (mError) throw mError;
      
      // 2. Update attendance
      const attendanceUpdates = Object.entries(attendance).map(([userId, wasPresent]) =>
        supabase
          .from('meeting_participants')
          .update({ 
            was_present: wasPresent,
            attended: wasPresent,
          })
          .eq('meeting_id', meetingId)
          .eq('user_id', userId)
      );
      
      await Promise.all(attendanceUpdates);
      
      // 3. Create agreements if provided
      if (agreements && agreements.length > 0) {
        for (let i = 0; i < agreements.length; i++) {
          const agreement = agreements[i];
          
          const { data: createdAgreement, error: aError } = await supabase
            .from('meeting_agreements')
            .insert({
              meeting_id: meetingId,
              description: agreement.description,
              sort_order: i,
            })
            .select()
            .single();
          
          if (aError) throw aError;
          
          if (agreement.assigneeIds.length > 0) {
            const assigneeInserts = agreement.assigneeIds.map(userId => ({
              agreement_id: createdAgreement.id,
              user_id: userId,
            }));
            
            await supabase
              .from('meeting_agreement_assignees')
              .insert(assigneeInserts);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-detail'] });
      queryClient.invalidateQueries({ queryKey: ['branch-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['brand-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['my-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['brand-meetings-stats'] });
    },
  });
}

// ============================================
// MUTATIONS - General
// ============================================

// Mark meeting as read
export function useMarkMeetingAsRead() {
  const effectiveUser = useEffectiveUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (meetingId: string) => {
      if (!effectiveUser.id) throw new Error('No user');
      
      const { error } = await supabase
        .from('meeting_participants')
        .update({ read_at: new Date().toISOString() })
        .eq('meeting_id', meetingId)
        .eq('user_id', effectiveUser.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['unread-meetings-count'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-detail'] });
      queryClient.invalidateQueries({ queryKey: ['branch-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['brand-meetings'] });
    },
  });
}

// Legacy: Create meeting (mantener por compatibilidad)
export function useCreateMeeting() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      branchId, 
      data 
    }: { 
      branchId: string; 
      data: MeetingWizardData 
    }) => {
      if (!user?.id) throw new Error('No authenticated user');
      
      // Combine date and time
      const [hours, minutes] = data.time.split(':').map(Number);
      const meetingDate = new Date(data.date);
      meetingDate.setHours(hours, minutes, 0, 0);
      
      // Create meeting (directly closed for legacy flow)
      const { data: meeting, error: mError } = await supabase
        .from('meetings')
        .insert({
          title: data.title,
          date: meetingDate.toISOString(),
          scheduled_at: meetingDate.toISOString(),
          area: data.area,
          branch_id: branchId,
          created_by: user.id,
          notes: data.notes,
          status: 'cerrada',
          closed_at: new Date().toISOString(),
          source: 'mi_local',
        })
        .select()
        .single();
      
      if (mError) throw mError;
      
      // Create participants
      const participantInserts = data.participantIds.map(userId => ({
        meeting_id: meeting.id,
        user_id: userId,
        attended: data.attendance[userId] ?? false,
        was_present: data.attendance[userId] ?? false,
      }));
      
      if (participantInserts.length > 0) {
        const { error: pError } = await supabase
          .from('meeting_participants')
          .insert(participantInserts);
        
        if (pError) throw pError;
      }
      
      // Create agreements and assignees
      for (let i = 0; i < data.agreements.length; i++) {
        const agreement = data.agreements[i];
        
        const { data: createdAgreement, error: aError } = await supabase
          .from('meeting_agreements')
          .insert({
            meeting_id: meeting.id,
            description: agreement.description,
            sort_order: i,
          })
          .select()
          .single();
        
        if (aError) throw aError;
        
        if (agreement.assigneeIds.length > 0) {
          const assigneeInserts = agreement.assigneeIds.map(userId => ({
            agreement_id: createdAgreement.id,
            user_id: userId,
          }));
          
          const { error: asError } = await supabase
            .from('meeting_agreement_assignees')
            .insert(assigneeInserts);
          
          if (asError) throw asError;
        }
      }
      
      return meeting;
    },
    onSuccess: (_, { branchId }) => {
      queryClient.invalidateQueries({ queryKey: ['branch-meetings', branchId] });
      queryClient.invalidateQueries({ queryKey: ['my-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['unread-meetings-count'] });
      queryClient.invalidateQueries({ queryKey: ['brand-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['brand-meetings-stats'] });
    },
  });
}

// ============================================
// QUERIES - Team Members
// ============================================

// Get team members for branch (for participant selection)
export function useBranchTeamMembers(branchId: string | undefined) {
  return useQuery({
    queryKey: ['branch-team-members', branchId],
    queryFn: async () => {
      if (!branchId) return [];
      
      // Get users with roles in this branch from user_branch_roles
      const { data: branchRoles, error: rError } = await supabase
        .from('user_branch_roles')
        .select('user_id, local_role')
        .eq('branch_id', branchId)
        .eq('is_active', true);
      
      if (rError) throw rError;
      if (!branchRoles?.length) return [];
      
      const userIds = branchRoles.map(r => r.user_id);
      
      // Get profiles
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      
      if (pError) throw pError;
      
      const roleMap = new Map(branchRoles.map(r => [r.user_id, r.local_role]));
      
      return (profiles || []).map(p => ({
        ...p,
        local_role: roleMap.get(p.id),
      })) as TeamMember[];
    },
    enabled: !!branchId,
  });
}

// Get all network members for brand meetings
export function useNetworkMembers() {
  return useQuery({
    queryKey: ['network-members'],
    queryFn: async () => {
      // Get all users with local roles from user_branch_roles
      const { data: branchRoles, error: rError } = await supabase
        .from('user_branch_roles')
        .select('user_id, branch_id, local_role')
        .eq('is_active', true);
      
      if (rError) throw rError;
      if (!branchRoles?.length) return [];
      
      const userIds = [...new Set(branchRoles.map(r => r.user_id))];
      
      // Get profiles
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      
      if (pError) throw pError;
      
      // Get branches for names
      const { data: branches } = await supabase
        .from('branches')
        .select('id, name');
      
      const branchMap = new Map(branches?.map(b => [b.id, b.name]) || []);
      
      // Build member list with branch info
      const members: TeamMember[] = [];
      branchRoles.forEach(role => {
        const profile = profiles?.find(p => p.id === role.user_id);
        if (!profile) return;
        
        members.push({
          id: profile.id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url || undefined,
          local_role: role.local_role || undefined,
          branch_id: role.branch_id,
          branch_name: branchMap.get(role.branch_id),
        });
      });
      
      return members;
    },
  });
}
