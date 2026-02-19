import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';

interface FloatingCartButtonProps {
  itemCount: number;
  total: number;
  onClick: () => void;
  formatPrice: (price: number) => string;
}

export function FloatingCartButton({
  itemCount,
  total,
  onClick,
  formatPrice,
}: FloatingCartButtonProps) {
  if (itemCount === 0) return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-background via-background to-transparent pt-8">
      <Button 
        size="lg" 
        className="w-full h-14 text-lg bg-primary hover:bg-primary/90 shadow-xl rounded-xl"
        onClick={onClick}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            <span>Ver Pedido ({itemCount})</span>
          </div>
          <span className="font-bold">{formatPrice(total)}</span>
        </div>
      </Button>
    </div>
  );
}
