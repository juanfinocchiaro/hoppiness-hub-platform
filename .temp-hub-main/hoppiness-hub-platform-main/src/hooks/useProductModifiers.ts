import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ModifierOption {
  id: string;
  name: string;
  price_adjustment: number;
  image_url: string | null;
  is_active: boolean;
  display_order: number;
  is_available?: boolean; // From branch_modifier_options
}

export interface ModifierGroup {
  id: string;
  name: string;
  description: string | null;
  modifier_type: 'adicional' | 'personalizacion' | 'combo';
  selection_type: 'single' | 'multiple';
  min_selections: number;
  max_selections: number;
  display_order: number;
  options: ModifierOption[];
}

export interface ProductModifiers {
  productId: string;
  groups: ModifierGroup[];
}

export function useProductModifiers(productId: string | null, branchId: string | null) {
  const [modifiers, setModifiers] = useState<ModifierGroup[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productId || !branchId) {
      setModifiers([]);
      return;
    }

    async function fetchModifiers() {
      setLoading(true);
      try {
        // 1. Get modifier group assignments for this product
        const { data: assignments } = await supabase
          .from('product_modifier_assignments')
          .select(`
            modifier_group_id,
            display_order,
            modifier_group:modifier_groups(
              id,
              name,
              description,
              modifier_type,
              selection_type,
              min_selections,
              max_selections,
              display_order
            )
          `)
          .eq('product_id', productId)
          .eq('is_enabled', true)
          .order('display_order');

        if (!assignments || assignments.length === 0) {
          setModifiers([]);
          setLoading(false);
          return;
        }

        // 2. Get all group IDs
        const groupIds = assignments
          .map(a => (a.modifier_group as any)?.id)
          .filter(Boolean);

        // 3. Get options for all groups
        const { data: options } = await supabase
          .from('modifier_options')
          .select('*')
          .in('group_id', groupIds)
          .eq('is_active', true)
          .eq('is_enabled_by_brand', true)
          .order('display_order');

        // 4. Get branch availability for options
        const optionIds = options?.map(o => o.id) || [];
        const { data: branchOptions } = await supabase
          .from('branch_modifier_options')
          .select('modifier_option_id, is_available')
          .eq('branch_id', branchId)
          .in('modifier_option_id', optionIds);

        // Create availability map
        const availabilityMap = new Map<string, boolean>();
        branchOptions?.forEach(bo => {
          availabilityMap.set(bo.modifier_option_id, bo.is_available);
        });

        // 5. Build the groups with their options
        const groups: ModifierGroup[] = assignments
          .filter(a => a.modifier_group)
          .map(a => {
            const group = a.modifier_group as any;
            const groupOptions = (options || [])
              .filter(o => o.group_id === group.id)
              .map(o => ({
                id: o.id,
                name: o.name,
                price_adjustment: o.price_adjustment || 0,
                image_url: o.image_url,
                is_active: o.is_active,
                display_order: o.display_order || 0,
                // Default to available if no branch override exists
                is_available: availabilityMap.has(o.id) ? availabilityMap.get(o.id) : true,
              }))
              .sort((a, b) => a.display_order - b.display_order);

            return {
              id: group.id,
              name: group.name,
              description: group.description,
              modifier_type: group.modifier_type as 'adicional' | 'personalizacion' | 'combo',
              selection_type: group.selection_type as 'single' | 'multiple',
              min_selections: group.min_selections || 0,
              max_selections: group.max_selections || 10,
              display_order: a.display_order || group.display_order || 0,
              options: groupOptions,
            };
          })
          .sort((a, b) => a.display_order - b.display_order);

        setModifiers(groups);
      } catch (error) {
        console.error('Error fetching modifiers:', error);
        setModifiers([]);
      } finally {
        setLoading(false);
      }
    }

    fetchModifiers();
  }, [productId, branchId]);

  return { modifiers, loading };
}

// Helper to calculate total price of selected modifiers
export function calculateModifiersTotal(
  groups: ModifierGroup[],
  selections: Record<string, string[]>
): number {
  let total = 0;
  
  groups.forEach(group => {
    const selectedIds = selections[group.id] || [];
    selectedIds.forEach(optionId => {
      const option = group.options.find(o => o.id === optionId);
      if (option) {
        total += option.price_adjustment;
      }
    });
  });

  return total;
}

// Helper to validate selections meet requirements
export function validateSelections(
  groups: ModifierGroup[],
  selections: Record<string, string[]>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  groups.forEach(group => {
    const selected = (selections[group.id] || []).length;
    
    if (group.min_selections > 0 && selected < group.min_selections) {
      errors.push(`Seleccioná al menos ${group.min_selections} opción(es) en "${group.name}"`);
    }
    
    if (selected > group.max_selections) {
      errors.push(`Máximo ${group.max_selections} opción(es) en "${group.name}"`);
    }
  });

  return { valid: errors.length === 0, errors };
}
