/**
 * Productos Obligatorios de Marca
 * Define qué productos deben comprar TODOS los locales a proveedores específicos
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PageHelp } from '@/components/shared/PageHelp';
import { toast } from 'sonner';
import { 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  Package, 
  Truck,
  Edit,
  Trash2,
  AlertTriangle,
  FolderPlus,
  Settings,
  Phone,
  Mail,
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
}

interface MandatoryProduct {
  id: string;
  category_id: string;
  ingredient_id: string | null;
  product_name: string;
  primary_supplier_id: string;
  unit_name: string;
  units_per_package: number;
  purchase_multiple: number;
  suggested_price: number | null;
  backup_supplier_id: string | null;
  backup_product_name: string | null;
  backup_units_per_package: number | null;
  backup_allowed_condition: 'never' | 'stock_emergency' | 'always';
  alert_brand_on_backup: boolean;
  is_active: boolean;
  notes: string | null;
  primary_supplier?: { id: string; name: string };
  backup_supplier?: { id: string; name: string } | null;
}

interface Supplier {
  id: string;
  name: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  cuit?: string | null;
  notes?: string | null;
}

interface Ingredient {
  id: string;
  name: string;
}

const BACKUP_CONDITIONS = {
  never: { label: 'Nunca permitido', color: 'destructive' },
  stock_emergency: { label: 'Solo emergencia de stock', color: 'warning' },
  always: { label: 'Siempre permitido', color: 'secondary' },
} as const;

export default function MandatoryProducts() {
  const queryClient = useQueryClient();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Dialogs
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [productDialog, setProductDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ type: 'category' | 'product'; id: string } | null>(null);
  const [suppliersModal, setSuppliersModal] = useState(false);
  const [newSupplierDialog, setNewSupplierDialog] = useState(false);
  const [editingSupplierInline, setEditingSupplierInline] = useState<Supplier | null>(null);
  
  // Form state
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingProduct, setEditingProduct] = useState<MandatoryProduct | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [productForm, setProductForm] = useState<{
    category_id: string;
    product_name: string;
    ingredient_id: string;
    primary_supplier_id: string;
    unit_name: string;
    units_per_package: number;
    purchase_multiple: number;
    suggested_price: string;
    backup_supplier_id: string;
    backup_product_name: string;
    backup_units_per_package: number;
    backup_allowed_condition: 'never' | 'stock_emergency' | 'always';
    alert_brand_on_backup: boolean;
    notes: string;
  }>({
    category_id: '',
    product_name: '',
    ingredient_id: '',
    primary_supplier_id: '',
    unit_name: 'unidad',
    units_per_package: 1,
    purchase_multiple: 1,
    suggested_price: '',
    backup_supplier_id: '',
    backup_product_name: '',
    backup_units_per_package: 1,
    backup_allowed_condition: 'never' as const,
    alert_brand_on_backup: true,
    notes: '',
  });

  // New supplier form
  const [newSupplierForm, setNewSupplierForm] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    cuit: '',
    notes: '',
  });

  // Queries
  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['mandatory-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_mandatory_categories')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as Category[];
    },
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['mandatory-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_mandatory_products')
        .select(`
          *,
          primary_supplier:suppliers!brand_mandatory_products_primary_supplier_id_fkey(id, name),
          backup_supplier:suppliers!brand_mandatory_products_backup_supplier_id_fkey(id, name)
        `)
        .order('product_name');
      if (error) throw error;
      return data as MandatoryProduct[];
    },
  });

  const { data: suppliers = [], refetch: refetchSuppliers } = useQuery({
    queryKey: ['brand-suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, phone, whatsapp, email, address, cuit, notes')
        .eq('scope', 'brand')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Supplier[];
    },
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ingredients')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Ingredient[];
    },
  });

  // Mutations
  const saveCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      if (editingCategory) {
        const { error } = await supabase
          .from('brand_mandatory_categories')
          .update(data)
          .eq('id', editingCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('brand_mandatory_categories')
          .insert([{ ...data, sort_order: categories.length }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mandatory-categories'] });
      setCategoryDialog(false);
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '' });
      toast.success(editingCategory ? 'Categoría actualizada' : 'Categoría creada');
    },
    onError: () => toast.error('Error al guardar categoría'),
  });

  const saveProductMutation = useMutation({
    mutationFn: async (data: typeof productForm) => {
      const payload = {
        category_id: data.category_id,
        product_name: data.product_name,
        ingredient_id: data.ingredient_id || null,
        primary_supplier_id: data.primary_supplier_id,
        unit_name: data.unit_name,
        units_per_package: data.units_per_package,
        purchase_multiple: data.purchase_multiple,
        suggested_price: data.suggested_price ? parseFloat(data.suggested_price) : null,
        backup_supplier_id: data.backup_supplier_id || null,
        backup_product_name: data.backup_product_name || null,
        backup_units_per_package: data.backup_supplier_id ? data.backup_units_per_package : null,
        backup_allowed_condition: data.backup_allowed_condition,
        alert_brand_on_backup: data.alert_brand_on_backup,
        notes: data.notes || null,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('brand_mandatory_products')
          .update(payload)
          .eq('id', editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('brand_mandatory_products')
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mandatory-products'] });
      setProductDialog(false);
      setEditingProduct(null);
      resetProductForm();
      toast.success(editingProduct ? 'Producto actualizado' : 'Producto creado');
    },
    onError: () => toast.error('Error al guardar producto'),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: 'category' | 'product'; id: string }) => {
      const table = type === 'category' ? 'brand_mandatory_categories' : 'brand_mandatory_products';
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ queryKey: type === 'category' ? ['mandatory-categories'] : ['mandatory-products'] });
      setDeleteDialog(null);
      toast.success(type === 'category' ? 'Categoría eliminada' : 'Producto eliminado');
    },
    onError: () => toast.error('Error al eliminar'),
  });

  // Create new supplier mutation
  const createSupplierMutation = useMutation({
    mutationFn: async (data: typeof newSupplierForm) => {
      const { data: newSupplier, error } = await supabase
        .from('suppliers')
        .insert({
          name: data.name,
          phone: data.phone || null,
          whatsapp: data.whatsapp || null,
          email: data.email || null,
          address: data.address || null,
          cuit: data.cuit || null,
          notes: data.notes || null,
          scope: 'brand',
          is_active: true,
        })
        .select('id')
        .single();
      if (error) throw error;
      return newSupplier;
    },
    onSuccess: (newSupplier) => {
      refetchSuppliers();
      queryClient.invalidateQueries({ queryKey: ['brand-suppliers'] });
      setNewSupplierDialog(false);
      setNewSupplierForm({ name: '', phone: '', whatsapp: '', email: '', address: '', cuit: '', notes: '' });
      // Auto-select the new supplier
      setProductForm(f => ({ ...f, primary_supplier_id: newSupplier.id }));
      toast.success('Proveedor creado');
    },
    onError: () => toast.error('Error al crear proveedor'),
  });

  // Update supplier mutation
  const updateSupplierMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof newSupplierForm> }) => {
      const { error } = await supabase
        .from('suppliers')
        .update({
          name: data.name,
          phone: data.phone || null,
          whatsapp: data.whatsapp || null,
          email: data.email || null,
          address: data.address || null,
          cuit: data.cuit || null,
          notes: data.notes || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchSuppliers();
      queryClient.invalidateQueries({ queryKey: ['brand-suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['mandatory-products'] });
      setEditingSupplierInline(null);
      toast.success('Proveedor actualizado');
    },
    onError: () => toast.error('Error al actualizar proveedor'),
  });

  // Helpers
  const toggleCategory = (id: string) => {
    const next = new Set(expandedCategories);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedCategories(next);
  };

  const resetProductForm = () => {
    setProductForm({
      category_id: '',
      product_name: '',
      ingredient_id: '',
      primary_supplier_id: '',
      unit_name: 'unidad',
      units_per_package: 1,
      purchase_multiple: 1,
      suggested_price: '',
      backup_supplier_id: '',
      backup_product_name: '',
      backup_units_per_package: 1,
      backup_allowed_condition: 'never' as 'never' | 'stock_emergency' | 'always',
      alert_brand_on_backup: true,
      notes: '',
    });
  };

  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name, description: cat.description || '' });
    setCategoryDialog(true);
  };

  const openEditProduct = (prod: MandatoryProduct) => {
    setEditingProduct(prod);
    setProductForm({
      category_id: prod.category_id,
      product_name: prod.product_name,
      ingredient_id: prod.ingredient_id || '',
      primary_supplier_id: prod.primary_supplier_id,
      unit_name: prod.unit_name,
      units_per_package: prod.units_per_package,
      purchase_multiple: prod.purchase_multiple,
      suggested_price: prod.suggested_price?.toString() || '',
      backup_supplier_id: prod.backup_supplier_id || '',
      backup_product_name: prod.backup_product_name || '',
      backup_units_per_package: prod.backup_units_per_package || 1,
      backup_allowed_condition: prod.backup_allowed_condition,
      alert_brand_on_backup: prod.alert_brand_on_backup,
      notes: prod.notes || '',
    });
    setProductDialog(true);
  };

  const openCreateProduct = (categoryId?: string) => {
    resetProductForm();
    if (categoryId) setProductForm(f => ({ ...f, category_id: categoryId }));
    setEditingProduct(null);
    setProductDialog(true);
  };

  const getProductsByCategory = (categoryId: string) => 
    products.filter(p => p.category_id === categoryId);

  // Get suppliers that are used in mandatory products
  const usedSupplierIds = new Set([
    ...products.map(p => p.primary_supplier_id),
    ...products.filter(p => p.backup_supplier_id).map(p => p.backup_supplier_id!),
  ]);

  const suppliersInUse = suppliers.filter(s => usedSupplierIds.has(s.id));

  if (loadingCategories || loadingProducts) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Productos Obligatorios</h1>
          <p className="text-muted-foreground">
            Productos que todos los locales deben comprar a proveedores específicos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSuppliersModal(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Gestionar Proveedores
          </Button>
          <Button variant="outline" onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', description: '' }); setCategoryDialog(true); }}>
            <FolderPlus className="w-4 h-4 mr-2" />
            Nueva Categoría
          </Button>
          <Button onClick={() => openCreateProduct()}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Producto
          </Button>
        </div>
      </div>

      <PageHelp
        id="mandatory-products"
        description="Acá definís qué productos deben comprar TODOS los locales a proveedores específicos. Si necesitás agregar un proveedor nuevo, podés hacerlo al crear un producto."
        features={[
          "Crear categorías y productos obligatorios",
          "Asignar proveedor principal y backup",
          "Gestionar datos de contacto de proveedores",
          "Establecer presentaciones y precios sugeridos",
        ]}
        tips={[
          "Hacé clic en ⚙️ Gestionar Proveedores para editar teléfonos o emails",
          "Los proveedores se crean automáticamente al agregar un producto nuevo",
          "Los locales NO pueden comprar estos productos a otros proveedores",
        ]}
        defaultCollapsed
      />

      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay categorías creadas todavía</p>
            <Button className="mt-4" onClick={() => setCategoryDialog(true)}>
              Crear primera categoría
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => {
            const catProducts = getProductsByCategory(cat.id);
            const isExpanded = expandedCategories.has(cat.id);
            
            return (
              <Card key={cat.id}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(cat.id)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                          <div>
                            <CardTitle className="text-lg">{cat.name}</CardTitle>
                            {cat.description && (
                              <p className="text-sm text-muted-foreground">{cat.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{catProducts.length} productos</Badge>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEditCategory(cat); }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDeleteDialog({ type: 'category', id: cat.id }); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {catProducts.length === 0 ? (
                        <div className="py-4 text-center text-muted-foreground">
                          <p>No hay productos en esta categoría</p>
                          <Button variant="link" onClick={() => openCreateProduct(cat.id)}>
                            Agregar producto
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {catProducts.map((prod) => (
                            <div 
                              key={prod.id} 
                              className="flex items-center justify-between p-4 rounded-lg border bg-card"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{prod.product_name}</span>
                                  {!prod.is_active && <Badge variant="outline">Inactivo</Badge>}
                                </div>
                                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Truck className="w-3 h-3" />
                                    {prod.primary_supplier?.name || 'Sin proveedor'}
                                  </span>
                                  <span>
                                    {prod.units_per_package > 1 
                                      ? `${prod.units_per_package} ${prod.unit_name}s por paquete`
                                      : `Por ${prod.unit_name}`
                                    }
                                    {prod.purchase_multiple > 1 && ` (múltiplos de ${prod.purchase_multiple})`}
                                  </span>
                                  {prod.suggested_price && (
                                    <span>${prod.suggested_price.toLocaleString()}</span>
                                  )}
                                </div>
                                {prod.backup_supplier && (
                                  <div className="flex items-center gap-2 mt-2">
                                    <Badge 
                                      variant={
                                        prod.backup_allowed_condition === 'never' ? 'destructive' :
                                        prod.backup_allowed_condition === 'stock_emergency' ? 'secondary' : 'outline'
                                      }
                                      className="text-xs"
                                    >
                                      Backup: {prod.backup_supplier.name}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      ({BACKUP_CONDITIONS[prod.backup_allowed_condition].label})
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" onClick={() => openEditProduct(prod)}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ type: 'product', id: prod.id })}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          <Button variant="ghost" className="w-full" onClick={() => openCreateProduct(cat.id)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Agregar producto a {cat.name}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}

      {/* Category Dialog */}
      <Dialog open={categoryDialog} onOpenChange={setCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input 
                value={categoryForm.name}
                onChange={(e) => setCategoryForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Carnes"
              />
            </div>
            <div>
              <Label>Descripción (opcional)</Label>
              <Textarea 
                value={categoryForm.description}
                onChange={(e) => setCategoryForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Descripción de la categoría"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialog(false)}>Cancelar</Button>
            <Button 
              onClick={() => saveCategoryMutation.mutate(categoryForm)}
              disabled={!categoryForm.name || saveCategoryMutation.isPending}
            >
              {saveCategoryMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Dialog */}
      <Dialog open={productDialog} onOpenChange={setProductDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Editar Producto' : 'Nuevo Producto Obligatorio'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoría *</Label>
                <Select 
                  value={productForm.category_id}
                  onValueChange={(v) => setProductForm(f => ({ ...f, category_id: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nombre del Producto *</Label>
                <Input 
                  value={productForm.product_name}
                  onChange={(e) => setProductForm(f => ({ ...f, product_name: e.target.value }))}
                  placeholder="Ej: Bolita de carne 90g"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Proveedor Obligatorio *</Label>
                <Select 
                  value={productForm.primary_supplier_id}
                  onValueChange={(v) => {
                    if (v === '__create_new__') {
                      setNewSupplierDialog(true);
                    } else {
                      setProductForm(f => ({ ...f, primary_supplier_id: v }));
                    }
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar proveedor" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                    <SelectItem value="__create_new__" className="text-primary font-medium">
                      <span className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Crear proveedor nuevo
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ingrediente del Sistema (opcional)</Label>
                <Select 
                  value={productForm.ingredient_id || '__none__'}
                  onValueChange={(v) => setProductForm(f => ({ ...f, ingredient_id: v === '__none__' ? '' : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Vincular a ingrediente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin vincular</SelectItem>
                    {ingredients.map((i) => (
                      <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>Unidad</Label>
                <Select 
                  value={productForm.unit_name}
                  onValueChange={(v) => setProductForm(f => ({ ...f, unit_name: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unidad">Unidad</SelectItem>
                    <SelectItem value="caja">Caja</SelectItem>
                    <SelectItem value="docena">Docena</SelectItem>
                    <SelectItem value="kg">Kg</SelectItem>
                    <SelectItem value="litro">Litro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unidades por paquete</Label>
                <Input 
                  type="number"
                  min={1}
                  value={productForm.units_per_package}
                  onChange={(e) => setProductForm(f => ({ ...f, units_per_package: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div>
                <Label>Múltiplos de compra</Label>
                <Input 
                  type="number"
                  min={1}
                  value={productForm.purchase_multiple}
                  onChange={(e) => setProductForm(f => ({ ...f, purchase_multiple: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div>
                <Label>Precio sugerido</Label>
                <Input 
                  type="number"
                  min={0}
                  step="0.01"
                  value={productForm.suggested_price}
                  onChange={(e) => setProductForm(f => ({ ...f, suggested_price: e.target.value }))}
                  placeholder="$0.00"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                Proveedor Backup (opcional)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Proveedor Backup</Label>
                  <Select 
                    value={productForm.backup_supplier_id || '__none__'}
                    onValueChange={(v) => setProductForm(f => ({ ...f, backup_supplier_id: v === '__none__' ? '' : v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Sin backup" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin backup</SelectItem>
                      {suppliers.filter(s => s.id !== productForm.primary_supplier_id).map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {productForm.backup_supplier_id && (
                  <>
                    <div>
                      <Label>Nombre del producto backup</Label>
                      <Input 
                        value={productForm.backup_product_name}
                        onChange={(e) => setProductForm(f => ({ ...f, backup_product_name: e.target.value }))}
                        placeholder="Ej: Pan Golden Armando"
                      />
                    </div>
                    <div>
                      <Label>Condición de uso</Label>
                      <Select 
                        value={productForm.backup_allowed_condition}
                        onValueChange={(v) => setProductForm(f => ({ ...f, backup_allowed_condition: v as any }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="never">Nunca permitido</SelectItem>
                          <SelectItem value="stock_emergency">Solo emergencia de stock</SelectItem>
                          <SelectItem value="always">Siempre permitido</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={productForm.alert_brand_on_backup}
                        onCheckedChange={(c) => setProductForm(f => ({ ...f, alert_brand_on_backup: c }))}
                      />
                      <Label>Alertar a la marca cuando se use backup</Label>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div>
              <Label>Notas (opcional)</Label>
              <Textarea 
                value={productForm.notes}
                onChange={(e) => setProductForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Notas adicionales sobre el producto"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductDialog(false)}>Cancelar</Button>
            <Button 
              onClick={() => saveProductMutation.mutate(productForm)}
              disabled={!productForm.category_id || !productForm.product_name || !productForm.primary_supplier_id || saveProductMutation.isPending}
            >
              {saveProductMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Supplier Dialog (inline from product form) */}
      <Dialog open={newSupplierDialog} onOpenChange={setNewSupplierDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Proveedor</DialogTitle>
            <DialogDescription>
              Creá un nuevo proveedor de marca. Quedará disponible para todos los productos obligatorios.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre *</Label>
              <Input 
                value={newSupplierForm.name}
                onChange={(e) => setNewSupplierForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ej: La 40 Congelados"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>CUIT</Label>
                <Input 
                  value={newSupplierForm.cuit}
                  onChange={(e) => setNewSupplierForm(f => ({ ...f, cuit: e.target.value }))}
                  placeholder="XX-XXXXXXXX-X"
                />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input 
                  value={newSupplierForm.phone}
                  onChange={(e) => setNewSupplierForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="351-5551234"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>WhatsApp</Label>
                <Input 
                  value={newSupplierForm.whatsapp}
                  onChange={(e) => setNewSupplierForm(f => ({ ...f, whatsapp: e.target.value }))}
                  placeholder="351-5551234"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input 
                  value={newSupplierForm.email}
                  onChange={(e) => setNewSupplierForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="proveedor@email.com"
                />
              </div>
            </div>
            <div>
              <Label>Dirección</Label>
              <Input 
                value={newSupplierForm.address}
                onChange={(e) => setNewSupplierForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Dirección del proveedor"
              />
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea 
                value={newSupplierForm.notes}
                onChange={(e) => setNewSupplierForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Notas adicionales"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewSupplierDialog(false)}>Cancelar</Button>
            <Button 
              onClick={() => createSupplierMutation.mutate(newSupplierForm)}
              disabled={!newSupplierForm.name || createSupplierMutation.isPending}
            >
              {createSupplierMutation.isPending ? 'Creando...' : 'Crear Proveedor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suppliers Management Modal */}
      <Dialog open={suppliersModal} onOpenChange={setSuppliersModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestionar Proveedores de Marca</DialogTitle>
            <DialogDescription>
              Proveedores asignados a productos obligatorios. Editá sus datos de contacto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {suppliersInUse.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No hay proveedores asignados a productos obligatorios todavía
              </p>
            ) : (
              suppliersInUse.map((supplier) => (
                <div key={supplier.id} className="p-4 border rounded-lg">
                  {editingSupplierInline?.id === supplier.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Nombre</Label>
                          <Input 
                            value={editingSupplierInline.name}
                            onChange={(e) => setEditingSupplierInline(s => s ? { ...s, name: e.target.value } : null)}
                          />
                        </div>
                        <div>
                          <Label>CUIT</Label>
                          <Input 
                            value={editingSupplierInline.cuit || ''}
                            onChange={(e) => setEditingSupplierInline(s => s ? { ...s, cuit: e.target.value } : null)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Teléfono</Label>
                          <Input 
                            value={editingSupplierInline.phone || ''}
                            onChange={(e) => setEditingSupplierInline(s => s ? { ...s, phone: e.target.value } : null)}
                          />
                        </div>
                        <div>
                          <Label>WhatsApp</Label>
                          <Input 
                            value={editingSupplierInline.whatsapp || ''}
                            onChange={(e) => setEditingSupplierInline(s => s ? { ...s, whatsapp: e.target.value } : null)}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input 
                          value={editingSupplierInline.email || ''}
                          onChange={(e) => setEditingSupplierInline(s => s ? { ...s, email: e.target.value } : null)}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingSupplierInline(null)}>
                          Cancelar
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => updateSupplierMutation.mutate({ 
                            id: editingSupplierInline.id, 
                            data: editingSupplierInline 
                          })}
                          disabled={updateSupplierMutation.isPending}
                        >
                          Guardar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{supplier.name}</div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          {supplier.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {supplier.phone}
                            </span>
                          )}
                          {supplier.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {supplier.email}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setEditingSupplierInline(supplier)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setSuppliersModal(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {deleteDialog?.type === 'category' ? 'categoría' : 'producto'}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog?.type === 'category' 
                ? 'Se eliminarán también todos los productos de esta categoría.'
                : 'Esta acción no se puede deshacer.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog && deleteMutation.mutate(deleteDialog)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
