/**
 * ModifiersModal - Extras y removibles al agregar un producto
 * If item has no extras/removibles, auto-adds to cart without showing modal.
 */
import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { POSDialogContent } from './POSDialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Minus, Plus } from 'lucide-react';
import { useItemExtras } from '@/hooks/useItemExtras';
import { useItemRemovibles } from '@/hooks/useItemRemovibles';
import { Skeleton } from '@/components/ui/skeleton';
import type { CartItem, CartItemExtra, CartItemRemovible } from './ProductGrid';

interface ModifiersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any | null;
  onConfirm: (cartItem: CartItem) => void;
}

const MAX_EXTRA_QTY = 10;

export function ModifiersModal({ open, onOpenChange, item, onConfirm }: ModifiersModalProps) {
  const itemId = item?.id;
  const { data: extras, isLoading: loadingExtras } = useItemExtras(itemId);
  const { data: removibles, isLoading: loadingRemovibles } = useItemRemovibles(itemId);

  const [selectedExtras, setSelectedExtras] = useState<Record<string, number>>({});
  const [selectedRemovibles, setSelectedRemovibles] = useState<Record<string, boolean>>({});
  const autoAddedRef = useRef<string | null>(null);

  // Reset state when item changes
  const [lastItemId, setLastItemId] = useState<string | null>(null);
  if (itemId && itemId !== lastItemId) {
    setLastItemId(itemId);
    setSelectedExtras({});
    setSelectedRemovibles({});
    autoAddedRef.current = null;
  }

  const extrasList = useMemo(() => {
    if (!extras) return [];
    return extras.map((e) => {
      const source = e.preparaciones || e.insumos;
      if (!source) return null;
      return {
        id: e.id,
        nombre: source.nombre,
        precio: source.precio_extra ?? 0,
      };
    }).filter(Boolean) as { id: string; nombre: string; precio: number }[];
  }, [extras]);

  const removiblesList = useMemo(() => {
    if (!removibles) return [];
    return removibles.map((r: any) => {
      const nombre = r.nombre_display || r.insumos?.nombre || r.preparaciones?.nombre || 'Ingrediente';
      return { id: r.id, nombre };
    });
  }, [removibles]);

  const precioBase = item?.precio_base ?? 0;
  const precioRef = item?.precio_referencia ? Number(item.precio_referencia) : undefined;
  const hasDiscount = precioRef != null && precioRef > precioBase;
  const nombre = item?.nombre_corto ?? item?.nombre ?? '';

  // Auto-add if no extras/removibles
  const isLoading = loadingExtras || loadingRemovibles;
  const hasContent = extrasList.length > 0 || removiblesList.length > 0;

  useEffect(() => {
    if (open && !isLoading && !hasContent && item && autoAddedRef.current !== itemId) {
      autoAddedRef.current = itemId;
      onConfirm({
        item_carta_id: item.id,
        nombre,
        cantidad: 1,
        precio_unitario: precioBase,
        subtotal: precioBase,
        precio_referencia: hasDiscount ? precioRef : undefined,
      });
      onOpenChange(false);
    }
  }, [open, isLoading, hasContent, item, itemId, nombre, precioBase, hasDiscount, precioRef, onConfirm, onOpenChange]);

  const extrasTotal = useMemo(() => {
    return extrasList.reduce((sum, ex) => {
      const qty = selectedExtras[ex.id] || 0;
      return sum + ex.precio * qty;
    }, 0);
  }, [extrasList, selectedExtras]);

  const totalPrice = precioBase + extrasTotal;

  const handleExtraQty = (id: string, delta: number) => {
    setSelectedExtras((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, Math.min(MAX_EXTRA_QTY, current + delta));
      if (next === 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: next };
    });
  };

  const handleRemovibleToggle = (id: string) => {
    setSelectedRemovibles((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleConfirm = () => {
    const cartExtras: CartItemExtra[] = extrasList
      .filter((ex) => (selectedExtras[ex.id] || 0) > 0)
      .map((ex) => ({
        id: ex.id,
        nombre: ex.nombre,
        precio: ex.precio,
        cantidad: selectedExtras[ex.id],
      }));

    const cartRemovibles: CartItemRemovible[] = removiblesList
      .filter((r: any) => selectedRemovibles[r.id])
      .map((r: any) => ({ id: r.id, nombre: r.nombre }));

    const notasParts: string[] = [];
    if (cartExtras.length > 0) {
      notasParts.push(cartExtras.map((e) => `+${e.cantidad} ${e.nombre}`).join(', '));
    }
    if (cartRemovibles.length > 0) {
      notasParts.push(cartRemovibles.map((r) => r.nombre).join(', '));
    }

    onConfirm({
      item_carta_id: item.id,
      nombre,
      cantidad: 1,
      precio_unitario: totalPrice,
      subtotal: totalPrice,
      notas: notasParts.length > 0 ? notasParts.join(' | ') : undefined,
      extras: cartExtras.length > 0 ? cartExtras : undefined,
      removibles: cartRemovibles.length > 0 ? cartRemovibles : undefined,
      precio_referencia: hasDiscount ? precioRef : undefined,
    });

    onOpenChange(false);
  };

  // Always render the dialog - skeleton shown during loading, auto-add handles simple items
  if (!open || !item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <POSDialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="truncate">{nombre}</span>
            <span className="text-primary font-semibold text-base ml-2 shrink-0">
              $ {precioBase.toLocaleString('es-AR')}
            </span>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-md" />
            ))}
          </div>
        ) : (
          <div className="space-y-5 py-2 max-h-[60vh] overflow-y-auto">
            {extrasList.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Extras
                </h4>
                <div className="space-y-2">
                  {extrasList.map((ex) => {
                    const qty = selectedExtras[ex.id] || 0;
                    return (
                      <div
                        key={ex.id}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{ex.nombre}</p>
                          {ex.precio > 0 && (
                            <p className="text-xs text-primary font-semibold">
                              +$ {ex.precio.toLocaleString('es-AR')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleExtraQty(ex.id, -1)} disabled={qty <= 0}>
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <span className="text-sm font-medium w-6 text-center">{qty}</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleExtraQty(ex.id, 1)} disabled={qty >= MAX_EXTRA_QTY}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {removiblesList.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Sin ingrediente
                </h4>
                <div className="space-y-2">
                  {removiblesList.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/50">
                      <span className="text-sm font-medium">{r.nombre}</span>
                      <Switch checked={!!selectedRemovibles[r.id]} onCheckedChange={() => handleRemovibleToggle(r.id)} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            Agregar al pedido — $ {totalPrice.toLocaleString('es-AR')}
          </Button>
        </DialogFooter>
      </POSDialogContent>
    </Dialog>
  );
}
