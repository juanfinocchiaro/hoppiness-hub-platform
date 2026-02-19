/**
 * ProductGrid - Grilla de productos con fotos y tabs de categoría
 */
import { useState, useRef, useCallback } from 'react';
import { useItemsCarta } from '@/hooks/useItemsCarta';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

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
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export function ProductGrid({ onAddItem, onSelectItem }: ProductGridProps) {
  const { data: items, isLoading } = useItemsCarta();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const byCategory = (items ?? [])
    .filter((item: any) => item.tipo !== 'extra')
    .reduce<Record<string, { items: typeof items; orden: number }>>((acc, item) => {
      const cat = (item as any).menu_categorias?.nombre ?? 'Sin categoría';
      const orden = (item as any).menu_categorias?.orden ?? 999;
      if (!acc[cat]) acc[cat] = { items: [], orden };
      acc[cat].items.push(item);
      return acc;
    }, {});

  const cats = Object.keys(byCategory).sort((a, b) => byCategory[a].orden - byCategory[b].orden);

  const handleCategoryClick = useCallback((cat: string) => {
    setActiveCategory(cat);
    const el = sectionRefs.current[cat];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 h-full">
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
      {/* Category tabs */}
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

      {/* Products grid */}
      <ScrollArea className="flex-1 min-h-0 pr-2" ref={scrollAreaRef}>
        <div className="space-y-6 pb-4">
          {cats.map((cat) => (
            <div
              key={cat}
              ref={(el) => { sectionRefs.current[cat] = el; }}
            >
              <h3 className="sticky top-0 z-10 bg-background py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {cat}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {(byCategory[cat]?.items ?? []).map((item: any) => {
                  const precio = item.precio_base ?? 0;
                  const nombre = item.nombre_corto ?? item.nombre;
                  const imagenUrl = item.imagen_url;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleProductClick(item)}
                      className="group flex flex-col rounded-lg border bg-card overflow-hidden text-left transition-colors hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {/* Image or initials placeholder */}
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
                        <span className="text-sm font-medium line-clamp-2 leading-tight">
                          {nombre}
                        </span>
                        <span className="text-xs text-primary font-semibold">
                          $ {precio.toLocaleString('es-AR')}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
