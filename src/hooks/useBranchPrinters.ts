/**
 * useBranchPrinters - CRUD for branch_printers table
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BranchPrinter {
  id: string;
  branch_id: string;
  name: string;
  connection_type: string;
  ip_address: string | null;
  port: number;
  paper_width: number;
  is_active: boolean;
  created_at: string;
}

export function useBranchPrinters(branchId: string) {
  const qc = useQueryClient();
  const queryKey = ['branch-printers', branchId];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branch_printers')
        .select('*')
        .eq('branch_id', branchId)
        .order('name');
      if (error) throw error;
      return data as BranchPrinter[];
    },
    enabled: !!branchId,
  });

  const create = useMutation({
    mutationFn: async (printer: Omit<BranchPrinter, 'id' | 'created_at'>) => {
      const { error } = await supabase.from('branch_printers').insert(printer);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success('Impresora creada');
    },
    onError: () => toast.error('Error al crear impresora'),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...data }: Partial<BranchPrinter> & { id: string }) => {
      const { error } = await supabase.from('branch_printers').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success('Impresora actualizada');
    },
    onError: () => toast.error('Error al actualizar'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('branch_printers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success('Impresora eliminada');
    },
    onError: () => toast.error('Error al eliminar'),
  });

  return { ...query, create, update, remove };
}
