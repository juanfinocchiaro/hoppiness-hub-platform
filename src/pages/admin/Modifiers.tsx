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
import { Plus, ChefHat, Minus, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  ModifierOptionCard, 
  ModifierOptionSkeleton, 
  ModifierEmptyState 
} from '@/components/admin/ModifierOptionCard';
import { ModifierAssignDialog } from '@/components/admin/ModifierAssignDialog';
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

  const openAssignDialog = (option: ModifierOption) => {
    setSelectedOptionForAssign(option);
    setAssignDialog(true);
  };

  const adicionales = groups.find(g => g.name === 'Adicionales');
  const personalizaciones = groups.find(g => g.name === 'Personalizaciones');

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
        <TabsList className="grid grid-cols-2 w-full max-w-md h-12">
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
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <ModifierOptionSkeleton key={i} />)}
                </div>
              ) : adicionales?.options.length === 0 ? (
                <ModifierEmptyState 
                  type="adicional" 
                  onAdd={() => adicionales && openAddOption(adicionales.id)} 
                />
              ) : (
                <div className="space-y-2">
                  {adicionales?.options.map(option => (
                    <ModifierOptionCard
                      key={option.id}
                      option={option}
                      type="adicional"
                      onToggle={handleToggleOption}
                      onEdit={openEditOption}
                      onDelete={handleDeleteOption}
                      onAssign={openAssignDialog}
                    />
                  ))}
                </div>
              )}
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
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <ModifierOptionSkeleton key={i} />)}
                </div>
              ) : personalizaciones?.options.length === 0 ? (
                <ModifierEmptyState 
                  type="personalizacion" 
                  onAdd={() => personalizaciones && openAddOption(personalizaciones.id)} 
                />
              ) : (
                <div className="space-y-2">
                  {personalizaciones?.options.map(option => (
                    <ModifierOptionCard
                      key={option.id}
                      option={option}
                      type="personalizacion"
                      onToggle={handleToggleOption}
                      onEdit={openEditOption}
                      onDelete={handleDeleteOption}
                      onAssign={openAssignDialog}
                      onAssignAllBurgers={handleAssignToAllBurgers}
                    />
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
