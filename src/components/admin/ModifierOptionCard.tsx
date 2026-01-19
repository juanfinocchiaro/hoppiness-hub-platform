import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Edit2, Trash2, Package, Link2, GripVertical, Loader2
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;

export interface ModifierOption {
  id: string;
  group_id: string;
  name: string;
  price_adjustment: number;
  is_active: boolean;
  display_order: number;
  linked_product_id?: string | null;
  linkedProduct?: Product | null;
  assignedProductIds: string[];
}

interface ModifierOptionCardProps {
  option: ModifierOption;
  type: 'adicional' | 'personalizacion';
  isReorderMode?: boolean;
  onToggle: (optionId: string, isActive: boolean) => Promise<void>;
  onEdit: (option: ModifierOption) => void;
  onDelete: (optionId: string) => void;
  onAssign: (option: ModifierOption) => void;
  onAssignAllBurgers?: (optionId: string) => void;
}

export function ModifierOptionCard({
  option,
  type,
  isReorderMode = false,
  onToggle,
  onEdit,
  onDelete,
  onAssign,
  onAssignAllBurgers,
}: ModifierOptionCardProps) {
  const [isToggling, setIsToggling] = useState(false);
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

  const handleToggle = async (checked: boolean) => {
    setIsToggling(true);
    try {
      await onToggle(option.id, checked);
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    onDelete(option.id);
  };

  const displayName = option.linkedProduct?.name || option.name;
  const imageUrl = option.linkedProduct?.image_url;
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

      {/* Toggle Switch - Hidden in reorder mode */}
      {!isReorderMode && (
        <div className="flex-shrink-0">
          {isToggling ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Switch
              checked={option.is_active}
              onCheckedChange={handleToggle}
              className="data-[state=checked]:bg-success"
            />
          )}
        </div>
      )}

      {/* Image */}
      {type === 'adicional' && (
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
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground truncate">
            {displayName}
          </span>
          {option.linkedProduct && (
            <Badge variant="secondary" className="text-xs gap-1 flex-shrink-0">
              <Link2 className="h-3 w-3" />
              Vinculado
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-sm text-muted-foreground">
            {assignedCount === 0 
              ? 'Sin asignar' 
              : `${assignedCount} producto${assignedCount !== 1 ? 's' : ''}`
            }
          </span>
          {type === 'adicional' && Number(option.price_adjustment) > 0 && (
            <Badge className="bg-accent text-accent-foreground text-xs">
              +{formatPrice(Number(option.price_adjustment))}
            </Badge>
          )}
        </div>
      </div>

      {/* Actions - Hidden in reorder mode */}
      {!isReorderMode && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {type === 'personalizacion' && onAssignAllBurgers && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onAssignAllBurgers(option.id)}
              className="text-xs h-8"
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
            <Package className="h-3.5 w-3.5 mr-1.5" />
            Asignar
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onEdit(option)}
            className="h-8 w-8"
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
  type: 'adicional' | 'personalizacion';
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed border-border rounded-xl bg-muted/30">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Package className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-foreground mb-1">
        {type === 'adicional' ? 'Sin adicionales' : 'Sin personalizaciones'}
      </h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-xs">
        {type === 'adicional' 
          ? 'Creá opciones como "Extra Bacon", "Doble Cheddar", etc.'
          : 'Creá opciones como "Sin cebolla", "Sin tomate", etc.'
        }
      </p>
      <Button onClick={onAdd} size="sm">
        Crear {type === 'adicional' ? 'adicional' : 'personalización'}
      </Button>
    </div>
  );
}
