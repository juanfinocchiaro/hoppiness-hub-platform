/**
 * Hook para gestionar conversiones de ingredientes alternativos
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleError } from '@/lib/errorHandler';

export interface IngredientWithAlternative {
  id: string;
  name: string;
  unit: string;
  usage_unit: string | null;
  cost_per_unit: number;
  alternative_ingredient_id: string | null;
  notify_on_alternative_use: boolean;
  alternative?: {
    id: string;
    name: string;
    unit: string;
    cost_per_unit: number;
  } | null;
}

export interface IngredientConversion {
  id: string;
  branch_id: string;
  from_ingredient_id: string;
  to_ingredient_id: string;
  quantity: number;
  reason: string;
  triggered_by_product_id: string | null;
  from_ingredient_cost: number | null;
  to_ingredient_cost: number | null;
  cost_difference: number | null;
  performed_by: string | null;
  created_at: string;
  from_ingredient?: { id: string; name: string };
  to_ingredient?: { id: string; name: string };
  product?: { id: string; name: string } | null;
  performer?: { full_name: string } | null;
}

export interface ProductMissingIngredient {
  productId: string;
  productName: string;
  missingIngredient: {
    id: string;
    name: string;
    currentStock: number;
    requiredPerUnit: number;
    unit: string;
  };
  alternativeIngredient?: {
    id: string;
    name: string;
    currentStock: number;
    unit: string;
    cost: number;
  } | null;
}

/**
 * Hook para obtener ingredientes con sus alternativos configurados
 */
