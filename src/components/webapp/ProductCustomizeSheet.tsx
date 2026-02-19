import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { useWebappItemExtras } from '@/hooks/useWebappMenu';
import type { WebappMenuItem, CartItem, CartItemModifier } from '@/types/webapp';

interface Props {
  item: WebappMenuItem | null;
  onClose: () => void;
  onAdd: (item: Omit<CartItem, 'cartId'>) => void;
}

function formatPrice(n: number) {
  return `$${n.toLocaleString('es-AR')}`;
}

export function ProductCustomizeSheet({ item, onClose, onAdd }: Props) {
  const [cantidad, setCantidad] = useState(1);
  const [extras, setExtras] = useState<CartItemModifier[]>([]);
  const [notas, setNotas] = useState('');
  const { data: gruposOpcionales } = useWebappItemExtras(item?.id);

  if (!item) return null;

  const extrasTotal = extras.reduce((s, e) => s + e.precio, 0);
  const total = (item.precio_base + extrasTotal) * cantidad;

  const toggleExtra = (extra: CartItemModifier) => {
    setExtras(prev => {
      const exists = prev.find(e => e.id === extra.id);
      if (exists) return prev.filter(e => e.id !== extra.id);
      return [...prev, extra];
    });
  };

  const handleAdd = () => {
    onAdd({
      itemId: item.id,
      nombre: item.nombre,
      imagen_url: item.imagen_url,
      precioUnitario: item.precio_base,
      cantidad,
      extras,
      removidos: [],
      notas,
    });
    // Reset for next use
    setCantidad(1);
    setExtras([]);
    setNotas('');
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      setCantidad(1);
      setExtras([]);
      setNotas('');
    }
  };

  return (
    <Sheet open={!!item} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl px-0 flex flex-col">
        {/* Product image */}
        {item.imagen_url ? (
          <div className="w-full h-48 overflow-hidden shrink-0">
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

          {/* Extras from optional groups */}
          {gruposOpcionales && gruposOpcionales.length > 0 && (
            <div className="space-y-4">
              {gruposOpcionales.map((grupo: any) => (
                <div key={grupo.id}>
                  <h3 className="text-sm font-bold text-foreground mb-2">{grupo.nombre}</h3>
                  <div className="space-y-1.5">
                    {(grupo.items || []).map((opcion: any) => {
                      const nombre = opcion.insumos?.nombre || opcion.preparaciones?.nombre || 'Extra';
                      const precio = opcion.costo_unitario || opcion.insumos?.costo_por_unidad_base || 0;
                      const extraId = opcion.id;
                      const isSelected = extras.some(e => e.id === extraId);

                      return (
                        <button
                          key={extraId}
                          onClick={() => toggleExtra({ id: extraId, nombre, precio, tipo: 'extra' })}
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
                            <span className="text-sm">{nombre}</span>
                          </div>
                          {precio > 0 && (
                            <span className="text-xs text-muted-foreground">+{formatPrice(precio)}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
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
      </SheetContent>
    </Sheet>
  );
}
