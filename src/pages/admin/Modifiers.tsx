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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, Settings, Trash2, Edit2, ChefHat, Package, 
  RefreshCw, GripVertical, ToggleLeft, ToggleRight, Link2, Image 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;

interface ModifierGroup {
  id: string;
  name: string;
  description: string | null;
  selection_type: 'single' | 'multiple';
  min_selections: number;
  max_selections: number | null;
  is_active: boolean;
  display_order: number;
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
}

interface ProductAssignment {
  product_id: string;
  modifier_group_id: string;
  is_enabled: boolean;
}

export default function Modifiers() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [assignments, setAssignments] = useState<ProductAssignment[]>([]);
  
  // Dialog states
  const [groupDialog, setGroupDialog] = useState(false);
  const [optionDialog, setOptionDialog] = useState(false);
  const [assignDialog, setAssignDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ModifierGroup | null>(null);
  const [editingOption, setEditingOption] = useState<ModifierOption | null>(null);
  const [selectedGroupForOption, setSelectedGroupForOption] = useState<string>('');
  const [selectedGroupForAssign, setSelectedGroupForAssign] = useState<string>('');
  
  // Form states
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupSelectionType, setGroupSelectionType] = useState<'single' | 'multiple'>('multiple');
  const [groupMinSelections, setGroupMinSelections] = useState('0');
  const [groupMaxSelections, setGroupMaxSelections] = useState('');
  
  const [optionName, setOptionName] = useState('');
  const [optionPrice, setOptionPrice] = useState('0');
  const [optionLinkedProductId, setOptionLinkedProductId] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch modifier groups with options
      const { data: groupsData } = await supabase
        .from('modifier_groups')
        .select('*')
        .order('display_order');

      const { data: optionsData } = await supabase
        .from('modifier_options')
        .select('*, linked_product:products!modifier_options_linked_product_id_fkey(id, name, image_url)')
        .order('display_order');

      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .order('name');

      const { data: assignmentsData } = await supabase
        .from('product_modifier_assignments')
        .select('product_id, modifier_group_id, is_enabled');

      const groupsWithOptions: ModifierGroup[] = (groupsData || []).map(g => ({
        ...g,
        selection_type: g.selection_type as 'single' | 'multiple',
        options: (optionsData || []).filter(o => o.group_id === g.id).map(o => ({
          ...o,
          linked_product_id: (o as any).linked_product_id,
          linkedProduct: (o as any).linked_product as Product | null,
        })),
      }));

      setGroups(groupsWithOptions);
      setProducts(productsData || []);
      setAssignments(assignmentsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGroup = async () => {
    try {
      if (editingGroup) {
        const { error } = await supabase
          .from('modifier_groups')
          .update({
            name: groupName,
            description: groupDescription || null,
            selection_type: groupSelectionType,
            min_selections: parseInt(groupMinSelections) || 0,
            max_selections: groupMaxSelections ? parseInt(groupMaxSelections) : null,
          })
          .eq('id', editingGroup.id);
        if (error) throw error;
        toast({ title: 'Grupo actualizado' });
      } else {
        const { error } = await supabase
          .from('modifier_groups')
          .insert({
            name: groupName,
            description: groupDescription || null,
            selection_type: groupSelectionType,
            min_selections: parseInt(groupMinSelections) || 0,
            max_selections: groupMaxSelections ? parseInt(groupMaxSelections) : null,
            display_order: groups.length,
          });
        if (error) throw error;
        toast({ title: 'Grupo creado' });
      }
      resetGroupForm();
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('modifier_groups')
        .delete()
        .eq('id', groupId);
      if (error) throw error;
      toast({ title: 'Grupo eliminado' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleToggleGroup = async (groupId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('modifier_groups')
        .update({ is_active: isActive })
        .eq('id', groupId);
      if (error) throw error;
      setGroups(prev => prev.map(g => g.id === groupId ? { ...g, is_active: isActive } : g));
      toast({ title: isActive ? 'Grupo activado' : 'Grupo desactivado' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
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

  const handleToggleProductAssignment = async (productId: string, groupId: string, currentlyEnabled: boolean) => {
    try {
      const existing = assignments.find(a => a.product_id === productId && a.modifier_group_id === groupId);
      
      if (existing) {
        const { error } = await supabase
          .from('product_modifier_assignments')
          .update({ is_enabled: !currentlyEnabled })
          .eq('product_id', productId)
          .eq('modifier_group_id', groupId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('product_modifier_assignments')
          .insert({
            product_id: productId,
            modifier_group_id: groupId,
            is_enabled: true,
          });
        if (error) throw error;
      }

      setAssignments(prev => {
        const filtered = prev.filter(a => !(a.product_id === productId && a.modifier_group_id === groupId));
        return [...filtered, { product_id: productId, modifier_group_id: groupId, is_enabled: !currentlyEnabled }];
      });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const resetGroupForm = () => {
    setGroupDialog(false);
    setEditingGroup(null);
    setGroupName('');
    setGroupDescription('');
    setGroupSelectionType('multiple');
    setGroupMinSelections('0');
    setGroupMaxSelections('');
  };

  const resetOptionForm = () => {
    setOptionDialog(false);
    setEditingOption(null);
    setSelectedGroupForOption('');
    setOptionName('');
    setOptionPrice('0');
    setOptionLinkedProductId('');
  };

  const openEditGroup = (group: ModifierGroup) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setGroupDescription(group.description || '');
    setGroupSelectionType(group.selection_type);
    setGroupMinSelections(String(group.min_selections));
    setGroupMaxSelections(group.max_selections ? String(group.max_selections) : '');
    setGroupDialog(true);
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

  const getAssignedProductsCount = (groupId: string) => {
    return assignments.filter(a => a.modifier_group_id === groupId && a.is_enabled).length;
  };

  const isProductAssigned = (productId: string, groupId: string) => {
    const assignment = assignments.find(a => a.product_id === productId && a.modifier_group_id === groupId);
    return assignment?.is_enabled || false;
  };

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
            Creá extras y opciones globales que se asignan a múltiples productos
          </p>
        </div>
        <Button onClick={() => setGroupDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Grupo
        </Button>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ChefHat className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">No hay grupos de modificadores</p>
            <p className="text-muted-foreground mb-4">
              Creá grupos como "Extras", "Punto de Cocción" y asignalos a tus productos
            </p>
            <Button onClick={() => setGroupDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primer Grupo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-4">
          {groups.map(group => (
            <AccordionItem key={group.id} value={group.id} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={group.is_active}
                      onCheckedChange={(checked) => handleToggleGroup(group.id, checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className={`font-semibold ${!group.is_active ? 'text-muted-foreground' : ''}`}>
                      {group.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {group.selection_type === 'single' ? 'Elegir 1' : 'Múltiple'}
                    </Badge>
                    <Badge variant="secondary">
                      {group.options.length} opciones
                    </Badge>
                    <Badge variant="outline" className="text-primary">
                      {getAssignedProductsCount(group.id)} productos
                    </Badge>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-6 space-y-4">
                {/* Group actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => openEditGroup(group)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Editar Grupo
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openAddOption(group.id)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Opción
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => { setSelectedGroupForAssign(group.id); setAssignDialog(true); }}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Asignar a Productos
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteGroup(group.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </Button>
                </div>

                {/* Options list */}
                {group.options.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No hay opciones en este grupo. Agregá opciones como "Extra Cheddar", "Bacon", etc.
                  </p>
                ) : (
                  <div className="grid gap-2">
                    {group.options.map(option => {
                      const linkedProduct = option.linkedProduct;
                      const displayName = linkedProduct?.name || option.name;
                      const imageUrl = linkedProduct?.image_url;
                      
                      return (
                        <div 
                          key={option.id} 
                          className={`flex items-center justify-between p-3 border rounded-lg ${!option.is_active ? 'opacity-50 bg-muted/50' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={option.is_active}
                              onCheckedChange={(checked) => handleToggleOption(option.id, checked)}
                            />
                            {imageUrl && (
                              <img 
                                src={imageUrl} 
                                alt={displayName} 
                                className="w-8 h-8 rounded object-cover"
                              />
                            )}
                            <div>
                              <span className="font-medium">{displayName}</span>
                              {linkedProduct && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  <Link2 className="inline w-3 h-3 mr-1" />
                                  Vinculado
                                </span>
                              )}
                            </div>
                            {Number(option.price_adjustment) !== 0 && (
                              <Badge variant={Number(option.price_adjustment) > 0 ? 'default' : 'secondary'}>
                                {Number(option.price_adjustment) > 0 ? '+' : ''}{formatPrice(Number(option.price_adjustment))}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
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
                      );
                    })}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Group Dialog */}
      <Dialog open={groupDialog} onOpenChange={resetGroupForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGroup ? 'Editar Grupo' : 'Nuevo Grupo de Modificadores'}</DialogTitle>
            <DialogDescription>
              Los grupos agrupan opciones relacionadas (ej: "Extras" contiene "Cheddar", "Bacon", etc.)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre del grupo</Label>
              <Input 
                placeholder="Ej: Extras, Punto de Cocción, Bebida" 
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>
            <div>
              <Label>Descripción (opcional)</Label>
              <Input 
                placeholder="Ej: Agregá ingredientes extra a tu hamburguesa" 
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
              />
            </div>
            <div>
              <Label>Tipo de selección</Label>
              <Select value={groupSelectionType} onValueChange={(v) => setGroupSelectionType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple">Múltiple (varias opciones)</SelectItem>
                  <SelectItem value="single">Simple (elegir una)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Mínimo selecciones</Label>
                <Input 
                  type="number" 
                  min="0"
                  value={groupMinSelections}
                  onChange={(e) => setGroupMinSelections(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">0 = opcional</p>
              </div>
              <div>
                <Label>Máximo selecciones</Label>
                <Input 
                  type="number" 
                  min="1"
                  placeholder="Sin límite"
                  value={groupMaxSelections}
                  onChange={(e) => setGroupMaxSelections(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetGroupForm}>Cancelar</Button>
            <Button onClick={handleSaveGroup} disabled={!groupName}>
              {editingGroup ? 'Guardar' : 'Crear Grupo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Option Dialog */}
      <Dialog open={optionDialog} onOpenChange={resetOptionForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingOption ? 'Editar Opción' : 'Nueva Opción'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Vincular a producto existente */}
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
                  <SelectValue placeholder="Sin vincular (opción independiente)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin vincular</SelectItem>
                  {products.filter(p => p.product_type === 'bebida' || p.category_id).map(product => (
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
              <p className="text-xs text-muted-foreground mt-1">
                Al vincular, hereda imagen y nombre del producto. Las ventas se unifican en estadísticas.
              </p>
            </div>

            <Separator />

            <div>
              <Label>Nombre {optionLinkedProductId && '(override)'}</Label>
              <Input 
                placeholder="Ej: Extra Cheddar, Bacon, Jugoso" 
                value={optionName}
                onChange={(e) => setOptionName(e.target.value)}
              />
              {optionLinkedProductId && (
                <p className="text-xs text-muted-foreground mt-1">
                  Dejalo igual al producto o cambialo para mostrar diferente
                </p>
              )}
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
              <p className="text-xs text-muted-foreground mt-1">
                Usá valores negativos para descuentos. En combos suele ser $0.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetOptionForm}>Cancelar</Button>
            <Button onClick={handleSaveOption} disabled={!optionName}>
              {editingOption ? 'Guardar' : 'Crear Opción'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign to Products Dialog */}
      <Dialog open={assignDialog} onOpenChange={() => setAssignDialog(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Asignar a Productos</DialogTitle>
            <DialogDescription>
              Seleccioná los productos que tendrán disponible este grupo de modificadores
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {products.map(product => {
                const isAssigned = isProductAssigned(product.id, selectedGroupForAssign);
                return (
                  <div 
                    key={product.id} 
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isAssigned}
                        onCheckedChange={() => handleToggleProductAssignment(product.id, selectedGroupForAssign, isAssigned)}
                      />
                      <span className="font-medium">{product.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatPrice(Number(product.price))}
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setAssignDialog(false)}>Listo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
