interface CartSummaryProps {
  subtotal: number;
  deliveryFee: number;
  total: number;
  itemCount: number;
  formatPrice: (price: number) => string;
  showDelivery?: boolean;
}

export function CartSummary({
  subtotal,
  deliveryFee,
  total,
  itemCount,
  formatPrice,
  showDelivery = true,
}: CartSummaryProps) {
  return (
    <div className="space-y-2">
      {/* Subtotal */}
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Subtotal ({itemCount} items)</span>
        <span>{formatPrice(subtotal)}</span>
      </div>
      
      {/* Delivery Fee */}
      {showDelivery && deliveryFee > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Costo de envío</span>
          <span>{formatPrice(deliveryFee)}</span>
        </div>
      )}
      
      {/* Free delivery */}
      {showDelivery && deliveryFee === 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Costo de envío</span>
          <span className="text-emerald-600 font-medium">Gratis</span>
        </div>
      )}
      
      {/* Total */}
      <div className="flex justify-between text-lg font-bold pt-2 border-t">
        <span>Total</span>
        <span className="text-primary">{formatPrice(total)}</span>
      </div>
    </div>
  );
}
