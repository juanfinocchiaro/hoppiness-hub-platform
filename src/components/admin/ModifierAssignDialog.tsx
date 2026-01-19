import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Check, Search, X } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;
type ProductCategory = Tables<'product_categories'>;

interface ModifierOption {
  id: string;
  name: string;
  assignedProductIds: string[];
}

interface ModifierAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  option: ModifierOption | null;
  products: Product[];
  categories: ProductCategory[];
  onToggleAssignment: (productId: string, optionId: string, currentlyEnabled: boolean) => Promise<void>;
}

export function ModifierAssignDialog({
  open,
  onOpenChange,
  option,
  products,
  categories,
  onToggleAssignment
}: ModifierAssignDialogProps) {
  const [search, setSearch] = useState('');
  const [loadingProducts, setLoadingProducts] = useState<Set<string>>(new Set());

  const productsByCategory = useMemo(() => {
    const grouped: Record<string, Product[]> = {};
    const filtered = products.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase())
    );
    
    filtered.forEach(p => {
      const cat = categories.find(c => c.id === p.category_id);
      const catName = cat?.name || 'Sin categoría';
      if (!grouped[catName]) grouped[catName] = [];
      grouped[catName].push(p);
    });
    
    return grouped;
  }, [products, categories, search]);

  const handleToggle = async (productId: string) => {
    if (!option) return;
    
    const isAssigned = option.assignedProductIds.includes(productId);
    setLoadingProducts(prev => new Set(prev).add(productId));
    
    try {
      await onToggleAssignment(productId, option.id, isAssigned);
    } finally {
      setLoadingProducts(prev => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const assignedCount = option?.assignedProductIds.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Asignar</span>
            <span className="text-primary">"{option?.name}"</span>
          </DialogTitle>
        </DialogHeader>

        {/* Search + Counter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar producto..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearch('')}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <div className="text-sm text-muted-foreground whitespace-nowrap">
            <span className="font-semibold text-foreground">{assignedCount}</span> asignados
          </div>
        </div>

        {/* Products Grid */}
        <ScrollArea className="h-[55vh]">
          <div className="space-y-6 pr-4">
            {Object.entries(productsByCategory).map(([categoryName, categoryProducts]) => (
              <div key={categoryName}>
                <div className="sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10 border-b border-border mb-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                    {categoryName}
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {categoryProducts.map(product => {
                    const isAssigned = option?.assignedProductIds.includes(product.id) || false;
                    const isLoading = loadingProducts.has(product.id);
                    
                    return (
                      <button
                        type="button"
                        key={product.id}
                        disabled={isLoading}
                        onClick={() => handleToggle(product.id)}
                        className={`
                          flex items-center gap-3 p-3 rounded-xl text-left
                          transition-all duration-150 ease-out
                          disabled:opacity-50 disabled:cursor-wait
                          ${isAssigned 
                            ? 'bg-primary/10 border-2 border-primary shadow-sm' 
                            : 'bg-card border-2 border-transparent hover:border-primary/30 hover:bg-muted/50'
                          }
                        `}
                      >
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt="" 
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0 ring-1 ring-border" 
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium truncate flex-1">
                          {product.name}
                        </span>
                        <div className={`
                          w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0
                          transition-all duration-150
                          ${isAssigned 
                            ? 'bg-primary text-primary-foreground' 
                            : 'border-2 border-muted-foreground/30'
                          }
                        `}>
                          {isAssigned && <Check className="h-3 w-3" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {Object.keys(productsByCategory).length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No se encontraron productos
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Listo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
