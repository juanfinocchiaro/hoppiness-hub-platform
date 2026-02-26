import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type MessageType =
  | 'all'
  | 'franquicia'
  | 'empleo'
  | 'proveedor'
  | 'pedidos'
  | 'consulta'
  | 'otro';

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string | null;
  status: string | null;
  read_at: string | null;
  created_at: string | null;
  // Franquicia fields
  franchise_has_zone: string | null;
  franchise_has_location: string | null;
  franchise_investment_capital: string | null;
  // Empleo fields
  employment_position: string | null;
  employment_cv_link: string | null;
  employment_motivation: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  // Pedidos fields
  order_number: string | null;
  order_date: string | null;
  order_issue: string | null;
  // Additional fields
  investment_range: string | null;
  employment_branch_id: string | null;
}

interface UseContactMessagesOptions {
  typeFilter?: MessageType;
  showOnlyUnread?: boolean;
}

export function useContactMessages(options: UseContactMessagesOptions = {}) {
  const { typeFilter = 'all', showOnlyUnread = false } = options;
  const queryClient = useQueryClient();

  const messagesQuery = useQuery({
    queryKey: ['contact-messages', typeFilter, showOnlyUnread],
    queryFn: async () => {
      let query = supabase
        .from('contact_messages')
        .select('*')
        .neq('status', 'archived')
        .order('created_at', { ascending: false });

      if (typeFilter !== 'all') {
        query = query.eq('subject', typeFilter);
      }

      if (showOnlyUnread) {
        query = query.is('read_at', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ContactMessage[];
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('contact_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
    },
    onError: (e: Error) => toast.error(`Error: ${e.message}`),
  });

  const archiveMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('contact_messages')
        .update({ status: 'archived' })
        .eq('id', messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
      toast.success('Mensaje archivado');
    },
    onError: (e: Error) => toast.error(`Error al archivar: ${e.message}`),
  });

  return {
    messages: messagesQuery.data ?? [],
    isLoading: messagesQuery.isLoading,
    error: messagesQuery.error,
    markAsRead: markAsReadMutation.mutate,
    archive: archiveMutation.mutate,
    isMarkingRead: markAsReadMutation.isPending,
    isArchiving: archiveMutation.isPending,
  };
}

export function useUnreadMessagesCount() {
  return useQuery({
    queryKey: ['unread-messages-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('contact_messages')
        .select('*', { count: 'exact', head: true })
        .is('read_at', null)
        .neq('status', 'archived');
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 60000, // Refrescar cada minuto
  });
}

export function useMessageCounts() {
  return useQuery({
    queryKey: ['contact-messages-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('subject')
        .neq('status', 'archived');

      if (error) throw error;

      const counts = {
        all: data?.length ?? 0,
        franquicia: 0,
        empleo: 0,
        proveedor: 0,
        pedidos: 0,
        consulta: 0,
        otro: 0,
      };

      data?.forEach((msg) => {
        const subject = msg.subject as keyof typeof counts;
        if (subject in counts && subject !== 'all') {
          counts[subject]++;
        } else if (subject !== 'all') {
          counts.otro++;
        }
      });

      return counts;
    },
  });
}
