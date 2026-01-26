import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Upload, X, Save, Package, Utensils, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { ScheduleDialog } from './ScheduleDialog';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;
type Category = Tables<'product_categories'>;

interface ModifierGroup {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface ProductEditDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string | null;
  categories: Category[];
  onProductUpdated: () => void;
}

export function ProductEditDrawer({
  open,
  onOpenChange,
  productId,
  categories,
  onProductUpdated,
}: ProductEditDrawerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [imageUrl, setImageUrl] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [preparationTime, setPreparationTime] = useState('');
  const [productType, setProductType] = useState<'final' | 'composite'>('final');
  const [containsAlcohol, setContainsAlcohol] = useState(false);

  useEffect(() => {
    if (!open || !productId) {
      // Reset form when closing
      setName('');
      setDescription('');
      setPrice('');
      setCategoryId('');
      setImageUrl('');
      setIsAvailable(true);
      setIsFeatured(false);
      setPreparationTime('');
      setProductType('final');
      setContainsAlcohol(false);
      setSelectedModifiers([]);
      return;
    }

    async function fetchProduct() {
      setLoading(true);

      // Fetch product and modifiers in parallel
      const [productRes, modifiersRes, assignmentsRes] = await Promise.all([
        supabase.from('products').select('*').eq('id', productId).single(),
        supabase.from('modifier_groups').select('id, name, description, is_active').eq('is_active', true).order('display_order'),
        supabase.from('product_modifier_assignments').select('modifier_group_id').eq('product_id', productId).eq('is_enabled', true),
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
        setProductType((product as any).product_type || 'final');
        setContainsAlcohol((product as any).contains_alcohol || false);
      }

      if (modifiersRes.data) {
        setModifierGroups(modifiersRes.data);
      }

      if (assignmentsRes.data) {
        setSelectedModifiers(assignmentsRes.data.map(a => a.modifier_group_id));
      }

      setLoading(false);
    }

    fetchProduct();
  }, [open, productId]);

  const toggleModifier = (groupId: string) => {
    setSelectedModifiers(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten archivos de imagen');
      return;
    }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return;

    setSaving(true);
    try {
      const productData = {
        name,
        description: description || null,
        price: parseFloat(price),
        category_id: categoryId || null,
        image_url: imageUrl || null,
        is_active: isAvailable,
        is_featured: isFeatured,
        preparation_time: preparationTime ? parseInt(preparationTime) : null,
        product_type: productType,
      };

      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', productId);

      if (error) throw error;

      // Handle modifier assignments
      const { data: currentAssignments } = await supabase
        .from('product_modifier_assignments')
        .select('modifier_group_id, is_enabled')
        .eq('product_id', productId);

      const currentModifierIds = (currentAssignments || [])
        .filter(a => a.is_enabled)
        .map(a => a.modifier_group_id);

      const toAdd = selectedModifiers.filter(id => !currentModifierIds.includes(id));
      const toRemove = currentModifierIds.filter(id => !selectedModifiers.includes(id));

      for (const groupId of toAdd) {
        const existing = (currentAssignments || []).find(a => a.modifier_group_id === groupId);
        if (existing) {
          await supabase
            .from('product_modifier_assignments')
            .update({ is_enabled: true })
            .eq('product_id', productId)
            .eq('modifier_group_id', groupId);
        } else {
          await supabase
            .from('product_modifier_assignments')
            .insert({
              product_id: productId,
              modifier_group_id: groupId,
              is_enabled: true,
            });
        }
      }

      for (const groupId of toRemove) {
        await supabase
          .from('product_modifier_assignments')
          .update({ is_enabled: false })
          .eq('product_id', productId)
          .eq('modifier_group_id', groupId);
      }

      toast.success('Producto actualizado');
      onProductUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Error al guardar el producto');
    } finally {
      setSaving(false);
    }
  };

  const formatPrice = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(num);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col">
          <SheetHeader className="p-6 pb-0">
            <SheetTitle className="text-xl font-bold">Editar producto</SheetTitle>
          </SheetHeader>

          {loading ? (
            <div className="flex items-center justify-center flex-1">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="flex-1 px-6">
              <form onSubmit={handleSubmit} className="space-y-6 pb-6">
                {/* Detalles Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Detalles</h3>
                  
                  {/* Name */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Nombre*</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="border-0 border-b rounded-none px-0 focus-visible:ring-0 bg-transparent text-base font-medium"
                      required
                    />
                  </div>

                  {/* Category & Price Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Categoría*</Label>
                      <Select value={categoryId} onValueChange={setCategoryId}>
                        <SelectTrigger className="border-0 border-b rounded-none px-0 focus:ring-0 bg-transparent">
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
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Precio*</Label>
                      <div className="flex items-center border-b">
                        <span className="text-muted-foreground">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          className="border-0 rounded-none px-1 focus-visible:ring-0 bg-transparent font-medium"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Descripción*</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="border-0 border-b rounded-none px-0 focus-visible:ring-0 bg-transparent resize-none min-h-[80px]"
                      placeholder="Descripción del producto..."
                    />
                  </div>

                  {/* Contains Alcohol Toggle */}
                  <div className="flex items-center justify-between py-3 border-b">
                    <span className="text-sm">Este producto contiene alcohol</span>
                    <Switch
                      checked={containsAlcohol}
                      onCheckedChange={setContainsAlcohol}
                    />
                  </div>
                </div>

                {/* Image Section */}
                <div className="flex justify-end">
                  <div className="relative">
                    {imageUrl ? (
                      <div className="relative w-40 h-40 rounded-xl overflow-hidden border-2 border-dashed border-primary/30 bg-accent/50">
                        <img
                          src={imageUrl}
                          alt={name}
                          className="w-full h-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6"
                          onClick={() => setImageUrl('')}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="absolute bottom-2 right-2"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Editar
                        </Button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-40 h-40 border-2 border-dashed border-muted-foreground/30 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors bg-accent/30"
                      >
                        {uploading ? (
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        ) : (
                          <>
                            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
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
                  </div>
                </div>

                {/* Advanced Options */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Tiempo prep. (min)</Label>
                      <Input
                        type="number"
                        value={preparationTime}
                        onChange={(e) => setPreparationTime(e.target.value)}
                        className="border-0 border-b rounded-none px-0 focus-visible:ring-0 bg-transparent"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Tipo</Label>
                      <Select value={productType} onValueChange={(v) => setProductType(v as any)}>
                        <SelectTrigger className="border-0 border-b rounded-none px-0 focus:ring-0 bg-transparent">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="final">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              Producto Final
                            </div>
                          </SelectItem>
                          <SelectItem value="composite">
                            <div className="flex items-center gap-2">
                              <Utensils className="h-4 w-4" />
                              Con Ingredientes
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm">Destacado</span>
                    <Switch
                      checked={isFeatured}
                      onCheckedChange={setIsFeatured}
                    />
                  </div>
                </div>

                {/* Modifiers Section */}
                {modifierGroups.length > 0 && (
                  <div className="space-y-3 pt-4 border-t">
                    <h3 className="text-sm font-medium text-muted-foreground">Personalizaciones</h3>
                    <div className="flex flex-wrap gap-2">
                      {modifierGroups.map((group) => {
                        const isSelected = selectedModifiers.includes(group.id);
                        return (
                          <Badge
                            key={group.id}
                            variant={isSelected ? "default" : "outline"}
                            className={`cursor-pointer transition-all ${
                              isSelected 
                                ? 'bg-primary hover:bg-primary/90' 
                                : 'hover:bg-accent'
                            }`}
                            onClick={() => toggleModifier(group.id)}
                          >
                            {group.name}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Schedule Button */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => setScheduleDialogOpen(true)}
                >
                  <span className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Ordenar personalizaciones
                  </span>
                  <span className="text-muted-foreground">→</span>
                </Button>

                {/* Save Button */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={saving || !name || !price}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Guardar cambios
                </Button>
              </form>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>

      {/* Schedule Dialog */}
      {productId && (
        <ScheduleDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          productId={productId}
          itemName={name}
        />
      )}
    </>
  );
}
