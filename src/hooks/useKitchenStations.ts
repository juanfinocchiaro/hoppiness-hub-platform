/**
 * useKitchenStations - CRUD for kitchen_stations table
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface KitchenStation {
  id: string;
  branch_id: string;
  name: string;
  icon: string;
  sort_order: number;
  kds_enabled: boolean;
  printer_id: string | null;
  print_on: string;
  print_copies: number;
  is_active: boolean;
  created_at: string;
}

export function useKitchenStations(branchId: string) {
  const qc = useQueryClient();
  const queryKey = ['kitchen-stations', branchId];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kitchen_stations')
        .select('*')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as KitchenStation[];
    },
    enabled: !!branchId,
  });

  const create = useMutation({
    mutationFn: async (station: Omit<KitchenStation, 'id' | 'created_at'>) => {
      const { error } = await supabase.from('kitchen_stations').insert(station);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success('Estación creada');
    },
    onError: () => toast.error('Error al crear estación'),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...data }: Partial<KitchenStation> & { id: string }) => {
      const { error } = await supabase.from('kitchen_stations').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success('Estación actualizada');
    },
    onError: () => toast.error('Error al actualizar'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('kitchen_stations')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success('Estación eliminada');
    },
    onError: () => toast.error('Error al eliminar'),
  });

  return { ...query, create, update, remove };
}
