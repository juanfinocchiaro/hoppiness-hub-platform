import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ShoppingBag, Circle } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;
type Category = Tables<'product_categories'>;
type Branch = Tables<'branches'>;

interface ProductWithAvailability extends Product {
  availability: { branchId: string; branchName: string; available: boolean }[];
  category?: Category | null;
}

// Mapeo de abreviaturas por nombre de sucursal
const branchAbbreviations: Record<string, string> = {
  'General Paz': 'GP',
  'Manantiales': 'MNT',
  'Nueva Córdoba': 'NVC',
  'Villa Allende': 'VA',
  'Villa Carlos Paz': 'VCP',
};

const getBranchAbbreviation = (branchName: string): string => {
  return branchAbbreviations[branchName] || branchName.substring(0, 3).toUpperCase();
};

export default function NuestroMenu() {
  const [products, setProducts] = useState<ProductWithAvailability[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [productsRes, branchesRes, branchProductsRes, categoriesRes] = await Promise.all([
      supabase.from('products').select('*, category:product_categories(*)').eq('is_active', true).order('name'),
      supabase.from('branches').select('*').eq('is_active', true).order('name'),
      supabase.from('branch_products').select('branch_id, product_id, is_available'),
      supabase.from('product_categories').select('*').eq('is_active', true).order('display_order'),
    ]);

    if (branchesRes.data) setBranches(branchesRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);

    if (productsRes.data && branchesRes.data) {
      const bpMap = new Map<string, boolean>();
      (branchProductsRes.data || []).forEach(bp => {
        bpMap.set(`${bp.branch_id}-${bp.product_id}`, bp.is_available);
      });

      const productsWithAvailability: ProductWithAvailability[] = productsRes.data.map(product => ({
        ...product,
        category: (product as any).category || null,
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

  // Group products by category
  const productsByCategory = categories.map(cat => ({
    category: cat,
    products: products.filter(p => p.category_id === cat.id),
  })).filter(g => g.products.length > 0);

  // Products without category
  const uncategorizedProducts = products.filter(p => !p.category_id);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicHeader />

      <section className="bg-primary text-primary-foreground py-10">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-black mb-3 font-brand">Nuestro Menú</h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Consultá la disponibilidad de cada producto en nuestras sucursales
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8 flex-1">
        {/* Branch Legend */}
        <div className="mb-6 flex flex-wrap items-center gap-4 justify-center">
          <span className="text-sm text-muted-foreground font-medium">Sucursales:</span>
          {branches.map((branch) => (
            <div key={branch.id} className="flex items-center gap-1.5 text-sm">
              <span className="px-2 py-0.5 rounded bg-muted text-xs font-bold">
                {getBranchAbbreviation(branch.name)}
              </span>
              <span className="text-muted-foreground">{branch.name}</span>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : (
          <TooltipProvider>
            <div className="space-y-8">
              {productsByCategory.map(({ category, products: catProducts }) => (
                <Card key={category.id}>
                  <CardHeader className="py-3 px-4 bg-muted/50">
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {catProducts.map(product => (
                        <ProductRow 
                          key={product.id} 
                          product={product} 
                          branches={branches}
                          formatPrice={formatPrice}
                          getBranchAbbreviation={getBranchAbbreviation}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {uncategorizedProducts.length > 0 && (
                <Card>
                  <CardHeader className="py-3 px-4 bg-muted/50">
                    <CardTitle className="text-lg">Otros</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {uncategorizedProducts.map(product => (
                        <ProductRow 
                          key={product.id} 
                          product={product} 
                          branches={branches}
                          formatPrice={formatPrice}
                          getBranchAbbreviation={getBranchAbbreviation}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TooltipProvider>
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

interface ProductRowProps {
  product: ProductWithAvailability;
  branches: Branch[];
  formatPrice: (price: number) => string;
  getBranchAbbreviation: (branchName: string) => string;
}

function ProductRow({ product, branches, formatPrice, getBranchAbbreviation }: ProductRowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
      {/* Left: Product Info */}
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
            {product.image_url ? (
              <img src={product.image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg">🍔</span>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-medium text-sm truncate">{product.name}</h3>
            <p className="text-primary font-bold text-sm">{formatPrice(product.price)}</p>
          </div>
        </div>
      </div>

      {/* Right: Branch Availability - Solo badges con title */}
      <div className="flex items-center gap-1.5">
        {branches.map((branch) => {
          const availability = product.availability.find(a => a.branchId === branch.id);
          const isAvailable = availability?.available ?? false;
          const abbr = getBranchAbbreviation(branch.name);
          
          return (
            <div 
              key={branch.id}
              className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                isAvailable 
                  ? 'bg-green-500 text-white' 
                  : 'bg-red-500/20 text-red-500'
              }`}
              title={`${branch.name}: ${isAvailable ? 'Disponible' : 'Sin stock'}`}
            >
              {abbr}
            </div>
          );
        })}
      </div>
    </div>
  );
}