export function useIngredientsWithAlternatives() {
  return useQuery({
    queryKey: ['ingredients-with-alternatives'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ingredients')
        .select(`
          id,
          name,
          unit,
          usage_unit,
          cost_per_unit,
          alternative_ingredient_id,
          notify_on_alternative_use
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      // Fetch alternatives for ingredients that have one
      const ingredientsWithAlt = data?.filter(i => i.alternative_ingredient_id) || [];
      const altIds = ingredientsWithAlt.map(i => i.alternative_ingredient_id).filter(Boolean) as string[];

      let alternativesMap = new Map<string, { id: string; name: string; unit: string; cost_per_unit: number }>();
      
      if (altIds.length > 0) {
        const { data: alternatives } = await supabase
          .from('ingredients')
          .select('id, name, unit, cost_per_unit')
          .in('id', altIds);
        
        alternatives?.forEach(alt => {
          alternativesMap.set(alt.id, alt);
        });
      }

      return (data || []).map(ingredient => ({
        ...ingredient,
        alternative: ingredient.alternative_ingredient_id 
          ? alternativesMap.get(ingredient.alternative_ingredient_id) || null
          : null,
      })) as IngredientWithAlternative[];
    },
    staleTime: 60000,
  });
}

/**
 * Hook para obtener el historial de conversiones de una sucursal
 */
export function useConversionHistory(branchId: string | undefined) {
  return useQuery({
    queryKey: ['conversion-history', branchId],
    queryFn: async () => {
      if (!branchId) return [];

      const { data, error } = await supabase
        .from('ingredient_conversions')
        .select(`
          id,
          branch_id,
          from_ingredient_id,
          to_ingredient_id,
          quantity,
          reason,
          triggered_by_product_id,
          from_ingredient_cost,
          to_ingredient_cost,
          cost_difference,
          performed_by,
          created_at,
          from_ingredient:ingredients!ingredient_conversions_from_ingredient_id_fkey(id, name),
          to_ingredient:ingredients!ingredient_conversions_to_ingredient_id_fkey(id, name),
          product:products(id, name),
          performer:profiles(full_name)
        `)
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as IngredientConversion[];
    },
    enabled: !!branchId,
  });
}

/**
 * Hook para obtener stock de ingredientes en una sucursal
 */
export function useBranchIngredientStock(branchId: string | undefined, ingredientIds: string[]) {
  return useQuery({
    queryKey: ['branch-ingredient-stock', branchId, ingredientIds],
    queryFn: async () => {
      if (!branchId || ingredientIds.length === 0) return [];

      const { data, error } = await supabase
        .from('branch_ingredients')
        .select('ingredient_id, current_stock')
        .eq('branch_id', branchId)
        .in('ingredient_id', ingredientIds);

      if (error) throw error;
      return data;
    },
    enabled: !!branchId && ingredientIds.length > 0,
  });
}

/**
 * Mutation para ejecutar una conversión de ingredientes
 */
export function useExecuteConversion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      branchId,
      fromIngredientId,
      toIngredientId,
      quantity,
      triggeredByProductId,
      reason,
    }: {
      branchId: string;
      fromIngredientId: string;
      toIngredientId: string;
      quantity: number;
      triggeredByProductId?: string;
      reason?: string;
    }) => {
      const { data, error } = await supabase.rpc('execute_ingredient_conversion', {
        p_branch_id: branchId,
        p_from_ingredient_id: fromIngredientId,
        p_to_ingredient_id: toIngredientId,
        p_quantity: quantity,
        p_triggered_by_product_id: triggeredByProductId || null,
        p_reason: reason || 'Sin stock del principal',
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: (_, variables) => {
      toast.success('Conversión realizada correctamente');
      queryClient.invalidateQueries({ queryKey: ['conversion-history', variables.branchId] });
      queryClient.invalidateQueries({ queryKey: ['branch-ingredient-stock'] });
      queryClient.invalidateQueries({ queryKey: ['branch-ingredients'] });
    },
    onError: (error) => {
      handleError(error, { userMessage: 'Error al realizar la conversión', context: 'useExecuteConversion' });
    },
  });
}

/**
 * Mutation para actualizar el ingrediente alternativo
 */
export function useUpdateAlternativeIngredient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ingredientId,
      alternativeIngredientId,
      notifyOnUse,
    }: {
      ingredientId: string;
      alternativeIngredientId: string | null;
      notifyOnUse: boolean;
    }) => {
      const { error } = await supabase
        .from('ingredients')
        .update({
          alternative_ingredient_id: alternativeIngredientId,
          notify_on_alternative_use: notifyOnUse,
        })
        .eq('id', ingredientId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Ingrediente alternativo actualizado');
      queryClient.invalidateQueries({ queryKey: ['ingredients-with-alternatives'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
    onError: (error) => {
      handleError(error, { userMessage: 'Error al actualizar', context: 'useUpdateAlternativeIngredient' });
    },
  });
}

/**
 * Obtener productos sin stock por falta de ingredientes y sus posibles alternativas
 */
export async function getProductsMissingStock(branchId: string): Promise<ProductMissingIngredient[]> {
  // Obtener productos con recetas
  const { data: recipes, error: recipesError } = await supabase
    .from('product_recipes')
    .select(`
      product_id,
      ingredient_id,
      quantity_required,
      product:products(id, name, is_active),
      ingredient:ingredients(id, name, unit, alternative_ingredient_id)
    `)
    .gt('quantity_required', 0);

  if (recipesError) throw recipesError;

  // Obtener stock de la sucursal
  const { data: branchStock, error: stockError } = await supabase
    .from('branch_ingredients')
    .select('ingredient_id, current_stock')
    .eq('branch_id', branchId);

  if (stockError) throw stockError;

  const stockMap = new Map(branchStock?.map(s => [s.ingredient_id, s.current_stock]) || []);

  // Encontrar productos sin stock
  const missingProducts: ProductMissingIngredient[] = [];
  const processedProducts = new Set<string>();

  for (const recipe of recipes || []) {
    if (!recipe.product || !recipe.ingredient) continue;
    if (processedProducts.has(recipe.product_id)) continue;

    const currentStock = stockMap.get(recipe.ingredient_id) || 0;
    
    if (currentStock < recipe.quantity_required) {
      processedProducts.add(recipe.product_id);

      let alternativeInfo = null;
      if (recipe.ingredient.alternative_ingredient_id) {
        const altStock = stockMap.get(recipe.ingredient.alternative_ingredient_id) || 0;
        
        // Obtener info del alternativo
        const { data: altIngredient } = await supabase
          .from('ingredients')
          .select('id, name, unit, cost_per_unit')
          .eq('id', recipe.ingredient.alternative_ingredient_id)
          .single();

        if (altIngredient && altStock > 0) {
          alternativeInfo = {
            id: altIngredient.id,
            name: altIngredient.name,
            currentStock: altStock,
            unit: altIngredient.unit,
            cost: altIngredient.cost_per_unit,
          };
        }
      }

      missingProducts.push({
        productId: recipe.product_id,
        productName: recipe.product.name,
        missingIngredient: {
          id: recipe.ingredient_id,
          name: recipe.ingredient.name,
          currentStock,
          requiredPerUnit: recipe.quantity_required,
          unit: recipe.ingredient.unit,
        },
        alternativeIngredient: alternativeInfo,
      });
    }
  }

  return missingProducts;
}
