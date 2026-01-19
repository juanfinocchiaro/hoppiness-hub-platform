import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Upload, X, Save, Plus, Trash2, DollarSign, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;
type Category = Tables<'product_categories'>;

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  usage_unit: string | null;
  cost_per_unit: number;
}

interface RecipeLine {
  id?: string;
  ingredient_id: string;
  ingredient_name: string;
  ingredient_unit: string;
  quantity_required: number;
  unit_cost: number;
  line_cost: number;
}

interface ProductInlineEditorProps {
  productId: string;
  categories: Category[];
  onClose: () => void;
  onProductUpdated: () => void;
}

export function ProductInlineEditor({
  productId,
  categories,
  onClose,
  onProductUpdated,
}: ProductInlineEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Ingredients for dropdown
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);
  
  // Recipe lines
  const [recipeLines, setRecipeLines] = useState<RecipeLine[]>([]);
  const [newIngredientId, setNewIngredientId] = useState('');
  const [newQuantity, setNewQuantity] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [imageUrl, setImageUrl] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [preparationTime, setPreparationTime] = useState('');
  const [isEnabledByBrand, setIsEnabledByBrand] = useState(true);

  // Calculate total recipe cost
  const totalRecipeCost = recipeLines.reduce((sum, line) => sum + line.line_cost, 0);
  const margin = parseFloat(price) > 0 ? ((parseFloat(price) - totalRecipeCost) / parseFloat(price)) * 100 : 0;

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const [productRes, ingredientsRes, recipeRes] = await Promise.all([
        supabase.from('products').select('*').eq('id', productId).single(),
        supabase.from('ingredients').select('id, name, unit, usage_unit, cost_per_unit').eq('is_active', true).order('name'),
        supabase.from('product_recipes').select('id, ingredient_id, quantity_required, unit').eq('product_id', productId),
      ]);

      if (productRes.data) {
        const product = productRes.data;
        setName(product.name);
        setDescription(product.description || '');
        setPrice(product.price.toString());
        setCategoryId(product.category_id || '');
        setImageUrl(product.image_url || '');
        setIsAvailable(product.is_available);
        setIsFeatured(product.is_featured || false);
        setPreparationTime(product.preparation_time?.toString() || '');
        setIsEnabledByBrand(product.is_enabled_by_brand ?? true);
      }

      if (ingredientsRes.data) {
        setAvailableIngredients(ingredientsRes.data);
      }

      // Build recipe lines with ingredient info
      if (recipeRes.data && ingredientsRes.data) {
        const lines: RecipeLine[] = recipeRes.data.map(r => {
          const ingredient = ingredientsRes.data.find(i => i.id === r.ingredient_id);
          const unitCost = ingredient?.cost_per_unit || 0;
          const qty = r.quantity_required || 0;
          return {
            id: r.id,
            ingredient_id: r.ingredient_id,
            ingredient_name: ingredient?.name || 'Desconocido',
            ingredient_unit: ingredient?.usage_unit || ingredient?.unit || 'u',
            quantity_required: qty,
            unit_cost: unitCost,
            line_cost: qty * unitCost,
          };
        });
        setRecipeLines(lines);
      }

      setLoading(false);
    }

    fetchData();
  }, [productId]);

  const handleAddIngredient = () => {
    if (!newIngredientId || !newQuantity) {
      toast.error('Seleccioná un ingrediente y cantidad');
      return;
    }

    const ingredient = availableIngredients.find(i => i.id === newIngredientId);
    if (!ingredient) return;

    // Check if already in recipe
    if (recipeLines.some(r => r.ingredient_id === newIngredientId)) {
      toast.error('Este ingrediente ya está en la receta');
      return;
    }

    const qty = parseFloat(newQuantity);
    const unitCost = ingredient.cost_per_unit || 0;

    setRecipeLines(prev => [...prev, {
      ingredient_id: ingredient.id,
      ingredient_name: ingredient.name,
      ingredient_unit: ingredient.usage_unit || ingredient.unit,
      quantity_required: qty,
      unit_cost: unitCost,
      line_cost: qty * unitCost,
    }]);

    setNewIngredientId('');
    setNewQuantity('');
  };

  const handleRemoveIngredient = (ingredientId: string) => {
    setRecipeLines(prev => prev.filter(r => r.ingredient_id !== ingredientId));
  };

  const handleUpdateQuantity = (ingredientId: string, newQty: number) => {
    setRecipeLines(prev => prev.map(r => {
      if (r.ingredient_id === ingredientId) {
        return {
          ...r,
          quantity_required: newQty,
          line_cost: newQty * r.unit_cost,
        };
      }
      return r;
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten archivos de imagen');
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
      toast.success('Imagen subida');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    setSaving(true);
    try {
      // Update product
      const { error: productError } = await supabase
        .from('products')
        .update({
          name,
          description: description || null,
          price: parseFloat(price),
          category_id: categoryId || null,
          image_url: imageUrl || null,
          is_available: isAvailable,
          is_featured: isFeatured,
          preparation_time: preparationTime ? parseInt(preparationTime) : null,
          is_enabled_by_brand: isEnabledByBrand,
        })
        .eq('id', productId);

      if (productError) throw productError;

      // Delete existing recipe lines and recreate
      await supabase.from('product_recipes').delete().eq('product_id', productId);

      if (recipeLines.length > 0) {
        const { error: recipeError } = await supabase
          .from('product_recipes')
          .insert(recipeLines.map(r => ({
            product_id: productId,
            ingredient_id: r.ingredient_id,
            quantity_required: r.quantity_required,
            unit: r.ingredient_unit,
          })));

        if (recipeError) throw recipeError;
      }

      toast.success('Producto actualizado');
      onProductUpdated();
      onClose();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="bg-card border-t-2 border-primary/20 animate-in slide-in-from-top-2 duration-200">

      {/* SECTION 1: Compact Basic Data */}
      <div className="p-4 space-y-3 border-b">
        {/* Row 1: Name, Category, Price, Prep Time */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nombre*</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Categoría</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Precio*</Label>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground text-sm">$</span>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tiempo (min)</Label>
            <Input
              type="number"
              value={preparationTime}
              onChange={(e) => setPreparationTime(e.target.value)}
              className="h-8 text-sm"
              placeholder="15"
            />
          </div>
        </div>

        {/* Row 2: Description + Image */}
        <div className="flex gap-4">
          {/* Description */}
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">Descripción</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-20 text-sm resize-none"
              placeholder="Descripción del producto..."
            />
          </div>

          {/* Image - larger */}
          <div className="relative shrink-0">
            <Label className="text-xs text-muted-foreground mb-1 block">Imagen</Label>
            {imageUrl ? (
              <div className="relative w-24 h-24 rounded-lg overflow-hidden border">
                <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-5 w-5"
                  onClick={() => setImageUrl('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Upload className="h-5 w-5 text-muted-foreground" />
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
          </div>
        </div>

        {/* Row 3: Toggles - bottom left */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={isEnabledByBrand} onCheckedChange={setIsEnabledByBrand} className="scale-90" />
            <span className="text-xs">Habilitado</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isFeatured} onCheckedChange={setIsFeatured} className="scale-90" />
            <span className="text-xs">Destacado</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: Recipe - Full Width & Prominent */}
      <div className="p-4 bg-muted/20">
        {/* Recipe Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-medium text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Receta / Ingredientes
            </h4>
            <p className="text-xs text-muted-foreground">Cantidades en unidad de uso</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Costo receta</p>
              <p className="font-mono font-semibold text-sm">{formatPrice(totalRecipeCost)}</p>
            </div>
            {parseFloat(price) > 0 && (
              <Badge 
                variant="outline" 
                className={`text-sm px-3 py-1 ${
                  margin > 50 ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 
                  margin > 30 ? 'border-amber-500 text-amber-600 bg-amber-50' : 
                  'border-destructive text-destructive bg-destructive/10'
                }`}
              >
                {margin.toFixed(1)}% margen
              </Badge>
            )}
          </div>
        </div>

        {/* Add Ingredient Row */}
        <div className="flex gap-2 mb-3">
          <Select value={newIngredientId} onValueChange={setNewIngredientId}>
            <SelectTrigger className="flex-1 h-9 bg-background">
              <SelectValue placeholder="Seleccionar ingrediente para agregar..." />
            </SelectTrigger>
            <SelectContent>
              {availableIngredients
                .filter(i => !recipeLines.some(r => r.ingredient_id === i.id))
                .map((ing) => (
                  <SelectItem key={ing.id} value={ing.id}>
                    {ing.name} ({formatPrice(ing.cost_per_unit)}/{ing.usage_unit || ing.unit})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            placeholder="Cantidad"
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
            className="w-28 h-9 bg-background"
            step="0.01"
          />
          <Button size="sm" onClick={handleAddIngredient} className="h-9 px-4">
            <Plus className="w-4 h-4 mr-1" />
            Agregar
          </Button>
        </div>

        {/* Recipe Table */}
        {recipeLines.length > 0 ? (
          <div className="border rounded-lg overflow-hidden bg-background">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-medium">Ingrediente</TableHead>
                  <TableHead className="text-xs font-medium text-center w-32">Cantidad</TableHead>
                  <TableHead className="text-xs font-medium text-right w-28">Costo Unit.</TableHead>
                  <TableHead className="text-xs font-medium text-right w-28">Subtotal</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipeLines.map((line) => (
                  <TableRow key={line.ingredient_id}>
                    <TableCell className="text-sm py-2 font-medium">{line.ingredient_name}</TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center justify-center gap-1">
                        <Input
                          type="number"
                          value={line.quantity_required}
                          onChange={(e) => handleUpdateQuantity(line.ingredient_id, parseFloat(e.target.value) || 0)}
                          className="h-7 text-center text-sm w-20"
                          step="0.01"
                        />
                        <span className="text-xs text-muted-foreground w-8">{line.ingredient_unit}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-right text-muted-foreground py-2">
                      {formatPrice(line.unit_cost)}/{line.ingredient_unit}
                    </TableCell>
                    <TableCell className="text-sm text-right font-medium py-2">
                      {formatPrice(line.line_cost)}
                    </TableCell>
                    <TableCell className="py-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveIngredient(line.ingredient_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Total Row */}
                <TableRow className="bg-muted/30 font-medium">
                  <TableCell colSpan={3} className="text-right text-sm py-2">
                    Total Costo Receta:
                  </TableCell>
                  <TableCell className="text-right text-sm py-2 font-mono">
                    {formatPrice(totalRecipeCost)}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg bg-background">
            <p className="text-sm">No hay ingredientes en la receta</p>
            <p className="text-xs mt-1">Agregá ingredientes para calcular el costo</p>
          </div>
        )}
      </div>

      {/* FOOTER: Actions */}
      <div className="flex items-center justify-end gap-3 p-4 border-t bg-muted/10">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Guardar Cambios
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
