import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fromUntyped } from '@/lib/supabase-helpers';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface CodigoDescuento {
  id: string;
  codigo: string;
  tipo: 'descuento_porcentaje' | 'descuento_fijo';
  valor: number;
  usos_maximos: number | null;
  usos_actuales: number;
  uso_unico_por_usuario: boolean;
  monto_minimo_pedido: number | null;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
  branch_ids: string[];
  created_at: string;
}

export type CodigoDescuentoFormData = Omit<CodigoDescuento, 'id' | 'usos_actuales' | 'created_at'>;

export function useCodigosDescuento() {
  return useQuery({
    queryKey: ['codigos-descuento'],
    queryFn: async () => {
      const { data, error } = await fromUntyped('codigos_descuento')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as CodigoDescuento[];
    },
  });
}

export function useValidateCode(branchId: string | undefined) {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ codigo, subtotal }: { codigo: string; subtotal: number }) => {
      const { data, error } = await fromUntyped('codigos_descuento')
        .select('*')
        .ilike('codigo', codigo.trim())
        .eq('activo', true)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Código no válido');

      const code = data as CodigoDescuento;
      const today = new Date().toISOString().slice(0, 10);

      if (code.fecha_inicio && today < code.fecha_inicio) throw new Error('Este código aún no está activo');
      if (code.fecha_fin && today > code.fecha_fin) throw new Error('Este código ya expiró');
      if (code.usos_maximos && code.usos_actuales >= code.usos_maximos) throw new Error('Este código ya alcanzó el máximo de usos');
      if (code.branch_ids.length > 0) {
        if (!branchId) throw new Error('No se puede validar el código sin un local seleccionado');
        if (!code.branch_ids.includes(branchId)) throw new Error('Este código no aplica en este local');
      }
      if (code.monto_minimo_pedido && subtotal < code.monto_minimo_pedido) {
        throw new Error(`Pedido mínimo: $${code.monto_minimo_pedido.toLocaleString('es-AR')}`);
      }

      if (code.uso_unico_por_usuario) {
        if (!user) throw new Error('Iniciá sesión para usar este código');
        const { count } = await fromUntyped('codigos_descuento_usos')
          .select('id', { count: 'exact', head: true })
          .eq('codigo_id', code.id)
          .eq('user_id', user.id);
        if (count && count > 0) throw new Error('Ya usaste este código');
      }

      let descuento = 0;
      if (code.tipo === 'descuento_porcentaje') {
        descuento = Math.round(subtotal * code.valor / 100);
      } else {
        descuento = Math.min(code.valor, subtotal);
      }

      return { code, descuento };
    },
  });
}

export function useCodigoDescuentoMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const create = useMutation({
    mutationFn: async (data: CodigoDescuentoFormData) => {
      const { data: result, error } = await fromUntyped('codigos_descuento')
        .insert({ ...data, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['codigos-descuento'] });
      toast.success('Código creado');
    },
    onError: (e) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CodigoDescuentoFormData> }) => {
      const { error } = await fromUntyped('codigos_descuento')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['codigos-descuento'] });
      toast.success('Código actualizado');
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await fromUntyped('codigos_descuento')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['codigos-descuento'] });
      toast.success('Código eliminado');
    },
    onError: (e) => toast.error(e.message),
  });

  return { create, update, remove };
}
