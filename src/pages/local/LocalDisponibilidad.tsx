import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, AlertTriangle, Package, ChefHat, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

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

interface ModifierGroup {
  id: string;
  name: string;
  description: string | null;
}

interface ModifierOptionAvailability {
  id: string;
  modifier_option_id: string;
  is_available: boolean;
  option: {
    id: string;
    name: string;
    price_adjustment: number;
    group_id: string;
  };
}

export default function LocalDisponibilidad() {
  const { branchId } = useParams<{ branchId: string }>();
  
  // Products state
  const [products, setProducts] = useState<ProductAvailability[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Modifiers state
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [modifierOptions, setModifierOptions] = useState<ModifierOptionAvailability[]>([]);
  const [modifierSearchTerm, setModifierSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (branchId) {
      fetchData();
    }
  }, [branchId]);

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes, modifierGroupsRes, branchModifiersRes] = await Promise.all([
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
          .order('display_order', { ascending: true }),
        supabase
          .from('modifier_groups')
          .select('id, name, description')
          .eq('is_active', true)
          .order('display_order'),
        supabase
          .from('branch_modifier_options')
          .select(`
            id,
            modifier_option_id,
            is_available,
            option:modifier_options(id, name, price_adjustment, group_id)
          `)
          .eq('branch_id', branchId!)
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

      // Modifiers
      if (modifierGroupsRes.data) {
        setModifierGroups(modifierGroupsRes.data);
        setExpandedGroups(new Set(modifierGroupsRes.data.map(g => g.id)));
      }

      if (branchModifiersRes.data) {
        const validModifiers = branchModifiersRes.data.filter(m => m.option !== null) as ModifierOptionAvailability[];
        setModifierOptions(validModifiers);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const toggleProductAvailability = async (productId: string, currentValue: boolean) => {
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

  const toggleModifierAvailability = async (modifierId: string, currentValue: boolean) => {
    setUpdating(modifierId);
    try {
      const { error } = await supabase
        .from('branch_modifier_options')
        .update({ is_available: !currentValue })
        .eq('id', modifierId);

      if (error) throw error;

      setModifierOptions(prev =>
        prev.map(m =>
          m.id === modifierId ? { ...m, is_available: !currentValue } : m
        )
      );

      toast.success(!currentValue ? 'Extra activado' : 'Extra desactivado');
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

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Products filtering
  const filteredProducts = products.filter(p =>
    p.product.name.toLowerCase().includes(productSearchTerm.toLowerCase())
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

  // Modifiers filtering
  const filteredModifiers = modifierOptions.filter(m =>
    m.option.name.toLowerCase().includes(modifierSearchTerm.toLowerCase())
  );

  const modifiersByGroup = modifierGroups.map(group => ({
    group,
    options: filteredModifiers.filter(m => m.option.group_id === group.id)
  })).filter(g => g.options.length > 0);

  const unavailableProductCount = products.filter(p => !p.is_available).length;
  const unavailableModifierCount = modifierOptions.filter(m => !m.is_available).length;

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
          <p className="text-muted-foreground">Gestión rápida de stock para productos y extras</p>
        </div>
        <div className="flex gap-2">
          {unavailableProductCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              {unavailableProductCount} producto{unavailableProductCount > 1 ? 's' : ''}
            </Badge>
          )}
          {unavailableModifierCount > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <ChefHat className="h-3 w-3" />
              {unavailableModifierCount} extra{unavailableModifierCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products" className="gap-2">
            <Package className="h-4 w-4" />
            Productos
          </TabsTrigger>
          <TabsTrigger value="modifiers" className="gap-2">
            <ChefHat className="h-4 w-4" />
            Extras / Modificadores
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar producto..."
              value={productSearchTerm}
              onChange={(e) => setProductSearchTerm(e.target.value)}
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
                              onCheckedChange={() => toggleProductAvailability(item.id, item.is_available)}
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
        </TabsContent>

        {/* Modifiers Tab */}
        <TabsContent value="modifiers" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar extra o modificador..."
              value={modifierSearchTerm}
              onChange={(e) => setModifierSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="space-y-4">
            {modifiersByGroup.map(({ group, options }) => (
              <Collapsible
                key={group.id}
                open={expandedGroups.has(group.id)}
                onOpenChange={() => toggleGroup(group.id)}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                  <div className="flex items-center gap-2">
                    {expandedGroups.has(group.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span className="font-semibold">{group.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {options.length}
                    </Badge>
                  </div>
                  {options.some(o => !o.is_available) && (
                    <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                      {options.filter(o => !o.is_available).length} sin stock
                    </Badge>
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {options.map((item) => (
                    <Card 
                      key={item.id} 
                      className={`transition-colors ${!item.is_available ? 'bg-orange-50 border-orange-200' : ''}`}
                    >
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                              <ChefHat className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className={`font-medium ${!item.is_available ? 'text-muted-foreground line-through' : ''}`}>
                                {item.option.name}
                              </p>
                              {Number(item.option.price_adjustment) !== 0 && (
                                <p className="text-sm text-muted-foreground">
                                  {Number(item.option.price_adjustment) > 0 ? '+' : ''}
                                  ${Number(item.option.price_adjustment).toLocaleString('es-AR')}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {!item.is_available && (
                              <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                                Sin stock
                              </Badge>
                            )}
                            <Switch
                              checked={item.is_available}
                              onCheckedChange={() => toggleModifierAvailability(item.id, item.is_available)}
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

            {modifiersByGroup.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <ChefHat className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay extras o modificadores configurados</p>
                  <p className="text-sm">Los extras se crean desde el panel de Admin → Modificadores</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}