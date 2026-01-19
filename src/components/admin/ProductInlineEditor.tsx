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
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <h3 className="font-semibold flex items-center gap-2">
          Editando: {name}
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ChevronUp className="w-4 h-4 mr-1" />
          Cerrar
        </Button>
      </div>

      <div className="p-4 grid lg:grid-cols-2 gap-6">
        {/* Left Column - Basic Info */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Nombre*</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Categoría</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-9">
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Precio de venta*</Label>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Tiempo prep. (min)</Label>
              <Input
                type="number"
                value={preparationTime}
                onChange={(e) => setPreparationTime(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Descripción</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none min-h-[60px]"
              placeholder="Descripción del producto..."
            />
          </div>

          <div className="flex items-center gap-6 pt-2">
            <div className="flex items-center gap-2">
              <Switch checked={isEnabledByBrand} onCheckedChange={setIsEnabledByBrand} />
              <span className="text-sm">Habilitado</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
              <span className="text-sm">Destacado</span>
            </div>
          </div>

          {/* Image */}
          <div className="flex items-start gap-4">
            <div className="relative">
              {imageUrl ? (
                <div className="relative w-20 h-20 rounded-lg overflow-hidden border">
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
                  className="w-20 h-20 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:border-primary/50"
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
        </div>

        {/* Right Column - Recipe & Cost */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-sm">Receta / Ingredientes</h4>
              <p className="text-xs text-muted-foreground">Cantidades en unidad de uso</p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">Costo:</span>
              <Badge variant="secondary" className="font-mono">
                {formatPrice(totalRecipeCost)}
              </Badge>
              {parseFloat(price) > 0 && (
                <Badge 
                  variant="outline" 
                  className={margin > 50 ? 'border-emerald-500 text-emerald-600' : margin > 30 ? 'border-amber-500 text-amber-600' : 'border-destructive text-destructive'}
                >
                  {margin.toFixed(1)}% margen
                </Badge>
              )}
            </div>
          </div>

          {/* Add Ingredient Row */}
          <div className="flex gap-2">
            <Select value={newIngredientId} onValueChange={setNewIngredientId}>
              <SelectTrigger className="flex-1 h-9">
                <SelectValue placeholder="Seleccionar ingrediente..." />
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
              placeholder="Cant."
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              className="w-24 h-9"
              step="0.01"
            />
            <Button size="sm" onClick={handleAddIngredient} className="h-9">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Recipe Table */}
          {recipeLines.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Ingrediente</TableHead>
                    <TableHead className="text-xs text-right w-24">Cantidad</TableHead>
                    <TableHead className="text-xs text-right w-28">Costo Unit.</TableHead>
                    <TableHead className="text-xs text-right w-28">Subtotal</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipeLines.map((line) => (
                    <TableRow key={line.ingredient_id}>
                      <TableCell className="text-sm py-2">{line.ingredient_name}</TableCell>
                      <TableCell className="py-2">
                        <Input
                          type="number"
                          value={line.quantity_required}
                          onChange={(e) => handleUpdateQuantity(line.ingredient_id, parseFloat(e.target.value) || 0)}
                          className="h-7 text-right text-sm w-full"
                          step="0.01"
                        />
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground py-2">
                        {formatPrice(line.unit_cost)}/{line.ingredient_unit}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm py-2">
                        {formatPrice(line.line_cost)}
                      </TableCell>
                      <TableCell className="py-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveIngredient(line.ingredient_id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground">
              <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Sin ingredientes asignados</p>
              <p className="text-xs">Agregá ingredientes para calcular el costo</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 p-4 border-t bg-muted/30">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Guardar Cambios
        </Button>
      </div>
    </div>
  );
}
