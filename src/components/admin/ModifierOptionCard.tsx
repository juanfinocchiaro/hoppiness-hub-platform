import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Edit2, Trash2, Package, Link2, GripVertical, Loader2, Beaker
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;
type Ingredient = Tables<'ingredients'>;

export interface ModifierOption {
  id: string;
  group_id: string;
  name: string;
  price_adjustment: number;
  is_active: boolean;
  display_order: number;
  image_url?: string | null;
  linked_product_id?: string | null;
  linked_ingredient_id?: string | null;
  linkedProduct?: Product | null;
  linkedIngredient?: Ingredient | null;
  assignedProductIds: string[];
  assignedProductNames?: string[];
}

interface ModifierOptionCardProps {
  option: ModifierOption;
  type: 'adicional' | 'personalizacion' | 'combo';
  isReorderMode?: boolean;
  onEdit: (option: ModifierOption) => void;
  onDelete: (optionId: string) => void;
  onAssign: (option: ModifierOption) => void;
  onAssignAllBurgers?: (optionId: string) => void;
}

export function ModifierOptionCard({
  option,
  type,
  isReorderMode = false,
  onEdit,
  onDelete,
  onAssign,
  onAssignAllBurgers,
}: ModifierOptionCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: option.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    onDelete(option.id);
  };

  const displayName = option.linkedProduct?.name || option.name;
  const imageUrl = option.image_url || option.linkedProduct?.image_url;
  const assignedCount = option.assignedProductIds.length;

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`
        group relative flex items-center gap-3 p-4 
        bg-card border border-border rounded-xl
        transition-all duration-200 ease-out
        ${!option.is_active ? 'opacity-60' : ''}
        ${isDragging 
          ? 'shadow-elevated ring-2 ring-primary/20 scale-[1.02] z-50 bg-card' 
          : 'hover:shadow-card hover:border-primary/20'
        }
        ${isReorderMode ? 'cursor-grab active:cursor-grabbing' : ''}
      `}
      {...(isReorderMode ? { ...attributes, ...listeners } : {})}
    >
      {/* Drag Handle - Only visible in reorder mode */}
      {isReorderMode && (
        <div className="p-1 -ml-1 rounded text-muted-foreground">
          <GripVertical className="h-5 w-5" />
        </div>
      )}

      {/* No toggle in brand view - availability is managed by branches */}

      {/* Image - Visible for both types */}
      <div className="flex-shrink-0">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={displayName} 
            className="w-12 h-12 rounded-lg object-cover ring-1 ring-border"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-foreground truncate">
            {displayName}
          </span>
          {option.linkedProduct && (
            <Badge variant="secondary" className="text-xs gap-1 flex-shrink-0">
              <Link2 className="h-3 w-3" />
              Producto
            </Badge>
          )}
          {option.linkedIngredient && (
            <Badge variant="outline" className="text-xs gap-1 flex-shrink-0 border-warning/50 text-warning">
              <Beaker className="h-3 w-3" />
              {option.linkedIngredient.name}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1">
          {assignedCount === 0 ? (
            <span className="text-sm text-muted-foreground">Sin asignar</span>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm text-primary cursor-help underline decoration-dotted underline-offset-2">
                    {assignedCount} producto{assignedCount !== 1 ? 's' : ''}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="font-medium mb-1">Productos asignados:</p>
                  <ul className="text-xs space-y-0.5">
                    {option.assignedProductNames?.slice(0, 10).map((name, i) => (
                      <li key={i}>• {name}</li>
                    ))}
                    {(option.assignedProductNames?.length || 0) > 10 && (
                      <li className="text-muted-foreground">
                        +{(option.assignedProductNames?.length || 0) - 10} más...
                      </li>
                    )}
                    {!option.assignedProductNames?.length && (
                      <li className="text-muted-foreground italic">
                        {assignedCount} producto{assignedCount !== 1 ? 's' : ''}
                      </li>
                    )}
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {type === 'adicional' && Number(option.price_adjustment) > 0 && (
            <Badge className="bg-accent text-accent-foreground text-xs">
              +{formatPrice(Number(option.price_adjustment))}
            </Badge>
          )}
        </div>
      </div>

      {/* Actions - Always visible */}
      {!isReorderMode && (
        <div className="flex items-center gap-1">
          {type === 'personalizacion' && onAssignAllBurgers && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onAssignAllBurgers(option.id)}
              className="text-xs h-8 hidden sm:flex"
            >
              🍔 Todas
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onAssign(option)}
            className="h-8"
          >
            <Package className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Asignar</span>
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onEdit(option)}
            className="h-8 w-8 text-foreground"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleDelete}
            disabled={isDeleting}
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      )}

      {/* Order indicator in reorder mode */}
      {isReorderMode && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
          {option.display_order + 1}
        </div>
      )}
    </div>
  );
}

export function ModifierOptionSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl animate-pulse">
      <div className="w-10 h-5 bg-muted rounded-full" />
      <div className="w-12 h-12 bg-muted rounded-lg" />
      <div className="flex-1 space-y-2">
        <div className="w-32 h-4 bg-muted rounded" />
        <div className="w-20 h-3 bg-muted rounded" />
      </div>
    </div>
  );
}

export function ModifierEmptyState({ 
  type, 
  onAdd 
}: { 
  type: 'adicional' | 'personalizacion' | 'combo';
  onAdd: () => void;
}) {
  const getTitle = () => {
    switch (type) {
      case 'adicional': return 'Sin adicionales';
      case 'personalizacion': return 'Sin personalizaciones';
      case 'combo': return 'Sin opciones de combo';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'adicional': return 'Creá opciones como "Extra Bacon", "Doble Cheddar", etc.';
      case 'personalizacion': return 'Creá opciones como "Sin cebolla", "Sin tomate", etc.';
      case 'combo': return 'Creá opciones de bebida y acompañamientos para combos.';
    }
  };

  const getButtonText = () => {
    switch (type) {
      case 'adicional': return 'Crear adicional';
      case 'personalizacion': return 'Crear personalización';
      case 'combo': return 'Crear opción';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed border-border rounded-xl bg-muted/30">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Package className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-foreground mb-1">{getTitle()}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-xs">{getDescription()}</p>
      <Button onClick={onAdd} size="sm">{getButtonText()}</Button>
    </div>
  );
}
