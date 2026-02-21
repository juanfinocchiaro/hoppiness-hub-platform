import { useState, useRef, useEffect, useMemo } from 'react';
import { ArrowLeft, Search, X, LayoutGrid, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ProductCard } from './ProductCard';
import { Loader2 } from 'lucide-react';
import type { WebappMenuItem, TipoServicioWebapp } from '@/types/webapp';
import type { useWebappCart } from '@/hooks/useWebappCart';
import logoHoppiness from '@/assets/logo-hoppiness-blue.png';

interface Props {
  branch: { name: string };
  config: any;
  items: WebappMenuItem[];
  loading: boolean;
  tipoServicio: TipoServicioWebapp;
  cart: ReturnType<typeof useWebappCart>;
  onProductClick: (item: WebappMenuItem) => void;
  onBack: () => void;
}

export function WebappMenuView({ branch, config, items, loading, tipoServicio, cart, onProductClick, onBack }: Props) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const tabsRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(() => {
    const filtered = search.trim()
      ? items.filter(i =>
          i.nombre.toLowerCase().includes(search.toLowerCase()) ||
          i.descripcion?.toLowerCase().includes(search.toLowerCase())
        )
      : items;

    const grouped: Record<string, { nombre: string; orden: number; items: WebappMenuItem[] }> = {};
    filtered.forEach(item => {
      const cat = item.categoria_nombre || 'Otros';
      const orden = item.categoria_orden ?? 999;
      if (!grouped[cat]) grouped[cat] = { nombre: cat, orden, items: [] };
      grouped[cat].items.push(item);
    });

    return Object.values(grouped).sort((a, b) => a.orden - b.orden);
  }, [items, search]);

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].nombre);
    }
  }, [categories, activeCategory]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveCategory(entry.target.getAttribute('data-category'));
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );

    Object.values(categoryRefs.current).forEach(el => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [categories]);

  const scrollToCategory = (catName: string) => {
    setActiveCategory(catName);
    categoryRefs.current[catName]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const servicioLabel = tipoServicio === 'retiro' ? '🛒 Retiro en local' : tipoServicio === 'delivery' ? '🛵 Delivery' : '🍽 Comer acá';

  const tiempoEstimado = tipoServicio === 'delivery'
    ? config.tiempo_estimado_delivery_min
    : config.tiempo_estimado_retiro_min;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-primary text-primary-foreground shadow-md">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={onBack} className="p-1.5 -ml-1 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <img src={logoHoppiness} alt="" className="w-8 h-8 rounded-full object-contain" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">{branch.name}</p>
            <p className="text-xs text-primary-foreground/70">
              {servicioLabel}
              {tiempoEstimado && <> · ~{tiempoEstimado} min</>}
            </p>
          </div>
          {/* View toggle */}
          <button
            onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title={viewMode === 'grid' ? 'Vista lista' : 'Vista grilla'}
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/50" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar en el menú..."
              className="pl-9 pr-8 bg-white/15 border-white/20 text-primary-foreground placeholder:text-primary-foreground/50 h-9 text-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-primary-foreground/50" />
              </button>
            )}
          </div>
        </div>

        {/* Category tabs */}
        {!search && categories.length > 1 && (
          <div
            ref={tabsRef}
            className="flex gap-1 overflow-x-auto px-4 pb-2 scrollbar-none"
          >
            {categories.map(cat => (
              <button
                key={cat.nombre}
                onClick={() => scrollToCategory(cat.nombre)}
                className={`
                  whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0
                  ${activeCategory === cat.nombre
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-white/10 text-primary-foreground/80 hover:bg-white/20'
                  }
                `}
              >
                {cat.nombre}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Menu content */}
      <main className="flex-1 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            {search ? 'No se encontraron productos' : 'No hay productos disponibles'}
          </div>
        ) : (
          categories.map(cat => (
            <div
              key={cat.nombre}
              ref={el => { categoryRefs.current[cat.nombre] = el; }}
              data-category={cat.nombre}
              className="scroll-mt-36"
            >
              <div className="sticky top-[140px] z-10 bg-background/95 backdrop-blur-sm px-4 py-2.5 border-b">
                <h2 className="text-sm font-black text-primary uppercase tracking-wide">
                  {cat.nombre}
                  <span className="text-xs font-normal text-muted-foreground ml-2 lowercase tracking-normal">
                    {cat.items.length} {cat.items.length === 1 ? 'producto' : 'productos'}
                  </span>
                </h2>
              </div>

              {viewMode === 'grid' ? (
                <div className="px-4 py-3 grid grid-cols-2 gap-3">
                  {cat.items.map(item => (
                    <ProductCard
                      key={item.id}
                      item={item}
                      qty={cart.getItemQty(item.id)}
                      layout="grid"
                      onTap={() => onProductClick(item)}
                      onQuickAdd={() => cart.quickAdd(item.id, item.nombre, item.precio_base, item.imagen_url)}
                      onIncrement={() => cart.quickAdd(item.id, item.nombre, item.precio_base, item.imagen_url)}
                      onDecrement={() => {
                        const entry = cart.items.find(i => i.itemId === item.id);
                        if (entry) cart.updateQuantity(entry.cartId, entry.cantidad - 1);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="px-4 py-2 space-y-2">
                  {cat.items.map(item => (
                    <ProductCard
                      key={item.id}
                      item={item}
                      qty={cart.getItemQty(item.id)}
                      layout="list"
                      onTap={() => onProductClick(item)}
                      onQuickAdd={() => cart.quickAdd(item.id, item.nombre, item.precio_base, item.imagen_url)}
                      onIncrement={() => cart.quickAdd(item.id, item.nombre, item.precio_base, item.imagen_url)}
                      onDecrement={() => {
                        const entry = cart.items.find(i => i.itemId === item.id);
                        if (entry) cart.updateQuantity(entry.cartId, entry.cantidad - 1);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  );
}
