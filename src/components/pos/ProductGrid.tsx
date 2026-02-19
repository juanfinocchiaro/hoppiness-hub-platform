/**
 * ProductGrid - Grilla de productos desde items_carta por categoría
 */
import { useItemsCarta } from '@/hooks/useItemsCarta';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface CartItem {
  item_carta_id: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  notas?: string;
}

interface ProductGridProps {
  onAddItem: (item: CartItem) => void;
}

export function ProductGrid({ onAddItem }: ProductGridProps) {
  const { data: items, isLoading } = useItemsCarta();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  const byCategory = (items ?? []).reduce<Record<string, typeof items>>((acc, item) => {
    const cat = (item as any).menu_categorias?.nombre ?? 'Sin categoría';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const cats = Object.keys(byCategory).sort();

  return (
    <ScrollArea className="h-full min-h-0 pr-4">
      <div className="space-y-6 pb-4">
        {cats.map((cat) => (
          <div key={cat} className="border-l-4 border-primary pl-3">
            <h3 className="sticky top-0 z-10 bg-background py-2 text-base font-semibold text-primary uppercase tracking-wide">
              {cat}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
              {(byCategory[cat] ?? []).map((item: any) => {
                const precio = item.precio_base ?? 0;
                const nombre = item.nombre_corto ?? item.nombre;
                return (
                  <Button
                    key={item.id}
                    variant="outline"
                    className="h-auto min-h-[80px] flex flex-col items-center justify-center p-3 text-left hover:border-primary/50 hover:bg-primary/5"
                    onClick={() =>
                      onAddItem({
                        item_carta_id: item.id,
                        nombre,
                        cantidad: 1,
                        precio_unitario: precio,
                        subtotal: precio,
                      })
                    }
                  >
                    <span className="text-sm font-medium line-clamp-2 w-full">{nombre}</span>
                    <span className="text-xs text-primary font-semibold mt-1">
                      $ {precio.toLocaleString('es-AR')}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
