import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, Trash2, Edit2, ChefHat, Package, 
  RefreshCw, Link2, Minus, Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;
type ProductCategory = Tables<'product_categories'>;

interface ModifierGroup {
  id: string;
  name: string;
  description: string | null;
  selection_type: 'single' | 'multiple';
  min_selections: number;
  max_selections: number | null;
  is_active: boolean;
  display_order: number;
  modifier_type: 'adicional' | 'personalizacion';
  options: ModifierOption[];
}

interface ModifierOption {
  id: string;
  group_id: string;
  name: string;
  price_adjustment: number;
  is_active: boolean;
  display_order: number;
  linked_product_id?: string | null;
  linkedProduct?: Product | null;
  assignedProductIds: string[];
}

interface ProductOptionAssignment {
  product_id: string;
  modifier_option_id: string;
  is_enabled: boolean;
}

const BURGER_CATEGORIES = ['Clásicas', 'Originales', 'Ultrasmash', 'Veggies', 'Más Sabor'];

export default function Modifiers() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [optionAssignments, setOptionAssignments] = useState<ProductOptionAssignment[]>([]);
  
  // Dialog states
  const [optionDialog, setOptionDialog] = useState(false);
  const [assignDialog, setAssignDialog] = useState(false);
  const [editingOption, setEditingOption] = useState<ModifierOption | null>(null);
  const [selectedGroupForOption, setSelectedGroupForOption] = useState<string>('');
  const [selectedOptionForAssign, setSelectedOptionForAssign] = useState<ModifierOption | null>(null);
  
  // Form states
  const [optionName, setOptionName] = useState('');
  const [optionPrice, setOptionPrice] = useState('0');
  const [optionLinkedProductId, setOptionLinkedProductId] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [groupsRes, optionsRes, productsRes, categoriesRes, assignmentsRes] = await Promise.all([
        supabase.from('modifier_groups').select('*').order('display_order'),
        supabase.from('modifier_options').select('*, linked_product:products(id, name, image_url)').order('display_order'),
        supabase.from('products').select('*').order('name'),
        supabase.from('product_categories').select('*').order('name'),
        supabase.from('product_modifier_options').select('product_id, modifier_option_id, is_enabled'),
      ]);

      const assignmentsList: ProductOptionAssignment[] = (assignmentsRes.data || []).map(a => ({
        product_id: a.product_id,
        modifier_option_id: a.modifier_option_id,
        is_enabled: a.is_enabled,
      }));

      const groupsWithOptions: ModifierGroup[] = (groupsRes.data || []).map(g => ({
        ...g,
        selection_type: g.selection_type as 'single' | 'multiple',
        modifier_type: (g as any).modifier_type as 'adicional' | 'personalizacion',
        options: (optionsRes.data || []).filter(o => o.group_id === g.id).map(o => ({
          ...o,
          linked_product_id: (o as any).linked_product_id,
          linkedProduct: (o as any).linked_product as Product | null,
          assignedProductIds: assignmentsList
            .filter(a => a.modifier_option_id === o.id && a.is_enabled)
            .map(a => a.product_id),
        })),
      }));

      setGroups(groupsWithOptions);
      setProducts(productsRes.data || []);
      setCategories(categoriesRes.data || []);
      setOptionAssignments(assignmentsList);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOption = async () => {
    try {
      const groupId = editingOption?.group_id || selectedGroupForOption;
      if (!groupId) return;

      if (editingOption) {
        const linkedId = optionLinkedProductId || null;
        const { error } = await supabase
          .from('modifier_options')
          .update({
            name: optionName,
            price_adjustment: parseFloat(optionPrice) || 0,
            linked_product_id: linkedId,
          } as any)
          .eq('id', editingOption.id);
        if (error) throw error;
        toast({ title: 'Opción actualizada' });
      } else {
        const group = groups.find(g => g.id === groupId);
        const linkedId = optionLinkedProductId || null;
        const { error } = await supabase
          .from('modifier_options')
          .insert({
            group_id: groupId,
            name: optionName,
            price_adjustment: parseFloat(optionPrice) || 0,
            display_order: group?.options.length || 0,
            linked_product_id: linkedId,
          } as any);
        if (error) throw error;
        toast({ title: 'Opción creada' });
      }
      resetOptionForm();
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteOption = async (optionId: string) => {
    try {
      const { error } = await supabase
        .from('modifier_options')
        .delete()
        .eq('id', optionId);
      if (error) throw error;
      toast({ title: 'Opción eliminada' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleToggleOption = async (optionId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('modifier_options')
        .update({ is_active: isActive })
        .eq('id', optionId);
      if (error) throw error;
      setGroups(prev => prev.map(g => ({
        ...g,
        options: g.options.map(o => o.id === optionId ? { ...o, is_active: isActive } : o)
      })));
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleToggleProductOptionAssignment = async (productId: string, optionId: string, currentlyEnabled: boolean) => {
    try {
      const existing = optionAssignments.find(a => a.product_id === productId && a.modifier_option_id === optionId);
      
      if (existing) {
        if (currentlyEnabled) {
          // Delete assignment
          const { error } = await supabase
            .from('product_modifier_options')
            .delete()
            .eq('product_id', productId)
            .eq('modifier_option_id', optionId);
          if (error) throw error;
        } else {
          // Re-enable
          const { error } = await supabase
            .from('product_modifier_options')
            .update({ is_enabled: true })
            .eq('product_id', productId)
            .eq('modifier_option_id', optionId);
          if (error) throw error;
        }
      } else {
        // Create new
        const { error } = await supabase
          .from('product_modifier_options')
          .insert({ product_id: productId, modifier_option_id: optionId, is_enabled: true });
        if (error) throw error;
      }

      // Update local state
      if (currentlyEnabled) {
        setOptionAssignments(prev => prev.filter(a => !(a.product_id === productId && a.modifier_option_id === optionId)));
        setGroups(prev => prev.map(g => ({
          ...g,
          options: g.options.map(o => o.id === optionId 
            ? { ...o, assignedProductIds: o.assignedProductIds.filter(id => id !== productId) }
            : o)
        })));
      } else {
        setOptionAssignments(prev => [...prev.filter(a => !(a.product_id === productId && a.modifier_option_id === optionId)), 
          { product_id: productId, modifier_option_id: optionId, is_enabled: true }]);
        setGroups(prev => prev.map(g => ({
          ...g,
          options: g.options.map(o => o.id === optionId 
            ? { ...o, assignedProductIds: [...o.assignedProductIds, productId] }
            : o)
        })));
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleAssignToAllBurgers = async (optionId: string) => {
    try {
      const burgerCategoryIds = categories.filter(c => BURGER_CATEGORIES.includes(c.name)).map(c => c.id);
      const burgerProducts = products.filter(p => p.category_id && burgerCategoryIds.includes(p.category_id));
      
      const assignments = burgerProducts.map(p => ({
        product_id: p.id,
        modifier_option_id: optionId,
        is_enabled: true,
      }));

      const { error } = await supabase
        .from('product_modifier_options')
        .upsert(assignments, { onConflict: 'product_id,modifier_option_id' });
      
      if (error) throw error;
      toast({ title: `Asignado a ${burgerProducts.length} hamburguesas` });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const resetOptionForm = () => {
    setOptionDialog(false);
    setEditingOption(null);
    setSelectedGroupForOption('');
    setOptionName('');
    setOptionPrice('0');
    setOptionLinkedProductId('');
  };

  const openEditOption = (option: ModifierOption) => {
    setEditingOption(option);
    setOptionName(option.name);
    setOptionPrice(String(option.price_adjustment));
    setOptionLinkedProductId(option.linked_product_id || '');
    setOptionDialog(true);
  };

  const openAddOption = (groupId: string) => {
    setSelectedGroupForOption(groupId);
    setOptionDialog(true);
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  };

  const getBurgerProducts = () => {
    const burgerCategoryIds = categories.filter(c => BURGER_CATEGORIES.includes(c.name)).map(c => c.id);
    return products.filter(p => p.category_id && burgerCategoryIds.includes(p.category_id));
  };

  const getProductsByCategory = () => {
    const grouped: Record<string, Product[]> = {};
    products.forEach(p => {
      const cat = categories.find(c => c.id === p.category_id);
      const catName = cat?.name || 'Sin categoría';
      if (!grouped[catName]) grouped[catName] = [];
      grouped[catName].push(p);
    });
    return grouped;
  };

  const adicionales = groups.find(g => g.name === 'Adicionales');
  const personalizaciones = groups.find(g => g.name === 'Personalizaciones');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ChefHat className="h-6 w-6" />
            Modificadores
          </h1>
          <p className="text-muted-foreground">
            Adicionales (+$) y personalizaciones (sin X) que se asignan individualmente a productos
          </p>
        </div>
      </div>

      <Tabs defaultValue="adicionales" className="space-y-6">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="adicionales" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Adicionales
          </TabsTrigger>
          <TabsTrigger value="personalizaciones" className="flex items-center gap-2">
            <Minus className="h-4 w-4" />
            Personalizaciones
          </TabsTrigger>
        </TabsList>

        {/* Adicionales Tab */}
        <TabsContent value="adicionales" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Adicionales</CardTitle>
                <CardDescription>
                  Cosas que se pueden agregar: extra bacon, cheddar, etc. Cada adicional se asigna individualmente a productos.
                </CardDescription>
              </div>
              {adicionales && (
                <Button onClick={() => openAddOption(adicionales.id)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Adicional
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {adicionales?.options.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay adicionales. Creá opciones como "Extra Bacon", "Doble Cheddar", etc.
                </p>
              ) : (
                <div className="grid gap-3">
                  {adicionales?.options.map(option => (
                    <div 
                      key={option.id} 
                      className={`flex items-center justify-between p-4 border rounded-lg ${!option.is_active ? 'opacity-50 bg-muted/50' : ''}`}
                    >
                      <div className="flex items-center gap-4">
                        <Switch
                          checked={option.is_active}
                          onCheckedChange={(checked) => handleToggleOption(option.id, checked)}
                        />
                        {option.linkedProduct?.image_url && (
                          <img 
                            src={option.linkedProduct.image_url} 
                            alt={option.name} 
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                        <div>
                          <span className="font-medium">{option.linkedProduct?.name || option.name}</span>
                          {option.linkedProduct && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              <Link2 className="inline w-3 h-3 mr-1" />
                              Vinculado
                            </span>
                          )}
                          <div className="text-sm text-muted-foreground">
                            {option.assignedProductIds.length} productos asignados
                          </div>
                        </div>
                        {Number(option.price_adjustment) !== 0 && (
                          <Badge variant="default">
                            +{formatPrice(Number(option.price_adjustment))}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => { setSelectedOptionForAssign(option); setAssignDialog(true); }}
                        >
                          <Package className="h-4 w-4 mr-2" />
                          Asignar
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditOption(option)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteOption(option.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Personalizaciones Tab */}
        <TabsContent value="personalizaciones" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Personalizaciones</CardTitle>
                <CardDescription>
                  Cosas que se pueden sacar: sin cebolla, sin tomate, etc. Se asignan individualmente a cada hamburguesa.
                </CardDescription>
              </div>
              {personalizaciones && (
                <Button onClick={() => openAddOption(personalizaciones.id)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Personalización
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {personalizaciones?.options.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay personalizaciones. Creá opciones como "Sin cebolla", "Sin tomate", etc.
                </p>
              ) : (
                <div className="grid gap-3">
                  {personalizaciones?.options.map(option => (
                    <div 
                      key={option.id} 
                      className={`flex items-center justify-between p-4 border rounded-lg ${!option.is_active ? 'opacity-50 bg-muted/50' : ''}`}
                    >
                      <div className="flex items-center gap-4">
                        <Switch
                          checked={option.is_active}
                          onCheckedChange={(checked) => handleToggleOption(option.id, checked)}
                        />
                        <div>
                          <span className="font-medium">{option.name}</span>
                          <div className="text-sm text-muted-foreground">
                            {option.assignedProductIds.length} productos asignados
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleAssignToAllBurgers(option.id)}
                        >
                          Todas las burgers
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => { setSelectedOptionForAssign(option); setAssignDialog(true); }}
                        >
                          <Package className="h-4 w-4 mr-2" />
                          Asignar
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditOption(option)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteOption(option.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Option Dialog */}
      <Dialog open={optionDialog} onOpenChange={resetOptionForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingOption ? 'Editar' : 'Nueva opción'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vincular a producto (opcional)</Label>
              <Select 
                value={optionLinkedProductId} 
                onValueChange={(v) => {
                  setOptionLinkedProductId(v === 'none' ? '' : v);
                  if (v && v !== 'none') {
                    const product = products.find(p => p.id === v);
                    if (product && !editingOption) {
                      setOptionName(product.name);
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin vincular" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin vincular</SelectItem>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      <div className="flex items-center gap-2">
                        {product.image_url && (
                          <img src={product.image_url} alt="" className="w-5 h-5 rounded object-cover" />
                        )}
                        <span>{product.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div>
              <Label>Nombre</Label>
              <Input 
                placeholder="Ej: Extra Bacon, Sin cebolla" 
                value={optionName}
                onChange={(e) => setOptionName(e.target.value)}
              />
            </div>
            <div>
              <Label>Ajuste de precio</Label>
              <Input 
                type="number"
                step="0.01"
                placeholder="0 = sin costo adicional" 
                value={optionPrice}
                onChange={(e) => setOptionPrice(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetOptionForm}>Cancelar</Button>
            <Button onClick={handleSaveOption} disabled={!optionName}>
              {editingOption ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign to Products Dialog */}
      <Dialog open={assignDialog} onOpenChange={() => { setAssignDialog(false); setSelectedOptionForAssign(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Asignar "{selectedOptionForAssign?.name}"</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6">
              {Object.entries(getProductsByCategory()).map(([categoryName, categoryProducts]) => (
                <div key={categoryName}>
                  <div className="sticky top-0 bg-background py-2 z-10 border-b mb-2">
                    <h4 className="font-semibold text-sm">{categoryName}</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {categoryProducts.map(product => {
                      const isAssigned = selectedOptionForAssign?.assignedProductIds.includes(product.id) || false;
                      return (
                        <button
                          type="button"
                          key={product.id} 
                          onClick={() => {
                            if (selectedOptionForAssign) {
                              handleToggleProductOptionAssignment(product.id, selectedOptionForAssign.id, isAssigned);
                            }
                          }}
                          className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                            isAssigned 
                              ? 'border-primary bg-primary/10' 
                              : 'border-muted hover:border-primary/50'
                          }`}
                        >
                          {product.image_url && (
                            <img src={product.image_url} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                          )}
                          <span className="text-sm font-medium truncate">{product.name}</span>
                          {isAssigned && (
                            <Check className="h-4 w-4 text-primary ml-auto flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => { setAssignDialog(false); setSelectedOptionForAssign(null); }}>
              Listo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
