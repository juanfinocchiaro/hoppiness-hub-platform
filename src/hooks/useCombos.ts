import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ComboItem {
  id: string;
  product_id: string | null;
  modifier_group_id: string | null;
  item_type: 'product' | 'modifier_group';
  quantity: number;
  price_adjustment: number;
  sort_order: number;
  // Joined data
  product_name?: string;
  product_price?: number;
  modifier_group_name?: string;
}

export interface Combo {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  items: ComboItem[];
  // Calculated
  calculated_savings?: number;
}

export function useCombos(options?: { includeInactive?: boolean }) {
  return useQuery({
    queryKey: ['combos', options?.includeInactive],
    queryFn: async (): Promise<Combo[]> => {
      // Get combos
      let query = supabase
        .from('combos')
        .select('*')
        .order('name');
      
      if (!options?.includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data: combos, error: combosError } = await query;
      if (combosError) throw combosError;
      if (!combos || combos.length === 0) return [];

      // Get combo items
      const comboIds = combos.map(c => c.id);
      const { data: items, error: itemsError } = await supabase
        .from('combo_items')
        .select('*')
        .in('combo_id', comboIds)
        .order('sort_order');
      
      if (itemsError) throw itemsError;

      // Get product data for items
      const productIds = (items || [])
        .filter(i => i.product_id)
        .map(i => i.product_id as string);
      
      const { data: products } = productIds.length > 0
        ? await supabase
            .from('products')
            .select('id, name, price')
            .in('id', productIds)
        : { data: [] };

      // Get modifier group data for items
      const groupIds = (items || [])
        .filter(i => i.modifier_group_id)
        .map(i => i.modifier_group_id as string);
      
      const { data: groups } = groupIds.length > 0
        ? await supabase
            .from('modifier_groups')
            .select('id, name')
            .in('id', groupIds)
        : { data: [] };

      // Build lookup maps
      const productMap = new Map((products || []).map(p => [p.id, p]));
      const groupMap = new Map((groups || []).map(g => [g.id, g]));

      // Combine data
      return combos.map(combo => {
        const comboItems: ComboItem[] = (items || [])
          .filter(i => i.combo_id === combo.id)
          .map(item => {
            const product = item.product_id ? productMap.get(item.product_id) : null;
            const group = item.modifier_group_id ? groupMap.get(item.modifier_group_id) : null;

            return {
              id: item.id,
              product_id: item.product_id,
              modifier_group_id: item.modifier_group_id,
              item_type: item.item_type as 'product' | 'modifier_group',
              quantity: item.quantity,
              price_adjustment: item.price_adjustment || 0,
              sort_order: item.sort_order,
              product_name: product?.name,
              product_price: product?.price,
              modifier_group_name: group?.name,
            };
          });

        // Calculate what price would be without combo
        const individualTotal = comboItems.reduce((sum, item) => {
          if (item.product_price) {
            return sum + (item.product_price * item.quantity);
          }
          return sum;
        }, 0);

        return {
          ...combo,
          items: comboItems,
          calculated_savings: Math.max(0, individualTotal - combo.base_price),
        };
      });
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCombo(comboId: string | null) {
  return useQuery({
    queryKey: ['combo', comboId],
    queryFn: async (): Promise<Combo | null> => {
      if (!comboId) return null;

      const { data: combo, error } = await supabase
        .from('combos')
        .select('*')
        .eq('id', comboId)
        .single();

      if (error) throw error;
      if (!combo) return null;

      // Get combo items
      const { data: items } = await supabase
        .from('combo_items')
        .select('*')
        .eq('combo_id', comboId)
        .order('sort_order');

      // Get product data
      const productIds = (items || [])
        .filter(i => i.product_id)
        .map(i => i.product_id as string);

      const { data: products } = productIds.length > 0
        ? await supabase.from('products').select('id, name, price').in('id', productIds)
        : { data: [] };

      // Get modifier groups
      const groupIds = (items || [])
        .filter(i => i.modifier_group_id)
        .map(i => i.modifier_group_id as string);

      const { data: groups } = groupIds.length > 0
        ? await supabase.from('modifier_groups').select('id, name').in('id', groupIds)
        : { data: [] };

      const productMap = new Map((products || []).map(p => [p.id, p]));
      const groupMap = new Map((groups || []).map(g => [g.id, g]));

      const comboItems: ComboItem[] = (items || []).map(item => {
        const product = item.product_id ? productMap.get(item.product_id) : null;
        const group = item.modifier_group_id ? groupMap.get(item.modifier_group_id) : null;

        return {
          id: item.id,
          product_id: item.product_id,
          modifier_group_id: item.modifier_group_id,
          item_type: item.item_type as 'product' | 'modifier_group',
          quantity: item.quantity,
          price_adjustment: item.price_adjustment || 0,
          sort_order: item.sort_order,
          product_name: product?.name,
          product_price: product?.price,
          modifier_group_name: group?.name,
        };
      });

      const individualTotal = comboItems.reduce((sum, item) => {
        if (item.product_price) {
          return sum + (item.product_price * item.quantity);
        }
        return sum;
      }, 0);

      return {
        ...combo,
        items: comboItems,
        calculated_savings: Math.max(0, individualTotal - combo.base_price),
      };
    },
    enabled: !!comboId,
  });
}

// Hook for branch-specific combo availability
export function useBranchCombos(branchId: string | null) {
  return useQuery({
    queryKey: ['branch-combos', branchId],
    queryFn: async () => {
      if (!branchId) return [];

      // Get all active combos
      const { data: combos, error: combosError } = await supabase
        .from('combos')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (combosError) throw combosError;
      if (!combos || combos.length === 0) return [];

      // Get combo items
      const comboIds = combos.map(c => c.id);
      const { data: items } = await supabase
        .from('combo_items')
        .select('*')
        .in('combo_id', comboIds)
        .order('sort_order');

      // Get products with branch availability
      const productIds = (items || [])
        .filter(i => i.product_id)
        .map(i => i.product_id as string);

      const { data: products } = productIds.length > 0
        ? await supabase.from('products').select('id, name, price, is_available').in('id', productIds)
        : { data: [] };

      const { data: branchProducts } = productIds.length > 0
        ? await supabase
            .from('branch_products')
            .select('product_id, is_available')
            .eq('branch_id', branchId)
            .in('product_id', productIds)
        : { data: [] };

      // Build availability map
      const productMap = new Map((products || []).map(p => [p.id, p]));
      const branchAvailability = new Map(
        (branchProducts || []).map(bp => [bp.product_id, bp.is_available])
      );

      // Process combos with availability status
      return combos.map(combo => {
        const comboItems = (items || [])
          .filter(i => i.combo_id === combo.id)
          .map(item => {
            const product = item.product_id ? productMap.get(item.product_id) : null;
            const branchAvail = item.product_id ? branchAvailability.get(item.product_id) : null;
            
            const isProductAvailable = product 
              ? product.is_available && (branchAvail !== false)
              : true;

            return {
              id: item.id,
              product_id: item.product_id,
              product_name: product?.name || 'Selección',
              quantity: item.quantity,
              is_available: isProductAvailable,
            };
          });

        const hasUnavailableItems = comboItems.some(i => !i.is_available);

        return {
          ...combo,
          items: comboItems,
          status: hasUnavailableItems ? 'incomplete' : 'available',
        };
      });
    },
    enabled: !!branchId,
    staleTime: 1000 * 60,
  });
}
