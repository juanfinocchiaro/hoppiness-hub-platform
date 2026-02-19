import { useState, useCallback, useMemo } from 'react';
import type { CartItem, CartItemModifier, TipoServicioWebapp } from '@/types/webapp';

export function useWebappCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [tipoServicio, setTipoServicio] = useState<TipoServicioWebapp>('retiro');

  const addItem = useCallback((item: Omit<CartItem, 'cartId'>) => {
    setItems(prev => [...prev, { ...item, cartId: crypto.randomUUID() }]);
  }, []);

  const removeItem = useCallback((cartId: string) => {
    setItems(prev => prev.filter(i => i.cartId !== cartId));
  }, []);

  const updateQuantity = useCallback((cartId: string, cantidad: number) => {
    if (cantidad <= 0) {
      setItems(prev => prev.filter(i => i.cartId !== cartId));
      return;
    }
    setItems(prev => prev.map(i => i.cartId === cartId ? { ...i, cantidad } : i));
  }, []);

  /** Quick add: if item has no extras/removidos, merge quantities */
  const quickAdd = useCallback((itemId: string, nombre: string, precio: number, imagenUrl: string | null) => {
    setItems(prev => {
      const existing = prev.find(i => i.itemId === itemId && i.extras.length === 0 && i.removidos.length === 0 && !i.notas);
      if (existing) {
        return prev.map(i => i.cartId === existing.cartId ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...prev, {
        cartId: crypto.randomUUID(),
        itemId,
        nombre,
        imagen_url: imagenUrl,
        precioUnitario: precio,
        cantidad: 1,
        extras: [],
        removidos: [],
        notas: '',
      }];
    });
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = useMemo(() => items.reduce((s, i) => s + i.cantidad, 0), [items]);

  const totalPrecio = useMemo(() =>
    items.reduce((s, i) => {
      const extrasTotal = i.extras.reduce((e, x) => e + x.precio, 0);
      return s + (i.precioUnitario + extrasTotal) * i.cantidad;
    }, 0),
    [items]
  );

  /** Get quantity of an item in cart (all entries combined) */
  const getItemQty = useCallback((itemId: string) =>
    items.filter(i => i.itemId === itemId).reduce((s, i) => s + i.cantidad, 0),
    [items]
  );

  return {
    items, tipoServicio, setTipoServicio,
    addItem, removeItem, updateQuantity, quickAdd, clearCart,
    totalItems, totalPrecio, getItemQty,
  };
}
