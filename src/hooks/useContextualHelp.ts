import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { getHelpConfig, type HelpConfig } from '@/lib/helpConfig';

interface UseContextualHelpResult {
  config: HelpConfig | null;
  isDismissed: boolean;
  showFloatingHelp: boolean;
  loading: boolean;
  dismissHelp: () => Promise<void>;
  toggleFloatingHelp: () => Promise<void>;
}

export function useContextualHelp(pageId: string): UseContextualHelpResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get help config for this page
  const config = getHelpConfig(pageId);

  // Query user's help preferences
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile-help-prefs', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('help_dismissed_pages, show_floating_help')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as {
        help_dismissed_pages: string[] | null;
        show_floating_help: boolean | null;
      } | null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const isDismissed = profile?.help_dismissed_pages?.includes(pageId) || false;
  const showFloatingHelp = profile?.show_floating_help ?? true;

  // Mutation to dismiss help for this page
  const dismissMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const currentDismissed = profile?.help_dismissed_pages || [];
      if (currentDismissed.includes(pageId)) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          help_dismissed_pages: [...currentDismissed, pageId],
        })
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-help-prefs'] });
    },
    onError: (e: Error) => toast.error(`Error: ${e.message}`),
  });

  // Mutation to toggle floating help
  const toggleMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          show_floating_help: !showFloatingHelp,
        })
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-help-prefs'] });
    },
    onError: (e: Error) => toast.error(`Error: ${e.message}`),
  });

  return {
    config,
    isDismissed,
    showFloatingHelp,
    loading: isLoading,
    dismissHelp: async () => {
      await dismissMutation.mutateAsync();
    },
    toggleFloatingHelp: async () => {
      await toggleMutation.mutateAsync();
    },
  };
}
