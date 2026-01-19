import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Plus, Search, Edit, Star, Package, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;
type Category = Tables<'product_categories'>;
type Branch = Tables<'branches'>;
type BranchProduct = Tables<'branch_products'>;

interface ProductWithAvailability extends Product {
  branchAvailability?: BranchProduct;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchProducts, setBranchProducts] = useState<BranchProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
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

  // Enable confirmation dialog for brand level
  const [enableBrandDialog, setEnableBrandDialog] = useState<{
    open: boolean;
    productId: string;
    productName: string;
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
      // Expand all categories by default
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

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Sin categoría';
    return categories.find((c) => c.id === categoryId)?.name || 'Desconocida';
  };

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

  const getUnavailableCount = (categoryProducts: Product[]): number => {
    if (selectedBranchId === 'all') {
      // Count products disabled at brand level
      return categoryProducts.filter(p => !p.is_enabled_by_brand).length;
    }
    // Count products unavailable at specific branch
    return categoryProducts.filter(p => {
      if (!p.is_enabled_by_brand) return true;
      return !getBranchAvailability(p.id, selectedBranchId);
    }).length;
  };

  const isProductAvailable = (product: Product): boolean => {
    if (!product.is_enabled_by_brand) return false;
    if (selectedBranchId === 'all') return true;
    return getBranchAvailability(product.id, selectedBranchId);
  };

  // Handle toggle click
  const handleToggleClick = (product: Product, currentlyAvailable: boolean) => {
    if (selectedBranchId === 'all') {
      // Brand level toggle
      if (currentlyAvailable) {
        // Disabling at brand level - show warning
        setDisableDialog({
          open: true,
          productId: product.id,
          productName: product.name,
          branchId: '',
          branchName: 'todas las sucursales',
          isBrandLevel: true,
        });
      } else {
        // Enabling at brand level
        setEnableBrandDialog({
          open: true,
          productId: product.id,
          productName: product.name,
        });
      }
    } else {
      // Branch level toggle
      const branch = branches.find(b => b.id === selectedBranchId);
      if (currentlyAvailable) {
        // Disabling at branch level - show warning
        setDisableDialog({
          open: true,
          productId: product.id,
          productName: product.name,
          branchId: selectedBranchId,
          branchName: branch?.name || 'esta sucursal',
          isBrandLevel: false,
        });
      } else {
        // Enabling at branch level - do it directly
        executeToggle(product.id, selectedBranchId, true, false);
      }
    }
  };

  const executeToggle = async (productId: string, branchId: string, newValue: boolean, isBrandLevel: boolean) => {
    setUpdating(productId);
    try {
      if (isBrandLevel) {
        // Update product.is_enabled_by_brand
        const { error } = await supabase
          .from('products')
          .update({ is_enabled_by_brand: newValue })
          .eq('id', productId);
        if (error) throw error;

        setProducts(prev => prev.map(p => 
          p.id === productId ? { ...p, is_enabled_by_brand: newValue } : p
        ));
      } else {
        // Update branch_products.is_available
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
    executeToggle(
      disableDialog.productId, 
      disableDialog.branchId, 
      false, 
      disableDialog.isBrandLevel
    );
    setDisableDialog(null);
  };

  const handleConfirmBrandEnable = () => {
    if (!enableBrandDialog) return;
    executeToggle(enableBrandDialog.productId, '', true, true);
    setEnableBrandDialog(null);
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

  const totalUnavailable = selectedBranchId === 'all' 
    ? products.filter(p => !p.is_enabled_by_brand).length
    : products.filter(p => !isProductAvailable(p)).length;

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
          <h1 className="text-2xl font-bold">Productos</h1>
          <p className="text-muted-foreground">Gestión de disponibilidad por sucursal</p>
        </div>
        <div className="flex items-center gap-2">
          {totalUnavailable > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              {totalUnavailable} deshabilitados
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar productos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Sucursal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las sucursales (Marca)</SelectItem>
            {branches.map((branch) => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products by Category */}
      <div className="space-y-4">
        {productsByCategory.map(({ category, products: categoryProducts }) => {
          const unavailableCount = getUnavailableCount(categoryProducts);
          
          return (
            <Collapsible
              key={category.id}
              open={expandedCategories.has(category.id)}
              onOpenChange={() => toggleCategory(category.id)}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
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
                {unavailableCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {unavailableCount} deshabilitados
                  </Badge>
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {categoryProducts.map((product) => {
                  const available = isProductAvailable(product);
                  const isDisabledByBrand = !product.is_enabled_by_brand;
                  
                  return (
                    <Card 
                      key={product.id} 
                      className={`transition-colors ${!available ? 'bg-destructive/5 border-destructive/20' : ''}`}
                    >
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {product.image_url && (
                              <img 
                                src={product.image_url} 
                                alt={product.name}
                                className="w-10 h-10 rounded object-cover"
                              />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                {product.is_featured && (
                                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />
                                )}
                                <p className={`font-medium ${!available ? 'text-muted-foreground line-through' : ''}`}>
                                  {product.name}
                                </p>
                                {isDisabledByBrand && selectedBranchId !== 'all' && (
                                  <Badge variant="outline" className="text-xs text-muted-foreground">
                                    Deshabilitado por Marca
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{formatPrice(product.price)}</span>
                                {selectedBranchId === 'all' && product.is_enabled_by_brand && (
                                  <Badge variant="secondary" className="text-xs">
                                    {getAvailableBranchesCount(product.id)}/{branches.length} sucursales
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {/* Only show switch if: 
                                - In "all" mode (brand level)
                                - In branch mode and product is enabled by brand */}
                            {(selectedBranchId === 'all' || product.is_enabled_by_brand) && (
                              <Switch
                                checked={available}
                                onCheckedChange={() => handleToggleClick(product, available)}
                                disabled={updating === product.id || (selectedBranchId !== 'all' && isDisabledByBrand)}
                              />
                            )}
                            <Link to={`/admin/productos/${product.id}`}>
                              <Button variant="ghost" size="icon">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          );
        })}

        {productsByCategory.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No se encontraron productos
            </CardContent>
          </Card>
        )}
      </div>

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

      {/* Enable Brand Confirmation Dialog */}
      <AlertDialog open={!!enableBrandDialog?.open} onOpenChange={() => setEnableBrandDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Habilitar producto</AlertDialogTitle>
            <AlertDialogDescription>
              Estás por <strong>habilitar "{enableBrandDialog?.productName}"</strong> a nivel marca.
              El producto estará disponible en todas las sucursales (salvo que estén deshabilitadas individualmente).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmBrandEnable}>
              Habilitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
