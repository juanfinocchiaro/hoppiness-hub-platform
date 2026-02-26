/**
 * useWorkPositions - Hook para gestionar posiciones de trabajo configurables
 *
 * Las posiciones (cajero, sandwichero, cafetero, etc.) se cargan dinámicamente
 * desde la tabla work_positions en lugar de estar hardcodeadas.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WorkPosition {
  id: string;
  key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Obtiene todas las posiciones activas ordenadas por sort_order
 */
export function useWorkPositions() {
  return useQuery({
    queryKey: ['work-positions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_positions')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return data as WorkPosition[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutos - estas posiciones cambian poco
  });
}

/**
 * Obtiene TODAS las posiciones (incluyendo inactivas) para admin
 */
export function useAllWorkPositions() {
  return useQuery({
    queryKey: ['work-positions', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('work_positions').select('*').order('sort_order');

      if (error) throw error;
      return data as WorkPosition[];
    },
  });
}

/**
 * Helper para obtener el label de una posición dado su key
 */
export function useWorkPositionLabel(key: string | null | undefined): string {
  const { data: positions } = useWorkPositions();

  if (!key || !positions) return '';

  const position = positions.find((p) => p.key === key);
  return position?.label || key;
}

/**
 * Crear nueva posición (solo superadmin)
 */
export function useCreateWorkPosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { key: string; label: string; sort_order?: number }) => {
      const { data: result, error } = await supabase
        .from('work_positions')
        .insert({
          key: data.key.toLowerCase().replace(/\s+/g, '_'),
          label: data.label,
          sort_order: data.sort_order ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      return result as WorkPosition;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-positions'] });
      toast.success('Posición creada');
    },
    onError: (e: Error) => toast.error(`Error al crear posición: ${e.message}`),
  });
}

/**
 * Actualizar posición existente (solo superadmin)
 */
export function useUpdateWorkPosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<WorkPosition> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('work_positions')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result as WorkPosition;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-positions'] });
      toast.success('Posición actualizada');
    },
    onError: (e: Error) => toast.error(`Error al actualizar posición: ${e.message}`),
  });
}

/**
 * Eliminar posición (solo superadmin) - soft delete cambiando is_active
 */
export function useDeleteWorkPosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('work_positions')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-positions'] });
      toast.success('Posición eliminada');
    },
    onError: (e: Error) => toast.error(`Error al eliminar posición: ${e.message}`),
  });
}
