/**
 * usePrintConfig - Config de salidas de impresión (ticket, delivery, backup)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PrintConfig {
  id: string;
  branch_id: string;
  ticket_printer_id: string | null;
  ticket_enabled: boolean;
  ticket_trigger: string;
  delivery_printer_id: string | null;
  delivery_enabled: boolean;
  backup_printer_id: string | null;
  backup_enabled: boolean;
  reprint_requires_pin: boolean;
  comanda_printer_id: string | null;
  vale_printer_id: string | null;
  salon_vales_enabled: boolean;
  no_salon_todo_en_comanda: boolean;
  updated_at: string;
}

export function usePrintConfig(branchId: string) {
  const qc = useQueryClient();
  const queryKey = ['print-config', branchId];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('print_config')
        .select('*')
        .eq('branch_id', branchId)
        .maybeSingle();
      if (error) throw error;
      return data as PrintConfig | null;
    },
    enabled: !!branchId,
  });

  const upsert = useMutation({
    mutationFn: async (config: Partial<PrintConfig>) => {
      const { error } = await supabase
        .from('print_config')
        .upsert({ branch_id: branchId, ...config, updated_at: new Date().toISOString() }, { onConflict: 'branch_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success('Configuración guardada');
    },
    onError: () => toast.error('Error al guardar configuración'),
  });

  return { ...query, upsert };
}
