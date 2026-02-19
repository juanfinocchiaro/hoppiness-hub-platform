import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import type { useWebappCart } from '@/hooks/useWebappCart';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: ReturnType<typeof useWebappCart>;
  branchName: string;
}

function formatPrice(n: number) {
  return `$${n.toLocaleString('es-AR')}`;
}

export function CartSheet({ open, onOpenChange, cart, branchName }: Props) {
  const servicioLabel = cart.tipoServicio === 'retiro' ? 'Retiro en local' : cart.tipoServicio === 'delivery' ? 'Delivery' : 'Comer acá';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl px-0">
        <SheetHeader className="px-5 pb-3 border-b">
          <SheetTitle className="flex items-center gap-2 text-left">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Tu pedido
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            {servicioLabel} · {branchName}
          </p>
        </SheetHeader>

        {cart.items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-20 text-center">
            <div>
              <span className="text-5xl mb-4 block">🛒</span>
              <p className="text-muted-foreground">Tu carrito está vacío</p>
              <p className="text-xs text-muted-foreground mt-1">Agregá productos del menú</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {cart.items.map(item => {
                const extrasTotal = item.extras.reduce((s, e) => s + e.precio, 0);
                const lineTotal = (item.precioUnitario + extrasTotal) * item.cantidad;

                return (
                  <div key={item.cartId} className="flex items-start gap-3 bg-card rounded-xl p-3 border">
                    {item.imagen_url ? (
                      <img src={item.imagen_url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0 text-xl">🍔</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{item.nombre}</p>
                      {item.extras.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {item.extras.map(e => `+ ${e.nombre}`).join(', ')}
                        </p>
                      )}
                      {item.removidos.length > 0 && (
                        <p className="text-xs text-red-500">
                          {item.removidos.map(r => `Sin ${r}`).join(', ')}
                        </p>
                      )}
                      {item.notas && (
                        <p className="text-xs text-muted-foreground italic">"{item.notas}"</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => cart.updateQuantity(item.cartId, item.cantidad - 1)}
                            className="w-7 h-7 rounded-full bg-muted flex items-center justify-center active:scale-95"
                          >
                            {item.cantidad === 1 ? <Trash2 className="w-3 h-3 text-destructive" /> : <Minus className="w-3 h-3" />}
                          </button>
                          <span className="w-5 text-center text-sm font-bold">{item.cantidad}</span>
                          <button
                            onClick={() => cart.updateQuantity(item.cartId, item.cantidad + 1)}
                            className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-95"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="font-bold text-sm">{formatPrice(lineTotal)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="border-t px-5 py-4 space-y-3 bg-background">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-xl font-black text-foreground">{formatPrice(cart.totalPrecio)}</span>
              </div>
              <Button size="lg" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-base" disabled>
                Ir al checkout (próximamente)
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
