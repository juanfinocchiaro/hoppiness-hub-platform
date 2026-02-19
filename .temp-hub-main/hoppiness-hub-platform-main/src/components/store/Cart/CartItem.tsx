import { Button } from '@/components/ui/button';
import { Minus, Plus, Trash2 } from 'lucide-react';
import type { CartItem as CartItemType } from '@/contexts/CartContext';

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
  formatPrice: (price: number) => string;
}

export function CartItem({ 
  item, 
  onUpdateQuantity, 
  onRemove, 
  formatPrice 
}: CartItemProps) {
  const itemTotal = (item.product.finalPrice + (item.modifiersTotal || 0)) * item.quantity;
  
  return (
    <div className="flex items-center gap-3 bg-muted/50 rounded-xl p-3">
      {/* Image */}
      <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
        {item.product.image_url ? (
          <img 
            src={item.product.image_url} 
            alt={item.product.name} 
            className="w-full h-full object-cover" 
          />
        ) : (
          <span className="text-xl">🍔</span>
        )}
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm line-clamp-1">{item.product.name}</p>
        
        {/* Modifiers */}
        {item.modifierNames && item.modifierNames.length > 0 && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            +{item.modifierNames.join(', ')}
          </p>
        )}
        
        {/* Notes */}
        {item.notes && (
          <p className="text-xs text-muted-foreground italic line-clamp-1">
            "{item.notes}"
          </p>
        )}
        
        {/* Modifier price */}
        {item.modifiersTotal && item.modifiersTotal > 0 && (
          <p className="text-xs text-primary">
            +{formatPrice(item.modifiersTotal)}
          </p>
        )}
        
        {/* Total */}
        <p className="text-sm text-primary font-bold mt-1">
          {formatPrice(itemTotal)}
        </p>
      </div>
      
      {/* Quantity Controls */}
      <div className="flex items-center gap-1">
        <Button 
          variant="outline" 
          size="icon" 
          className="h-7 w-7" 
          onClick={() => onUpdateQuantity(item.quantity - 1)}
        >
          <Minus className="w-3 h-3" />
        </Button>
        <span className="w-5 text-center text-sm font-medium">{item.quantity}</span>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-7 w-7" 
          onClick={() => onUpdateQuantity(item.quantity + 1)}
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>
      
      {/* Remove */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-7 w-7 text-destructive hover:text-destructive" 
        onClick={onRemove}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
