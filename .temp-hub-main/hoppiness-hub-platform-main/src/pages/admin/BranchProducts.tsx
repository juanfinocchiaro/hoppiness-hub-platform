import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ArrowLeft, Search, ChevronDown, ChevronRight, Store, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;
type Category = Tables<'product_categories'>;
type Branch = Tables<'branches'>;
type BranchProduct = Tables<'branch_products'>;

interface ProductWithBranchStatus extends Product {
  branchProduct: BranchProduct | null;
}

interface CategoryWithProducts {
  category: Category;
  products: ProductWithBranchStatus[];
  availableCount: number;
  allActive: boolean;
}

export default function BranchProducts() {
  const { branchId } = useParams<{ branchId: string }>();
  const { isAdmin, branchPermissions, loading: roleLoading } = useUserRole();
  
  const [branch, setBranch] = useState<Branch | null>(null);
  const [categoriesWithProducts, setCategoriesWithProducts] = useState<CategoryWithProducts[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [updating, setUpdating] = useState<string | null>(null);

  const canManageProducts = isAdmin || branchPermissions.some(
    p => p.branch_id === branchId && p.can_manage_products
  );

  useEffect(() => {
    async function fetchData() {
      if (!branchId) return;

      const [branchRes, productsRes, categoriesRes, branchProductsRes] = await Promise.all([
        supabase.from('branches').select('*').eq('id', branchId).single(),
        supabase.from('products').select('*').order('name'),
        supabase.from('product_categories').select('*').order('display_order'),
        supabase.from('branch_products').select('*').eq('branch_id', branchId),
      ]);

      if (branchRes.data) setBranch(branchRes.data);

      if (productsRes.data && categoriesRes.data) {
        const branchProductsMap = new Map(
          (branchProductsRes.data || []).map(bp => [bp.product_id, bp])
        );

        const grouped: CategoryWithProducts[] = categoriesRes.data.map(category => {
          const categoryProducts = productsRes.data
            .filter(p => p.category_id === category.id)
            .map(p => ({
              ...p,
              branchProduct: branchProductsMap.get(p.id) || null,
            }));

          const availableCount = categoryProducts.filter(p => p.branchProduct?.is_available !== false).length;

          return {
            category,
            products: categoryProducts,
            availableCount,
            allActive: availableCount === categoryProducts.length,
          };
        });

        // Add uncategorized products
        const uncategorizedProducts = productsRes.data
          .filter(p => !p.category_id)
          .map(p => ({
            ...p,
            branchProduct: branchProductsMap.get(p.id) || null,
          }));

        if (uncategorizedProducts.length > 0) {
          const availableCount = uncategorizedProducts.filter(p => p.branchProduct?.is_available !== false).length;
          grouped.push({
            category: { id: 'uncategorized', name: 'Sin Categoría', is_active: true, created_at: '', display_order: 999, description: null, image_url: null },
            products: uncategorizedProducts,
            availableCount,
            allActive: availableCount === uncategorizedProducts.length,
          });
        }

        setCategoriesWithProducts(grouped.filter(g => g.products.length > 0));
        
        // Expand first category by default
        if (grouped.length > 0) {
          setExpandedCategories(new Set([grouped[0].category.id]));
        }
      }

      setLoading(false);
    }

    fetchData();
  }, [branchId]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const toggleCategoryProducts = async (categoryId: string, activate: boolean) => {
    if (!branchId || !canManageProducts) return;
    
    const categoryData = categoriesWithProducts.find(c => c.category.id === categoryId);
    if (!categoryData) return;

    setUpdating(categoryId);

    try {
      // Update all products in this category
      for (const product of categoryData.products) {
        if (product.branchProduct) {
          await supabase
            .from('branch_products')
            .update({ is_available: activate })
            .eq('id', product.branchProduct.id);
        } else {
          await supabase
            .from('branch_products')
            .insert({
              branch_id: branchId,
              product_id: product.id,
              is_available: activate,
            });
        }
      }

      // Update local state
      setCategoriesWithProducts(prev =>
        prev.map(cat => {
          if (cat.category.id !== categoryId) return cat;
          return {
            ...cat,
            products: cat.products.map(p => ({
              ...p,
              branchProduct: {
                ...(p.branchProduct || { id: '', branch_id: branchId, product_id: p.id, custom_price: null, stock_quantity: null }),
                is_available: activate,
              } as BranchProduct
            })),
            availableCount: activate ? cat.products.length : 0,
            allActive: activate,
          };
        })
      );

      toast.success(activate ? 'Categoría activada' : 'Categoría desactivada');
    } catch (error) {
      console.error('Error toggling category:', error);
      toast.error('Error al actualizar la categoría');
    } finally {
      setUpdating(null);
    }
  };

  const toggleProductAvailability = async (product: ProductWithBranchStatus) => {
    if (!branchId || !canManageProducts) return;
    
    setUpdating(product.id);
    
    try {
      const currentlyAvailable = product.branchProduct?.is_available !== false;
      const newAvailability = !currentlyAvailable;

      if (product.branchProduct) {
        const { error } = await supabase
          .from('branch_products')
          .update({ is_available: newAvailability })
          .eq('id', product.branchProduct.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('branch_products')
          .insert({
            branch_id: branchId,
            product_id: product.id,
            is_available: newAvailability,
          });

        if (error) throw error;
      }

      // Update local state
      setCategoriesWithProducts(prev => 
        prev.map(cat => {
          const updatedProducts = cat.products.map(p => 
            p.id === product.id 
              ? {
                  ...p,
                  branchProduct: {
                    ...(p.branchProduct || { id: '', branch_id: branchId, product_id: product.id, custom_price: null, stock_quantity: null }),
                    is_available: newAvailability,
                  } as BranchProduct
                }
              : p
          );
          const newAvailableCount = updatedProducts.filter(p => p.branchProduct?.is_available !== false).length;
          return {
            ...cat,
            products: updatedProducts,
            availableCount: newAvailableCount,
            allActive: newAvailableCount === updatedProducts.length,
          };
        })
      );

      toast.success(newAvailability ? 'Producto activado' : 'Producto desactivado');
    } catch (error) {
      console.error('Error toggling product:', error);
      toast.error('Error al actualizar el producto');
    } finally {
      setUpdating(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const filteredCategories = categoriesWithProducts.map(cat => ({
    ...cat,
    products: cat.products.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat => cat.products.length > 0);

  if (loading || roleLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Sucursal no encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/admin/sucursales">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Store className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">{branch.name}</h1>
            {!branch.is_active && <Badge variant="secondary">Inactiva</Badge>}
          </div>
          <p className="text-muted-foreground mt-1">Gestión de productos disponibles en esta sucursal</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar productos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Products by Category - másDelivery style */}
      <div className="space-y-3">
        {filteredCategories.map(({ category, products, availableCount, allActive }) => (
          <Card key={category.id} className="overflow-hidden">
            <Collapsible 
              open={expandedCategories.has(category.id)}
              onOpenChange={() => toggleCategory(category.id)}
            >
              {/* Category Header */}
              <div className="flex items-center justify-between p-4 bg-muted/30">
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-3 flex-1 text-left hover:opacity-80 transition-opacity">
                    {expandedCategories.has(category.id) ? (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                    <span className="font-semibold text-lg">{category.name}</span>
                  </button>
                </CollapsibleTrigger>
                
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {allActive ? 'Activa' : availableCount > 0 ? 'Parcial' : 'Inactiva'}
                  </span>
                  <Switch
                    checked={allActive}
                    onCheckedChange={(checked) => toggleCategoryProducts(category.id, checked)}
                    disabled={!canManageProducts || updating === category.id}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>
              
              <CollapsibleContent>
                <div className="divide-y">
                  {products.map((product) => {
                    const isAvailable = product.branchProduct?.is_available !== false;
                    const customPrice = product.branchProduct?.custom_price;
                    const displayPrice = customPrice || product.price;
                    
                    return (
                      <div 
                        key={product.id}
                        className={`flex items-center gap-4 p-4 transition-opacity ${!isAvailable ? 'opacity-50 bg-muted/20' : ''}`}
                      >
                        {/* Product Image Placeholder */}
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                          {product.image_url ? (
                            <img 
                              src={product.image_url} 
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-2xl">🍔</span>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-base">{product.name}</p>
                          {product.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                              {product.description}
                            </p>
                          )}
                        </div>

                        {/* Price */}
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground">Precio:</p>
                          <p className="font-semibold text-lg">{formatPrice(displayPrice)}</p>
                          {customPrice && customPrice !== product.price && (
                            <p className="text-xs text-muted-foreground line-through">
                              {formatPrice(product.price)}
                            </p>
                          )}
                        </div>

                        {/* Toggle */}
                        <Switch
                          checked={isAvailable}
                          onCheckedChange={() => toggleProductAvailability(product)}
                          disabled={!canManageProducts || updating === product.id}
                          className="data-[state=checked]:bg-primary shrink-0"
                        />

                        {/* Edit button (only for admin - goes to master catalog) */}
                        {isAdmin && (
                          <Link to={`/admin/productos/${product.id}`}>
                            <Button variant="ghost" size="icon" className="shrink-0">
                              <Pencil className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {search ? 'No se encontraron productos' : 'No hay productos disponibles'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
