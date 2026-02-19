import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ArrowLeft, MapPin, Clock, Phone, ShoppingBag } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;
type Product = Tables<'products'>;
type Category = Tables<'product_categories'>;
type BranchProduct = Tables<'branch_products'>;

interface ProductWithAvailability extends Product {
  branchProduct: BranchProduct | null;
}

export default function MenuPublic() {
  const { branchSlug } = useParams();
  const [branch, setBranch] = useState<Branch | null>(null);
  const [products, setProducts] = useState<ProductWithAvailability[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      // Fetch branch by slug
      const { data: branchData, error: branchError } = await supabase
        .from('branches')
        .select('*')
        .eq('slug', branchSlug)
        .eq('is_active', true)
        .single();

      if (branchError || !branchData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setBranch(branchData);

      // Fetch products and categories
      const [productsRes, categoriesRes, branchProductsRes] = await Promise.all([
        supabase.from('products').select('*').eq('is_available', true).order('name'),
        supabase.from('product_categories').select('*').eq('is_active', true).order('display_order'),
        supabase.from('branch_products').select('*').eq('branch_id', branchData.id),
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);

      if (productsRes.data) {
        const branchProductsMap = new Map(
          (branchProductsRes.data || []).map(bp => [bp.product_id, bp])
        );

        const availableProducts = productsRes.data
          .map(p => ({
            ...p,
            branchProduct: branchProductsMap.get(p.id) || null,
          }))
          .filter(p => p.branchProduct?.is_available !== false);

        setProducts(availableProducts);
      }

      setLoading(false);
    }

    if (branchSlug) {
      fetchData();
    }
  }, [branchSlug]);

  const filteredProducts = products.filter(p => 
    selectedCategory === 'all' || p.category_id === selectedCategory
  );

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-4">
          <Skeleton className="h-32 mb-6" />
          <Skeleton className="h-10 mb-4" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48" />)}
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <h1 className="text-2xl font-bold mb-2">Sucursal no encontrada</h1>
            <p className="text-muted-foreground mb-4">
              No pudimos encontrar el menú de esta sucursal.
            </p>
            <Link to="/">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al inicio
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto p-4 md:p-6">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/">
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{branch?.name}</h1>
              <div className="flex items-center gap-2 text-sm opacity-90">
                <MapPin className="w-3 h-3" />
                <span>{branch?.address}, {branch?.city}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            {branch?.phone && (
              <div className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                <span>{branch.phone}</span>
              </div>
            )}
            <Badge variant={branch?.is_open ? 'secondary' : 'outline'} className="bg-primary-foreground/20">
              {branch?.is_open ? '🟢 Abierto' : '🔴 Cerrado'}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Order CTA */}
        {branch?.is_open && (
          <Card className="mb-6 bg-primary/5 border-primary/20">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">¿Querés pedir?</p>
                  <p className="text-sm text-muted-foreground">Hacé tu pedido online</p>
                </div>
                <Link to={`/pedir/${branchSlug}`}>
                  <Button>
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Pedir Ahora
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Categories */}
        <ScrollArea className="w-full mb-6">
          <div className="flex gap-2 pb-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
            >
              Todos
            </Button>
            {categories.map(cat => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.name}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Products */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProducts.map(product => {
            const price = product.branchProduct?.custom_price || product.price;
            
            return (
              <Card key={product.id} className="overflow-hidden">
                <div className="flex">
                  {product.image_url && (
                    <div className="w-32 h-32 flex-shrink-0">
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardContent className="flex-1 p-4">
                    <h3 className="font-semibold mb-1">{product.name}</h3>
                    {product.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {product.description}
                      </p>
                    )}
                    <p className="text-lg font-bold text-primary">{formatPrice(price)}</p>
                  </CardContent>
                </div>
              </Card>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No hay productos disponibles en esta categoría</p>
          </div>
        )}
      </div>
    </div>
  );
}
