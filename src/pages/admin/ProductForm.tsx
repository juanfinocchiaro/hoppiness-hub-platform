import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, Upload, X, Package, Utensils } from 'lucide-react';
import { toast } from 'sonner';
import { handleError } from '@/lib/errorHandler';
import type { Tables } from '@/integrations/supabase/types';

type Category = Tables<'product_categories'>;
type Branch = Tables<'branches'>;

interface ModifierGroup {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  options: { id: string; name: string; price_adjustment: number }[];
}

interface ModifierAssignment {
  modifier_group_id: string;
  is_enabled: boolean;
}

export default function ProductForm() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const isEditing = !!productId;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true); // is_active = estado del catálogo
  const [isFeatured, setIsFeatured] = useState(false);
  const [preparationTime, setPreparationTime] = useState('');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const [categoriesRes, branchesRes, modifiersRes] = await Promise.all([
        supabase.from('product_categories').select('*').order('display_order'),
        supabase.from('branches').select('*').eq('is_active', true).order('name'),
        supabase.from('modifier_groups').select('id, name, description, is_active').eq('is_active', true).order('display_order'),
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (branchesRes.data) {
        setBranches(branchesRes.data);
        if (!isEditing) {
          setSelectedBranches(branchesRes.data.map(b => b.id));
        }
      }

      // Fetch modifier options for each group
      if (modifiersRes.data) {
        const { data: optionsData } = await supabase
          .from('modifier_options')
          .select('id, name, price_adjustment, group_id')
          .eq('is_active', true)
          .order('display_order');

        const groupsWithOptions: ModifierGroup[] = modifiersRes.data.map(g => ({
          ...g,
          options: (optionsData || []).filter(o => o.group_id === g.id),
        }));
        setModifierGroups(groupsWithOptions);
      }

      if (isEditing && productId) {
        const { data: product } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();

        if (product) {
          setName(product.name);
          setDescription(product.description || '');
          setPrice(product.price.toString());
          setCategoryId(product.category_id || '');
          setImageUrl(product.image_url || '');
          setIsActive(product.is_active);
          setIsFeatured(product.is_featured || false);
          setPreparationTime(product.preparation_time?.toString() || '');
        }

        // Obtener sucursales donde está AUTORIZADO por marca (is_enabled_by_brand = true)
        const { data: branchProducts } = await supabase
          .from('branch_products')
          .select('branch_id, is_enabled_by_brand')
          .eq('product_id', productId)
          .eq('is_enabled_by_brand', true);

        if (branchProducts) {
          setSelectedBranches(branchProducts.map(bp => bp.branch_id));
        }

        // Obtener modificadores asignados
        const { data: modifierAssignments } = await supabase
          .from('product_modifier_assignments')
          .select('modifier_group_id')
          .eq('product_id', productId)
          .eq('is_enabled', true);

        if (modifierAssignments) {
          setSelectedModifiers(modifierAssignments.map(ma => ma.modifier_group_id));
        }
      }

      setLoading(false);
    }

    fetchData();
  }, [isEditing, productId]);

  const toggleBranch = (branchId: string) => {
    setSelectedBranches(prev =>
      prev.includes(branchId)
        ? prev.filter(id => id !== branchId)
        : [...prev, branchId]
    );
  };

  const toggleModifier = (groupId: string) => {
    setSelectedModifiers(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const selectAllBranches = () => {
    setSelectedBranches(branches.map(b => b.id));
  };

  const deselectAllBranches = () => {
    setSelectedBranches([]);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten archivos de imagen');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no puede superar los 5MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setImageUrl(urlData.publicUrl);
      toast.success('Imagen subida correctamente');
      
      // If editing, trigger POS thumbnail generation in background
      if (isEditing && productId) {
        generatePosThumbnail(productId, urlData.publicUrl);
      }
    } catch (error) {
      handleError(error, { userMessage: 'Error al subir la imagen', context: 'ProductForm.handleImageUpload' });
    } finally {
      setUploading(false);
    }
  };
  
  // Generate POS thumbnail in background (non-blocking)
  const generatePosThumbnail = async (prodId: string, imgUrl: string) => {
    try {
      const response = await supabase.functions.invoke('generate-pos-thumbnail', {
        body: { product_id: prodId, image_url: imgUrl },
      });
      
      if (response.error) {
        console.error('POS thumbnail generation failed:', response.error);
      } else {
        console.log('POS thumbnail generated:', response.data?.pos_thumb_url);
        toast.success('Miniatura POS generada');
      }
    } catch (err) {
      console.error('Error calling generate-pos-thumbnail:', err);
    }
  };

  const removeImage = () => {
    setImageUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Nota: is_active es el estado de catálogo (archivado/activo)
      // Por defecto los productos nuevos están activos en el catálogo
      const productData = {
        name,
        description: description || null,
        price: parseFloat(price),
        category_id: categoryId || null,
        image_url: imageUrl || null,
        is_active: isActive, // Campo renombrado de is_available a is_active
        is_featured: isFeatured,
        preparation_time: preparationTime ? parseInt(preparationTime) : null,
      };

      let savedProductId = productId;

      if (isEditing) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', productId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert(productData)
          .select('id')
          .single();

        if (error) throw error;
        savedProductId = data.id;
      }

      // Manejar branch_products según nuevo modelo de 3 capas
      // - is_enabled_by_brand = true para locales seleccionados (autorizado por marca)
      // - is_enabled_by_brand = false para locales no seleccionados
      // - is_available = false siempre (el local debe activarlo manualmente)
      if (savedProductId) {
        const { data: currentBranchProducts } = await supabase
          .from('branch_products')
          .select('branch_id, is_enabled_by_brand')
          .eq('product_id', savedProductId);

        const currentBranchIds = (currentBranchProducts || []).map(bp => bp.branch_id);

        // Locales nuevos a agregar (no tienen registro)
        const toAdd = selectedBranches.filter(id => !currentBranchIds.includes(id));
        // Locales a habilitar (tienen registro pero is_enabled_by_brand = false)
        const toEnable = selectedBranches.filter(id => {
          const bp = currentBranchProducts?.find(b => b.branch_id === id);
          return bp && !bp.is_enabled_by_brand;
        });
        // Locales a deshabilitar (tienen registro y is_enabled_by_brand = true pero no están seleccionados)
        const toDisable = currentBranchIds.filter(id => {
          const bp = currentBranchProducts?.find(b => b.branch_id === id);
          return bp?.is_enabled_by_brand && !selectedBranches.includes(id);
        });

        // Agregar nuevos registros con is_enabled_by_brand = true, is_available = false
        if (toAdd.length > 0) {
          const { error: insertError } = await supabase
            .from('branch_products')
            .insert(
              toAdd.map(branchId => ({
                branch_id: branchId,
                product_id: savedProductId,
                is_enabled_by_brand: true,
                is_available: false, // Pausado por defecto
              }))
            );

          if (insertError) throw insertError;
        }

        // Habilitar locales que ya tenían registro
        if (toEnable.length > 0) {
          const { error: enableError } = await supabase
            .from('branch_products')
            .update({ is_enabled_by_brand: true })
            .eq('product_id', savedProductId)
            .in('branch_id', toEnable);

          if (enableError) throw enableError;
        }

        // Deshabilitar locales no seleccionados
        if (toDisable.length > 0) {
          const { error: disableError } = await supabase
            .from('branch_products')
            .update({ is_enabled_by_brand: false })
            .eq('product_id', savedProductId)
            .in('branch_id', toDisable);

          if (disableError) throw disableError;
        }

        // Manejar modifier assignments
        const { data: currentModifierAssignments } = await supabase
          .from('product_modifier_assignments')
          .select('modifier_group_id, is_enabled')
          .eq('product_id', savedProductId);

        const currentModifierIds = (currentModifierAssignments || [])
          .filter(ma => ma.is_enabled)
          .map(ma => ma.modifier_group_id);

        const modifiersToAdd = selectedModifiers.filter(id => !currentModifierIds.includes(id));
        const modifiersToRemove = currentModifierIds.filter(id => !selectedModifiers.includes(id));

        // Add new modifier assignments
        for (const groupId of modifiersToAdd) {
          const existing = (currentModifierAssignments || []).find(ma => ma.modifier_group_id === groupId);
          if (existing) {
            await supabase
              .from('product_modifier_assignments')
              .update({ is_enabled: true })
              .eq('product_id', savedProductId)
              .eq('modifier_group_id', groupId);
          } else {
            await supabase
              .from('product_modifier_assignments')
              .insert({
                product_id: savedProductId,
                modifier_group_id: groupId,
                is_enabled: true,
              });
          }
        }

        // Disable removed modifier assignments
        for (const groupId of modifiersToRemove) {
          await supabase
            .from('product_modifier_assignments')
            .update({ is_enabled: false })
            .eq('product_id', savedProductId)
            .eq('modifier_group_id', groupId);
        }
        
        // Generate POS thumbnail for new products or when image changed
        if (imageUrl && savedProductId) {
          generatePosThumbnail(savedProductId, imageUrl);
        }
      }

      toast.success(isEditing ? 'Producto actualizado' : 'Producto creado');
      navigate('/admin/productos');
    } catch (error) {
      handleError(error, { userMessage: 'Error al guardar el producto', context: 'ProductForm.handleSubmit' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/productos')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Modificar datos del producto' : 'Crear un nuevo producto en el catálogo'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Info básica */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Información Básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoría</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sin categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Precio *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prepTime">Tiempo prep. (min)</Label>
                  <Input
                    id="prepTime"
                    type="number"
                    value={preparationTime}
                    onChange={(e) => setPreparationTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Imagen del Producto</Label>
                <div className="flex items-start gap-4">
                  {imageUrl ? (
                    <div className="relative">
                      <img
                        src={imageUrl}
                        alt="Product"
                        className="w-32 h-32 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={removeImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-32 h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
                    >
                      {uploading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                          <span className="text-xs text-muted-foreground">Subir imagen</span>
                        </>
                      )}
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="imageUrl">O pegar URL de imagen</Label>
                    <Input
                      id="imageUrl"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estado */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Estado del Catálogo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Activo en catálogo</Label>
                    <p className="text-sm text-muted-foreground">
                      Si está apagado, el producto está archivado y no aparece en ningún lado
                    </p>
                  </div>
                  <Switch
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Destacado</Label>
                    <p className="text-sm text-muted-foreground">
                      Aparecerá primero en el menú
                    </p>
                  </div>
                  <Switch
                    checked={isFeatured}
                    onCheckedChange={setIsFeatured}
                  />
                </div>

              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Sucursales</span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={selectAllBranches}
                    >
                      Todas
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={deselectAllBranches}
                    >
                      Ninguna
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Selecciona en qué sucursales estará disponible
                </p>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-3">
                    {branches.map((branch) => (
                      <div key={branch.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`branch-${branch.id}`}
                          checked={selectedBranches.includes(branch.id)}
                          onCheckedChange={() => toggleBranch(branch.id)}
                        />
                        <label
                          htmlFor={`branch-${branch.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {branch.name} - {branch.city}
                        </label>
                      </div>
                    ))}
                    {branches.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No hay sucursales activas
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Modificadores */}
        <Card>
          <CardHeader>
            <CardTitle>Modificadores y Extras</CardTitle>
            <p className="text-sm text-muted-foreground">
              Selecciona qué grupos de extras/opciones aplican a este producto
            </p>
          </CardHeader>
          <CardContent>
            {modifierGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No hay grupos de modificadores creados. Crealos desde la sección de Modificadores.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {modifierGroups.map((group) => (
                  <div
                    key={group.id}
                    onClick={() => toggleModifier(group.id)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedModifiers.includes(group.id)
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-muted-foreground/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedModifiers.includes(group.id)}
                            onCheckedChange={() => toggleModifier(group.id)}
                          />
                          <span className="font-medium">{group.name}</span>
                        </div>
                        {group.description && (
                          <p className="text-sm text-muted-foreground mt-1 ml-6">
                            {group.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2 ml-6">
                          {group.options.slice(0, 3).map((opt) => (
                            <Badge key={opt.id} variant="secondary" className="text-xs">
                              {opt.name}
                            </Badge>
                          ))}
                          {group.options.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{group.options.length - 3} más
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/admin/productos')}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Save className="w-4 h-4 mr-2" />
            {isEditing ? 'Guardar Cambios' : 'Crear Producto'}
          </Button>
        </div>
      </form>
    </div>
  );
}