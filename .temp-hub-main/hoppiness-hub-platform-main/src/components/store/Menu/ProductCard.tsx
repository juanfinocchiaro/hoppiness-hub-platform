import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Star } from 'lucide-react';
import type { MenuProduct } from '@/hooks/store/useBranchMenu';

const LOW_STOCK_THRESHOLD = 5;

interface ProductCardProps {
  product: MenuProduct;
  cartQuantity?: number;
  onAdd: () => void;
  formatPrice: (price: number) => string;
}

export function ProductCard({ 
  product, 
  cartQuantity = 0, 
  onAdd, 
  formatPrice 
}: ProductCardProps) {
  const isUnavailable = !product.isAvailable;
  const isLowStock = product.stockQuantity !== null && 
                     product.stockQuantity > 0 && 
                     product.stockQuantity <= LOW_STOCK_THRESHOLD;
  
  const handleClick = () => {
    if (!isUnavailable) onAdd();
  };
  
  return (
    <Card 
      className={`overflow-hidden transition-all group ${
        isUnavailable 
          ? 'opacity-60 cursor-not-allowed' 
          : 'cursor-pointer hover:shadow-md active:scale-[0.99]'
      } ${cartQuantity > 0 ? 'ring-2 ring-primary' : ''}`}
      onClick={handleClick}
    >
      <CardContent className="p-0">
        <div className="flex">
          {/* Text Content */}
          <div className="flex-1 p-3 flex flex-col">
            {/* Title & Badges */}
            <div className="flex items-start justify-between gap-1 mb-0.5">
              <h3 className={`font-bold text-sm line-clamp-2 ${
                isUnavailable ? 'line-through text-muted-foreground' : ''
              }`}>
                {product.name}
              </h3>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {isUnavailable && (
                  <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                    Agotado
                  </Badge>
                )}
                {!isUnavailable && isLowStock && (
                  <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-amber-100 text-amber-700">
                    Últimos {product.stockQuantity}
                  </Badge>
                )}
                {product.is_featured && !isUnavailable && (
                  <Badge variant="secondary" className="text-[10px] py-0 px-1">
                    <Star className="w-2.5 h-2.5 mr-0.5 fill-current" />
                    Top
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Description */}
            {product.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
                {product.description}
              </p>
            )}
            
            {/* Price & Add Button */}
            <div className="flex items-center justify-between mt-auto pt-2">
              <span className={`text-base font-bold ${
                isUnavailable ? 'text-muted-foreground' : 'text-primary'
              }`}>
                {formatPrice(product.finalPrice)}
              </span>
              {!isUnavailable && (
                <Button 
                  variant={cartQuantity > 0 ? 'default' : 'outline'}
                  size="sm" 
                  className="rounded-full h-7 w-7 p-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  onClick={(e) => { e.stopPropagation(); handleClick(); }}
                >
                  {cartQuantity > 0 ? cartQuantity : <Plus className="w-3.5 h-3.5" />}
                </Button>
              )}
            </div>
          </div>
          
          {/* Image */}
          <div className={`w-24 h-24 md:w-28 md:h-28 shrink-0 bg-muted overflow-hidden rounded-xl m-2 ${
            isUnavailable ? 'grayscale' : ''
          }`}>
            {product.image_url ? (
              <img 
                src={product.image_url} 
                alt={product.name} 
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-br from-primary/10 to-primary/20">
                🍔
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
