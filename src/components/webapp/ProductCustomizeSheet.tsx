import { useState, useEffect } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Minus, Plus, ShoppingCart, AlertCircle } from 'lucide-react';
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
  const { data: gruposOpcionales } = useWebappItemExtras(item.id);
  const { data: removables } = useWebappItemRemovables(item.id);

  const extrasTotal = extras.reduce((s, e) => s + e.precio, 0);
  const total = (item.precio_base + extrasTotal) * cantidad;

  const toggleExtra = (extra: CartItemModifier, grupoId: string, maxSel: number | null) => {
    setExtras(prev => {
      const exists = prev.find(e => e.id === extra.id);
      if (exists) return prev.filter(e => e.id !== extra.id);
      // If max_selecciones is set, enforce it within this group
      if (maxSel && maxSel > 0) {
        const grupoExtras = prev.filter(e => {
          // Find which group this extra belongs to
          const grupo = gruposOpcionales?.find((g: any) =>
            g.items?.some((i: any) => i.id === e.id)
          );
          return grupo?.id === grupoId;
        });
        if (grupoExtras.length >= maxSel) {
          // Remove oldest in group, add new
          return [...prev.filter(e => e.id !== grupoExtras[0].id), extra];
        }
      }
      return [...prev, extra];
    });
  };

  const toggleRemovido = (nombre: string) => {
    setRemovidos(prev =>
      prev.includes(nombre) ? prev.filter(r => r !== nombre) : [...prev, nombre]
    );
  };

  // Calculate missing required selections
  const missingRequired = (gruposOpcionales || [])
    .filter((g: any) => g.es_obligatorio)
    .filter((g: any) => {
      const maxSel = g.max_selecciones || 1;
      const selected = extras.filter(e =>
        g.items?.some((i: any) => i.id === e.id)
      ).length;
      return selected < maxSel;
    });

  const canAdd = missingRequired.length === 0;

  const handleAdd = () => {
    if (!canAdd) return;
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

        {/* Extras groups */}
        {gruposOpcionales && gruposOpcionales.length > 0 && (
          <div className="space-y-4">
            {gruposOpcionales.map((grupo: any) => {
              const maxSel = grupo.max_selecciones || null;
              const isRequired = grupo.es_obligatorio;
              const selectedCount = extras.filter(e =>
                grupo.items?.some((i: any) => i.id === e.id)
              ).length;
              const isFulfilled = !isRequired || selectedCount >= (maxSel || 1);

              return (
                <div key={grupo.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-bold text-foreground">{grupo.nombre}</h3>
                    {isRequired ? (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isFulfilled
                          ? 'bg-green-100 text-green-700'
                          : 'bg-destructive/10 text-destructive'
                      }`}>
                        Obligatorio
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Opcional
                      </span>
                    )}
                    {maxSel && (
                      <span className="text-[10px] text-muted-foreground">
                        {selectedCount}/{maxSel}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {(grupo.items || []).map((opcion: any) => {
                      const nombre = opcion.insumos?.nombre || opcion.preparaciones?.nombre || 'Extra';
                      const precio = opcion.costo_unitario || opcion.insumos?.costo_por_unidad_base || 0;
                      const extraId = opcion.id;
                      const isSelected = extras.some(e => e.id === extraId);

                      return (
                        <button
                          key={extraId}
                          onClick={() => toggleExtra({ id: extraId, nombre, precio, tipo: 'extra' }, grupo.id, maxSel)}
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
              );
            })}
          </div>
        )}

        {/* Removables */}
        {removables && removables.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-foreground mb-2">¿Querés sacar algo?</h3>
            <div className="space-y-2">
              {removables.map((comp: any) => {
                const nombre = comp.insumos?.nombre || comp.preparaciones?.nombre || 'Ingrediente';
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
        {/* Price breakdown when extras selected */}
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
          disabled={!canAdd}
        >
          <ShoppingCart className="w-4 h-4" />
          {canAdd
            ? `Agregar al carrito · ${formatPrice(total)}`
            : `Completá ${missingRequired.length} selección${missingRequired.length > 1 ? 'es' : ''}`
          }
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

  // Desktop: Dialog modal
  if (isDesktop) {
    return (
      <Dialog open={!!item} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg p-0 overflow-hidden max-h-[90vh] flex flex-col">
          <ProductDetailContent item={item} onAdd={onAdd} onClose={onClose} />
        </DialogContent>
      </Dialog>
    );
  }

  // Mobile: Sheet from bottom
  return (
    <Sheet open={!!item} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl px-0 flex flex-col">
        <ProductDetailContent item={item} onAdd={onAdd} onClose={onClose} />
      </SheetContent>
    </Sheet>
  );
}
