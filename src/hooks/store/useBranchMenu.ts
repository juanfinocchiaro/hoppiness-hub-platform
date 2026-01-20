import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;
type Category = Tables<'product_categories'>;

export interface MenuProduct extends Product {
  finalPrice: number;
  category: Category | null;
  isAvailable: boolean;
  stockQuantity: number | null;
}

export interface MenuCategory extends Category {
  products: MenuProduct[];
}

export interface BranchMenu {
  branch: Tables<'branches'>;
  categories: MenuCategory[];
  featuredProducts: MenuProduct[];
  allProducts: MenuProduct[];
}

export function useBranchMenu(branchSlug: string | undefined) {
  return useQuery({
    queryKey: ['branch-menu', branchSlug],
    queryFn: async (): Promise<BranchMenu | null> => {
      if (!branchSlug) return null;
      
      // Fetch branch
      const { data: branch, error: branchError } = await supabase
        .from('branches')
        .select('*')
        .eq('slug', branchSlug)
        .eq('is_active', true)
        .maybeSingle();
      
      if (branchError) throw branchError;
      if (!branch) return null;
      
      // Fetch branch products with product data and category
      const { data: branchProducts, error: productsError } = await supabase
        .from('branch_products')
        .select(`
          is_available,
          custom_price,
          stock_quantity,
          is_enabled_by_brand,
          product:products(
            *,
            category:product_categories(*)
          )
        `)
        .eq('branch_id', branch.id)
        .eq('is_enabled_by_brand', true);
      
      if (productsError) throw productsError;
      
      // Transform to MenuProduct
      const allProducts: MenuProduct[] = (branchProducts || [])
        .filter(bp => bp.product && (bp.product as any).is_available)
        .map(bp => {
          const prod = bp.product as Product & { category?: Category };
          return {
            ...prod,
            finalPrice: bp.custom_price || prod.price,
            category: prod.category || null,
            isAvailable: bp.is_available ?? true,
            stockQuantity: bp.stock_quantity,
          };
        })
        .sort((a, b) => {
          // Unavailable at end
          if (a.isAvailable && !b.isAvailable) return -1;
          if (!a.isAvailable && b.isAvailable) return 1;
          // Featured first
          if (a.is_featured && !b.is_featured) return -1;
          if (!a.is_featured && b.is_featured) return 1;
          return a.name.localeCompare(b.name);
        });
      
      // Build categories map
      const categoryMap = new Map<string, MenuCategory>();
      allProducts.forEach(product => {
        if (product.category) {
          const existing = categoryMap.get(product.category.id);
          if (existing) {
            existing.products.push(product);
          } else {
            categoryMap.set(product.category.id, {
              ...product.category,
              products: [product],
            });
          }
        }
      });
      
      // Sort categories by display_order
      const categories = Array.from(categoryMap.values())
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      
      // Featured products
      const featuredProducts = allProducts.filter(p => p.is_featured);
      
      return {
        branch,
        categories,
        featuredProducts,
        allProducts,
      };
    },
    enabled: !!branchSlug,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useBranches() {
  return useQuery({
    queryKey: ['branches-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
