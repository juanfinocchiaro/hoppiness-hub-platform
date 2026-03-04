import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchMenuCategorias,
  createMenuCategoria,
  updateMenuCategoria,
  reorderMenuCategorias,
  softDeleteMenuCategoria,
  toggleMenuCategoriaVisibility,
} from '@/services/menuService';

// Categorías del menú
export function useMenuCategorias() {
  return useQuery({
    queryKey: ['menu-categorias'],
    queryFn: fetchMenuCategorias,
  });
}

// Mutations para categorías
export function useMenuCategoriaMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (data: { nombre: string; descripcion?: string; orden?: number }) =>
      createMenuCategoria(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categorias'] });
      toast.success('Categoría creada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { nombre?: string; descripcion?: string; orden?: number };
    }) => updateMenuCategoria(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categorias'] });
      toast.success('Categoría actualizada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const reorder = useMutation({
    mutationFn: (items: { id: string; orden: number }[]) => reorderMenuCategorias(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categorias'] });
    },
    onError: (e) => toast.error(`Error al reordenar: ${e.message}`),
  });

  const softDelete = useMutation({
    mutationFn: (id: string) => softDeleteMenuCategoria(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categorias'] });
      toast.success('Categoría eliminada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const toggleVisibility = useMutation({
    mutationFn: ({ id, visible }: { id: string; visible: boolean }) =>
      toggleMenuCategoriaVisibility(id, visible),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categorias'] });
      toast.success('Visibilidad actualizada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create, update, reorder, softDelete, toggleVisibility };
}
