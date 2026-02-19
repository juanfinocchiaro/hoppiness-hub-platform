import { useState, useEffect } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Plus, Loader2 } from 'lucide-react';
import { ProductModifierSelector } from '@/components/store/ProductModifierSelector';
import { useProductModifiers, calculateModifiersTotal, validateSelections } from '@/hooks/useProductModifiers';
import type { MenuProduct } from '@/hooks/store/useBranchMenu';
import { toast } from 'sonner';

interface SelectedModifiers {
  [groupId: string]: string[];
}

interface ProductSheetProps {
  product: MenuProduct | null;
  branchId: string | null;
  onClose: () => void;
  onAddToCart: (data: {
    product: MenuProduct;
    modifiers: SelectedModifiers;
    modifiersTotal: number;
    modifierNames: string[];
    notes: string;
  }) => void;
  formatPrice: (price: number) => string;
}

export function ProductSheet({
  product,
  branchId,
  onClose,
  onAddToCart,
  formatPrice,
}: ProductSheetProps) {
  const [modifierSelections, setModifierSelections] = useState<SelectedModifiers>({});
  const [notes, setNotes] = useState('');
  
  const { modifiers: productModifiers, loading: modifiersLoading } = useProductModifiers(
    product?.id || null,
    branchId
  );
  
  // Reset selections when product changes
  useEffect(() => {
    setModifierSelections({});
    setNotes('');
  }, [product?.id]);
  
  const currentModifiersTotal = calculateModifiersTotal(productModifiers, modifierSelections);
  
  const getModifierNames = (): string[] => {
    const names: string[] = [];
    productModifiers.forEach(group => {
      const selectedIds = modifierSelections[group.id] || [];
      selectedIds.forEach(optId => {
        const opt = group.options.find(o => o.id === optId);
        if (opt) names.push(opt.name);
      });
    });
    return names;
  };
  
  const handleAddToCart = () => {
    if (!product) return;
    
    // Validate required selections
    const validation = validateSelections(productModifiers, modifierSelections);
    if (!validation.valid) {
      validation.errors.forEach(err => toast.error(err));
      return;
    }
    
    onAddToCart({
      product,
      modifiers: modifierSelections,
      modifiersTotal: currentModifiersTotal,
      modifierNames: getModifierNames(),
      notes,
    });
    
    onClose();
  };
  
  return (
    <Sheet open={!!product} onOpenChange={() => onClose()}>
      <SheetContent 
        side="bottom" 
        className="h-[85vh] rounded-t-3xl p-0 flex flex-col bg-background"
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        
        {/* Close Button */}
        <Button 
          variant="ghost" 
          size="icon"
          className="absolute top-3 right-3 bg-muted hover:bg-muted/80 rounded-full h-8 w-8 z-10"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {/* Product Image */}
          <div className="flex justify-center mb-4">
            <div className="relative w-44 h-44 rounded-2xl overflow-hidden shadow-lg">
              {product?.image_url ? (
                <img 
                  src={product.image_url} 
                  alt={product.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                  <span className="text-6xl">🍔</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Title & Price */}
          <div className="text-center mb-5">
            <h2 className="text-xl font-bold">{product?.name}</h2>
            <p className="text-2xl font-bold text-primary mt-1">
              {formatPrice(product?.finalPrice || 0)}
            </p>
            {product?.description && (
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed max-w-md mx-auto">
                {product.description}
              </p>
            )}
          </div>
          
          {/* Modifiers */}
          {modifiersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : productModifiers.length > 0 ? (
            <ProductModifierSelector
              groups={productModifiers}
              selections={modifierSelections}
              onSelectionsChange={setModifierSelections}
              formatPrice={formatPrice}
            />
          ) : null}
          
          {/* Notes */}
          <div className="rounded-xl border p-3 mt-4">
            <Label htmlFor="notes" className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              ¿Alguna indicación especial?
            </Label>
            <Textarea
              id="notes"
              placeholder="Ej: Sin cebolla, punto de la carne..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2 bg-transparent border-0 p-0 focus-visible:ring-0 resize-none"
              rows={2}
            />
          </div>
        </div>
        
        {/* Sticky Footer */}
        <div className="shrink-0 p-4 border-t bg-background">
          <Button 
            className="w-full h-12 text-base font-semibold rounded-xl"
            onClick={handleAddToCart}
            disabled={modifiersLoading}
          >
            <Plus className="w-5 h-5 mr-2" />
            Agregar {formatPrice((product?.finalPrice || 0) + currentModifiersTotal)}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
