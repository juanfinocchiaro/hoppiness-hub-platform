import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { CartItem, CartItemModifier, TipoServicioWebapp } from '@/types/webapp';

const CART_STORAGE_KEY = 'hoppiness_cart';
const CART_EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 hours

interface PersistedCart {
  items: CartItem[];
  tipoServicio: TipoServicioWebapp;
  timestamp: number;
}

function loadCart(): { items: CartItem[]; tipoServicio: TipoServicioWebapp } {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return { items: [], tipoServicio: 'retiro' };
    const parsed: PersistedCart = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CART_EXPIRY_MS) {
      localStorage.removeItem(CART_STORAGE_KEY);
      return { items: [], tipoServicio: 'retiro' };
    }
    return { items: parsed.items || [], tipoServicio: parsed.tipoServicio || 'retiro' };
  } catch {
    return { items: [], tipoServicio: 'retiro' };
  }
}

export function useWebappCart() {
  const initial = useRef(loadCart());
  const [items, setItems] = useState<CartItem[]>(initial.current.items);
  const [tipoServicio, setTipoServicio] = useState<TipoServicioWebapp>(initial.current.tipoServicio);

  /** Load reorder items from localStorage (set by MisPedidosPage) */
  const loadReorderItems = useCallback((menuItems: Array<{ id: string; nombre: string; precio_base: number; imagen_url: string | null }>) => {
    try {
      const raw = localStorage.getItem('hoppiness_reorder');
      if (!raw) return false;
      localStorage.removeItem('hoppiness_reorder');
      const reorderItems: CartItem[] = JSON.parse(raw);
      if (!Array.isArray(reorderItems) || reorderItems.length === 0) return false;
      
      // Match reorder items to current menu by name
      const matchedItems: CartItem[] = [];
      for (const ri of reorderItems) {
        const menuItem = menuItems.find(m => m.nombre === ri.nombre);
        if (menuItem) {
          matchedItems.push({
            cartId: crypto.randomUUID(),
            itemId: menuItem.id,
            nombre: menuItem.nombre,
            imagen_url: menuItem.imagen_url,
            precioUnitario: menuItem.precio_base,
            cantidad: ri.cantidad,
            extras: [],
            removidos: [],
            notas: '',
          });
        }
      }
      if (matchedItems.length > 0) {
        setItems(matchedItems);
        return true;
      }
      return false;
    } catch {
      localStorage.removeItem('hoppiness_reorder');
      return false;
    }
  }, []);

  // Persist to localStorage on changes (debounced)
  useEffect(() => {
    const timeout = setTimeout(() => {
      const data: PersistedCart = { items, tipoServicio, timestamp: Date.now() };
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(data));
    }, 300);
    return () => clearTimeout(timeout);
  }, [items, tipoServicio]);

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

  const clearCart = useCallback(() => {
    setItems([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  }, []);

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
    totalItems, totalPrecio, getItemQty, loadReorderItems,
  };
}
