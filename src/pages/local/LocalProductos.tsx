import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Package, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { handleError } from '@/lib/errorHandler';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const AVAILABILITY_REASONS = [
  { value: 'sin_stock', label: 'Sin stock' },
  { value: 'rotura', label: 'Rotura de equipo' },
  { value: 'falta_insumo', label: 'Falta de insumo' },
  { value: 'decision_comercial', label: 'Decisión comercial' },
  { value: 'otro', label: 'Otro' },
];

const getReasonLabel = (reason: string | null) => {
  return AVAILABILITY_REASONS.find(r => r.value === reason)?.label || reason || 'Desconocido';
};

interface AvailabilityLog {
  id: string;
  item_type: 'product' | 'modifier';
  item_id: string;
  new_state: boolean;
  reason: string | null;
  notes: string | null;
  until_date: string | null;
  created_at: string;
}

interface ProductAvailability {
  id: string;
  product_id: string;
  is_available: boolean;
  is_enabled_by_brand: boolean;
  product: {
    id: string;
    name: string;
    category_id: string | null;
    price: number;
    image_url: string | null;
    is_active: boolean;
  };
  lastLog?: AvailabilityLog;
}

interface Category {
  id: string;
  name: string;
  display_order: number | null;
}

export default function LocalProductos() {
  const { branchId } = useParams<{ branchId: string }>();
  
  const [products, setProducts] = useState<ProductAvailability[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // Availability dialog state
  const [availabilityDialog, setAvailabilityDialog] = useState<{
    open: boolean;
    itemId: string;
    currentValue: boolean;
    itemName: string;
  } | null>(null);
  const [availabilityReason, setAvailabilityReason] = useState('');
  const [availabilityNotes, setAvailabilityNotes] = useState('');
  const [availabilityUntil, setAvailabilityUntil] = useState('');

  useEffect(() => {
    if (branchId) {
      fetchData();
    }
  }, [branchId]);

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes, logsRes] = await Promise.all([
      supabase
        .from('branch_products')
        .select(`
          id,
          product_id,
          is_available,
          is_enabled_by_brand,
          product:products(id, name, category_id, price, image_url, is_active)
        `)
        .eq('branch_id', branchId!)
        .eq('is_enabled_by_brand', true), // Solo productos autorizados por la marca
        supabase
          .from('product_categories')
          .select('id, name, display_order')
          .eq('is_active', true)
          .order('display_order', { ascending: true }),
        supabase
          .from('availability_logs')
          .select('*')
          .eq('branch_id', branchId!)
          .eq('item_type', 'product')
          .order('created_at', { ascending: false })
      ]);

      if (productsRes.error) throw productsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      
      // Create a map of latest logs per item
      const logsMap = new Map<string, AvailabilityLog>();
      (logsRes.data || []).forEach(log => {
        const key = `product-${log.item_id}`;
        if (!logsMap.has(key)) {
          logsMap.set(key, log as AvailabilityLog);
        }
      });
      
      // Productos autorizados por la marca y activos en el catálogo
      const validProducts = (productsRes.data || [])
        .filter(p => p.product !== null && p.product.is_active)
        .map(p => ({
          ...p,
          lastLog: logsMap.get(`product-${p.product_id}`)
        })) as ProductAvailability[];
      setProducts(validProducts);
      setCategories(categoriesRes.data || []);
      
      // Expand all categories by default
      const allCategoryIds = new Set((categoriesRes.data || []).map(c => c.id));
      allCategoryIds.add('uncategorized');
      setExpandedCategories(allCategoryIds);
    } catch (error) {
      handleError(error, { userMessage: 'Error al cargar datos', context: 'LocalProductos.fetchData' });
    } finally {
      setLoading(false);
    }
  };

  const handleAvailabilityToggle = (itemId: string, currentValue: boolean, itemName: string) => {
    if (currentValue) {
      setAvailabilityDialog({ open: true, itemId, currentValue, itemName });
    } else {
      executeToggle(itemId, currentValue, null, null, null);
    }
  };

  const executeToggle = async (
    productId: string, 
    currentValue: boolean, 
    reason: string | null,
    notes: string | null,
    untilDate: string | null
  ) => {
    setUpdating(productId);
    try {
      const { error } = await supabase
        .from('branch_products')
        .update({ is_available: !currentValue })
        .eq('id', productId);

      if (error) throw error;

      if (reason) {
        const product = products.find(p => p.id === productId);
        await supabase.from('availability_logs').insert({
          branch_id: branchId,
          item_type: 'product',
          item_id: product?.product_id,
          new_state: !currentValue,
          reason: reason,
          notes: notes,
          until_date: untilDate || null,
        });
      }

      setProducts(prev =>
        prev.map(p =>
          p.id === productId ? { ...p, is_available: !currentValue } : p
        )
      );

      toast.success(!currentValue ? 'Producto activado' : 'Producto desactivado');
    } catch (error) {
      handleError(error, { userMessage: 'Error al actualizar', context: 'LocalProductos.updateAvailability' });
    } finally {
      setUpdating(null);
    }
  };

  const handleConfirmAvailability = () => {
    if (!availabilityDialog || !availabilityReason) {
      toast.error('Seleccioná un motivo');
      return;
    }

    executeToggle(
      availabilityDialog.itemId,
      availabilityDialog.currentValue,
      availabilityReason,
      availabilityNotes || null,
      availabilityUntil || null
    );

    setAvailabilityDialog(null);
    setAvailabilityReason('');
    setAvailabilityNotes('');
    setAvailabilityUntil('');
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

  // Products filtering
  const filteredProducts = products.filter(p =>
    p.product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const productsByCategory = categories.map(category => ({
    category,
    products: filteredProducts.filter(p => p.product.category_id === category.id)
  })).filter(group => group.products.length > 0);

  const uncategorizedProducts = filteredProducts.filter(p => !p.product.category_id);
  if (uncategorizedProducts.length > 0) {
    productsByCategory.push({
      category: { id: 'uncategorized', name: 'Sin Categoría', display_order: 999 },
      products: uncategorizedProducts
    });
  }

  const pausedCount = products.filter(p => !p.is_available).length;

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
          <h1 className="text-2xl font-bold">Productos</h1>
          <p className="text-muted-foreground">Gestión de disponibilidad de productos</p>
        </div>
        {pausedCount > 0 && (
          <Badge variant="outline" className="flex items-center gap-1 border-muted-foreground/30 text-muted-foreground">
            <Package className="h-3 w-3" />
            {pausedCount} pausado{pausedCount > 1 ? 's' : ''}
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
                <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground">
                  {categoryProducts.filter(p => !p.is_available).length} pausado{categoryProducts.filter(p => !p.is_available).length > 1 ? 's' : ''}
                </Badge>
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {categoryProducts.map((item) => (
                <Card 
                  key={item.id} 
                  className={`transition-colors ${!item.is_available ? 'bg-muted/50 border-muted' : ''}`}
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {item.product.image_url && (
                          <img 
                            src={item.product.image_url} 
                            alt={item.product.name}
                            className={`w-10 h-10 rounded object-cover ${!item.is_available ? 'opacity-50' : ''}`}
                          />
                        )}
                        <div>
                          <p className={`font-medium ${!item.is_available ? 'text-muted-foreground' : ''}`}>
                            {item.product.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            ${item.product.price.toLocaleString('es-AR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Estado visual del producto */}
                        {item.is_available ? (
                          <Badge variant="outline" className="text-xs border-primary/50 text-primary bg-primary/10">
                            Activo
                          </Badge>
                        ) : item.lastLog ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-xs cursor-help gap-1 border-muted-foreground/30 text-muted-foreground">
                                <Info className="h-3 w-3" />
                                {getReasonLabel(item.lastLog.reason)}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                {formatDistanceToNow(new Date(item.lastLog.created_at), { addSuffix: true, locale: es })}
                                {item.lastLog.until_date && (
                                  <> · Hasta {format(new Date(item.lastLog.until_date), 'dd/MM HH:mm')}</>
                                )}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Pausado</Badge>
                        )}
                        <Switch
                          checked={item.is_available}
                          onCheckedChange={() => handleAvailabilityToggle(item.id, item.is_available, item.product.name)}
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

      {/* Availability Reason Dialog */}
      <Dialog open={!!availabilityDialog?.open} onOpenChange={() => setAvailabilityDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desactivar producto</DialogTitle>
            <DialogDescription>
              ¿Por qué desactivás "{availabilityDialog?.itemName}"?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Motivo *</Label>
              <Select value={availabilityReason} onValueChange={setAvailabilityReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar motivo" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABILITY_REASONS.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notas (opcional)</Label>
              <Textarea 
                value={availabilityNotes}
                onChange={(e) => setAvailabilityNotes(e.target.value)}
                placeholder="Agregar detalles..."
              />
            </div>
            <div>
              <Label>Hasta cuándo (opcional)</Label>
              <Input 
                type="datetime-local"
                value={availabilityUntil}
                onChange={(e) => setAvailabilityUntil(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAvailabilityDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmAvailability} disabled={!availabilityReason}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
