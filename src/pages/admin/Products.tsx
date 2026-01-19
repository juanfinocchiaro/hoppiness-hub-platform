import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { Plus, Search, Edit, Star, Settings2, Check, X, Store, CalendarIcon, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;
type Category = Tables<'product_categories'>;
type Branch = Tables<'branches'>;
type BranchProduct = Tables<'branch_products'>;

interface ProductSalesData {
  productId: string;
  branchId: string;
  quantity: number;
}

type TimeFilter = 'today' | 'week' | 'month' | 'year' | 'custom';

// Availability mode for dialog
type AvailabilityEditMode = 'brand' | 'branch';

// Pending changes type for batch save
interface PendingChange {
  productId: string;
  branchId?: string; // undefined = global brand change
  newValue: boolean;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchProducts, setBranchProducts] = useState<BranchProduct[]>([]);
  const [salesData, setSalesData] = useState<ProductSalesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');
  
  // Custom date range
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [timeFrom, setTimeFrom] = useState<string>('00:00');
  const [timeTo, setTimeTo] = useState<string>('23:59');
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState<AvailabilityEditMode>('brand');
  const [pendingChanges, setPendingChanges] = useState<Map<string, boolean>>(new Map());
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  const getDateRange = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;
    
    switch (timeFilter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'custom':
        if (dateFrom && dateTo) {
          const [fromHours, fromMins] = timeFrom.split(':').map(Number);
          const [toHours, toMins] = timeTo.split(':').map(Number);
          startDate = new Date(dateFrom);
          startDate.setHours(fromHours, fromMins, 0, 0);
          endDate = new Date(dateTo);
          endDate.setHours(toHours, toMins, 59, 999);
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    return { startDate, endDate };
  }, [timeFilter, dateFrom, dateTo, timeFrom, timeTo]);

  const fetchData = async () => {
    const { startDate, endDate } = getDateRange;

    const [productsRes, categoriesRes, branchesRes, branchProductsRes, ordersRes] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('product_categories').select('*').order('display_order'),
      supabase.from('branches').select('*').eq('is_active', true).order('name'),
      supabase.from('branch_products').select('*'),
      supabase
        .from('orders')
        .select('id, branch_id')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .in('status', ['delivered', 'ready', 'preparing', 'confirmed']),
    ]);

    const orders = ordersRes.data || [];
    const orderIds = orders.map(o => o.id);
    
    let salesByProductBranch: ProductSalesData[] = [];
    
    if (orderIds.length > 0) {
      const batchSize = 100;
      const allItems: { product_id: string; quantity: number; order_id: string }[] = [];
      
      for (let i = 0; i < orderIds.length; i += batchSize) {
        const batch = orderIds.slice(i, i + batchSize);
        const itemsRes = await supabase
          .from('order_items')
          .select('product_id, quantity, order_id')
          .in('order_id', batch);
        
        if (itemsRes.data) {
          allItems.push(...itemsRes.data);
        }
      }
      
      const orderToBranch = new Map(orders.map(o => [o.id, o.branch_id]));
      const salesMap = new Map<string, number>();
      
      allItems.forEach(item => {
        const branchId = orderToBranch.get(item.order_id);
        if (branchId) {
          const key = `${item.product_id}-${branchId}`;
          salesMap.set(key, (salesMap.get(key) || 0) + (item.quantity || 0));
        }
      });
      
      salesByProductBranch = Array.from(salesMap.entries()).map(([key, quantity]) => {
        const [productId, branchId] = key.split('-');
        return { productId, branchId, quantity };
      });
    }

    if (productsRes.data) setProducts(productsRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);
    if (branchesRes.data) setBranches(branchesRes.data);
    if (branchProductsRes.data) setBranchProducts(branchProductsRes.data);
    setSalesData(salesByProductBranch);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [timeFilter, dateFrom, dateTo, timeFrom, timeTo]);

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category_id === categoryFilter;
    return matchesSearch && matchesCategory;
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

  const getBrandEnabled = (productId: string): boolean => {
    const product = products.find(p => p.id === productId);
    return product?.is_enabled_by_brand ?? true;
  };

  // Get availability considering pending changes (branch mode)
  const getEditingAvailability = (productId: string, branchId: string): boolean => {
    const key = `${productId}-${branchId}`;
    if (pendingChanges.has(key)) {
      return pendingChanges.get(key)!;
    }
    return getBranchAvailability(productId, branchId);
  };

  // Get brand enabled considering pending changes (brand mode)
  const getEditingBrandEnabled = (productId: string): boolean => {
    const key = `brand-${productId}`;
    if (pendingChanges.has(key)) {
      return pendingChanges.get(key)!;
    }
    return getBrandEnabled(productId);
  };

  const getProductSales = (productId: string, branchId: string): number => {
    const sale = salesData.find(s => s.productId === productId && s.branchId === branchId);
    return sale?.quantity || 0;
  };

  const getTotalSales = (productId: string): number => {
    return salesData
      .filter(s => s.productId === productId)
      .reduce((sum, s) => sum + s.quantity, 0);
  };

  const getAvailableBranchesCount = (productId: string): number => {
    return branches.filter(b => getBranchAvailability(productId, b.id)).length;
  };

  // Toggle in pending changes (not saved yet) - branch mode
  const togglePendingChange = (productId: string, branchId: string) => {
    const key = `${productId}-${branchId}`;
    const currentValue = getEditingAvailability(productId, branchId);
    setPendingChanges(prev => {
      const newMap = new Map(prev);
      newMap.set(key, !currentValue);
      return newMap;
    });
  };

  // Toggle brand enabled in pending changes (brand mode)
  const toggleBrandPendingChange = (productId: string) => {
    const key = `brand-${productId}`;
    const currentValue = getEditingBrandEnabled(productId);
    setPendingChanges(prev => {
      const newMap = new Map(prev);
      newMap.set(key, !currentValue);
      return newMap;
    });
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = pendingChanges.size > 0;

  // Handle dialog close
  const handleDialogClose = () => {
    if (hasUnsavedChanges) {
      setConfirmCloseOpen(true);
    } else {
      setEditDialogOpen(false);
    }
  };

  // Confirm discard changes
  const handleConfirmDiscard = () => {
    setPendingChanges(new Map());
    setConfirmCloseOpen(false);
    setEditDialogOpen(false);
  };

  // Save all pending changes
  const saveAllChanges = async () => {
    if (pendingChanges.size === 0) {
      toast.info('No hay cambios para guardar');
      return;
    }

    setSavingAvailability(true);
    
    try {
      if (editMode === 'brand') {
        // Brand mode: update products.is_enabled_by_brand
        for (const [key, newValue] of pendingChanges.entries()) {
          if (key.startsWith('brand-')) {
            const productId = key.replace('brand-', '');
            const { error } = await supabase
              .from('products')
              .update({ is_enabled_by_brand: newValue })
              .eq('id', productId);
            if (error) throw error;
          }
        }
        // Refresh products
        const { data: newProducts } = await supabase.from('products').select('*').order('name');
        if (newProducts) setProducts(newProducts);
      } else {
        // Branch mode: update branch_products.is_available
        for (const [key, newValue] of pendingChanges.entries()) {
          const [productId, branchId] = key.split('-');
          const existingBp = branchProducts.find(bp => bp.product_id === productId && bp.branch_id === branchId);
          
          if (existingBp) {
            const { error } = await supabase
              .from('branch_products')
              .update({ is_available: newValue })
              .eq('id', existingBp.id);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('branch_products')
              .insert({ product_id: productId, branch_id: branchId, is_available: newValue });
            if (error) throw error;
          }
        }
        // Refresh branch products
        const { data: newBranchProducts } = await supabase.from('branch_products').select('*');
        if (newBranchProducts) setBranchProducts(newBranchProducts);
      }
      
      setPendingChanges(new Map());
      toast.success(`${pendingChanges.size} cambios guardados correctamente`);
      setEditDialogOpen(false);
    } catch (error) {
      toast.error('Error al guardar cambios');
      console.error(error);
    } finally {
      setSavingAvailability(false);
    }
  };

  const getTimeFilterLabel = () => {
    switch (timeFilter) {
      case 'today': return 'Hoy';
      case 'week': return 'Última semana';
      case 'month': return 'Este mes';
      case 'year': return 'Este año';
      case 'custom': 
        if (dateFrom && dateTo) {
          return `${format(dateFrom, 'dd/MM', { locale: es })} - ${format(dateTo, 'dd/MM', { locale: es })}`;
        }
        return 'Personalizado';
    }
  };

  const getBranchAbbr = (name: string): string => {
    const words = name.split(' ');
    if (words.length === 1) return name.slice(0, 3).toUpperCase();
    return words.map(w => w[0]).join('').toUpperCase().slice(0, 3);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Productos</h1>
          <p className="text-muted-foreground">Catálogo maestro de productos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <Settings2 className="w-4 h-4 mr-2" />
            Editar Disponibilidad
          </Button>
          <Link to="/admin/productos/nuevo">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Producto
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
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
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoy</SelectItem>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Este mes</SelectItem>
                  <SelectItem value="year">Este año</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Custom date/time range */}
            {timeFilter === 'custom' && (
              <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn(!dateFrom && "text-muted-foreground")}>
                        {dateFrom ? format(dateFrom, 'dd/MM/yyyy', { locale: es }) : 'Desde'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={setDateFrom}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground">-</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn(!dateTo && "text-muted-foreground")}>
                        {dateTo ? format(dateTo, 'dd/MM/yyyy', { locale: es }) : 'Hasta'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={setDateTo}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <Input
                    type="time"
                    value={timeFrom}
                    onChange={(e) => setTimeFrom(e.target.value)}
                    className="w-28"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="time"
                    value={timeTo}
                    onChange={(e) => setTimeTo(e.target.value)}
                    className="w-28"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''}
          </CardTitle>
          <CardDescription>
            Ventas: {getTimeFilterLabel()} | Disponibilidad por sucursal
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead className="text-center">Disponibilidad</TableHead>
                    <TableHead className="text-center">Ventas Totales</TableHead>
                    {branches.map(branch => (
                      <TableHead key={branch.id} className="text-center min-w-[80px]">
                        <span title={branch.name} className="cursor-help">
                          {getBranchAbbr(branch.name)}
                        </span>
                      </TableHead>
                    ))}
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {product.is_featured && (
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />
                          )}
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {product.description}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getCategoryName(product.category_id)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatPrice(product.price)}
                      </TableCell>
                      <TableCell className="text-center">
                        {product.is_enabled_by_brand ? (
                          <Badge variant={product.is_available ? 'default' : 'secondary'}>
                            {getAvailableBranchesCount(product.id)}/{branches.length}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Deshabilitado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {getTotalSales(product.id)}
                      </TableCell>
                      {branches.map(branch => {
                        const isAvailable = getBranchAvailability(product.id, branch.id);
                        const sales = getProductSales(product.id, branch.id);
                        
                        return (
                          <TableCell key={branch.id} className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                isAvailable 
                                  ? 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400' 
                                  : 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400'
                              }`}>
                                {isAvailable ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              </div>
                              <span className="text-xs text-muted-foreground">{sales}</span>
                            </div>
                          </TableCell>
                        );
                      })}
                      <TableCell>
                        <Link to={`/admin/productos/${product.id}`}>
                          <Button variant="ghost" size="icon">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Availability Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        if (!open) handleDialogClose();
        else setEditDialogOpen(true);
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="w-5 h-5" />
              Editar Disponibilidad
            </DialogTitle>
            <DialogDescription>
              {editMode === 'brand' 
                ? 'Habilita o deshabilita productos a nivel marca. Los deshabilitados no estarán disponibles en ningún local.' 
                : 'Activa o desactiva productos en cada sucursal.'}
              {hasUnsavedChanges && (
                <span className="ml-2 text-orange-600 font-medium">
                  ({pendingChanges.size} cambio{pendingChanges.size !== 1 ? 's' : ''} pendiente{pendingChanges.size !== 1 ? 's' : ''})
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Mode Tabs */}
          <div className="flex gap-2 border-b pb-3">
            <Button
              variant={editMode === 'brand' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (hasUnsavedChanges) {
                  setConfirmCloseOpen(true);
                } else {
                  setPendingChanges(new Map());
                  setEditMode('brand');
                }
              }}
            >
              Por Marca (Global)
            </Button>
            <Button
              variant={editMode === 'branch' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (hasUnsavedChanges) {
                  setConfirmCloseOpen(true);
                } else {
                  setPendingChanges(new Map());
                  setEditMode('branch');
                }
              }}
            >
              Por Sucursal
            </Button>
          </div>
          
          <div className="flex-1 overflow-auto">
            {editMode === 'brand' ? (
              /* Brand Mode - Simple list with single toggle per product */
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="min-w-[200px]">Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-center w-[120px]">Habilitado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const isEnabled = getEditingBrandEnabled(product.id);
                    const key = `brand-${product.id}`;
                    const hasChange = pendingChanges.has(key);
                    
                    return (
                      <TableRow key={product.id} className={!isEnabled ? 'opacity-60' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {product.is_featured && (
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />
                            )}
                            <span className="font-medium">{product.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getCategoryName(product.category_id)}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className={cn(
                            "inline-flex rounded-md p-1",
                            hasChange && "bg-orange-100 dark:bg-orange-950"
                          )}>
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={() => toggleBrandPendingChange(product.id)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              /* Branch Mode - Matrix with toggle per branch */
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="min-w-[200px]">Producto</TableHead>
                    {branches.map(branch => (
                      <TableHead key={branch.id} className="text-center min-w-[100px]">
                        <span title={branch.name}>{getBranchAbbr(branch.name)}</span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.filter(p => p.is_enabled_by_brand).map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {product.is_featured && (
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />
                          )}
                          <span className="font-medium">{product.name}</span>
                        </div>
                      </TableCell>
                      {branches.map(branch => {
                        const isAvailable = getEditingAvailability(product.id, branch.id);
                        const key = `${product.id}-${branch.id}`;
                        const hasChange = pendingChanges.has(key);
                        
                        return (
                          <TableCell key={branch.id} className="text-center">
                            <div className={cn(
                              "inline-flex rounded-md p-1",
                              hasChange && "bg-orange-100 dark:bg-orange-950"
                            )}>
                              <Switch
                                checked={isAvailable}
                                onCheckedChange={() => togglePendingChange(product.id, branch.id)}
                              />
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={handleDialogClose}>
              Cancelar
            </Button>
            <Button 
              onClick={saveAllChanges} 
              disabled={savingAvailability || !hasUnsavedChanges}
            >
              {savingAvailability ? 'Guardando...' : `Aplicar${hasUnsavedChanges ? ` (${pendingChanges.size})` : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Discard Changes Dialog */}
      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Salir sin guardar?</AlertDialogTitle>
            <AlertDialogDescription>
              Tienes {pendingChanges.size} cambio{pendingChanges.size !== 1 ? 's' : ''} sin guardar. 
              Si sales ahora, los cambios se perderán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Seguir editando</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDiscard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Salir sin guardar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}