import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Channel, ChannelFormData } from "@/types/channels";
import { toast } from "sonner";

// =====================================================
// HOOK: useChannels - CRUD de Canales (Admin)
// =====================================================

export function useChannels() {
  return useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .order('display_order');
      
      if (error) throw error;
      return data as Channel[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos - canales cambian poco
  });
}

export function useChannel(channelId: string | undefined) {
  return useQuery({
    queryKey: ['channels', channelId],
    queryFn: async () => {
      if (!channelId) return null;
      
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('id', channelId)
        .single();
      
      if (error) throw error;
      return data as Channel;
    },
    enabled: !!channelId,
  });
}

export function useCreateChannel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (channelData: ChannelFormData) => {
      const { data, error } = await supabase
        .from('channels')
        .insert(channelData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast.success('Canal creado correctamente');
    },
    onError: (error) => {
      console.error('Error creating channel:', error);
      toast.error('Error al crear el canal');
    },
  });
}

export function useUpdateChannel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...channelData }: Partial<Channel> & { id: string }) => {
      const { data, error } = await supabase
        .from('channels')
        .update(channelData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      queryClient.invalidateQueries({ queryKey: ['channels', variables.id] });
      toast.success('Canal actualizado correctamente');
    },
    onError: (error) => {
      console.error('Error updating channel:', error);
      toast.error('Error al actualizar el canal');
    },
  });
}

export function useDeleteChannel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (channelId: string) => {
      const { error } = await supabase
        .from('channels')
        .delete()
        .eq('id', channelId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast.success('Canal eliminado correctamente');
    },
    onError: (error) => {
      console.error('Error deleting channel:', error);
      toast.error('Error al eliminar el canal');
    },
  });
}

// =====================================================
// Estadísticas de uso de canales
// =====================================================

export function useChannelStats() {
  return useQuery({
    queryKey: ['channel-stats'],
    queryFn: async () => {
      // Contar sucursales usando cada canal
      const { data: branchChannels, error } = await supabase
        .from('branch_channels')
        .select('channel_id, is_enabled');
      
      if (error) throw error;
      
      // Agrupar por channel_id
      const stats = branchChannels.reduce((acc, bc) => {
        if (!acc[bc.channel_id]) {
          acc[bc.channel_id] = { total: 0, enabled: 0 };
        }
        acc[bc.channel_id].total++;
        if (bc.is_enabled) {
          acc[bc.channel_id].enabled++;
        }
        return acc;
      }, {} as Record<string, { total: number; enabled: number }>);
      
      return stats;
    },
    staleTime: 60 * 1000, // 1 minuto
  });
}
