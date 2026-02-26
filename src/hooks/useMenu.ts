import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// NOTA: v_menu_costos y menu_productos están deprecados.
// El sistema activo de costos usa items_carta + CentroCostosPage (useItemsCarta).

// Categorías del menú
export function useMenuCategorias() {
  return useQuery({
    queryKey: ['menu-categorias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_categorias')
        .select('*')
        .eq('activo', true)
        .order('orden');
      if (error) throw error;
      return data;
    },
  });
}

// Mutations para categorías
export function useMenuCategoriaMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: async (data: { nombre: string; descripcion?: string; orden?: number }) => {
      const { data: cat, error } = await supabase
        .from('menu_categorias')
        .insert({
          nombre: data.nombre,
          descripcion: data.descripcion || null,
          orden: data.orden || 99,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return cat;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categorias'] });
      toast.success('Categoría creada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { nombre?: string; descripcion?: string; orden?: number };
    }) => {
      const { error } = await supabase
        .from('menu_categorias')
        .update({ ...data, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categorias'] });
      toast.success('Categoría actualizada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const reorder = useMutation({
    mutationFn: async (items: { id: string; orden: number }[]) => {
      for (const item of items) {
        const { error } = await supabase
          .from('menu_categorias')
          .update({ orden: item.orden, updated_at: new Date().toISOString() } as any)
          .eq('id', item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categorias'] });
    },
    onError: (e) => toast.error(`Error al reordenar: ${e.message}`),
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('menu_categorias')
        .update({ activo: false, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categorias'] });
      queryClient.invalidateQueries({ queryKey: ['menu-productos'] });
      toast.success('Categoría eliminada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const toggleVisibility = useMutation({
    mutationFn: async ({ id, visible }: { id: string; visible: boolean }) => {
      const { error } = await supabase
        .from('menu_categorias')
        .update({ visible_en_carta: visible, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categorias'] });
      toast.success('Visibilidad actualizada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create, update, reorder, softDelete, toggleVisibility };
}

// Productos del menú con datos relacionados
export function useMenuProductos() {
  return useQuery({
    queryKey: ['menu-productos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_productos')
        .select(
          `
          *,
          menu_categorias(id, nombre),
          menu_precios(precio_base, fc_objetivo),
          insumos(id, nombre, costo_por_unidad_base)
        `,
        )
        .eq('activo', true)
        .order('orden');
      if (error) throw error;
      return data;
    },
  });
}

// Ficha técnica de un producto
export function useFichaTecnica(productoId: string | undefined) {
  return useQuery({
    queryKey: ['ficha-tecnica', productoId],
    queryFn: async () => {
      if (!productoId) return null;
      const { data, error } = await supabase
        .from('menu_fichas_tecnicas')
        .select(
          `
          *,
          insumos(id, nombre, unidad_base, costo_por_unidad_base)
        `,
        )
        .eq('menu_producto_id', productoId)
        .order('orden');
      if (error) throw error;
      return data;
    },
    enabled: !!productoId,
  });
}

// Mutations para productos
export function useMenuProductoMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: async (data: any) => {
      const { data: producto, error: errProducto } = await supabase
        .from('menu_productos')
        .insert({
          nombre: data.nombre,
          nombre_corto: data.nombre_corto,
          descripcion: data.descripcion,
          tipo: data.tipo,
          categoria_id: data.categoria_id,
          insumo_id: data.insumo_id,
          disponible_delivery: data.disponible_delivery,
          visible_en_carta: data.visible_en_carta ?? true,
        } as any)
        .select()
        .single();

      if (errProducto) throw errProducto;
      return producto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-productos'] });
      toast.success('Producto creado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error: errProducto } = await supabase
        .from('menu_productos')
        .update({
          nombre: data.nombre,
          nombre_corto: data.nombre_corto,
          descripcion: data.descripcion,
          tipo: data.tipo,
          categoria_id: data.categoria_id,
          insumo_id: data.insumo_id,
          disponible_delivery: data.disponible_delivery,
          visible_en_carta: data.visible_en_carta ?? true,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', id);

      if (errProducto) throw errProducto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-productos'] });
      toast.success('Producto actualizado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('menu_productos')
        .update({ activo: false, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-productos'] });
      toast.success('Producto eliminado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create, update, softDelete };
}

// Mutations para ficha técnica
export function useFichaTecnicaMutations() {
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: async ({ menu_producto_id, items }: { menu_producto_id: string; items: any[] }) => {
      await supabase.from('menu_fichas_tecnicas').delete().eq('menu_producto_id', menu_producto_id);

      if (items.length > 0) {
        const { error } = await supabase.from('menu_fichas_tecnicas').insert(
          items.map((item, index) => ({
            menu_producto_id,
            insumo_id: item.insumo_id,
            cantidad: item.cantidad,
            unidad: item.unidad,
            orden: index,
          })) as any,
        );

        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ficha-tecnica', variables.menu_producto_id] });
      queryClient.invalidateQueries({ queryKey: ['menu-productos'] });
      toast.success('Ficha técnica guardada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { save };
}

// Historial de precios
export function useHistorialPrecios(productoId: string | undefined) {
  return useQuery({
    queryKey: ['historial-precios', productoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_precios_historial')
        .select('*')
        .eq('menu_producto_id', productoId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!productoId,
  });
}

// Cambiar precio (con historial)
export function useCambiarPrecioMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productoId,
      precioAnterior,
      precioNuevo,
      motivo,
      userId,
    }: {
      productoId: string;
      precioAnterior: number;
      precioNuevo: number;
      motivo?: string;
      userId?: string;
    }) => {
      // Update price
      const { error: errPrecio } = await supabase.from('menu_precios').upsert(
        {
          menu_producto_id: productoId,
          precio_base: precioNuevo,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: 'menu_producto_id' },
      );
      if (errPrecio) throw errPrecio;

      // Record history
      const { error: errHist } = await supabase.from('menu_precios_historial').insert({
        menu_producto_id: productoId,
        precio_anterior: precioAnterior,
        precio_nuevo: precioNuevo,
        motivo: motivo || null,
        usuario_id: userId || null,
      } as any);
      if (errHist) throw errHist;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-productos'] });
      queryClient.invalidateQueries({ queryKey: ['centro-costos'] });
      queryClient.invalidateQueries({ queryKey: ['historial-precios'] });
      toast.success('Precio actualizado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });
}
