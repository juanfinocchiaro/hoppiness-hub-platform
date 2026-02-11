import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useModificadores(itemId: string | undefined) {
  return useQuery({
    queryKey: ['modificadores', itemId],
    queryFn: async () => {
      if (!itemId) return null;
      const { data, error } = await supabase
        .from('item_modificadores' as any)
        .select('*')
        .eq('item_carta_id', itemId)
        .order('tipo')
        .order('orden');
      if (error) throw error;
      return data as any[];
    },
    enabled: !!itemId,
  });
}

export function useModificadoresMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: async (data: any) => {
      const { data: result, error } = await supabase
        .from('item_modificadores' as any)
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['modificadores', variables.item_carta_id] });
      toast.success('Modificador agregado');
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from('item_modificadores' as any)
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modificadores'] });
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('item_modificadores' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modificadores'] });
      toast.success('Modificador eliminado');
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  return { create, update, remove };
}
