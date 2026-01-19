import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Search, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

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

export default function LocalDisponibilidad() {
  const { branchId } = useParams<{ branchId: string }>();
  const [products, setProducts] = useState<ProductAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (branchId) {
      fetchProducts();
    }
  }, [branchId]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('branch_products')
        .select(`
          id,
          product_id,
          is_available,
          product:products(id, name, category_id, price, image_url)
        `)
        .eq('branch_id', branchId!)
        .order('is_available', { ascending: false });

      if (error) throw error;
      
      // Filter out null products and type cast
      const validProducts = (data || []).filter(p => p.product !== null) as ProductAvailability[];
      setProducts(validProducts);
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

      toast.success(!currentValue ? 'Producto activado' : 'Producto desactivado (86)');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al actualizar');
    } finally {
      setUpdating(null);
    }
  };

  const filteredProducts = products.filter(p =>
    p.product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold">Disponibilidad (86)</h1>
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

      <div className="grid gap-2">
        {filteredProducts.map((item) => (
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
                    <Badge variant="destructive" className="text-xs">86</Badge>
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

        {filteredProducts.length === 0 && (
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
