import { useState, useEffect } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { useWebappItemExtras, useWebappItemRemovables } from '@/hooks/useWebappMenu';
import type { WebappMenuItem, CartItem, CartItemModifier } from '@/types/webapp';

interface Props {
  item: WebappMenuItem | null;
  onClose: () => void;
  onAdd: (item: Omit<CartItem, 'cartId'>) => void;
}

function formatPrice(n: number) {
  return `$${n.toLocaleString('es-AR')}`;
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isDesktop;
}

function ProductDetailContent({ item, onAdd, onClose }: { item: WebappMenuItem; onAdd: Props['onAdd']; onClose: () => void }) {
  const [cantidad, setCantidad] = useState(1);
  const [extras, setExtras] = useState<CartItemModifier[]>([]);
  const [removidos, setRemovidos] = useState<string[]>([]);
  const [notas, setNotas] = useState('');
  const { data: extrasList } = useWebappItemExtras(item.id);
  const { data: removables } = useWebappItemRemovables(item.id);

  const extrasTotal = extras.reduce((s, e) => s + e.precio, 0);
  const total = (item.precio_base + extrasTotal) * cantidad;

  const toggleExtra = (extra: CartItemModifier) => {
    setExtras(prev => {
      const exists = prev.find(e => e.id === extra.id);
      if (exists) return prev.filter(e => e.id !== extra.id);
      return [...prev, extra];
    });
  };

  const toggleRemovido = (nombre: string) => {
    setRemovidos(prev =>
      prev.includes(nombre) ? prev.filter(r => r !== nombre) : [...prev, nombre]
    );
  };

  const handleAdd = () => {
    onAdd({
      itemId: item.id,
      nombre: item.nombre,
      imagen_url: item.imagen_url,
      precioUnitario: item.precio_base,
      cantidad,
      extras,
      removidos,
      notas,
    });
    setCantidad(1);
    setExtras([]);
    setRemovidos([]);
    setNotas('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Product image */}
      {item.imagen_url ? (
        <div className="w-full h-48 lg:h-64 overflow-hidden shrink-0">
          <img src={item.imagen_url} alt={item.nombre} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-full h-32 bg-muted flex items-center justify-center shrink-0">
          <span className="text-6xl">🍔</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <div>
          <h2 className="text-xl font-black text-foreground">{item.nombre}</h2>
          {item.descripcion && (
            <p className="text-sm text-muted-foreground mt-1">{item.descripcion}</p>
          )}
          <p className="text-lg font-bold text-primary mt-2">{formatPrice(item.precio_base)}</p>
        </div>

        {/* Extras - flat list from item_extra_asignaciones */}
        {extrasList && extrasList.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-foreground mb-2">Extras</h3>
            <div className="space-y-1.5">
              {extrasList.map((extra: any) => {
                const isSelected = extras.some(e => e.id === extra.id);
                return (
                  <button
                    key={extra.id}
                    onClick={() => toggleExtra({ id: extra.id, nombre: extra.nombre, precio: extra.precio, tipo: 'extra' })}
                    className={`
                      w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors
                      ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                        ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}>
                        {isSelected && <span className="text-primary-foreground text-xs">✓</span>}
                      </div>
                      <span className="text-sm">{extra.nombre}</span>
                    </div>
                    {extra.precio > 0 && (
                      <span className="text-xs text-muted-foreground">+{formatPrice(extra.precio)}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Removables - from item_removibles */}
        {removables && removables.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-foreground mb-2">¿Querés sacar algo?</h3>
            <div className="space-y-2">
              {removables.map((comp: any) => {
                const nombre = comp.nombre;
                const isRemoved = removidos.includes(nombre);
                return (
                  <div
                    key={comp.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      isRemoved ? 'border-destructive/30 bg-destructive/5' : 'border-border'
                    }`}
                  >
                    <span className={`text-sm ${isRemoved ? 'line-through text-muted-foreground' : ''}`}>
                      {nombre}
                    </span>
                    <Switch
                      checked={!isRemoved}
                      onCheckedChange={() => toggleRemovido(nombre)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <h3 className="text-sm font-bold text-foreground mb-2">Notas</h3>
          <Textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="¿Algún pedido especial?"
            className="resize-none h-20 text-sm"
            maxLength={200}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t px-5 py-4 bg-background shrink-0">
        {extrasTotal > 0 && (
          <div className="text-xs text-muted-foreground mb-2 space-y-0.5">
            <div className="flex justify-between">
              <span>Base</span>
              <span>{formatPrice(item.precio_base)}</span>
            </div>
            {extras.map(e => (
              <div key={e.id} className="flex justify-between">
                <span>+ {e.nombre}</span>
                <span>{formatPrice(e.precio)}</span>
              </div>
            ))}
            {cantidad > 1 && (
              <div className="flex justify-between font-medium text-foreground pt-0.5 border-t border-dashed">
                <span>× {cantidad}</span>
                <span>{formatPrice(total)}</span>
              </div>
            )}
          </div>
        )}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCantidad(q => Math.max(1, q - 1))}
              className="w-9 h-9 rounded-full bg-muted flex items-center justify-center active:scale-95"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-bold text-lg">{cantidad}</span>
            <button
              onClick={() => setCantidad(q => q + 1)}
              className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-95"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        <Button
          size="lg"
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-base gap-2"
          onClick={handleAdd}
        >
          <ShoppingCart className="w-4 h-4" />
          Agregar al carrito · {formatPrice(total)}
        </Button>
      </div>
    </div>
  );
}

export function ProductCustomizeSheet({ item, onClose, onAdd }: Props) {
  const isDesktop = useIsDesktop();

  if (!item) return null;

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  if (isDesktop) {
    return (
      <Dialog open={!!item} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg p-0 overflow-hidden max-h-[90vh] flex flex-col">
          <ProductDetailContent item={item} onAdd={onAdd} onClose={onClose} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={!!item} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl px-0 flex flex-col">
        <ProductDetailContent item={item} onAdd={onAdd} onClose={onClose} />
      </SheetContent>
    </Sheet>
  );
}
