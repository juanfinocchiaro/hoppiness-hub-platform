import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Plus, Search, Edit, Star, ChevronDown, ChevronRight, Power, Check, X, CalendarDays } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ScheduleDialog } from '@/components/admin/ScheduleDialog';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;
type Category = Tables<'product_categories'>;
type Branch = Tables<'branches'>;
type BranchProduct = Tables<'branch_products'>;

// Abbreviations for branches
const getBranchAbbreviation = (name: string): string => {
  const abbrevMap: Record<string, string> = {
    'General Paz': 'GP',
    'Manantiales': 'MNT',
    'Nueva Córdoba': 'NVC',
    'Villa Allende': 'VA',
    'Villa Carlos Paz': 'VCP',
  };
  return abbrevMap[name] || name.slice(0, 3).toUpperCase();
};

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchProducts, setBranchProducts] = useState<BranchProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [updating, setUpdating] = useState<string | null>(null);
  const [scheduleDialog, setScheduleDialog] = useState<{
    open: boolean;
    categoryId?: string;
    productId?: string;
    name: string;
  } | null>(null);

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
      supabase.from('product_categories').select('*').order('display_order'),
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

  const handleCategoryToggle = async (categoryId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('product_categories')
        .update({ is_active: !currentValue })
        .eq('id', categoryId);
      if (error) throw error;

      setCategories(prev => prev.map(c => 
        c.id === categoryId ? { ...c, is_active: !currentValue } : c
      ));
      toast.success(!currentValue ? 'Categoría activada' : 'Categoría desactivada');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al actualizar categoría');
    }
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

  const handleBrandToggle = (product: Product) => {
    const newValue = !product.is_enabled_by_brand;
    if (!newValue) {
      setDisableDialog({
        open: true,
        productId: product.id,
        productName: product.name,
        branchId: '',
        branchName: 'todas las sucursales',
        isBrandLevel: true,
      });
    } else {
      executeBrandToggle(product.id, true);
    }
  };

  const handleBranchToggle = (product: Product, branchId: string) => {
    if (!product.is_enabled_by_brand) {
      toast.error('El producto está deshabilitado a nivel marca');
      return;
    }
    
    const currentlyAvailable = getBranchAvailability(product.id, branchId);
    const branch = branches.find(b => b.id === branchId);
    
    if (currentlyAvailable) {
      setDisableDialog({
        open: true,
        productId: product.id,
        productName: product.name,
        branchId: branchId,
        branchName: branch?.name || 'esta sucursal',
        isBrandLevel: false,
      });
    } else {
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
      <div className="space-y-6 p-6">
        <div className="flex justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-12 w-full max-w-md" />
        <div className="grid gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Control de Productos</h1>
          <p className="text-muted-foreground text-sm">
            {products.length} productos • {branches.length} sucursales
          </p>
        </div>
        <div className="flex items-center gap-3">
          {totalDisabled > 0 && (
            <Badge variant="secondary" className="bg-destructive/10 text-destructive border-0">
              <Power className="h-3 w-3 mr-1" />
              {totalDisabled} deshabilitados
            </Badge>
          )}
          <Link to="/admin/productos/nuevo">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Nuevo
            </Button>
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar productos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Products Grid */}
      <div className="space-y-6">
        {productsByCategory.map(({ category, products: categoryProducts }) => (
          <div key={category.id} className="space-y-2">
            {/* Category Header */}
            <div className={`flex items-center justify-between py-2 px-3 rounded-lg transition-all ${!category.is_active ? 'bg-muted/50 opacity-60' : 'bg-muted/30'}`}>
              <button
                onClick={() => toggleCategory(category.id)}
                className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
              >
                {expandedCategories.has(category.id) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span className={!category.is_active ? 'line-through' : ''}>{category.name}</span>
                <span className="text-xs font-normal text-muted-foreground">({categoryProducts.length})</span>
              </button>
              
              {category.id !== 'uncategorized' && (
                <div className="flex items-center gap-3">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            setScheduleDialog({
                              open: true,
                              categoryId: category.id,
                              name: category.name,
                            });
                          }}
                        >
                          <CalendarDays className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Programar disponibilidad</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className={`text-xs ${category.is_active ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    {category.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                  <Switch
                    checked={category.is_active}
                    onCheckedChange={() => handleCategoryToggle(category.id, category.is_active)}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>
              )}
            </div>

            {/* Products List */}
            {expandedCategories.has(category.id) && (
              <div className="grid gap-2">
                {categoryProducts.map((product) => {
                  const isDisabledByBrand = !product.is_enabled_by_brand;
                  const availableCount = getAvailableBranchesCount(product.id);
                  
                  return (
                    <div 
                      key={product.id} 
                      className={`
                        group flex items-center gap-4 p-3 rounded-lg transition-all
                        ${isDisabledByBrand 
                          ? 'bg-muted/50 opacity-60' 
                          : 'bg-card hover:bg-accent/50 border border-border/50'
                        }
                      `}
                    >
                      {/* Product Info */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {product.image_url && (
                          <img 
                            src={product.image_url} 
                            alt={product.name}
                            className="w-10 h-10 rounded-md object-cover shrink-0"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {product.is_featured && (
                              <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                            )}
                            <span className={`font-medium truncate text-sm ${isDisabledByBrand ? 'line-through' : ''}`}>
                              {product.name}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatPrice(product.price)}
                          </span>
                        </div>
                      </div>

                      {/* Branch Availability with Abbreviations */}
                      <div className="flex items-center gap-1.5">
                        {branches.map((branch) => {
                          const isAvailable = getBranchAvailability(product.id, branch.id);
                          const isUpdating = updating === `${product.id}-${branch.id}`;
                          const isActive = isAvailable && !isDisabledByBrand;
                          
                          return (
                            <TooltipProvider key={branch.id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => handleBranchToggle(product, branch.id)}
                                    disabled={isDisabledByBrand || isUpdating}
                                    className={`
                                      flex flex-col items-center gap-0.5 transition-all
                                      ${isDisabledByBrand ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105'}
                                      disabled:hover:scale-100
                                    `}
                                  >
                                    <span className="text-[9px] font-semibold text-muted-foreground">
                                      {getBranchAbbreviation(branch.name)}
                                    </span>
                                    <div className={`
                                      w-6 h-6 rounded-full flex items-center justify-center transition-all
                                      ${isActive 
                                        ? 'bg-emerald-500 text-white' 
                                        : 'bg-muted text-muted-foreground/40'
                                      }
                                    `}>
                                      {isActive ? (
                                        <Check className="w-3.5 h-3.5" />
                                      ) : (
                                        <X className="w-3.5 h-3.5" />
                                      )}
                                    </div>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-medium">{branch.name}</p>
                                  <p className="text-xs opacity-70">
                                    {isActive ? 'Click para desactivar' : 'Click para activar'}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })}
                      </div>

                      {/* Availability Count */}
                      {!isDisabledByBrand && (
                        <Badge 
                          variant="secondary" 
                          className={`
                            text-[10px] px-1.5 shrink-0
                            ${availableCount === branches.length 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                              : availableCount === 0 
                                ? 'bg-destructive/10 text-destructive' 
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            }
                          `}
                        >
                          {availableCount}/{branches.length}
                        </Badge>
                      )}

                      {/* Edit Button */}
                      <Link to={`/admin/productos/${product.id}`}>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {productsByCategory.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <p>No se encontraron productos</p>
          </div>
        )}
      </div>

      {/* Disable Confirmation Dialog */}
      <AlertDialog open={disableDialog?.open} onOpenChange={(open) => !open && setDisableDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Power className="h-5 w-5 text-destructive" />
              Desactivar Producto
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas desactivar <strong>{disableDialog?.productName}</strong> en{' '}
              <strong>{disableDialog?.branchName}</strong>?
              {disableDialog?.isBrandLevel && (
                <span className="block mt-2 text-destructive">
                  Esto desactivará el producto en todas las sucursales.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDisable}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Schedule Dialog */}
      {scheduleDialog && (
        <ScheduleDialog
          open={scheduleDialog.open}
          onOpenChange={(open) => !open && setScheduleDialog(null)}
          categoryId={scheduleDialog.categoryId}
          productId={scheduleDialog.productId}
          itemName={scheduleDialog.name}
        />
      )}
    </div>
  );
}
