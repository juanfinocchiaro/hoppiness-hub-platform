import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';

interface Communication {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'urgent' | 'celebration';
  target_branch_ids: string[] | null;
  target_roles: string[] | null;
  is_published: boolean;
  published_at: string;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string | null;
}

interface CommunicationWithRead extends Communication {
  is_read: boolean;
}

export function useCommunications() {
  return useQuery({
    queryKey: ['communications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communications')
        .select('*')
        .order('published_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as Communication[];
    },
    staleTime: 60000,
  });
}

export interface CommunicationWithSource extends CommunicationWithRead {
  source_type: 'brand' | 'local';
  source_branch_id: string | null;
  tag: string | null;
  custom_label: string | null;
  branch_name?: string;
  requires_confirmation?: boolean;
  is_confirmed?: boolean;
}

export function useUserCommunications() {
  const { id: userId } = useEffectiveUser();
  
  return useQuery({
    queryKey: ['user-communications', userId],
    queryFn: async () => {
      if (!userId) return { brand: [], local: [] };
      
      // Get all published communications (RLS handles filtering)
      const { data: comms, error: commsError } = await supabase
        .from('communications')
        .select('*, branches:source_branch_id(name)')
        .eq('is_published', true)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('published_at', { ascending: false });
      
      if (commsError) throw commsError;
      
      // Get user's reads with confirmation status
      const { data: reads, error: readsError } = await supabase
        .from('communication_reads')
        .select('communication_id, confirmed_at')
        .eq('user_id', userId);
      
      if (readsError) throw readsError;
      
      const readMap = new Map(reads?.map(r => [r.communication_id, r]) || []);
      
      const allComms = (comms || []).map(c => {
        const readRecord = readMap.get(c.id);
        return {
          ...c,
          is_read: !!readRecord,
          is_confirmed: !!readRecord?.confirmed_at,
          branch_name: (c.branches as any)?.name || null,
        };
      }) as CommunicationWithSource[];
      
      // Separate by source
      const brand = allComms.filter(c => c.source_type === 'brand');
      const local = allComms.filter(c => c.source_type === 'local');
      
      return { brand, local };
    },
    enabled: !!userId,
    staleTime: 30000,
  });
}

export function useUnreadCount() {
  const { data } = useUserCommunications();
  if (!data) return 0;
  const brandUnread = data.brand?.filter(c => !c.is_read).length || 0;
  const localUnread = data.local?.filter(c => !c.is_read).length || 0;
  return brandUnread + localUnread;
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  const { id: userId } = useEffectiveUser();
  
  return useMutation({
    mutationFn: async (communicationId: string) => {
      if (!userId) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('communication_reads')
        .insert({
          communication_id: communicationId,
          user_id: userId,
        });
      
      // Ignore unique constraint violation (already read)
      if (error && !error.message.includes('duplicate')) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-communications'] });
    },
  });
}

export function useConfirmCommunication() {
  const queryClient = useQueryClient();
  const { id: userId } = useEffectiveUser();
  
  return useMutation({
    mutationFn: async (communicationId: string) => {
      if (!userId) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('communication_reads')
        .update({ confirmed_at: new Date().toISOString() })
        .eq('communication_id', communicationId)
        .eq('user_id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-communications'] });
    },
  });
}

export function useCreateCommunication() {
  const queryClient = useQueryClient();
  const { id: userId } = useEffectiveUser();
  
  return useMutation({
    mutationFn: async (data: {
      title: string;
      body: string;
      type: Communication['type'];
      target_branch_ids?: string[];
      target_roles?: string[];
      expires_at?: string;
    }) => {
      if (!userId) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('communications')
        .insert({
          ...data,
          created_by: userId,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications'] });
    },
  });
}

export function useDeleteCommunication() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('communications')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications'] });
    },
  });
}

export function getTypeLabel(type: Communication['type']): string {
  switch (type) {
    case 'info': return 'Información';
    case 'warning': return 'Aviso';
    case 'urgent': return 'Urgente';
    case 'celebration': return 'Celebración';
    default: return type;
  }
}

export function getTypeColor(type: Communication['type']): string {
  switch (type) {
    case 'info': return 'bg-blue-500/10 text-blue-600';
    case 'warning': return 'bg-yellow-500/10 text-yellow-600';
    case 'urgent': return 'bg-red-500/10 text-red-600';
    case 'celebration': return 'bg-green-500/10 text-green-600';
    default: return 'bg-muted text-muted-foreground';
  }
}

export type { Communication, CommunicationWithRead };
