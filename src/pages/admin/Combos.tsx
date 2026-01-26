import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCombos, type Combo } from '@/hooks/useCombos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Package, Search, DollarSign, Percent, Layers } from 'lucide-react';

interface ComboFormData {
  name: string;
  description: string;
  base_price: number;
  image_url: string;
  is_active: boolean;
}

interface ComboItemForm {
  product_id: string;
  quantity: number;
}

export default function Combos() {
  const queryClient = useQueryClient();
  const { data: combos, isLoading } = useCombos({ includeInactive: true });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Combo | null>(null);

  // Form state
  const [formData, setFormData] = useState<ComboFormData>({
    name: '',
    description: '',
    base_price: 0,
    image_url: '',
    is_active: true,
  });
  const [comboItems, setComboItems] = useState<ComboItemForm[]>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string; price: number }>>([]);

  // Load products for item selection
  const loadProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, price')
      .eq('is_active', true)
      .order('name');
    setProducts(data || []);
  };

  // Save combo mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { combo: ComboFormData; items: ComboItemForm[]; id?: string }) => {
      if (data.id) {
        // Update existing combo
        const { error: comboError } = await supabase
          .from('combos')
          .update({
            name: data.combo.name,
            description: data.combo.description || null,
            base_price: data.combo.base_price,
            image_url: data.combo.image_url || null,
            is_active: data.combo.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.id);

        if (comboError) throw comboError;

        // Delete old items and insert new ones
        await supabase.from('combo_items').delete().eq('combo_id', data.id);

        if (data.items.length > 0) {
          const itemsToInsert = data.items.map((item, index) => ({
            combo_id: data.id,
            product_id: item.product_id,
            item_type: 'product',
            quantity: item.quantity,
            sort_order: index,
          }));

          const { error: itemsError } = await supabase
            .from('combo_items')
            .insert(itemsToInsert);

          if (itemsError) throw itemsError;
        }
      } else {
        // Create new combo
        const { data: newCombo, error: comboError } = await supabase
          .from('combos')
          .insert({
            name: data.combo.name,
            description: data.combo.description || null,
            base_price: data.combo.base_price,
            image_url: data.combo.image_url || null,
            is_active: data.combo.is_active,
          })
          .select()
          .single();

        if (comboError) throw comboError;

        if (data.items.length > 0) {
          const itemsToInsert = data.items.map((item, index) => ({
            combo_id: newCombo.id,
            product_id: item.product_id,
            item_type: 'product',
            quantity: item.quantity,
            sort_order: index,
          }));

          const { error: itemsError } = await supabase
            .from('combo_items')
            .insert(itemsToInsert);

          if (itemsError) throw itemsError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combos'] });
      toast.success(editingCombo ? 'Combo actualizado' : 'Combo creado');
      closeDialog();
    },
    onError: (error) => {
      toast.error('Error al guardar: ' + (error as Error).message);
    },
  });

  // Delete combo mutation
  const deleteMutation = useMutation({
    mutationFn: async (comboId: string) => {
      // Items are deleted by CASCADE
      const { error } = await supabase.from('combos').delete().eq('id', comboId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combos'] });
      toast.success('Combo eliminado');
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast.error('Error al eliminar: ' + (error as Error).message);
    },
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('combos')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combos'] });
    },
  });

  const openCreateDialog = () => {
    setFormData({ name: '', description: '', base_price: 0, image_url: '', is_active: true });
    setComboItems([{ product_id: '', quantity: 1 }]);
    setEditingCombo(null);
    setIsCreating(true);
    loadProducts();
  };

  const openEditDialog = (combo: Combo) => {
    setFormData({
      name: combo.name,
      description: combo.description || '',
      base_price: combo.base_price,
      image_url: combo.image_url || '',
      is_active: combo.is_active,
    });
    setComboItems(
      combo.items
        .filter(i => i.product_id)
        .map(i => ({ product_id: i.product_id!, quantity: i.quantity }))
    );
    if (combo.items.length === 0) {
      setComboItems([{ product_id: '', quantity: 1 }]);
    }
    setEditingCombo(combo);
    setIsCreating(true);
    loadProducts();
  };

  const closeDialog = () => {
    setIsCreating(false);
    setEditingCombo(null);
    setFormData({ name: '', description: '', base_price: 0, image_url: '', is_active: true });
    setComboItems([]);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Ingresá un nombre para el combo');
      return;
    }
    if (formData.base_price <= 0) {
      toast.error('El precio debe ser mayor a 0');
      return;
    }
    const validItems = comboItems.filter(i => i.product_id && i.quantity > 0);
    if (validItems.length === 0) {
      toast.error('Agregá al menos un producto al combo');
      return;
    }

    saveMutation.mutate({
      combo: formData,
      items: validItems,
      id: editingCombo?.id,
    });
  };

  const addItem = () => {
    setComboItems([...comboItems, { product_id: '', quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    setComboItems(comboItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ComboItemForm, value: string | number) => {
    const updated = [...comboItems];
    updated[index] = { ...updated[index], [field]: value };
    setComboItems(updated);
  };

  // Calculate suggested price based on items
  const calculateSuggestedPrice = () => {
    return comboItems.reduce((sum, item) => {
      const product = products.find(p => p.id === item.product_id);
      return sum + (product?.price || 0) * item.quantity;
    }, 0);
  };

  const suggestedPrice = calculateSuggestedPrice();
  const savings = suggestedPrice > 0 ? suggestedPrice - formData.base_price : 0;
  const savingsPercent = suggestedPrice > 0 ? Math.round((savings / suggestedPrice) * 100) : 0;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Filter combos
  const filteredCombos = combos?.filter(combo => {
    if (!searchQuery) return true;
    return combo.name.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <HoppinessLoader size="md" text="Cargando combos" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Combos</h1>
          <p className="text-muted-foreground">Armá ofertas combinando productos</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Combo
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar combo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Combos Grid */}
      {filteredCombos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-medium mb-1">No hay combos</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Creá tu primer combo para ofrecer descuentos en productos combinados
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Combo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCombos.map((combo) => (
            <Card key={combo.id} className={!combo.is_active ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{combo.name}</CardTitle>
                    {combo.description && (
                      <CardDescription className="line-clamp-2 mt-1">
                        {combo.description}
                      </CardDescription>
                    )}
                  </div>
                  <Switch
                    checked={combo.is_active}
                    onCheckedChange={(checked) => 
                      toggleMutation.mutate({ id: combo.id, is_active: checked })
                    }
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Items */}
                <div className="space-y-1">
                  {combo.items.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="text-sm flex items-center gap-2">
                      <Package className="h-3 w-3 text-muted-foreground" />
                      <span>
                        {item.quantity > 1 && `${item.quantity}x `}
                        {item.product_name || 'Producto'}
                      </span>
                    </div>
                  ))}
                  {combo.items.length > 4 && (
                    <p className="text-xs text-muted-foreground">
                      +{combo.items.length - 4} más
                    </p>
                  )}
                </div>

                {/* Price */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div>
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(combo.base_price)}
                    </p>
                    {combo.calculated_savings && combo.calculated_savings > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <Percent className="h-3 w-3 mr-1" />
                        Ahorrás {formatCurrency(combo.calculated_savings)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(combo)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirm(combo)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isCreating} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCombo ? 'Editar Combo' : 'Nuevo Combo'}
            </DialogTitle>
            <DialogDescription>
              Combiná productos con un precio especial
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                placeholder="Ej: Combo Clásico"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Descripción del combo..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Productos del combo *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar
                </Button>
              </div>
              
              <div className="space-y-2">
                {comboItems.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Select
                      value={item.product_id}
                      onValueChange={(value) => updateItem(index, 'product_id', value)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Seleccionar producto" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - {formatCurrency(product.price)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={1}
                      className="w-20"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    />
                    {comboItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {suggestedPrice > 0 && (
                <p className="text-sm text-muted-foreground">
                  Precio individual: {formatCurrency(suggestedPrice)}
                </p>
              )}
            </div>

            {/* Price */}
            <div className="space-y-2">
              <Label htmlFor="price">Precio del combo *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="price"
                  type="number"
                  min={0}
                  className="pl-10"
                  value={formData.base_price}
                  onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              {savings > 0 && (
                <p className="text-sm text-primary">
                  ✓ Ahorro: {formatCurrency(savings)} ({savingsPercent}%)
                </p>
              )}
            </div>

            {/* Active */}
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Combo activo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar combo?</DialogTitle>
            <DialogDescription>
              Se eliminará "{deleteConfirm?.name}" permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
