import { useState, useEffect } from 'react';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CheckoutInlineView } from './CheckoutInlineView';
import { TrackingInlineView } from './TrackingInlineView';
import type { useWebappCart } from '@/hooks/useWebappCart';
import type { WebappMenuItem } from '@/types/webapp';

type SidePanelStep = 'cart' | 'checkout' | 'tracking';

interface Props {
  cart: ReturnType<typeof useWebappCart>;
  costoEnvio: number;
  branchId: string;
  branchName: string;
  mpEnabled: boolean;
  suggestedItems?: WebappMenuItem[];
  onAddSuggested?: (item: WebappMenuItem) => void;
}

function formatPrice(n: number) {
  return `$${n.toLocaleString('es-AR')}`;
}

export function CartSidePanel({ cart, costoEnvio, branchId, branchName, mpEnabled, suggestedItems, onAddSuggested }: Props) {
  const [step, setStep] = useState<SidePanelStep>('cart');
  const [trackingCode, setTrackingCode] = useState<string | null>(null);

  // If cart becomes empty while on cart step, stay. If on checkout, go back.
  useEffect(() => {
    if (cart.items.length === 0 && step === 'checkout') setStep('cart');
  }, [cart.items.length, step]);

  // Restore tracking if there's a recent one
  useEffect(() => {
    const saved = localStorage.getItem('hoppiness_last_tracking');
    if (saved && step === 'cart' && cart.items.length === 0) {
      setTrackingCode(saved);
      setStep('tracking');
    }
  }, []);

  const totalConEnvio = cart.totalPrecio + costoEnvio;

  const suggestions = (suggestedItems || [])
    .filter(item => !cart.items.some(ci => ci.itemId === item.id))
    .slice(0, 3);

  const handleNewOrder = () => {
    setStep('cart');
    setTrackingCode(null);
    localStorage.removeItem('hoppiness_last_tracking');
  };

  return (
    <div className="hidden lg:flex fixed top-[114px] right-0 w-[350px] bottom-0 border-l bg-background flex-col z-20">
      {step === 'cart' && (
        <>
          {/* Header */}
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-sm text-foreground">Tu pedido</h2>
            <span className="ml-auto text-xs text-muted-foreground">{cart.totalItems} items</span>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {cart.items.map(item => {
              const extrasTotal = item.extras.reduce((s, e) => s + e.precio, 0);
              const lineTotal = (item.precioUnitario + extrasTotal) * item.cantidad;

              return (
                <div key={item.cartId} className="flex items-start gap-3">
                  {item.imagen_url ? (
                    <img src={item.imagen_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0 text-lg">🍔</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs truncate text-foreground">{item.nombre}</p>
                    {item.extras.length > 0 && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        {item.extras.map(e => `+ ${e.nombre}`).join(', ')}
                      </p>
                    )}
                    {item.removidos.length > 0 && (
                      <p className="text-[11px] text-destructive truncate">
                        {item.removidos.map(r => `Sin ${r}`).join(', ')}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            if (item.cantidad <= 1) cart.removeItem(item.cartId);
                            else cart.updateQuantity(item.cartId, item.cantidad - 1);
                          }}
                          className="w-6 h-6 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                        >
                          {item.cantidad === 1 ? <Trash2 className="w-3 h-3 text-destructive" /> : <Minus className="w-3 h-3" />}
                        </button>
                        <span className="w-5 text-center text-xs font-bold">{item.cantidad}</span>
                        <button
                          onClick={() => cart.updateQuantity(item.cartId, item.cantidad + 1)}
                          className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="font-bold text-xs">{formatPrice(lineTotal)}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Upsell suggestions */}
            {suggestions.length > 0 && onAddSuggested && (
              <div className="pt-3 border-t">
                <p className="text-xs font-bold text-foreground mb-2">¿Querés agregar algo más?</p>
                <div className="space-y-2">
                  {suggestions.map(item => (
                    <button
                      key={item.id}
                      onClick={() => onAddSuggested(item)}
                      className="w-full flex items-center gap-2.5 p-2 rounded-lg border hover:border-accent/50 hover:bg-accent/5 transition-colors text-left"
                    >
                      {item.imagen_url ? (
                        <img src={item.imagen_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 text-sm">🍔</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{item.nombre}</p>
                        <p className="text-xs text-accent font-bold">{formatPrice(item.precio_base)}</p>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center shrink-0">
                        <Plus className="w-3 h-3" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {cart.items.length > 0 && (
            <div className="border-t px-4 py-4 space-y-2 bg-background">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">{formatPrice(cart.totalPrecio)}</span>
              </div>
              {costoEnvio > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Envío</span>
                  <span className="font-semibold">{formatPrice(costoEnvio)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold pt-1 border-t">
                <span>Total</span>
                <span>{formatPrice(totalConEnvio)}</span>
              </div>
              <Button
                size="lg"
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-sm mt-2"
                onClick={() => setStep('checkout')}
              >
                Continuar al pago
              </Button>
            </div>
          )}
        </>
      )}

      {step === 'checkout' && (
        <CheckoutInlineView
          cart={cart}
          branchId={branchId}
          branchName={branchName}
          mpEnabled={mpEnabled}
          costoEnvio={costoEnvio}
          onBack={() => setStep('cart')}
          onConfirmed={(code) => {
            setTrackingCode(code);
            setStep('tracking');
          }}
        />
      )}

      {step === 'tracking' && trackingCode && (
        <TrackingInlineView
          trackingCode={trackingCode}
          onNewOrder={handleNewOrder}
        />
      )}
    </div>
  );
}
