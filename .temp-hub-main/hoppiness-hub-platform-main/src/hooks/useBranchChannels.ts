import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BranchChannel, BranchActiveChannel } from "@/types/channels";
import { toast } from "sonner";

// =====================================================
// HOOK: useBranchChannels - Canales de una Sucursal
// =====================================================

export function useBranchChannels(branchId: string | undefined) {
  return useQuery({
    queryKey: ['branch-channels', branchId],
    queryFn: async () => {
      if (!branchId) return [];
      
      const { data, error } = await supabase
        .rpc('get_branch_active_channels', { p_branch_id: branchId });
      
      if (error) throw error;
      return data as BranchActiveChannel[];
    },
    enabled: !!branchId,
    staleTime: 30 * 1000, // 30 segundos
  });
}

export function useBranchChannelsDetailed(branchId: string | undefined) {
  return useQuery({
    queryKey: ['branch-channels-detailed', branchId],
    queryFn: async () => {
      if (!branchId) return [];
      
      const { data, error } = await supabase
        .from('branch_channels')
        .select(`
          *,
          channel:channels(*)
        `)
        .eq('branch_id', branchId)
        .order('channel(display_order)');
      
      if (error) throw error;
      return data as (BranchChannel & { channel: NonNullable<BranchChannel['channel']> })[];
    },
    enabled: !!branchId,
    staleTime: 30 * 1000,
  });
}

export function useToggleBranchChannel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      branchId, 
      channelId, 
      isEnabled 
    }: { 
      branchId: string; 
      channelId: string; 
      isEnabled: boolean;
    }) => {
      const { error } = await supabase
        .from('branch_channels')
        .update({ is_enabled: isEnabled })
        .eq('branch_id', branchId)
        .eq('channel_id', channelId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['branch-channels', variables.branchId] });
      queryClient.invalidateQueries({ queryKey: ['branch-channels-detailed', variables.branchId] });
      toast.success(variables.isEnabled ? 'Canal activado' : 'Canal desactivado');
    },
    onError: (error) => {
      console.error('Error toggling channel:', error);
      toast.error('Error al cambiar estado del canal');
    },
  });
}

export function useUpdateBranchChannelConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      branchId, 
      channelId, 
      config,
      deliveryFeeOverride,
      minimumOrderOverride,
    }: { 
      branchId: string; 
      channelId: string; 
      config?: Record<string, unknown>;
      deliveryFeeOverride?: number | null;
      minimumOrderOverride?: number | null;
    }) => {
      const updateData: Record<string, unknown> = {};
      if (config !== undefined) updateData.config = config;
      if (deliveryFeeOverride !== undefined) updateData.delivery_fee_override = deliveryFeeOverride;
      if (minimumOrderOverride !== undefined) updateData.minimum_order_override = minimumOrderOverride;
      
      const { error } = await supabase
        .from('branch_channels')
        .update(updateData)
        .eq('branch_id', branchId)
        .eq('channel_id', channelId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['branch-channels', variables.branchId] });
      queryClient.invalidateQueries({ queryKey: ['branch-channels-detailed', variables.branchId] });
      toast.success('Configuración del canal actualizada');
    },
    onError: (error) => {
      console.error('Error updating channel config:', error);
      toast.error('Error al actualizar configuración');
    },
  });
}

// =====================================================
// Hook para verificar si un canal específico está activo
// =====================================================

export function useIsChannelEnabled(branchId: string | undefined, channelSlug: string) {
  const { data: channels } = useBranchChannels(branchId);
  
  const channel = channels?.find(c => c.channel_slug === channelSlug);
  return {
    isEnabled: channel?.is_enabled ?? false,
    channel,
  };
}
