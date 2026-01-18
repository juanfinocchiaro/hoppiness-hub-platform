import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ArrowLeft, Search, ChevronDown, ChevronRight, Store } from 'lucide-react';
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

          return {
            category,
            products: categoryProducts,
            availableCount: categoryProducts.filter(p => p.branchProduct?.is_available !== false).length,
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
          grouped.push({
            category: { id: 'uncategorized', name: 'Sin Categoría', is_active: true, created_at: '', display_order: 999, description: null, image_url: null },
            products: uncategorizedProducts,
            availableCount: uncategorizedProducts.filter(p => p.branchProduct?.is_available !== false).length,
          });
        }

        setCategoriesWithProducts(grouped.filter(g => g.products.length > 0));
        
        // Expand all categories by default
        setExpandedCategories(new Set(grouped.map(g => g.category.id)));
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

  const toggleProductAvailability = async (product: ProductWithBranchStatus) => {
    if (!branchId || !canManageProducts) return;
    
    setUpdating(product.id);
    
    try {
      const currentlyAvailable = product.branchProduct?.is_available !== false;
      const newAvailability = !currentlyAvailable;

      if (product.branchProduct) {
        // Update existing record
        const { error } = await supabase
          .from('branch_products')
          .update({ is_available: newAvailability })
          .eq('id', product.branchProduct.id);

        if (error) throw error;
      } else {
        // Create new record
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
        prev.map(cat => ({
          ...cat,
          products: cat.products.map(p => 
            p.id === product.id 
              ? {
                  ...p,
                  branchProduct: {
                    ...(p.branchProduct || { id: '', branch_id: branchId, product_id: product.id, custom_price: null, stock_quantity: null }),
                    is_available: newAvailability,
                  } as BranchProduct
                }
              : p
          ),
          availableCount: cat.products.filter(p => 
            p.id === product.id 
              ? newAvailability 
              : p.branchProduct?.is_available !== false
          ).length,
        }))
      );

      toast.success(newAvailability ? 'Producto activado' : 'Producto desactivado');
    } catch (error) {
      console.error('Error toggling product:', error);
      toast.error('Error al actualizar el producto');
    } finally {
      setUpdating(null);
    }
  };

  const updateCustomPrice = async (product: ProductWithBranchStatus, customPrice: number | null) => {
    if (!branchId || !canManageProducts) return;

    try {
      if (product.branchProduct) {
        const { error } = await supabase
          .from('branch_products')
          .update({ custom_price: customPrice })
          .eq('id', product.branchProduct.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('branch_products')
          .insert({
            branch_id: branchId,
            product_id: product.id,
            is_available: true,
            custom_price: customPrice,
          });

        if (error) throw error;
      }

      // Update local state
      setCategoriesWithProducts(prev =>
        prev.map(cat => ({
          ...cat,
          products: cat.products.map(p =>
            p.id === product.id
              ? {
                  ...p,
                  branchProduct: {
                    ...(p.branchProduct || { id: '', branch_id: branchId, product_id: product.id, is_available: true, stock_quantity: null }),
                    custom_price: customPrice,
                  } as BranchProduct
                }
              : p
          ),
        }))
      );

      toast.success('Precio actualizado');
    } catch (error) {
      console.error('Error updating price:', error);
      toast.error('Error al actualizar precio');
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
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold">{branch.name}</h1>
            {!branch.is_active && <Badge variant="secondary">Inactiva</Badge>}
          </div>
          <p className="text-muted-foreground">Gestión de productos disponibles</p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar productos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Products by Category */}
      <div className="space-y-4">
        {filteredCategories.map(({ category, products, availableCount }) => (
          <Card key={category.id}>
            <Collapsible 
              open={expandedCategories.has(category.id)}
              onOpenChange={() => toggleCategory(category.id)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expandedCategories.has(category.id) ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                      <div>
                        <CardTitle className="text-lg">{category.name}</CardTitle>
                        <CardDescription>
                          {availableCount}/{products.length} productos activos
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-lg px-3">
                      {availableCount}/{products.length}
                    </Badge>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Activo</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead>Precio Base</TableHead>
                        <TableHead>Precio Sucursal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => {
                        const isAvailable = product.branchProduct?.is_available !== false;
                        const customPrice = product.branchProduct?.custom_price;
                        
                        return (
                          <TableRow 
                            key={product.id}
                            className={!isAvailable ? 'opacity-50' : ''}
                          >
                            <TableCell>
                              <Switch
                                checked={isAvailable}
                                onCheckedChange={() => toggleProductAvailability(product)}
                                disabled={!canManageProducts || updating === product.id}
                              />
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{product.name}</p>
                                {product.description && (
                                  <p className="text-sm text-muted-foreground line-clamp-1">
                                    {product.description}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatPrice(product.price)}
                            </TableCell>
                            <TableCell>
                              {canManageProducts ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    placeholder="Precio base"
                                    defaultValue={customPrice || ''}
                                    className="w-28"
                                    onBlur={(e) => {
                                      const value = e.target.value ? parseFloat(e.target.value) : null;
                                      if (value !== customPrice) {
                                        updateCustomPrice(product, value);
                                      }
                                    }}
                                  />
                                  {customPrice && (
                                    <Badge variant="outline" className="shrink-0">
                                      Personalizado
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="font-medium">
                                  {customPrice ? formatPrice(customPrice) : '-'}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>
    </div>
  );
}
