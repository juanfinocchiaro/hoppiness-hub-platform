import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Search, Edit, Star, Settings2, Check, X, Store } from 'lucide-react';
import { toast } from 'sonner';
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

type TimeFilter = 'today' | 'week' | 'month' | 'year';

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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState<string | null>(null);

  const fetchData = async () => {
    const now = new Date();
    let startDate: Date;
    
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
    }

    const [productsRes, categoriesRes, branchesRes, branchProductsRes, ordersRes] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('product_categories').select('*').order('display_order'),
      supabase.from('branches').select('*').eq('is_active', true).order('name'),
      supabase.from('branch_products').select('*'),
      supabase
        .from('orders')
        .select('id, branch_id')
        .gte('created_at', startDate.toISOString())
        .in('status', ['delivered', 'ready', 'preparing', 'confirmed']),
    ]);

    const orders = ordersRes.data || [];
    const orderIds = orders.map(o => o.id);
    
    let salesByProductBranch: ProductSalesData[] = [];
    
    if (orderIds.length > 0) {
      // Fetch in batches to avoid query limits
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
      
      // Create order to branch mapping
      const orderToBranch = new Map(orders.map(o => [o.id, o.branch_id]));
      
      // Aggregate sales by product and branch
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
  }, [timeFilter]);

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

  const toggleBranchAvailability = async (productId: string, branchId: string, currentValue: boolean) => {
    const key = `${productId}-${branchId}`;
    setSavingAvailability(key);
    
    const existingBp = branchProducts.find(bp => bp.product_id === productId && bp.branch_id === branchId);
    
    try {
      if (existingBp) {
        const { error } = await supabase
          .from('branch_products')
          .update({ is_available: !currentValue })
          .eq('id', existingBp.id);
        
        if (error) throw error;
        
        setBranchProducts(prev => 
          prev.map(bp => bp.id === existingBp.id ? { ...bp, is_available: !currentValue } : bp)
        );
      } else {
        const { data, error } = await supabase
          .from('branch_products')
          .insert({ product_id: productId, branch_id: branchId, is_available: !currentValue })
          .select()
          .single();
        
        if (error) throw error;
        if (data) setBranchProducts(prev => [...prev, data]);
      }
      
      toast.success('Disponibilidad actualizada');
    } catch (error) {
      toast.error('Error al actualizar disponibilidad');
      console.error(error);
    } finally {
      setSavingAvailability(null);
    }
  };

  const getTimeFilterLabel = () => {
    switch (timeFilter) {
      case 'today': return 'Hoy';
      case 'week': return 'Última semana';
      case 'month': return 'Este mes';
      case 'year': return 'Este año';
    }
  };

  // Get branch abbreviation for compact display
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
              </SelectContent>
            </Select>
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
                        <Badge variant={product.is_available ? 'default' : 'secondary'}>
                          {getAvailableBranchesCount(product.id)}/{branches.length}
                        </Badge>
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
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="w-5 h-5" />
              Editar Disponibilidad por Sucursal
            </DialogTitle>
            <DialogDescription>
              Activa o desactiva productos en cada sucursal
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
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
                {filteredProducts.map((product) => (
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
                      const isAvailable = getBranchAvailability(product.id, branch.id);
                      const key = `${product.id}-${branch.id}`;
                      const isSaving = savingAvailability === key;
                      
                      return (
                        <TableCell key={branch.id} className="text-center">
                          <Switch
                            checked={isAvailable}
                            onCheckedChange={() => toggleBranchAvailability(product.id, branch.id, isAvailable)}
                            disabled={isSaving}
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}