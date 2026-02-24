/**
 * ProductGrid - Grilla de productos con fotos, tabs de categoría, búsqueda y scroll spy
 */
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useItemsCarta } from '@/hooks/useItemsCarta';
import { useFrequentItems } from '@/hooks/pos/useFrequentItems';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Search, X, Star, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { useActivePromoItems, type PromocionItem } from '@/hooks/usePromociones';

export interface CartItemExtra {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
}

export interface CartItemRemovible {
  id: string;
  nombre: string;
}

export interface CartItemOpcional {
  grupoId: string;
  grupoNombre: string;
  itemId: string;
  nombre: string;
}

export interface CartItem {
  item_carta_id: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  notas?: string;
  extras?: CartItemExtra[];
  removibles?: CartItemRemovible[];
  opcionales?: CartItemOpcional[];
  precio_referencia?: number;
  categoria_carta_id?: string | null;
  createdAt?: number;
}

interface ProductGridProps {
  onAddItem: (item: CartItem) => void;
  onSelectItem?: (item: any) => void;
  cart?: CartItem[];
  branchId?: string;
  disabled?: boolean;
  promoChannel?: string;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export function ProductGrid({ onAddItem, onSelectItem, cart = [], branchId, disabled, promoChannel }: ProductGridProps) {
  const { data: items, isLoading } = useItemsCarta();
  const { data: frequentIds } = useFrequentItems(branchId);
  const { data: promoItems = [] } = useActivePromoItems(branchId, promoChannel);

  const promoMap = useMemo(() => {
    const m = new Map<string, PromocionItem>();
    promoItems.forEach(pi => m.set(pi.item_carta_id, pi));
    return m;
  }, [promoItems]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const isManualScroll = useRef(false);

  // Cart quantity map for badges
  const cartQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of cart) {
      map.set(item.item_carta_id, (map.get(item.item_carta_id) || 0) + item.cantidad);
    }
    return map;
  }, [cart]);

  const allItems = useMemo(
    () => (items ?? []).filter((item: any) => item.tipo !== 'extra'),
    [items]
  );

  // Search filter
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return allItems;
    const term = searchTerm.toLowerCase();
    return allItems.filter((item: any) => {
      const nombre = (item.nombre ?? '').toLowerCase();
      const nombreCorto = (item.nombre_corto ?? '').toLowerCase();
      return nombre.includes(term) || nombreCorto.includes(term);
    });
  }, [allItems, searchTerm]);

  const byCategory = useMemo(() => {
    const source = searchTerm.trim() ? filteredItems : allItems;
    return source.reduce<Record<string, { items: typeof items; orden: number }>>((acc, item) => {
      const cat = (item as any).menu_categorias?.nombre ?? 'Sin categoría';
      const orden = (item as any).menu_categorias?.orden ?? 999;
      if (!acc[cat]) acc[cat] = { items: [], orden };
      acc[cat].items.push(item);
      return acc;
    }, {});
  }, [allItems, filteredItems, searchTerm]);

  // Frequent items
  const frequentItems = useMemo(() => {
    if (!frequentIds || frequentIds.length === 0) return [];
    return frequentIds
      .map((id) => allItems.find((item: any) => item.id === id))
      .filter(Boolean);
  }, [frequentIds, allItems]);

  const FRECUENTES_KEY = '⭐ Frecuentes';
  const hasFrequents = frequentItems.length >= 3;

  const cats = useMemo(() => {
    const sorted = Object.keys(byCategory).sort((a, b) => byCategory[a].orden - byCategory[b].orden);
    return hasFrequents ? [FRECUENTES_KEY, ...sorted] : sorted;
  }, [byCategory, hasFrequents]);

  // Scroll spy with IntersectionObserver
  useEffect(() => {
    // Find the scroll viewport (Radix ScrollArea renders a [data-radix-scroll-area-viewport])
    const root = scrollViewportRef.current;
    if (!root) return;
    const viewport = root.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    if (!viewport) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isManualScroll.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const cat = entry.target.getAttribute('data-category');
            if (cat) setActiveCategory(cat);
          }
        }
      },
      { root: viewport, threshold: 0.3 }
    );

    Object.entries(sectionRefs.current).forEach(([, el]) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [cats]);

  const handleCategoryClick = useCallback((cat: string) => {
    setActiveCategory(cat);
    isManualScroll.current = true;
    const el = sectionRefs.current[cat];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => { isManualScroll.current = false; }, 600);
    } else {
      isManualScroll.current = false;
    }
  }, []);

  // Prefetch extras/removibles on hover
  const queryClient = useQueryClient();
  const prefetchedRef = useRef(new Set<string>());

  const handlePrefetch = useCallback((itemId: string) => {
    if (prefetchedRef.current.has(itemId) || disabled) return;
    prefetchedRef.current.add(itemId);

    queryClient.prefetchQuery({
      queryKey: ['item-carta-extras', itemId],
      queryFn: async () => {
        const { data: asignaciones } = await supabase
          .from('item_extra_asignaciones' as any)
          .select('extra_id')
          .eq('item_carta_id', itemId);
        if (asignaciones && asignaciones.length > 0) {
          const extraIds = (asignaciones as any[]).map((a: any) => a.extra_id);
          const { data: extras } = await supabase
            .from('items_carta')
            .select('id, nombre, precio_base, activo')
            .in('id', extraIds)
            .eq('activo', true)
            .is('deleted_at', null);
          return (extras || []).map((e: any, i: number) => ({
            id: e.id, item_carta_id: itemId, preparacion_id: null, insumo_id: null, orden: i,
            preparaciones: { id: e.id, nombre: e.nombre, costo_calculado: 0, precio_extra: e.precio_base, puede_ser_extra: true },
            insumos: null,
          }));
        }
        const { data } = await supabase
          .from('item_carta_extras')
          .select('*, preparaciones(id, nombre, costo_calculado, precio_extra, puede_ser_extra), insumos(id, nombre, costo_por_unidad_base, precio_extra, puede_ser_extra)')
          .eq('item_carta_id', itemId)
          .order('orden');
        return data ?? [];
      },
      staleTime: 5 * 60 * 1000,
    });

    queryClient.prefetchQuery({
      queryKey: ['item-removibles', itemId],
      queryFn: async () => {
        const { data } = await supabase
          .from('item_removibles' as any)
          .select('*, insumos(id, nombre), preparaciones(id, nombre)')
          .eq('item_carta_id', itemId)
          .eq('activo', true);
        return data ?? [];
      },
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient, disabled]);

  const [promoConfirmItem, setPromoConfirmItem] = useState<any>(null);

  const handleProductClick = (item: any) => {
    if (disabled) {
      toast('Iniciá la venta primero', { description: 'Configurá el canal y servicio antes de agregar productos' });
      return;
    }

    const promo = promoMap.get(item.id);
    if (promo && promo.precio_promo < Number(item.precio_base ?? 0)) {
      setPromoConfirmItem(item);
      return;
    }

    addItemToCart(item);
  };

  const addItemToCart = (item: any, usePromoPrice = false) => {
    const promoMatch = promoMap.get(item.id);
    const precio = usePromoPrice && promoMatch ? promoMatch.precio_promo : (item.precio_base ?? 0);
    const nombre = item.nombre_corto ?? item.nombre;
    const precioRef = item.precio_referencia ? Number(item.precio_referencia) : undefined;

    if (onSelectItem) {
      onSelectItem(usePromoPrice && promoMatch ? { ...item, precio_base: promoMatch.precio_promo } : item);
    } else {
      onAddItem({
        item_carta_id: item.id,
        nombre: usePromoPrice ? `${nombre} (PROMO)` : nombre,
        cantidad: 1,
        precio_unitario: precio,
        subtotal: precio,
        precio_referencia: precioRef && precioRef > precio ? precioRef : undefined,
        categoria_carta_id: item.categoria_carta_id ?? null,
      });
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredItems.length === 1) {
      handleProductClick(filteredItems[0]);
      setSearchTerm('');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 h-full">
        <Skeleton className="h-10 w-full rounded-md" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Search input */}
      <div className="relative shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar producto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="pl-9 pr-9"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category tabs */}
      {!searchTerm.trim() && (
        <div className="flex flex-wrap gap-1.5 shrink-0">
          {cats.map((cat) => {
            // Check if this category has items in cart
            const isFrecuentes = cat === FRECUENTES_KEY;
            const catItems = isFrecuentes ? frequentItems : (byCategory[cat]?.items ?? []);
            const hasCartItems = catItems.some((item: any) => cartQtyMap.has(item.id));
            return (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className={cn(
                  'relative px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border',
                  activeCategory === cat
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                )}
              >
                {cat}
                {hasCartItems && (
                  <span className={cn(
                    'absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full',
                    activeCategory === cat ? 'bg-primary-foreground' : 'bg-primary'
                  )} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Products grid */}
      <ScrollArea className="flex-1 min-h-0 pr-2" ref={scrollViewportRef}>
        <div className="space-y-6 pb-4">
          {searchTerm.trim() ? (
            // Flat search results
            <div>
              <h3 className="py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {filteredItems.length} resultado{filteredItems.length !== 1 ? 's' : ''}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredItems.map((item: any) => (
                  <ProductCard
                    key={item.id}
                    item={item}
                    qty={cartQtyMap.get(item.id) || 0}
                    onClick={handleProductClick}
                    onHover={handlePrefetch}
                    promoPrice={promoMap.get(item.id)?.precio_promo}
                  />
                ))}
              </div>
            </div>
          ) : (
            // Grouped by category (with Frecuentes)
            cats.map((cat) => {
              const isFrecuentes = cat === FRECUENTES_KEY;
              const catItems = isFrecuentes ? frequentItems : (byCategory[cat]?.items ?? []);
              return (
                <div
                  key={cat}
                  ref={(el) => { sectionRefs.current[cat] = el; }}
                  data-category={cat}
                >
                  <h3 className="sticky top-0 z-10 bg-slate-50 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    {isFrecuentes && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
                    {isFrecuentes ? 'Frecuentes' : cat}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {catItems.map((item: any) => (
                    <ProductCard
                    key={item.id}
                    item={item}
                    qty={cartQtyMap.get(item.id) || 0}
                    onClick={handleProductClick}
                    onHover={handlePrefetch}
                    promoPrice={promoMap.get(item.id)?.precio_promo}
                  />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Promo apply confirmation */}
      {promoConfirmItem && (() => {
        const pi = promoMap.get(promoConfirmItem.id)!;
        const nombre = promoConfirmItem.nombre_corto ?? promoConfirmItem.nombre;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPromoConfirmItem(null)}>
            <div className="bg-card rounded-xl shadow-xl p-5 max-w-xs w-full space-y-3" onClick={e => e.stopPropagation()}>
              <h4 className="font-semibold text-sm">Aplicar promoción?</h4>
              <p className="text-sm text-muted-foreground">
                <strong>{nombre}</strong>: ${Number(promoConfirmItem.precio_base).toLocaleString('es-AR')} → <span className="text-green-600 font-bold">${pi.precio_promo.toLocaleString('es-AR')}</span>
              </p>
              <div className="flex gap-2">
                <button
                  className="flex-1 py-2 text-sm rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors"
                  onClick={() => { addItemToCart(promoConfirmItem, true); setPromoConfirmItem(null); }}
                >
                  Sí, con promo
                </button>
                <button
                  className="flex-1 py-2 text-sm rounded-lg bg-muted text-foreground font-medium hover:bg-muted/80 transition-colors"
                  onClick={() => { addItemToCart(promoConfirmItem, false); setPromoConfirmItem(null); }}
                >
                  Precio normal
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* Extracted product card with badge + promo support */
function ProductCard({ item, qty, onClick, onHover, promoPrice }: { item: any; qty: number; onClick: (item: any) => void; onHover?: (id: string) => void; promoPrice?: number }) {
  const precio = item.precio_base ?? 0;
  const precioRef = item.precio_referencia ? Number(item.precio_referencia) : null;
  const hasDiscount = precioRef != null && precioRef > precio;
  const discountPct = hasDiscount ? Math.round(((precioRef! - precio) / precioRef!) * 100) : 0;
  const hasPromo = promoPrice != null && promoPrice < precio;
  const nombre = item.nombre_corto ?? item.nombre;
  const imagenUrl = item.imagen_url;
  const inCart = qty > 0;

  return (
    <button
      onClick={() => onClick(item)}
      onMouseEnter={() => onHover?.(item.id)}
      className={cn(
        'group relative flex flex-col rounded-lg border bg-card overflow-hidden text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30',
        inCart
          ? 'border-primary hover:border-primary'
          : hasPromo
            ? 'border-green-400/60 hover:border-green-500'
            : 'hover:border-primary/50'
      )}
    >
      {/* Quantity badge */}
      {inCart && (
        <span className="absolute top-1.5 right-1.5 z-20 flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-sm">
          {qty}
        </span>
      )}
      {/* Promo badge */}
      {hasPromo && !inCart && (
        <span className="absolute top-1.5 left-1.5 z-20 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-green-600 text-white text-[10px] font-bold shadow-sm">
          <Tag className="w-2.5 h-2.5" /> PROMO
        </span>
      )}
      {/* Discount badge */}
      {hasDiscount && !inCart && !hasPromo && (
        <span className="absolute top-1.5 right-1.5 z-20 px-1.5 py-0.5 rounded-md bg-destructive text-destructive-foreground text-[10px] font-bold shadow-sm">
          -{discountPct}%
        </span>
      )}
      {/* Image or initials */}
      <div className="relative w-full aspect-[4/3] bg-slate-100 flex items-center justify-center overflow-hidden">
        {imagenUrl ? (
          <img
            src={imagenUrl}
            alt={nombre}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
        ) : (
          <span className="text-2xl font-bold text-muted-foreground/40 select-none">
            {getInitials(nombre)}
          </span>
        )}
      </div>
      {/* Info */}
      <div className="p-2.5 flex flex-col gap-0.5">
        <span className="text-sm font-medium line-clamp-2 leading-tight">{nombre}</span>
        {hasPromo ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground line-through">
              $ {precio.toLocaleString('es-AR')}
            </span>
            <span className="text-xs text-green-600 font-bold">
              $ {promoPrice!.toLocaleString('es-AR')}
            </span>
          </div>
        ) : hasDiscount ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground line-through">
              $ {precioRef!.toLocaleString('es-AR')}
            </span>
            <span className="text-xs text-destructive font-bold">
              $ {precio.toLocaleString('es-AR')}
            </span>
          </div>
        ) : (
          <span className="text-base text-primary font-bold">
            $ {precio.toLocaleString('es-AR')}
          </span>
        )}
      </div>
    </button>
  );
}
