import type { Tables } from '@/integrations/supabase/types';
import type { usePreparacionMutations } from '@/hooks/usePreparaciones';

export type Preparacion = Tables<'preparaciones'>;
export type CategoriaPreparacion = Tables<'categorias_preparacion'>;
export type PreparacionMutations = ReturnType<typeof usePreparacionMutations>;

export interface IngredienteLine {
  tipo_linea: string;
  insumo_id: string;
  sub_preparacion_id: string;
  cantidad: number;
  unidad: string;
  insumo: {
    id: string;
    nombre: string;
    unidad_base: string;
    costo_por_unidad_base: number | null;
  } | null;
  sub_preparacion: {
    id: string;
    nombre: string;
    costo_calculado: number | null;
  } | null;
}

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(value);

export const UNIDADES = [
  { value: 'g', label: 'Gramos (g)' },
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'ml', label: 'Mililitros (ml)' },
  { value: 'l', label: 'Litros (l)' },
  { value: 'un', label: 'Unidades' },
];

export function calcSubtotal(cantidad: number, costoUnit: number, unidad: string) {
  if (!cantidad || !costoUnit) return 0;
  const mult = unidad === 'kg' || unidad === 'l' ? 1000 : 1;
  return cantidad * costoUnit * mult;
}
