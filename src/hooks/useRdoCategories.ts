import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { RdoCategory } from '@/types/rdo';

interface RdoCategoryFilters {
  itemType?: string;
  section?: string;
  level?: number;
}

export function useRdoCategories(filters?: RdoCategoryFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['rdo-categories', filters],
    queryFn: async () => {
      let q = supabase
        .from('rdo_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (filters?.level) {
        q = q.eq('level', filters.level);
      }
      if (filters?.section) {
        q = q.eq('rdo_section', filters.section);
      }
      if (filters?.itemType) {
        q = q.contains('allowed_item_types', [filters.itemType]);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as RdoCategory[];
    },
    enabled: !!user,
  });
}

/** Returns only level-3 categories suitable for selectors, optionally filtered by item type */
export function useRdoCategoryOptions(itemType?: string) {
  return useRdoCategories({ level: 3, itemType });
}
