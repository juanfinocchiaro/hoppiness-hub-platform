import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Category = Tables<'product_categories'>;
type Branch = Tables<'branches'>;

export default function ProductForm() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const isEditing = !!productId;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [imageUrl, setImageUrl] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [preparationTime, setPreparationTime] = useState('');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const [categoriesRes, branchesRes] = await Promise.all([
        supabase.from('product_categories').select('*').order('display_order'),
        supabase.from('branches').select('*').eq('is_active', true).order('name'),
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (branchesRes.data) {
        setBranches(branchesRes.data);
        // Por defecto, seleccionar todas las sucursales para productos nuevos
        if (!isEditing) {
          setSelectedBranches(branchesRes.data.map(b => b.id));
        }
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
          setIsAvailable(product.is_available);
          setIsFeatured(product.is_featured || false);
          setPreparationTime(product.preparation_time?.toString() || '');
        }

        // Obtener sucursales donde está el producto
        const { data: branchProducts } = await supabase
          .from('branch_products')
          .select('branch_id')
          .eq('product_id', productId);

        if (branchProducts) {
          setSelectedBranches(branchProducts.map(bp => bp.branch_id));
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

  const selectAllBranches = () => {
    setSelectedBranches(branches.map(b => b.id));
  };

  const deselectAllBranches = () => {
    setSelectedBranches([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const productData = {
        name,
        description: description || null,
        price: parseFloat(price),
        category_id: categoryId || null,
        image_url: imageUrl || null,
        is_available: isAvailable,
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

      // Manejar branch_products
      if (savedProductId) {
        // Obtener branch_products actuales
        const { data: currentBranchProducts } = await supabase
          .from('branch_products')
          .select('branch_id')
          .eq('product_id', savedProductId);

        const currentBranchIds = (currentBranchProducts || []).map(bp => bp.branch_id);

        // Sucursales a agregar
        const toAdd = selectedBranches.filter(id => !currentBranchIds.includes(id));
        // Sucursales a eliminar
        const toRemove = currentBranchIds.filter(id => !selectedBranches.includes(id));

        // Insertar nuevas
        if (toAdd.length > 0) {
          const { error: insertError } = await supabase
            .from('branch_products')
            .insert(
              toAdd.map(branchId => ({
                branch_id: branchId,
                product_id: savedProductId,
                is_available: true,
              }))
            );

          if (insertError) throw insertError;
        }

        // Eliminar las que ya no están seleccionadas
        if (toRemove.length > 0) {
          const { error: deleteError } = await supabase
            .from('branch_products')
            .delete()
            .eq('product_id', savedProductId)
            .in('branch_id', toRemove);

          if (deleteError) throw deleteError;
        }
      }

      toast.success(isEditing ? 'Producto actualizado' : 'Producto creado');
      navigate('/admin/productos');
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Error al guardar el producto');
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
        <div className="grid gap-6 md:grid-cols-2">
          {/* Info básica */}
          <Card>
            <CardHeader>
              <CardTitle>Información Básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="imageUrl">URL de imagen</Label>
                <Input
                  id="imageUrl"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prepTime">Tiempo de preparación (min)</Label>
                <Input
                  id="prepTime"
                  type="number"
                  value={preparationTime}
                  onChange={(e) => setPreparationTime(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Estado y sucursales */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Estado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Disponible globalmente</Label>
                    <p className="text-sm text-muted-foreground">
                      Si está apagado, no aparecerá en ninguna sucursal
                    </p>
                  </div>
                  <Switch
                    checked={isAvailable}
                    onCheckedChange={setIsAvailable}
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
                  Selecciona en qué sucursales estará disponible este producto
                </p>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
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
              </CardContent>
            </Card>
          </div>
        </div>

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
