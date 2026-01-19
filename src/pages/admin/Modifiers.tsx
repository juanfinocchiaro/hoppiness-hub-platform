import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, ChefHat, Minus, RefreshCw, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { handleError } from '@/lib/errorHandler';
import { ModifierOption } from '@/components/admin/ModifierOptionCard';
import { SortableModifierList } from '@/components/admin/SortableModifierList';
import { ModifierAssignDialog } from '@/components/admin/ModifierAssignDialog';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;
type ProductCategory = Tables<'product_categories'>;
type Ingredient = Tables<'ingredients'>;

interface ModifierGroup {
  id: string;
  name: string;
  description: string | null;
  selection_type: 'single' | 'multiple';
  min_selections: number;
  max_selections: number | null;
  is_active: boolean;
  display_order: number;
  modifier_type: 'adicional' | 'personalizacion' | 'combo';
  options: ModifierOption[];
}

// Re-export interface from component
export type { ModifierOption } from '@/components/admin/ModifierOptionCard';

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
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
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
  const [optionImageUrl, setOptionImageUrl] = useState('');
  const [optionLinkedProductId, setOptionLinkedProductId] = useState<string>('');
  const [optionLinkedIngredientId, setOptionLinkedIngredientId] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [groupsRes, optionsRes, productsRes, ingredientsRes, categoriesRes, assignmentsRes] = await Promise.all([
        supabase.from('modifier_groups').select('*').order('display_order'),
        supabase.from('modifier_options').select('*, linked_product:products(id, name, image_url), linked_ingredient:ingredients(id, name, unit)').order('display_order'),
        supabase.from('products').select('*').order('name'),
        supabase.from('ingredients').select('*').eq('is_active', true).order('name'),
        supabase.from('product_categories').select('*').order('name'),
        supabase.from('product_modifier_options').select('product_id, modifier_option_id, is_enabled'),
      ]);

      const assignmentsList: ProductOptionAssignment[] = (assignmentsRes.data || []).map(a => ({
        product_id: a.product_id,
        modifier_option_id: a.modifier_option_id,
        is_enabled: a.is_enabled,
      }));

      const productsList = productsRes.data || [];
      
      const groupsWithOptions: ModifierGroup[] = (groupsRes.data || []).map(g => ({
        ...g,
        selection_type: g.selection_type as 'single' | 'multiple',
        modifier_type: (g as any).modifier_type as 'adicional' | 'personalizacion',
        options: (optionsRes.data || []).filter(o => o.group_id === g.id).map(o => {
          const assignedIds = assignmentsList
            .filter(a => a.modifier_option_id === o.id && a.is_enabled)
            .map(a => a.product_id);
          const assignedNames = assignedIds
            .map(id => productsList.find(p => p.id === id)?.name)
            .filter(Boolean) as string[];
          return {
            ...o,
            image_url: (o as any).image_url,
            linked_product_id: (o as any).linked_product_id,
            linked_ingredient_id: (o as any).linked_ingredient_id,
            linkedProduct: (o as any).linked_product as Product | null,
            linkedIngredient: (o as any).linked_ingredient as Ingredient | null,
            assignedProductIds: assignedIds,
            assignedProductNames: assignedNames,
          };
        }),
      }));

      setGroups(groupsWithOptions);
      setProducts(productsRes.data || []);
      setIngredients(ingredientsRes.data || []);
      setCategories(categoriesRes.data || []);
      setOptionAssignments(assignmentsList);
    } catch (error) {
      handleError(error, { showToast: false, context: 'Modifiers.fetchData' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOption = async () => {
    try {
      const groupId = editingOption?.group_id || selectedGroupForOption;
      if (!groupId) return;

      if (editingOption) {
        const linkedProductId = optionLinkedProductId || null;
        const linkedIngredientId = optionLinkedIngredientId || null;
        const imageUrlValue = optionImageUrl || null;
        const { error } = await supabase
          .from('modifier_options')
          .update({
            name: optionName,
            price_adjustment: parseFloat(optionPrice) || 0,
            linked_product_id: linkedProductId,
            linked_ingredient_id: linkedIngredientId,
            image_url: imageUrlValue,
          } as any)
          .eq('id', editingOption.id);
        if (error) throw error;
        toast({ title: 'Opción actualizada' });
      } else {
        const group = groups.find(g => g.id === groupId);
        const linkedProductId = optionLinkedProductId || null;
        const linkedIngredientId = optionLinkedIngredientId || null;
        const imageUrlValue = optionImageUrl || null;
        const { error } = await supabase
          .from('modifier_options')
          .insert({
            group_id: groupId,
            name: optionName,
            price_adjustment: parseFloat(optionPrice) || 0,
            display_order: group?.options.length || 0,
            linked_product_id: linkedProductId,
            linked_ingredient_id: linkedIngredientId,
            image_url: imageUrlValue,
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

  const handleToggleProductOptionAssignment = async (productId: string, optionId: string, currentlyEnabled: boolean) => {
    try {
      const existing = optionAssignments.find(a => a.product_id === productId && a.modifier_option_id === optionId);
      
      if (existing) {
        if (currentlyEnabled) {
          const { error } = await supabase
            .from('product_modifier_options')
            .delete()
            .eq('product_id', productId)
            .eq('modifier_option_id', optionId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('product_modifier_options')
            .update({ is_enabled: true })
            .eq('product_id', productId)
            .eq('modifier_option_id', optionId);
          if (error) throw error;
        }
      } else {
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
        // Also update selectedOptionForAssign if open
        if (selectedOptionForAssign?.id === optionId) {
          setSelectedOptionForAssign(prev => prev ? {
            ...prev,
            assignedProductIds: prev.assignedProductIds.filter(id => id !== productId)
          } : null);
        }
      } else {
        setOptionAssignments(prev => [...prev.filter(a => !(a.product_id === productId && a.modifier_option_id === optionId)), 
          { product_id: productId, modifier_option_id: optionId, is_enabled: true }]);
        setGroups(prev => prev.map(g => ({
          ...g,
          options: g.options.map(o => o.id === optionId 
            ? { ...o, assignedProductIds: [...o.assignedProductIds, productId] }
            : o)
        })));
        // Also update selectedOptionForAssign if open
        if (selectedOptionForAssign?.id === optionId) {
          setSelectedOptionForAssign(prev => prev ? {
            ...prev,
            assignedProductIds: [...prev.assignedProductIds, productId]
          } : null);
        }
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

  const handleReorderOptions = async (reorderedOptions: ModifierOption[]) => {
    try {
      // Update all options with new display_order
      const updates = reorderedOptions.map((opt, index) => 
        supabase
          .from('modifier_options')
          .update({ display_order: index })
          .eq('id', opt.id)
      );
      
      await Promise.all(updates);
      
      // Update local state
      setGroups(prev => prev.map(g => {
        const updatedOptions = reorderedOptions.filter(o => o.group_id === g.id);
        if (updatedOptions.length > 0) {
          return { ...g, options: updatedOptions };
        }
        return g;
      }));
      
      toast({ title: 'Orden guardado' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      fetchData(); // Refresh to get correct order
    }
  };

  const resetOptionForm = () => {
    setOptionDialog(false);
    setEditingOption(null);
    setSelectedGroupForOption('');
    setOptionName('');
    setOptionPrice('0');
    setOptionImageUrl('');
    setOptionLinkedProductId('');
    setOptionLinkedIngredientId('');
  };

  const openEditOption = (option: ModifierOption) => {
    setEditingOption(option);
    setOptionName(option.name);
    setOptionPrice(String(option.price_adjustment));
    setOptionImageUrl(option.image_url || '');
    setOptionLinkedProductId(option.linked_product_id || '');
    setOptionLinkedIngredientId(option.linked_ingredient_id || '');
    setOptionDialog(true);
  };

  const openAddOption = (groupId: string) => {
    setSelectedGroupForOption(groupId);
    setOptionDialog(true);
  };

  const openAssignDialog = (option: ModifierOption) => {
    setSelectedOptionForAssign(option);
    setAssignDialog(true);
  };

  const adicionales = groups.find(g => g.modifier_type === 'adicional');
  const personalizaciones = groups.find(g => g.modifier_type === 'personalizacion');
  const combo = groups.find(g => g.modifier_type === 'combo');

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <ChefHat className="h-7 w-7 text-primary" />
            </div>
            Modificadores
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            Adicionales (+$) y personalizaciones (sin X) que se asignan individualmente a cada producto.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="icon"
          onClick={fetchData}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </header>

      {/* Tabs */}
      <Tabs defaultValue="adicionales" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-xl h-12">
          <TabsTrigger value="adicionales" className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" />
            Adicionales
            {adicionales && (
              <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                {adicionales.options.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="personalizaciones" className="flex items-center gap-2 text-base">
            <Minus className="h-4 w-4" />
            Personalizaciones
            {personalizaciones && (
              <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                {personalizaciones.options.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="combo" className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4" />
            Combo
            {combo && (
              <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                {combo.options.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Adicionales Tab */}
        <TabsContent value="adicionales" className="space-y-4">
          <Card className="border-0 shadow-card">
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-xl">Adicionales</CardTitle>
                <CardDescription className="mt-1">
                  Cosas que se pueden agregar: extra bacon, cheddar, etc.
                </CardDescription>
              </div>
              {adicionales && (
                <Button onClick={() => openAddOption(adicionales.id)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <SortableModifierList
                options={adicionales?.options || []}
                type="adicional"
                loading={loading}
                onEdit={openEditOption}
                onDelete={handleDeleteOption}
                onAssign={openAssignDialog}
                onReorder={handleReorderOptions}
                onAddNew={() => adicionales && openAddOption(adicionales.id)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Personalizaciones Tab */}
        <TabsContent value="personalizaciones" className="space-y-4">
          <Card className="border-0 shadow-card">
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-xl">Personalizaciones</CardTitle>
                <CardDescription className="mt-1">
                  Cosas que se pueden sacar: sin cebolla, sin tomate, etc.
                </CardDescription>
              </div>
              {personalizaciones && (
                <Button onClick={() => openAddOption(personalizaciones.id)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <SortableModifierList
                options={personalizaciones?.options || []}
                type="personalizacion"
                loading={loading}
                onEdit={openEditOption}
                onDelete={handleDeleteOption}
                onAssign={openAssignDialog}
                onAssignAllBurgers={handleAssignToAllBurgers}
                onReorder={handleReorderOptions}
                onAddNew={() => personalizaciones && openAddOption(personalizaciones.id)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Combo Tab */}
        <TabsContent value="combo" className="space-y-4">
          <Card className="border-0 shadow-card">
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-xl">Opciones de Combo</CardTitle>
                <CardDescription className="mt-1">
                  Bebidas y acompañamientos incluidos en combos: Pepsi, 7up, Papas, etc.
                </CardDescription>
              </div>
              {combo && (
                <Button onClick={() => openAddOption(combo.id)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <SortableModifierList
                options={combo?.options || []}
                type="combo"
                loading={loading}
                onEdit={openEditOption}
                onDelete={handleDeleteOption}
                onAssign={openAssignDialog}
                onReorder={handleReorderOptions}
                onAddNew={() => combo && openAddOption(combo.id)}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Option Dialog */}
      <Dialog open={optionDialog} onOpenChange={resetOptionForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingOption ? 'Editar opción' : 'Nueva opción'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Vincular a producto (opcional)</Label>
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

            <div className="space-y-2">
              <Label className="text-muted-foreground">Vincular a ingrediente (para stock)</Label>
              <Select 
                value={optionLinkedIngredientId} 
                onValueChange={(v) => setOptionLinkedIngredientId(v === 'none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin vincular" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin vincular</SelectItem>
                  {ingredients.map(ingredient => (
                    <SelectItem key={ingredient.id} value={ingredient.id}>
                      <div className="flex items-center gap-2">
                        <span>{ingredient.name}</span>
                        <span className="text-xs text-muted-foreground">({ingredient.unit})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Si se vincula, se descontará stock al vender este adicional.
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input 
                placeholder="Ej: Extra Bacon, Sin cebolla" 
                value={optionName}
                onChange={(e) => setOptionName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Ajuste de precio</Label>
              <Input 
                type="number"
                step="0.01"
                placeholder="0 = sin costo adicional" 
                value={optionPrice}
                onChange={(e) => setOptionPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>URL de imagen (opcional)</Label>
              <Input 
                placeholder="https://... o /images/modifiers/..." 
                value={optionImageUrl}
                onChange={(e) => setOptionImageUrl(e.target.value)}
              />
              {optionImageUrl && (
                <div className="mt-2">
                  <img 
                    src={optionImageUrl} 
                    alt="Preview" 
                    className="w-16 h-16 rounded-lg object-cover ring-1 ring-border"
                    onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={resetOptionForm}>
              Cancelar
            </Button>
            <Button onClick={handleSaveOption} disabled={!optionName}>
              {editingOption ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign to Products Dialog */}
      <ModifierAssignDialog
        open={assignDialog}
        onOpenChange={(open) => {
          setAssignDialog(open);
          if (!open) setSelectedOptionForAssign(null);
        }}
        option={selectedOptionForAssign}
        products={products}
        categories={categories}
        onToggleAssignment={handleToggleProductOptionAssignment}
      />
    </div>
  );
}
