import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ChannelProduct, UnavailableReason, ToggleChannelAvailabilityParams } from "@/types/channels";
import { toast } from "sonner";

// =====================================================
// HOOK: useChannelAvailability - Productos por Canal
// =====================================================

export function useChannelAvailability(branchId: string | undefined, channelSlug: string | undefined) {
  return useQuery({
    queryKey: ['channel-availability', branchId, channelSlug],
    queryFn: async () => {
      if (!branchId || !channelSlug) return [];
      
      const { data, error } = await supabase
        .rpc('get_available_products_for_channel', {
          p_branch_id: branchId,
          p_channel_slug: channelSlug,
        });
      
      if (error) {
        // Si el canal no está habilitado, retornar vacío
        if (error.message.includes('no habilitado')) {
          return [];
        }
        throw error;
      }
      
      return data as ChannelProduct[];
    },
    enabled: !!branchId && !!channelSlug,
    staleTime: 30 * 1000, // 30 segundos - disponibilidad cambia más frecuentemente
  });
}

// Matriz completa: todos los productos × todos los canales
export function useProductChannelMatrix(branchId: string | undefined) {
  return useQuery({
    queryKey: ['product-channel-matrix', branchId],
    queryFn: async () => {
      if (!branchId) return { products: [], channels: [], matrix: {} };
      
      // Obtener productos de la sucursal
      const { data: products, error: productsError } = await supabase
        .from('branch_products')
        .select(`
          product_id,
          products(id, name, image_url, price, category_id, product_categories(name))
        `)
        .eq('branch_id', branchId);
      
      if (productsError) throw productsError;
      
      // Obtener canales activos de la sucursal
      const { data: channels, error: channelsError } = await supabase
        .from('branch_channels')
        .select(`
          channel_id,
          is_enabled,
          channels(id, name, slug, icon, color)
        `)
        .eq('branch_id', branchId)
        .eq('is_enabled', true);
      
      if (channelsError) throw channelsError;
      
      // Obtener disponibilidad
      const { data: availability, error: availError } = await supabase
        .from('branch_product_channel_availability')
        .select('*')
        .eq('branch_id', branchId);
      
      if (availError) throw availError;
      
      // Obtener permisos de producto-canal (a nivel marca)
      const productIds = products.map(p => p.product_id);
      const { data: permissions, error: permError } = await supabase
        .from('product_allowed_channels')
        .select('*')
        .in('product_id', productIds);
      
      if (permError) throw permError;
      
      // Construir matriz
      const matrix: Record<string, Record<string, {
        isAllowed: boolean;
        isAvailable: boolean;
        unavailableReason?: string | null;
        stockQuantity?: number | null;
        localPriceOverride?: number | null;
      }>> = {};
      
      for (const product of products) {
        matrix[product.product_id] = {};
        
        for (const channel of channels) {
          const channelId = channel.channel_id;
          
          // Verificar si está permitido a nivel marca
          const permission = permissions.find(
            p => p.product_id === product.product_id && p.channel_id === channelId
          );
          const isAllowed = permission?.is_allowed ?? false;
          
          // Verificar disponibilidad local
          const avail = availability.find(
            a => a.product_id === product.product_id && a.channel_id === channelId
          );
          
          matrix[product.product_id][channelId] = {
            isAllowed,
            isAvailable: isAllowed ? (avail?.is_available ?? true) : false,
            unavailableReason: avail?.unavailable_reason,
            stockQuantity: avail?.stock_quantity,
            localPriceOverride: avail?.local_price_override,
          };
        }
      }
      
      return {
        products: products.map(p => ({
          id: p.product_id,
          name: p.products?.name ?? '',
          imageUrl: p.products?.image_url,
          price: p.products?.price,
          categoryName: p.products?.product_categories?.name,
        })),
        channels: channels.map(c => ({
          id: c.channel_id,
          name: c.channels?.name ?? '',
          slug: c.channels?.slug ?? '',
          icon: c.channels?.icon,
          color: c.channels?.color,
        })),
        matrix,
      };
    },
    enabled: !!branchId,
    staleTime: 30 * 1000,
  });
}

export function useToggleChannelAvailability() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      branchId, 
      productId, 
      channelId, 
      isAvailable, 
      reason 
    }: ToggleChannelAvailabilityParams) => {
      const { data, error } = await supabase
        .rpc('toggle_product_channel_availability', {
          p_branch_id: branchId,
          p_product_id: productId,
          p_channel_id: channelId,
          p_is_available: isAvailable,
          p_reason: reason ?? null,
        });
      
      if (error) throw error;
      return data;
    },
    onMutate: async (variables) => {
      // Cancelar queries en vuelo
      await queryClient.cancelQueries({ 
        queryKey: ['channel-availability', variables.branchId] 
      });
      await queryClient.cancelQueries({ 
        queryKey: ['product-channel-matrix', variables.branchId] 
      });
      
      // Optimistic update para la matriz
      const previousMatrix = queryClient.getQueryData(['product-channel-matrix', variables.branchId]);
      
      queryClient.setQueryData(['product-channel-matrix', variables.branchId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          matrix: {
            ...old.matrix,
            [variables.productId]: {
              ...old.matrix[variables.productId],
              [variables.channelId]: {
                ...old.matrix[variables.productId]?.[variables.channelId],
                isAvailable: variables.isAvailable,
                unavailableReason: variables.reason,
              },
            },
          },
        };
      });
      
      return { previousMatrix };
    },
    onError: (err, variables, context) => {
      // Rollback en caso de error
      if (context?.previousMatrix) {
        queryClient.setQueryData(
          ['product-channel-matrix', variables.branchId], 
          context.previousMatrix
        );
      }
      toast.error('Error al actualizar disponibilidad');
    },
    onSettled: (_, __, variables) => {
      // Invalidar queries para asegurar datos frescos
      queryClient.invalidateQueries({ 
        queryKey: ['channel-availability', variables.branchId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['product-channel-matrix', variables.branchId] 
      });
    },
  });
}

// =====================================================
// Bulk update de disponibilidad
// =====================================================

export function useBulkToggleAvailability() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      branchId, 
      updates,
    }: { 
      branchId: string; 
      updates: Array<{
        productId: string;
        channelId: string;
        isAvailable: boolean;
        reason?: UnavailableReason;
      }>;
    }) => {
      // Ejecutar todas las actualizaciones
      for (const update of updates) {
        const { error } = await supabase
          .rpc('toggle_product_channel_availability', {
            p_branch_id: branchId,
            p_product_id: update.productId,
            p_channel_id: update.channelId,
            p_is_available: update.isAvailable,
            p_reason: update.reason ?? null,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['channel-availability', variables.branchId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['product-channel-matrix', variables.branchId] 
      });
      toast.success(`${variables.updates.length} productos actualizados`);
    },
    onError: (error) => {
      console.error('Error bulk updating availability:', error);
      toast.error('Error al actualizar productos');
    },
  });
}
