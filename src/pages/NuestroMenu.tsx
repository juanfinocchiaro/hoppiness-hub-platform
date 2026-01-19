import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, ShoppingBag } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;
type Branch = Tables<'branches'>;

interface ProductWithAvailability extends Product {
  availability: { branchId: string; branchName: string; available: boolean }[];
}

export default function NuestroMenu() {
  const [products, setProducts] = useState<ProductWithAvailability[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [productsRes, branchesRes, branchProductsRes] = await Promise.all([
      supabase.from('products').select('*').eq('is_available', true).order('name'),
      supabase.from('branches').select('*').eq('is_active', true).order('name'),
      supabase.from('branch_products').select('branch_id, product_id, is_available'),
    ]);

    if (branchesRes.data) setBranches(branchesRes.data);

    if (productsRes.data && branchesRes.data) {
      const bpMap = new Map<string, boolean>();
      (branchProductsRes.data || []).forEach(bp => {
        bpMap.set(`${bp.branch_id}-${bp.product_id}`, bp.is_available);
      });

      const productsWithAvailability: ProductWithAvailability[] = productsRes.data.map(product => ({
        ...product,
        availability: branchesRes.data.map(branch => ({
          branchId: branch.id,
          branchName: branch.name,
          available: bpMap.get(`${branch.id}-${product.id}`) ?? false,
        })),
      }));

      setProducts(productsWithAvailability);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(price);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicHeader />

      <section className="bg-primary text-primary-foreground py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-black mb-4 font-brand">Nuestro Menú</h1>
          <p className="text-xl text-primary-foreground/80 max-w-2xl mx-auto">
            Consultá la disponibilidad de cada producto en nuestras sucursales
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 flex-1">
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-64" />)}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(product => (
              <Card key={product.id} className="overflow-hidden">
                <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-6xl">🍔</span>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-bold text-lg mb-1">{product.name}</h3>
                  {product.description && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{product.description}</p>
                  )}
                  <p className="text-primary font-bold text-xl mb-4">{formatPrice(product.price)}</p>
                  
                  <div className="border-t pt-3">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Disponibilidad por sucursal:</p>
                    <div className="flex flex-wrap gap-2">
                      {product.availability.map(a => (
                        <Badge
                          key={a.branchId}
                          variant={a.available ? 'default' : 'secondary'}
                          className={`text-xs ${a.available ? 'bg-green-500' : 'bg-muted text-muted-foreground'}`}
                        >
                          {a.available ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                          {a.branchName}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="text-center mt-12">
          <Link to="/pedir">
            <Button size="lg">
              <ShoppingBag className="w-5 h-5 mr-2" />
              Hacer un pedido
            </Button>
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
