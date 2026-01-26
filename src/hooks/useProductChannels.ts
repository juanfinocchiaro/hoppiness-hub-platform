import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProductChannelPermission, Channel } from "@/types/channels";
import { toast } from "sonner";

// =====================================================
// HOOK: useProductChannels - Canales Permitidos por Producto
// =====================================================

export function useProductChannels(productId: string | undefined) {
  return useQuery({
    queryKey: ['product-channels', productId],
    queryFn: async () => {
      if (!productId) return [];
      
      const { data, error } = await supabase
        .from('product_allowed_channels')
        .select(`
          *,
          channel:channels(*)
        `)
        .eq('product_id', productId);
      
      if (error) throw error;
      return data as (ProductChannelPermission & { channel: Channel })[];
    },
    enabled: !!productId,
  });
}

export function useAllProductChannelPermissions(productId: string | undefined) {
  const { data: channels } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data as Channel[];
    },
    staleTime: 5 * 60 * 1000,
  });
  
  const { data: permissions } = useProductChannels(productId);
  
  // Combinar: todos los canales con sus permisos (si existen)
  const combinedData = channels?.map(channel => {
    const permission = permissions?.find(p => p.channel_id === channel.id);
    return {
      channel,
      is_allowed: permission?.is_allowed ?? false, // Si no existe registro, no está permitido
      price_override: permission?.price_override ?? null,
      notes: permission?.notes ?? null,
    };
  });
  
  return {
    data: combinedData,
    isLoading: !channels,
  };
}

export function useToggleProductChannel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      productId, 
      channelId, 
      isAllowed,
      priceOverride,
    }: { 
      productId: string; 
      channelId: string; 
      isAllowed: boolean;
      priceOverride?: number | null;
    }) => {
      // Upsert: insert or update
      const { error } = await supabase
        .from('product_allowed_channels')
        .upsert({
          product_id: productId,
          channel_id: channelId,
          is_allowed: isAllowed,
          price_override: priceOverride,
        }, {
          onConflict: 'product_id,channel_id',
        });
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-channels', variables.productId] });
      toast.success(variables.isAllowed ? 'Canal habilitado para este producto' : 'Canal deshabilitado');
    },
    onError: (error) => {
      console.error('Error toggling product channel:', error);
      toast.error('Error al cambiar permisos del canal');
    },
  });
}

export function useUpdateProductChannelPrice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      productId, 
      channelId, 
      priceOverride,
    }: { 
      productId: string; 
      channelId: string; 
      priceOverride: number | null;
    }) => {
      const { error } = await supabase
        .from('product_allowed_channels')
        .update({ price_override: priceOverride })
        .eq('product_id', productId)
        .eq('channel_id', channelId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-channels', variables.productId] });
      toast.success('Precio por canal actualizado');
    },
    onError: (error) => {
      console.error('Error updating channel price:', error);
      toast.error('Error al actualizar precio');
    },
  });
}

// =====================================================
// HOOK: useProductBranchAuthorization - Sucursales autorizadas por marca
// Reemplaza el sistema de exclusiones con branch_products.is_enabled_by_brand
// =====================================================

export function useProductBranchAuthorization(productId: string | undefined) {
  return useQuery({
    queryKey: ['product-branch-authorization', productId],
    queryFn: async () => {
      if (!productId) return [];
      
      const { data, error } = await supabase
        .from('branch_products')
        .select('branch_id, is_enabled_by_brand')
        .eq('product_id', productId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!productId,
  });
}

export function useUpdateProductBranchAuthorization() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      productId, 
      branchAuthorizations,
    }: { 
      productId: string; 
      branchAuthorizations: { branchId: string; isEnabled: boolean }[];
    }) => {
      // Upsert each branch authorization
      for (const auth of branchAuthorizations) {
        const { error } = await supabase
          .from('branch_products')
          .upsert({
            product_id: productId,
            branch_id: auth.branchId,
            is_enabled_by_brand: auth.isEnabled,
            // Default is_available to false when creating new records
            is_available: false,
          }, {
            onConflict: 'product_id,branch_id',
            ignoreDuplicates: false,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-branch-authorization', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['branch-products'] });
      toast.success('Autorización de sucursales actualizada');
    },
    onError: (error) => {
      console.error('Error updating branch authorization:', error);
      toast.error('Error al actualizar autorización');
    },
  });
}
