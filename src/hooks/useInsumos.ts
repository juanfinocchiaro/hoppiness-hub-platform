import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { InsumoFormData, CategoriaInsumoFormData } from '@/types/financial';

// ===== CATEGORÍAS =====
export function useCategoriasInsumo() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['categorias-insumo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categorias_insumo')
        .select('*')
        .is('deleted_at', null)
        .order('orden', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCategoriaInsumoMutations() {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: async (data: CategoriaInsumoFormData) => {
      const { data: result, error } = await supabase
        .from('categorias_insumo')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias-insumo'] });
      toast.success('Categoría creada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CategoriaInsumoFormData> }) => {
      const { error } = await supabase
        .from('categorias_insumo')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias-insumo'] });
      toast.success('Categoría actualizada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categorias_insumo')
        .update({ deleted_at: new Date().toISOString(), activo: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias-insumo'] });
      toast.success('Categoría eliminada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create, update, softDelete };
}

// ===== INSUMOS =====
export function useInsumos() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['insumos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insumos')
        .select('*, categorias_insumo(nombre, tipo), rdo_categories!insumos_rdo_category_code_fkey(code, name), proveedor_obligatorio:proveedores!insumos_proveedor_obligatorio_id_fkey(id, razon_social), proveedor_sugerido:proveedores!insumos_proveedor_sugerido_id_fkey(id, razon_social)')
        .is('deleted_at', null)
        .neq('activo', false)
        .order('nombre');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useInsumoMutations() {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: async (data: InsumoFormData) => {
      const { data: result, error } = await supabase
        .from('insumos')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insumos'] });
      toast.success('Insumo creado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsumoFormData> }) => {
      const { error } = await supabase
        .from('insumos')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insumos'] });
      toast.success('Insumo actualizado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('insumos')
        .update({ deleted_at: new Date().toISOString(), activo: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insumos'] });
      toast.success('Insumo eliminado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create, update, softDelete };
}
