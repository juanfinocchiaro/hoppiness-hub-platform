/**
 * useMeetings - Hook para gestión de reuniones
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useEffectiveUser } from './useEffectiveUser';
import type { Meeting, MeetingWithDetails, MeetingWizardData, MeetingStats } from '@/types/meeting';

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
            read_at
          )
        `)
        .eq('branch_id', branchId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data as (Meeting & { participants: any[] })[];
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
        .select('meeting_id, attended, read_at')
        .eq('user_id', userId);
      
      if (pError) throw pError;
      if (!participantRecords?.length) return [];
      
      const meetingIds = participantRecords.map(p => p.meeting_id);
      
      // Then get the meetings
      const { data: meetings, error: mError } = await supabase
        .from('meetings')
        .select('*')
        .in('id', meetingIds)
        .order('date', { ascending: false });
      
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
          participants:meeting_participants(id, user_id, attended, read_at)
        `)
        .order('date', { ascending: false });
      
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
          branch_id,
          branches(id, name),
          participants:meeting_participants(id, read_at)
        `)
        .gte('date', startOfMonth.toISOString());
      
      if (error) throw error;
      
      const totalMeetings = meetings?.length || 0;
      
      // Calculate read percentage
      let totalParticipants = 0;
      let readParticipants = 0;
      
      // Track pending by branch
      const pendingByBranch: Record<string, { name: string; pending: number }> = {};
      
      meetings?.forEach(meeting => {
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
        .select('*')
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
      
      // Get agreements
      const { data: agreements } = await supabase
        .from('meeting_agreements')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('sort_order');
      
      // Get assignees for agreements
      const agreementIds = agreements?.map(a => a.id) || [];
      const { data: assignees } = agreementIds.length > 0 
        ? await supabase
            .from('meeting_agreement_assignees')
            .select('*')
            .in('agreement_id', agreementIds)
        : { data: [] };
      
      // Build response
      const result: MeetingWithDetails = {
        ...meeting,
        area: meeting.area as MeetingWithDetails['area'],
        status: 'closed' as const,
        creator: profileMap.get(meeting.created_by),
        participants: (participants || []).map(p => ({
          ...p,
          profile: profileMap.get(p.user_id),
        })),
        agreements: (agreements || []).map(a => ({
          ...a,
          assignees: (assignees || [])
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

// Create meeting mutation
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
      
      // 1. Create meeting
      const { data: meeting, error: mError } = await supabase
        .from('meetings')
        .insert({
          title: data.title,
          date: meetingDate.toISOString(),
          area: data.area,
          branch_id: branchId,
          created_by: user.id,
          notes: data.notes,
          status: 'closed',
        })
        .select()
        .single();
      
      if (mError) throw mError;
      
      // 2. Create participants
      const participantInserts = data.participantIds.map(userId => ({
        meeting_id: meeting.id,
        user_id: userId,
        attended: data.attendance[userId] ?? false,
      }));
      
      if (participantInserts.length > 0) {
        const { error: pError } = await supabase
          .from('meeting_participants')
          .insert(participantInserts);
        
        if (pError) throw pError;
      }
      
      // 3. Create agreements and assignees
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
        
        // Create assignees for this agreement
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
    },
  });
}

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
    },
  });
}

// Get team members for branch (for participant selection)
export function useBranchTeamMembers(branchId: string | undefined) {
  return useQuery({
    queryKey: ['branch-team-members', branchId],
    queryFn: async () => {
      if (!branchId) return [];
      
      // Get users with roles in this branch
      const { data: roles, error: rError } = await supabase
        .from('user_branch_roles')
        .select('user_id, local_role')
        .eq('branch_id', branchId)
        .eq('is_active', true);
      
      if (rError) throw rError;
      if (!roles?.length) return [];
      
      const userIds = roles.map(r => r.user_id);
      
      // Get profiles
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      
      if (pError) throw pError;
      
      const roleMap = new Map(roles.map(r => [r.user_id, r.local_role]));
      
      return profiles?.map(p => ({
        ...p,
        local_role: roleMap.get(p.id),
      })) || [];
    },
    enabled: !!branchId,
  });
}
