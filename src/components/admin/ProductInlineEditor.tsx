import { useEffect, useState, useRef, useMemo } from 'react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Loader2, Upload, X, Save, Plus, Trash2, DollarSign, AlertCircle, PackagePlus } from 'lucide-react';
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

// Format currency helper
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

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
  const [showExitDialog, setShowExitDialog] = useState(false);
  
  // Ingredients for dropdown
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);
  
  // Recipe lines
  const [recipeLines, setRecipeLines] = useState<RecipeLine[]>([]);
  const [newIngredientId, setNewIngredientId] = useState('');
  const [newQuantity, setNewQuantity] = useState('');

  // Original values for change detection
  const [originalData, setOriginalData] = useState<{
    name: string;
    description: string;
    price: string;
    categoryId: string;
    imageUrl: string;
    isAvailable: boolean;
    isFeatured: boolean;
    preparationTime: string;
    isEnabledByBrand: boolean;
    recipeLines: RecipeLine[];
  } | null>(null);

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

  // Calculate total recipe cost and margins
  const totalRecipeCost = recipeLines.reduce((sum, line) => sum + line.line_cost, 0);
  const priceNum = parseFloat(price) || 0;
  const utilidad = priceNum - totalRecipeCost;
  const margin = priceNum > 0 ? (utilidad / priceNum) * 100 : 0;

  // Detect unsaved changes
  const hasChanges = useMemo(() => {
    if (!originalData) return false;
    
    const recipeLinesChanged = JSON.stringify(recipeLines.map(r => ({
      ingredient_id: r.ingredient_id,
      quantity_required: r.quantity_required,
    }))) !== JSON.stringify(originalData.recipeLines.map(r => ({
      ingredient_id: r.ingredient_id,
      quantity_required: r.quantity_required,
    })));

    return (
      name !== originalData.name ||
      description !== originalData.description ||
      price !== originalData.price ||
      categoryId !== originalData.categoryId ||
      imageUrl !== originalData.imageUrl ||
      isAvailable !== originalData.isAvailable ||
      isFeatured !== originalData.isFeatured ||
      preparationTime !== originalData.preparationTime ||
      isEnabledByBrand !== originalData.isEnabledByBrand ||
      recipeLinesChanged
    );
  }, [name, description, price, categoryId, imageUrl, isAvailable, isFeatured, preparationTime, isEnabledByBrand, recipeLines, originalData]);

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
        setIsAvailable(product.is_active);
        setIsFeatured(product.is_featured || false);
        setPreparationTime(product.preparation_time?.toString() || '');
        setIsEnabledByBrand(product.is_enabled_by_brand ?? true);
      }

      if (ingredientsRes.data) {
        setAvailableIngredients(ingredientsRes.data);
      }

      // Build recipe lines with ingredient info
      let lines: RecipeLine[] = [];
      if (recipeRes.data && ingredientsRes.data) {
        lines = recipeRes.data.map(r => {
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

      // Store original data for change detection
      if (productRes.data) {
        const product = productRes.data;
        setOriginalData({
          name: product.name,
          description: product.description || '',
          price: product.price.toString(),
          categoryId: product.category_id || '',
          imageUrl: product.image_url || '',
          isAvailable: product.is_active,
          isFeatured: product.is_featured || false,
          preparationTime: product.preparation_time?.toString() || '',
          isEnabledByBrand: product.is_enabled_by_brand ?? true,
          recipeLines: lines,
        });
      }

      setLoading(false);
    }

    fetchData();
  }, [productId]);

  const handleClose = () => {
    if (hasChanges) {
      setShowExitDialog(true);
    } else {
      onClose();
    }
  };

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
    toast.success(`${ingredient.name} agregado a la receta`);
  };

  const handleRemoveIngredient = (ingredientId: string) => {
    const ingredient = recipeLines.find(r => r.ingredient_id === ingredientId);
    setRecipeLines(prev => prev.filter(r => r.ingredient_id !== ingredientId));
    if (ingredient) {
      toast.info(`${ingredient.ingredient_name} eliminado de la receta`);
    }
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

  // Toggle handlers with feedback
  const handleToggleEnabled = (checked: boolean) => {
    setIsEnabledByBrand(checked);
    toast(checked ? 'Producto habilitado en menú' : 'Producto deshabilitado del menú', {
      icon: checked ? '✅' : '⛔',
    });
  };

  const handleToggleFeatured = (checked: boolean) => {
    setIsFeatured(checked);
    toast(checked ? 'Producto marcado como destacado' : 'Producto ya no está destacado', {
      icon: checked ? '⭐' : '☆',
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten archivos de imagen');
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no puede superar 5MB');
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
      
      // Trigger POS thumbnail generation in background
      if (productId) {
        generatePosThumbnail(productId, urlData.publicUrl);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Error al subir la imagen');
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
      if (!response.error) {
        toast.success('Miniatura POS generada');
      }
    } catch (err) {
      console.error('Error generating POS thumbnail:', err);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    
    if (!price || parseFloat(price) <= 0) {
      toast.error('El precio debe ser mayor a 0');
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

      toast.success('Producto actualizado correctamente');
      onProductUpdated();
      onClose();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Error al guardar el producto');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="bg-card border-t-2 border-primary/20 animate-in slide-in-from-top-2 duration-200">
        {/* Unsaved Changes Indicator */}
        {hasChanges && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-700 dark:text-amber-400">Hay cambios sin guardar</span>
          </div>
        )}

        {/* SECTION 1: Compact Basic Data */}
        <div className="p-4 space-y-3 border-b">
          {/* Row 1: Name, Category, Price, Prep Time */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Nombre *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 text-sm"
                placeholder="Nombre del producto"
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
              <Label className="text-xs text-muted-foreground">Precio *</Label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="h-8 text-sm pl-6"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Tiempo prep.
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="ml-1 text-muted-foreground/60 cursor-help">ⓘ</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Tiempo estimado de preparación en minutos</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  value={preparationTime}
                  onChange={(e) => setPreparationTime(e.target.value)}
                  className="h-8 text-sm pr-10"
                  placeholder="15"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">min</span>
              </div>
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
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border group">
                  <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Cambiar
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setImageUrl('')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors gap-1"
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Max 5MB</span>
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
            </div>
          </div>

          {/* Row 3: Toggles - bottom left */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch 
                checked={isEnabledByBrand} 
                onCheckedChange={handleToggleEnabled} 
                className="scale-90" 
              />
              <span className="text-xs">Habilitado</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                checked={isFeatured} 
                onCheckedChange={handleToggleFeatured} 
                className="scale-90" 
              />
              <span className="text-xs">Destacado</span>
            </div>
          </div>
        </div>

        {/* SECTION 2: Recipe - Full Width & Prominent */}
        <div className="p-4 bg-muted/20">
          {/* Recipe Header with expanded margin info */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-medium text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Receta / Ingredientes
              </h4>
              <p className="text-xs text-muted-foreground">Cantidades en unidad de uso</p>
            </div>
            
            {/* Expanded margin context */}
            <div className="flex items-center gap-4">
              {/* Cost breakdown */}
              <div className="flex items-center gap-3 text-xs">
                <div className="text-right">
                  <p className="text-muted-foreground">Costo</p>
                  <p className="font-mono font-semibold">{formatCurrency(totalRecipeCost)}</p>
                </div>
                <div className="text-muted-foreground">→</div>
                <div className="text-right">
                  <p className="text-muted-foreground">Precio</p>
                  <p className="font-mono font-semibold">{formatCurrency(priceNum)}</p>
                </div>
                <div className="text-muted-foreground">=</div>
                <div className="text-right">
                  <p className="text-muted-foreground">Utilidad</p>
                  <p className={`font-mono font-semibold ${utilidad >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                    {formatCurrency(utilidad)}
                  </p>
                </div>
              </div>
              
              {/* Margin badge */}
              {priceNum > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant="outline" 
                        className={`text-sm px-3 py-1 cursor-help ${
                          margin > 50 ? 'border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' : 
                          margin > 30 ? 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30' : 
                          'border-destructive text-destructive bg-destructive/10'
                        }`}
                      >
                        {margin.toFixed(1)}% margen
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">Margen bruto</p>
                      <p className="text-xs">(Precio - Costo) / Precio × 100</p>
                      <p className="text-xs mt-1 text-muted-foreground">
                        {margin > 50 ? 'Excelente margen' : margin > 30 ? 'Margen aceptable' : 'Margen bajo, revisar costos'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
                      {ing.name} ({formatCurrency(ing.cost_per_unit)}/{ing.usage_unit || ing.unit})
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
                    <TableHead className="text-xs font-medium text-center w-20">Unidad</TableHead>
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
                        <div className="flex items-center justify-center">
                          <Input
                            type="number"
                            value={line.quantity_required}
                            onChange={(e) => handleUpdateQuantity(line.ingredient_id, parseFloat(e.target.value) || 0)}
                            className="h-7 text-center text-sm w-20"
                            step="0.01"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-center text-muted-foreground py-2">
                        {line.ingredient_unit}
                      </TableCell>
                      <TableCell className="text-sm text-right text-muted-foreground py-2">
                        {formatCurrency(line.unit_cost)}
                      </TableCell>
                      <TableCell className="text-sm text-right font-medium py-2">
                        {formatCurrency(line.line_cost)}
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
                    <TableCell colSpan={4} className="text-right text-sm py-2">
                      Total Costo Receta:
                    </TableCell>
                    <TableCell className="text-right text-sm py-2 font-mono">
                      {formatCurrency(totalRecipeCost)}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg bg-background">
              <PackagePlus className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No hay ingredientes en la receta</p>
              <p className="text-xs mt-1">Agregá ingredientes para calcular el costo y margen</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => document.querySelector<HTMLButtonElement>('[data-radix-collection-item]')?.click()}
              >
                <Plus className="w-4 h-4 mr-1" />
                Agregar tu primer ingrediente
              </Button>
            </div>
          )}

          {/* Actions - dentro de la sección de receta */}
          <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t">
            <Button variant="ghost" onClick={handleClose} disabled={saving}>
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
      </div>

      {/* Exit confirmation dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Descartar cambios?</AlertDialogTitle>
            <AlertDialogDescription>
              Tenés cambios sin guardar. Si salís ahora, se perderán todos los cambios realizados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Seguir editando</AlertDialogCancel>
            <AlertDialogAction onClick={onClose} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Descartar cambios
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
