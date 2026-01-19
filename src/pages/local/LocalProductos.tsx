import { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Search, Package, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;
type BranchProduct = Tables<'branch_products'>;

interface ProductWithBranchData extends Product {
  branchProduct: BranchProduct | null;
  category?: { name: string } | null;
}

export default function LocalProductos() {
  const { branchId } = useParams();
  const { branch } = useOutletContext<{ branch: Tables<'branches'> | null }>();
  const { isAdmin, isGerente, branchPermissions } = useUserRole();
  
  const [products, setProducts] = useState<ProductWithBranchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const currentPermissions = branchPermissions.find(p => p.branch_id === branchId);
  const canEdit = isAdmin || isGerente || currentPermissions?.can_manage_products;

  const fetchProducts = async () => {
    if (!branchId) return;
    
    setLoading(true);
    try {
      // Fetch all global products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          category:product_categories(name)
        `)
        .order('name');

      if (productsError) throw productsError;

      // Fetch branch products for this branch
      const { data: branchProductsData, error: bpError } = await supabase
        .from('branch_products')
        .select('*')
        .eq('branch_id', branchId);

      if (bpError) throw bpError;

      const branchProductsMap = new Map(
        (branchProductsData || []).map(bp => [bp.product_id, bp])
      );

      const combined = (productsData || []).map(p => ({
        ...p,
        branchProduct: branchProductsMap.get(p.id) || null,
      }));

      setProducts(combined);
    } catch (error: any) {
      toast.error('Error al cargar productos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [branchId]);

  const toggleProductAvailability = async (product: ProductWithBranchData) => {
    if (!canEdit || !branchId) {
      toast.error('No tenés permisos para modificar productos');
      return;
    }

    setUpdating(product.id);
    try {
      const currentlyActive = product.branchProduct?.is_available ?? true;
      const newStatus = !currentlyActive;

      if (product.branchProduct) {
        // Update existing branch_product
        const { error } = await supabase
          .from('branch_products')
          .update({ is_available: newStatus })
          .eq('id', product.branchProduct.id);

        if (error) throw error;
      } else {
        // Create new branch_product record
        const { error } = await supabase
          .from('branch_products')
          .insert({
            branch_id: branchId,
            product_id: product.id,
            is_available: newStatus,
          });

        if (error) throw error;
      }

      toast.success(`${product.name} ${newStatus ? 'activado' : 'desactivado'}`);
      fetchProducts();
    } catch (error: any) {
      toast.error('Error al actualizar: ' + error.message);
    } finally {
      setUpdating(null);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = filteredProducts.filter(p => 
    p.is_available && (p.branchProduct?.is_available !== false)
  ).length;

  const formatPrice = (price: number) => 
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(price);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Productos</h1>
          <p className="text-muted-foreground">
            {branch?.name} · {activeCount} activos de {filteredProducts.length}
          </p>
        </div>
        <Button variant="outline" onClick={fetchProducts} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {!canEdit && (
        <Card className="bg-muted">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Modo lectura: no tenés permisos para modificar productos en esta sucursal.
            </p>
          </CardContent>
        </Card>
      )}

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Lista de Productos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Precio Base</TableHead>
                  <TableHead>Precio Sucursal</TableHead>
                  <TableHead>Global</TableHead>
                  <TableHead className="text-center">Activo en Sucursal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => {
                  const isGlobalActive = product.is_available;
                  const isBranchActive = product.branchProduct?.is_available !== false;
                  const customPrice = product.branchProduct?.custom_price;
                  const finalPrice = customPrice || product.price;

                  return (
                    <TableRow 
                      key={product.id}
                      className={!isGlobalActive ? 'opacity-50' : ''}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center overflow-hidden">
                            {product.image_url ? (
                              <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            {product.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {product.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{product.category?.name || 'Sin categoría'}</Badge>
                      </TableCell>
                      <TableCell>{formatPrice(product.price)}</TableCell>
                      <TableCell>
                        {customPrice ? (
                          <span className="text-primary font-medium">{formatPrice(customPrice)}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isGlobalActive ? (
                          <Badge variant="default" className="bg-green-500">Activo</Badge>
                        ) : (
                          <Badge variant="secondary">Inactivo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {isGlobalActive ? (
                          <div className="flex items-center justify-center gap-2">
                            <Switch
                              checked={isBranchActive}
                              onCheckedChange={() => toggleProductAvailability(product)}
                              disabled={!canEdit || updating === product.id}
                            />
                            {updating === product.id && (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Desactivado globalmente
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
