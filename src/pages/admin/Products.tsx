import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Plus, Search, Edit, Star, ChevronDown, ChevronRight, Power, Check, X, CalendarDays, Settings2, Eye, EyeOff, PowerOff, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { handleError } from '@/lib/errorHandler';
import { ScheduleDialog } from '@/components/admin/ScheduleDialog';
import { ProductInlineEditor } from '@/components/admin/ProductInlineEditor';
import { CategoryManager } from '@/components/admin/CategoryManager';
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
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'enabled' | 'disabled' | 'featured'>('all');
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

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    productId: string;
    productName: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [showDisabledInCategory, setShowDisabledInCategory] = useState<Set<string>>(new Set());

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
      const newValue = !currentValue;
      
      // Update category
      const { error } = await supabase
        .from('product_categories')
        .update({ is_active: newValue })
        .eq('id', categoryId);
      if (error) throw error;

      // If disabling category, also archive all products in it
      if (!newValue) {
        const productsInCategory = products.filter(p => p.category_id === categoryId);
        if (productsInCategory.length > 0) {
          const productIds = productsInCategory.map(p => p.id);
          await supabase
            .from('products')
            .update({ is_active: false })
            .in('id', productIds);
          
          setProducts(prev => prev.map(p => 
            p.category_id === categoryId ? { ...p, is_active: false } : p
          ));
        }
      }

      setCategories(prev => prev.map(c => 
        c.id === categoryId ? { ...c, is_active: newValue } : c
      ));
      toast.success(newValue ? 'Categoría activada' : 'Categoría y sus productos archivados');
    } catch (error) {
      handleError(error, { userMessage: 'Error al actualizar categoría', context: 'Products.toggleCategoryActive' });
    }
  };

  // Check if category has archived products
  const getCategoryStatus = (categoryId: string) => {
    const categoryProducts = products.filter(p => p.category_id === categoryId);
    const archivedCount = categoryProducts.filter(p => !p.is_active).length;
    const totalCount = categoryProducts.length;
    
    if (archivedCount === 0) return 'complete';
    if (archivedCount === totalCount) return 'disabled';
    return 'incomplete';
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

  // Products filtered by search and filters
  const searchFilteredProducts = products.filter((product) => {
    // Text search
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
    
    // Category filter
    const matchesCategory = filterCategory === 'all' 
      || (filterCategory === 'uncategorized' && !product.category_id)
      || product.category_id === filterCategory;
    
    // Status filter - is_active = archived/active at catalog level
    const matchesStatus = filterStatus === 'all'
      || (filterStatus === 'enabled' && product.is_active)
      || (filterStatus === 'disabled' && !product.is_active)
      || (filterStatus === 'featured' && product.is_featured);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Helper to get products for a category (active + optionally archived at the end)
  const getProductsForCategory = (categoryId: string | null) => {
    const categoryProducts = searchFilteredProducts.filter(p => 
      categoryId === 'uncategorized' ? !p.category_id : p.category_id === categoryId
    );
    const activeProducts = categoryProducts.filter(p => p.is_active);
    const archivedProducts = categoryProducts.filter(p => !p.is_active);
    const showArchived = showDisabledInCategory.has(categoryId || 'uncategorized');
    
    // Active products first, then archived at the end (if showing)
    const visibleProducts = showArchived 
      ? [...activeProducts, ...archivedProducts]
      : activeProducts;
    
    return {
      visibleProducts,
      activeCount: activeProducts.length,
      inactiveCount: archivedProducts.length,
      showingInactive: showArchived,
    };
  };

  const toggleShowDisabledInCategory = (categoryId: string) => {
    setShowDisabledInCategory(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
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

  const handleArchiveToggle = (product: Product) => {
    const newValue = !product.is_active;
    if (!newValue) {
      setDisableDialog({
        open: true,
        productId: product.id,
        productName: product.name,
        branchId: '',
        branchName: 'el catálogo',
        isBrandLevel: true,
      });
    } else {
      executeArchiveToggle(product.id, true);
    }
  };

  const handleBranchToggle = (product: Product, branchId: string) => {
    // Solo verificar que el producto esté activo en el catálogo
    if (!product.is_active) {
      toast.error('El producto está archivado');
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

  const executeArchiveToggle = async (productId: string, newValue: boolean) => {
    setUpdating(productId);
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: newValue })
        .eq('id', productId);
      if (error) throw error;

      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, is_active: newValue } : p
      ));
      toast.success(newValue ? 'Producto restaurado' : 'Producto archivado');
    } catch (error) {
      handleError(error, { userMessage: 'Error al actualizar producto', context: 'Products.executeArchiveToggle' });
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
      handleError(error, { userMessage: 'Error al actualizar disponibilidad', context: 'Products.executeBranchToggle' });
    } finally {
      setUpdating(null);
    }
  };

  const handleConfirmDisable = () => {
    if (!disableDialog) return;
    if (disableDialog.isBrandLevel) {
      executeArchiveToggle(disableDialog.productId, false);
    } else {
      executeBranchToggle(disableDialog.productId, disableDialog.branchId, false);
    }
    setDisableDialog(null);
  };

  const handleDeleteProduct = async () => {
    if (!deleteDialog) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', deleteDialog.productId);
      
      if (error) throw error;
      
      setProducts(prev => prev.filter(p => p.id !== deleteDialog.productId));
      toast.success(`"${deleteDialog.productName}" eliminado permanentemente`);
      setDeleteDialog(null);
    } catch (error) {
      handleError(error, { userMessage: 'Error al eliminar el producto', context: 'Products.handleDeleteProduct' });
    } finally {
      setDeleting(false);
    }
  };

  // Build category groups - include categories that have any products (active or inactive)
  const productsByCategory = categories
    .map(category => {
      const categoryData = getProductsForCategory(category.id);
      return {
        category,
        ...categoryData,
      };
    })
    .filter(group => group.activeCount > 0 || group.inactiveCount > 0);

  // Handle uncategorized products
  const uncategorizedData = getProductsForCategory('uncategorized');
  if (uncategorizedData.activeCount > 0 || uncategorizedData.inactiveCount > 0) {
    productsByCategory.push({
      category: { id: 'uncategorized', name: 'Sin Categoría', display_order: 999, is_active: true, created_at: '', description: null, image_url: null },
      ...uncategorizedData,
    });
  }

  const totalArchived = products.filter(p => !p.is_active).length;

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
          <h1 className="text-2xl font-bold">Control Centralizado de Productos</h1>
          <p className="text-muted-foreground text-sm">
            {products.length} productos • {branches.length} sucursales
          </p>
        </div>
        <div className="flex items-center gap-3">
          {totalArchived > 0 && (
            <Badge variant="secondary" className="bg-muted text-muted-foreground border-0">
              <Power className="h-3 w-3 mr-1" />
              {totalArchived} archivados
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => setCategoryManagerOpen(true)}>
            <Settings2 className="w-4 h-4 mr-1.5" />
            Categorías de Productos
          </Button>
          <Link to="/admin/productos/nuevo">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Nuevo Producto
            </Button>
          </Link>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar productos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        
        {/* Category Filter */}
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
            <SelectItem value="uncategorized">Sin categoría</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Status Filter */}
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="enabled">
              <span className="flex items-center gap-2">
                <Check className="w-3 h-3 text-emerald-500" />
                Activos
              </span>
            </SelectItem>
            <SelectItem value="disabled">
              <span className="flex items-center gap-2">
                <X className="w-3 h-3 text-muted-foreground" />
                Archivados
              </span>
            </SelectItem>
            <SelectItem value="featured">
              <span className="flex items-center gap-2">
                <Star className="w-3 h-3 text-amber-500" />
                Destacados
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        
        {/* Active filters indicator */}
        {(filterCategory !== 'all' || filterStatus !== 'all' || search) && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-9 text-muted-foreground"
            onClick={() => {
              setSearch('');
              setFilterCategory('all');
              setFilterStatus('all');
            }}
          >
            <X className="w-3 h-3 mr-1" />
            Limpiar filtros
          </Button>
        )}
        
        {/* Results count */}
        <span className="text-xs text-muted-foreground ml-auto">
          {searchFilteredProducts.length} de {products.length} productos
        </span>
      </div>

      {/* Products Grid */}
      <div className="space-y-4">
        {productsByCategory.map(({ category, visibleProducts, activeCount, inactiveCount, showingInactive }) => {
          const categoryStatus = getCategoryStatus(category.id);
          
          return (
          <div key={category.id} className="space-y-3">
            {/* Category Header */}
            <div className={`
              flex items-center justify-between p-4 rounded-xl transition-all
              ${!category.is_active ? 'bg-muted/60' : 'bg-muted hover:bg-muted/80'}
            `}>
              <button
                onClick={() => toggleCategory(category.id)}
                className="flex items-center gap-3 font-semibold text-foreground hover:text-primary transition-colors"
              >
                {expandedCategories.has(category.id) ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
                <span className={`text-base ${!category.is_active ? 'line-through text-muted-foreground' : ''}`}>
                  {category.name}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {activeCount}
                </Badge>
                {inactiveCount > 0 && (
                  <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600 bg-amber-500/10">
                    +{inactiveCount} inactivos
                  </Badge>
                )}
              </button>
              
              {category.id !== 'uncategorized' && (
                <div className="flex items-center gap-3">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
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
                  <span className={`text-sm font-medium ${category.is_active ? 'text-emerald-600' : 'text-muted-foreground'}`}>
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
              <div className="grid gap-3 pl-2">
                {visibleProducts.map((product) => {
                  const isArchived = !product.is_active;
                  const availableCount = getAvailableBranchesCount(product.id);
                  
                    return (
                      <div key={product.id} className="space-y-0">
                        <div 
                          onClick={() => setExpandedProductId(expandedProductId === product.id ? null : product.id)}
                          className={`
                            group flex items-center gap-4 p-4 rounded-xl transition-all cursor-pointer
                            ${expandedProductId === product.id ? 'rounded-b-none border-b-0' : ''}
                            ${isArchived 
                              ? 'bg-muted/40 border border-dashed border-border' 
                              : 'bg-card hover:bg-accent/30 border border-border shadow-sm hover:shadow-md'
                            }
                          `}
                        >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                          {product.image_url ? (
                            <img 
                              src={product.image_url} 
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                              <span className="text-lg">🍔</span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {product.is_featured && (
                              <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                            )}
                            <span className={`font-medium truncate text-sm ${isArchived ? 'line-through text-muted-foreground' : ''}`}>
                              {product.name}
                            </span>
                            {isArchived && (
                              <Badge variant="outline" className="text-[9px] border-muted-foreground/30 text-muted-foreground">
                                Archivado
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatPrice(product.price)}
                          </span>
                        </div>
                      </div>

                      {/* Branch Availability with Abbreviations - only show for non-archived */}
                      {!isArchived && (
                        <div className="flex items-center gap-1.5">
                          {branches.map((branch) => {
                            const isAvailable = getBranchAvailability(product.id, branch.id);
                            const isUpdating = updating === `${product.id}-${branch.id}`;
                            
                            return (
                              <TooltipProvider key={branch.id}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleBranchToggle(product, branch.id);
                                      }}
                                      disabled={isUpdating}
                                      className="flex flex-col items-center gap-0.5 transition-all hover:scale-105 disabled:hover:scale-100"
                                    >
                                      <span className="text-[9px] font-semibold text-muted-foreground">
                                        {getBranchAbbreviation(branch.name)}
                                      </span>
                                      <div className={`
                                        w-6 h-6 rounded-full flex items-center justify-center transition-all
                                        ${isAvailable 
                                          ? 'bg-emerald-500 text-white' 
                                          : 'bg-muted text-muted-foreground/40'
                                        }
                                      `}>
                                        {isAvailable ? (
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
                                      {isAvailable ? 'Click para desactivar' : 'Click para activar'}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })}
                        </div>
                      )}

                      {/* Availability Count - only show for non-archived */}
                      {!isArchived && (
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

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1">
                        {/* Toggle Archive Button */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className={`h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity ${
                                  isArchived ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10' : 'text-muted-foreground hover:text-muted-foreground hover:bg-muted'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleArchiveToggle(product);
                                }}
                              >
                                {isArchived ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {isArchived ? 'Restaurar producto' : 'Archivar producto'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        {/* Edit Button */}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedProductId(expandedProductId === product.id ? null : product.id);
                          }}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        
                        {/* Delete Button */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteDialog({
                                    open: true,
                                    productId: product.id,
                                    productName: product.name,
                                  });
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Eliminar producto</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                        </div>
                        
                        {/* Inline Editor */}
                        {expandedProductId === product.id && (
                          <ProductInlineEditor
                            productId={product.id}
                            categories={categories}
                            onClose={() => setExpandedProductId(null)}
                            onProductUpdated={fetchData}
                          />
                        )}
                      </div>
                    );
                })}
                
                {/* Show/Hide Inactive Products Button */}
                {inactiveCount > 0 && (
                  <button
                    onClick={() => toggleShowDisabledInCategory(category.id)}
                    className="flex items-center gap-2 py-3 px-4 w-full text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all group"
                  >
                    <div className={`
                      flex items-center justify-center w-5 h-5 rounded-full border border-dashed 
                      transition-all group-hover:border-primary group-hover:text-primary
                      ${showingInactive ? 'bg-primary/10 border-primary text-primary' : 'border-muted-foreground/40'}
                    `}>
                      {showingInactive ? (
                        <EyeOff className="w-3 h-3" />
                      ) : (
                        <Plus className="w-3 h-3" />
                      )}
                    </div>
                    <span>
                      {showingInactive 
                        ? 'Ocultar productos desactivados' 
                        : `Ver ${inactiveCount} producto${inactiveCount > 1 ? 's' : ''} desactivado${inactiveCount > 1 ? 's' : ''}`
                      }
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        );
        })}


        {productsByCategory.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <p>No se encontraron productos</p>
          </div>
        )}
      </div>

      {/* Archive/Disable Confirmation Dialog */}
      <AlertDialog open={disableDialog?.open} onOpenChange={(open) => !open && setDisableDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <PowerOff className="h-5 w-5 text-muted-foreground" />
              {disableDialog?.isBrandLevel ? 'Archivar Producto' : 'Desactivar en Sucursal'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {disableDialog?.isBrandLevel ? (
                <>
                  ¿Estás seguro de que deseas archivar <strong>{disableDialog?.productName}</strong>?
                  <span className="block mt-2 text-muted-foreground">
                    El producto desaparecerá del catálogo y de todas las sucursales. Podrás restaurarlo en cualquier momento.
                  </span>
                </>
              ) : (
                <>
                  ¿Estás seguro de que deseas desactivar <strong>{disableDialog?.productName}</strong> en{' '}
                  <strong>{disableDialog?.branchName}</strong>?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDisable}
              className={disableDialog?.isBrandLevel ? 'bg-muted text-muted-foreground hover:bg-muted/80' : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}
            >
              {disableDialog?.isBrandLevel ? 'Archivar' : 'Desactivar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog?.open} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Eliminar Producto Permanentemente
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar <strong>{deleteDialog?.productName}</strong>?
              <span className="block mt-2 text-destructive font-medium">
                Esta acción es irreversible. El nombre quedará liberado para usar en nuevos productos.
              </span>
              <span className="block mt-1 text-muted-foreground text-xs">
                Los pedidos históricos conservarán el nombre y precio del producto al momento de la venta.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Eliminando...' : 'Eliminar permanentemente'}
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

      {/* Category Manager */}
      <CategoryManager
        open={categoryManagerOpen}
        onOpenChange={setCategoryManagerOpen}
        categories={categories}
        onCategoriesUpdated={fetchData}
      />
    </div>
  );
}
