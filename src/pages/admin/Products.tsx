import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Plus, Search, Edit, Star, ChevronDown, ChevronRight, AlertTriangle, Store, Power } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;
type Category = Tables<'product_categories'>;
type Branch = Tables<'branches'>;
type BranchProduct = Tables<'branch_products'>;

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchProducts, setBranchProducts] = useState<BranchProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [updating, setUpdating] = useState<string | null>(null);

  // Disable confirmation dialog state
  const [disableDialog, setDisableDialog] = useState<{
    open: boolean;
    productId: string;
    productName: string;
    branchId: string;
    branchName: string;
    isBrandLevel: boolean;
  } | null>(null);

  const fetchData = async () => {
    const [productsRes, categoriesRes, branchesRes, branchProductsRes] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('product_categories').select('*').eq('is_active', true).order('display_order'),
      supabase.from('branches').select('*').eq('is_active', true).order('name'),
      supabase.from('branch_products').select('*'),
    ]);

    if (productsRes.data) setProducts(productsRes.data);
    if (categoriesRes.data) {
      setCategories(categoriesRes.data);
      const allCategoryIds = new Set(categoriesRes.data.map(c => c.id));
      allCategoryIds.add('uncategorized');
      setExpandedCategories(allCategoryIds);
    }
    if (branchesRes.data) setBranches(branchesRes.data);
    if (branchProductsRes.data) setBranchProducts(branchProductsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  const filteredProducts = products.filter((product) => {
    return product.name.toLowerCase().includes(search.toLowerCase());
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getBranchAvailability = (productId: string, branchId: string): boolean => {
    const bp = branchProducts.find(bp => bp.product_id === productId && bp.branch_id === branchId);
    return bp?.is_available ?? true;
  };

  const getAvailableBranchesCount = (productId: string): number => {
    return branches.filter(b => getBranchAvailability(productId, b.id)).length;
  };

  // Handle toggle for brand level
  const handleBrandToggle = (product: Product) => {
    const newValue = !product.is_enabled_by_brand;
    if (!newValue) {
      // Disabling - show warning
      setDisableDialog({
        open: true,
        productId: product.id,
        productName: product.name,
        branchId: '',
        branchName: 'todas las sucursales',
        isBrandLevel: true,
      });
    } else {
      // Enabling - do directly
      executeBrandToggle(product.id, true);
    }
  };

  // Handle toggle for branch level
  const handleBranchToggle = (product: Product, branchId: string) => {
    if (!product.is_enabled_by_brand) {
      toast.error('El producto está deshabilitado a nivel marca');
      return;
    }
    
    const currentlyAvailable = getBranchAvailability(product.id, branchId);
    const branch = branches.find(b => b.id === branchId);
    
    if (currentlyAvailable) {
      // Disabling - show warning
      setDisableDialog({
        open: true,
        productId: product.id,
        productName: product.name,
        branchId: branchId,
        branchName: branch?.name || 'esta sucursal',
        isBrandLevel: false,
      });
    } else {
      // Enabling - do directly
      executeBranchToggle(product.id, branchId, true);
    }
  };

  const executeBrandToggle = async (productId: string, newValue: boolean) => {
    setUpdating(productId);
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_enabled_by_brand: newValue })
        .eq('id', productId);
      if (error) throw error;

      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, is_enabled_by_brand: newValue } : p
      ));
      toast.success(newValue ? 'Producto habilitado' : 'Producto deshabilitado');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al actualizar disponibilidad');
    } finally {
      setUpdating(null);
    }
  };

  const executeBranchToggle = async (productId: string, branchId: string, newValue: boolean) => {
    setUpdating(`${productId}-${branchId}`);
    try {
      const existingBp = branchProducts.find(bp => bp.product_id === productId && bp.branch_id === branchId);
      
      if (existingBp) {
        const { error } = await supabase
          .from('branch_products')
          .update({ is_available: newValue })
          .eq('id', existingBp.id);
        if (error) throw error;

        setBranchProducts(prev => prev.map(bp => 
          bp.id === existingBp.id ? { ...bp, is_available: newValue } : bp
        ));
      } else {
        const { data, error } = await supabase
          .from('branch_products')
          .insert({ product_id: productId, branch_id: branchId, is_available: newValue })
          .select()
          .single();
        if (error) throw error;
        if (data) {
          setBranchProducts(prev => [...prev, data]);
        }
      }

      toast.success(newValue ? 'Producto habilitado' : 'Producto deshabilitado');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al actualizar disponibilidad');
    } finally {
      setUpdating(null);
    }
  };

  const handleConfirmDisable = () => {
    if (!disableDialog) return;
    if (disableDialog.isBrandLevel) {
      executeBrandToggle(disableDialog.productId, false);
    } else {
      executeBranchToggle(disableDialog.productId, disableDialog.branchId, false);
    }
    setDisableDialog(null);
  };

  // Group products by category
  const productsByCategory = categories.map(category => ({
    category,
    products: filteredProducts.filter(p => p.category_id === category.id)
  })).filter(group => group.products.length > 0);

  const uncategorizedProducts = filteredProducts.filter(p => !p.category_id);
  if (uncategorizedProducts.length > 0) {
    productsByCategory.push({
      category: { id: 'uncategorized', name: 'Sin Categoría', display_order: 999, is_active: true, created_at: '', description: null, image_url: null },
      products: uncategorizedProducts
    });
  }

  const totalDisabled = products.filter(p => !p.is_enabled_by_brand).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-12 w-full" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Control de Productos</h1>
          <p className="text-muted-foreground">
            Gestión de disponibilidad por sucursal • {products.length} productos • {branches.length} sucursales
          </p>
        </div>
        <div className="flex items-center gap-2">
          {totalDisabled > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <Power className="h-3 w-3" />
              {totalDisabled} deshabilitados
            </Badge>
          )}
          <Link to="/admin/productos/nuevo">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Producto
            </Button>
          </Link>
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

      {/* Matrix Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-max">
              {/* Header with branch names */}
              <div className="sticky top-0 z-10 bg-muted border-b flex">
                <div className="w-72 min-w-72 p-3 font-semibold border-r sticky left-0 bg-muted z-20">
                  Producto
                </div>
                <div className="w-20 min-w-20 p-3 font-semibold text-center border-r">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center justify-center gap-1">
                        <Power className="h-4 w-4" />
                        Marca
                      </TooltipTrigger>
                      <TooltipContent>
                        Control global del producto
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {branches.map((branch) => (
                  <div key={branch.id} className="w-24 min-w-24 p-2 text-center border-r">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex flex-col items-center gap-1 w-full">
                          <Store className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-medium truncate w-full">{branch.name}</span>
                        </TooltipTrigger>
                        <TooltipContent>{branch.name}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ))}
                <div className="w-14 min-w-14 p-3 font-semibold text-center">
                  
                </div>
              </div>

              {/* Products by Category */}
              {productsByCategory.map(({ category, products: categoryProducts }) => (
                <Collapsible
                  key={category.id}
                  open={expandedCategories.has(category.id)}
                  onOpenChange={() => toggleCategory(category.id)}
                >
                  {/* Category Header */}
                  <CollapsibleTrigger className="flex items-center w-full p-3 bg-muted/50 hover:bg-muted/80 transition-colors border-b">
                    <div className="flex items-center gap-2">
                      {expandedCategories.has(category.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span className="font-semibold">{category.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {categoryProducts.length}
                      </Badge>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    {categoryProducts.map((product) => {
                      const isDisabledByBrand = !product.is_enabled_by_brand;
                      const availableCount = getAvailableBranchesCount(product.id);
                      
                      return (
                        <div 
                          key={product.id} 
                          className={`flex border-b hover:bg-muted/30 transition-colors ${isDisabledByBrand ? 'bg-destructive/5' : ''}`}
                        >
                          {/* Product Info - Sticky */}
                          <div className="w-72 min-w-72 p-3 border-r sticky left-0 bg-background z-10 flex items-center gap-3">
                            {product.image_url && (
                              <img 
                                src={product.image_url} 
                                alt={product.name}
                                className="w-10 h-10 rounded object-cover shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                {product.is_featured && (
                                  <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 shrink-0" />
                                )}
                                <span className={`font-medium truncate ${isDisabledByBrand ? 'text-muted-foreground line-through' : ''}`}>
                                  {product.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{formatPrice(product.price)}</span>
                                {!isDisabledByBrand && (
                                  <span className={availableCount === branches.length ? 'text-success' : 'text-warning'}>
                                    {availableCount}/{branches.length}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Brand Toggle */}
                          <div className="w-20 min-w-20 p-3 border-r flex items-center justify-center">
                            <Switch
                              checked={product.is_enabled_by_brand}
                              onCheckedChange={() => handleBrandToggle(product)}
                              disabled={updating === product.id}
                              className="data-[state=checked]:bg-primary"
                            />
                          </div>

                          {/* Branch Toggles */}
                          {branches.map((branch) => {
                            const isAvailable = getBranchAvailability(product.id, branch.id);
                            const isUpdating = updating === `${product.id}-${branch.id}`;
                            
                            return (
                              <div 
                                key={branch.id} 
                                className={`w-24 min-w-24 p-3 border-r flex items-center justify-center ${isDisabledByBrand ? 'opacity-30' : ''}`}
                              >
                                <Switch
                                  checked={isAvailable && !isDisabledByBrand}
                                  onCheckedChange={() => handleBranchToggle(product, branch.id)}
                                  disabled={isDisabledByBrand || isUpdating}
                                  className="data-[state=checked]:bg-success"
                                />
                              </div>
                            );
                          })}

                          {/* Edit Button */}
                          <div className="w-14 min-w-14 p-3 flex items-center justify-center">
                            <Link to={`/admin/productos/${product.id}`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              ))}

              {productsByCategory.length === 0 && (
                <div className="p-12 text-center text-muted-foreground">
                  No se encontraron productos
                </div>
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Disable Confirmation Dialog */}
      <AlertDialog open={!!disableDialog?.open} onOpenChange={() => setDisableDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Deshabilitar producto
            </AlertDialogTitle>
            <AlertDialogDescription>
              {disableDialog?.isBrandLevel ? (
                <>
                  Estás por <strong>deshabilitar "{disableDialog?.productName}"</strong> a nivel marca. 
                  Esto significa que el producto <strong>no estará disponible en ninguna sucursal</strong>.
                </>
              ) : (
                <>
                  Estás por <strong>deshabilitar "{disableDialog?.productName}"</strong> para <strong>{disableDialog?.branchName}</strong>. 
                  El producto dejará de estar disponible en esa sucursal.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDisable} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deshabilitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
