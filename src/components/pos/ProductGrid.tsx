/**
 * ProductGrid - Grilla de productos con fotos, tabs de categoría, búsqueda y scroll spy
 */
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useItemsCarta } from '@/hooks/useItemsCarta';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Search, X } from 'lucide-react';

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

export interface CartItem {
  item_carta_id: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  notas?: string;
  extras?: CartItemExtra[];
  removibles?: CartItemRemovible[];
}

interface ProductGridProps {
  onAddItem: (item: CartItem) => void;
  onSelectItem?: (item: any) => void;
  cart?: CartItem[];
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export function ProductGrid({ onAddItem, onSelectItem, cart = [] }: ProductGridProps) {
  const { data: items, isLoading } = useItemsCarta();
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

  const cats = Object.keys(byCategory).sort((a, b) => byCategory[a].orden - byCategory[b].orden);

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

  const handleProductClick = (item: any) => {
    const precio = item.precio_base ?? 0;
    const nombre = item.nombre_corto ?? item.nombre;

    if (onSelectItem) {
      onSelectItem(item);
    } else {
      onAddItem({
        item_carta_id: item.id,
        nombre,
        cantidad: 1,
        precio_unitario: precio,
        subtotal: precio,
      });
    }
  };

  // Enter shortcut: if single search result, add it
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
          {cats.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border',
                activeCategory === cat
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
              )}
            >
              {cat}
            </button>
          ))}
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
                  />
                ))}
              </div>
            </div>
          ) : (
            // Grouped by category
            cats.map((cat) => (
              <div
                key={cat}
                ref={(el) => { sectionRefs.current[cat] = el; }}
                data-category={cat}
              >
                <h3 className="sticky top-0 z-10 bg-background py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {cat}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {(byCategory[cat]?.items ?? []).map((item: any) => (
                    <ProductCard
                      key={item.id}
                      item={item}
                      qty={cartQtyMap.get(item.id) || 0}
                      onClick={handleProductClick}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

/* Extracted product card with badge */
function ProductCard({ item, qty, onClick }: { item: any; qty: number; onClick: (item: any) => void }) {
  const precio = item.precio_base ?? 0;
  const nombre = item.nombre_corto ?? item.nombre;
  const imagenUrl = item.imagen_url;
  const inCart = qty > 0;

  return (
    <button
      onClick={() => onClick(item)}
      className={cn(
        'group relative flex flex-col rounded-lg border bg-card overflow-hidden text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30',
        inCart
          ? 'border-primary hover:border-primary'
          : 'hover:border-primary/50'
      )}
    >
      {/* Quantity badge */}
      {inCart && (
        <span className="absolute top-1.5 right-1.5 z-20 flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-sm">
          {qty}
        </span>
      )}
      {/* Image or initials */}
      <div className="relative w-full aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
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
        <span className="text-xs text-primary font-semibold">
          $ {precio.toLocaleString('es-AR')}
        </span>
      </div>
    </button>
  );
}
