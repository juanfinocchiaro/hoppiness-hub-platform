import { Button } from '@/components/ui/button';
import { Truck, ShoppingBag } from 'lucide-react';
import type { OrderMode } from '@/contexts/CartContext';

interface DeliveryModeToggleProps {
  mode: OrderMode;
  onChange: (mode: OrderMode) => void;
  className?: string;
  size?: 'default' | 'sm' | 'lg';
}

export function DeliveryModeToggle({ 
  mode, 
  onChange, 
  className = '',
  size = 'default'
}: DeliveryModeToggleProps) {
  const sizeClasses = {
    sm: 'h-8 text-xs',
    default: 'h-10 text-sm',
    lg: 'h-12 text-base',
  };
  
  return (
    <div className={`flex bg-muted rounded-xl p-1 ${className}`}>
      <Button
        variant={mode === 'delivery' ? 'default' : 'ghost'}
        className={`flex-1 rounded-lg ${sizeClasses[size]}`}
        onClick={() => onChange('delivery')}
      >
        <Truck className="w-4 h-4 mr-2" />
        Delivery
      </Button>
      <Button
        variant={mode === 'takeaway' ? 'default' : 'ghost'}
        className={`flex-1 rounded-lg ${sizeClasses[size]}`}
        onClick={() => onChange('takeaway')}
      >
        <ShoppingBag className="w-4 h-4 mr-2" />
        Retiro
      </Button>
    </div>
  );
}
