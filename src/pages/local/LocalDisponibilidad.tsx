import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Search, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ProductAvailability {
  id: string;
  product_id: string;
  is_available: boolean;
  product: {
    id: string;
    name: string;
    category_id: string | null;
    price: number;
    image_url: string | null;
  };
}

interface Category {
  id: string;
  name: string;
  display_order: number | null;
}

export default function LocalDisponibilidad() {
  const { branchId } = useParams<{ branchId: string }>();
  const [products, setProducts] = useState<ProductAvailability[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (branchId) {
      fetchData();
    }
  }, [branchId]);

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        supabase
          .from('branch_products')
          .select(`
            id,
            product_id,
            is_available,
            product:products(id, name, category_id, price, image_url)
          `)
          .eq('branch_id', branchId!),
        supabase
          .from('product_categories')
          .select('id, name, display_order')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
      ]);

      if (productsRes.error) throw productsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      
      const validProducts = (productsRes.data || []).filter(p => p.product !== null) as ProductAvailability[];
      setProducts(validProducts);
      setCategories(categoriesRes.data || []);
      
      // Expand all categories by default
      const allCategoryIds = new Set((categoriesRes.data || []).map(c => c.id));
      allCategoryIds.add('uncategorized');
      setExpandedCategories(allCategoryIds);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async (productId: string, currentValue: boolean) => {
    setUpdating(productId);
    try {
      const { error } = await supabase
        .from('branch_products')
        .update({ is_available: !currentValue })
        .eq('id', productId);

      if (error) throw error;

      setProducts(prev =>
        prev.map(p =>
          p.id === productId ? { ...p, is_available: !currentValue } : p
        )
      );

      toast.success(!currentValue ? 'Producto activado' : 'Producto desactivado');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al actualizar');
    } finally {
      setUpdating(null);
    }
  };

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

  const filteredProducts = products.filter(p =>
    p.product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group products by category
  const productsByCategory = categories.map(category => ({
    category,
    products: filteredProducts.filter(p => p.product.category_id === category.id)
  })).filter(group => group.products.length > 0);

  // Add uncategorized products
  const uncategorizedProducts = filteredProducts.filter(p => !p.product.category_id);
  if (uncategorizedProducts.length > 0) {
    productsByCategory.push({
      category: { id: 'uncategorized', name: 'Sin Categoría', display_order: 999 },
      products: uncategorizedProducts
    });
  }

  const unavailableCount = products.filter(p => !p.is_available).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Disponibilidad</h1>
          <p className="text-muted-foreground">Switch rápido para apagar productos</p>
        </div>
        {unavailableCount > 0 && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {unavailableCount} producto{unavailableCount > 1 ? 's' : ''} sin stock
          </Badge>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar producto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-4">
        {productsByCategory.map(({ category, products: categoryProducts }) => (
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
              {categoryProducts.some(p => !p.is_available) && (
                <Badge variant="destructive" className="text-xs">
                  {categoryProducts.filter(p => !p.is_available).length} sin stock
                </Badge>
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {categoryProducts.map((item) => (
                <Card 
                  key={item.id} 
                  className={`transition-colors ${!item.is_available ? 'bg-destructive/5 border-destructive/20' : ''}`}
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {item.product.image_url && (
                          <img 
                            src={item.product.image_url} 
                            alt={item.product.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                        <div>
                          <p className={`font-medium ${!item.is_available ? 'text-muted-foreground line-through' : ''}`}>
                            {item.product.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            ${item.product.price.toLocaleString('es-AR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {!item.is_available && (
                          <Badge variant="destructive" className="text-xs">Sin stock</Badge>
                        )}
                        <Switch
                          checked={item.is_available}
                          onCheckedChange={() => toggleAvailability(item.id, item.is_available)}
                          disabled={updating === item.id}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CollapsibleContent>
          </Collapsible>
        ))}

        {productsByCategory.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No se encontraron productos
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
