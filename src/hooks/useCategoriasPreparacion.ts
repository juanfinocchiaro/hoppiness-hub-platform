import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useCategoriasPreparacion() {
  return useQuery({
    queryKey: ['categorias-preparacion'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categorias_preparacion')
        .select('*')
        .eq('activo', true)
        .is('deleted_at', null)
        .order('orden');
      if (error) throw error;
      return data;
    },
  });
}

export function useCategoriaPreparacionMutations() {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: async (data: { nombre: string; orden: number }) => {
      const { data: cat, error } = await supabase
        .from('categorias_preparacion')
        .insert(data as any)
        .select()
        .single();
      if (error) throw error;
      return cat;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias-preparacion'] });
      toast.success('Categoría creada');
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from('categorias_preparacion')
        .update({ ...data, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias-preparacion'] });
      toast.success('Categoría actualizada');
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  const reorder = useMutation({
    mutationFn: async (items: { id: string; orden: number }[]) => {
      for (const item of items) {
        const { error } = await supabase
          .from('categorias_preparacion')
          .update({ orden: item.orden } as any)
          .eq('id', item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorias-preparacion'] }),
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categorias_preparacion')
        .update({ activo: false, deleted_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
      // Unassign recipes from this category
      await supabase
        .from('preparaciones')
        .update({ categoria_preparacion_id: null } as any)
        .eq('categoria_preparacion_id', id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias-preparacion'] });
      qc.invalidateQueries({ queryKey: ['preparaciones'] });
      toast.success('Categoría eliminada');
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  return { create, update, reorder, softDelete };
}
