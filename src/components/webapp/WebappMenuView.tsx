import { useState, useRef, useEffect, useMemo } from 'react';
import { ArrowLeft, Search, X, LayoutGrid, List, Star } from 'lucide-react';
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
  onServiceChange?: (tipo: TipoServicioWebapp) => void;
  cartPanelVisible?: boolean;
}

export function WebappMenuView({ branch, config, items, loading, tipoServicio, cart, onProductClick, onBack, onServiceChange, cartPanelVisible }: Props) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const tabsRef = useRef<HTMLDivElement>(null);

  // Popular items — first 4 items as "Destacados" (fallback until real order data exists)
  const popularItems = useMemo(() => {
    if (items.length <= 6) return []; // Don't show if menu is tiny
    return items.slice(0, 4);
  }, [items]);

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

  const servicioOptions = [
    config.retiro_habilitado && { key: 'retiro' as TipoServicioWebapp, label: 'Retiro', icon: '🛒', tiempo: config.tiempo_estimado_retiro_min },
    config.delivery_habilitado && { key: 'delivery' as TipoServicioWebapp, label: 'Delivery', icon: '🛵', tiempo: config.tiempo_estimado_delivery_min },
    config.comer_aca_habilitado && { key: 'comer_aca' as TipoServicioWebapp, label: 'Comer acá', icon: '🍽', tiempo: null },
  ].filter(Boolean) as { key: TipoServicioWebapp; label: string; icon: string; tiempo: number | null }[];

  const servicioLabel = tipoServicio === 'retiro' ? '🛒 Retiro en local' : tipoServicio === 'delivery' ? '🛵 Delivery' : '🍽 Comer acá';

  const tiempoEstimado = tipoServicio === 'delivery'
    ? config.tiempo_estimado_delivery_min
    : config.tiempo_estimado_retiro_min;

  const renderProductCard = (item: WebappMenuItem, layout: 'grid' | 'list' | 'desktop') => (
    <ProductCard
      key={item.id}
      item={item}
      qty={cart.getItemQty(item.id)}
      layout={layout}
      onTap={() => onProductClick(item)}
      onQuickAdd={() => cart.quickAdd(item.id, item.nombre, item.precio_base, item.imagen_url)}
      onIncrement={() => cart.quickAdd(item.id, item.nombre, item.precio_base, item.imagen_url)}
      onDecrement={() => {
        const entry = cart.items.find(i => i.itemId === item.id);
        if (entry) cart.updateQuantity(entry.cartId, entry.cantidad - 1);
      }}
    />
  );

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header with brand gradient accent */}
      <header className="sticky top-0 z-30 bg-background border-b shadow-sm">
        <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-warning" />
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={onBack} className="p-1.5 -ml-1 hover:bg-muted rounded-lg transition-colors text-muted-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <img src={logoHoppiness} alt="" className="w-8 h-8 rounded-full object-contain" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate text-foreground">{branch.name}</p>
              {servicioOptions.length > 1 && onServiceChange ? (
                <div className="flex gap-1 mt-1">
                  {servicioOptions.map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => onServiceChange(opt.key)}
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full transition-colors ${
                        tipoServicio === opt.key
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {opt.icon} {opt.label}
                      {opt.tiempo && <span className="opacity-70"> ~{opt.tiempo}′</span>}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {servicioLabel}
                  {tiempoEstimado && <> · ~{tiempoEstimado} min</>}
                </p>
              )}
            </div>
            {/* Search icon (mobile: collapsible) */}
            <button
              onClick={() => setSearchExpanded(v => !v)}
              className="p-1.5 hover:bg-muted rounded-lg transition-colors lg:hidden text-muted-foreground"
            >
              <Search className="w-4 h-4" />
            </button>
            {/* View toggle - only on mobile */}
            <button
              onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
              className="p-1.5 hover:bg-muted rounded-lg transition-colors lg:hidden text-muted-foreground"
              title={viewMode === 'grid' ? 'Vista lista' : 'Vista grilla'}
            >
              {viewMode === 'grid' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
            </button>
          </div>

          {/* Search - collapsible on mobile, always visible on desktop */}
          <div className={`px-4 pb-3 ${searchExpanded ? '' : 'hidden lg:block'}`}>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar en el menú..."
                className="pl-9 pr-8 bg-muted border-border text-foreground placeholder:text-muted-foreground h-9 text-sm"
                autoFocus={searchExpanded}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Category tabs - mobile only */}
          {!search && categories.length > 1 && (
            <div
              ref={tabsRef}
              className="flex gap-1 overflow-x-auto px-4 pb-2 scrollbar-none lg:hidden"
            >
              {categories.map(cat => (
                <button
                  key={cat.nombre}
                  onClick={() => scrollToCategory(cat.nombre)}
                  className={`
                    whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0
                    ${activeCategory === cat.nombre
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }
                  `}
                >
                  {cat.nombre}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Main content: sidebar (desktop) + products */}
      <main className="flex-1 pb-24 lg:pb-8">
        <div className="max-w-6xl mx-auto flex">
          {/* Desktop sidebar categories */}
          {!search && categories.length > 1 && (
            <aside className="hidden lg:block w-[200px] shrink-0 sticky top-[120px] self-start max-h-[calc(100vh-140px)] overflow-y-auto border-r">
              <nav className="py-4 pr-2">
                {popularItems.length > 0 && (
                  <button
                    onClick={() => scrollToCategory('__popular')}
                    className={`
                      w-full text-left px-4 py-2.5 text-sm rounded-lg transition-colors mb-0.5 flex items-center gap-1.5
                      ${activeCategory === '__popular'
                        ? 'bg-accent/10 text-accent font-bold'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }
                    `}
                  >
                    <Star className="w-3.5 h-3.5" />
                    Destacados
                  </button>
                )}
                {categories.map(cat => (
                  <button
                    key={cat.nombre}
                    onClick={() => scrollToCategory(cat.nombre)}
                    className={`
                      w-full text-left px-4 py-2.5 text-sm rounded-lg transition-colors mb-0.5
                      ${activeCategory === cat.nombre
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }
                    `}
                  >
                    {cat.nombre}
                  </button>
                ))}
              </nav>
            </aside>
          )}

          {/* Products area */}
          <div className={`flex-1 min-w-0 ${cartPanelVisible ? 'lg:mr-[360px]' : ''}`}>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : categories.length === 0 && !popularItems.length ? (
              <div className="text-center py-20 text-muted-foreground">
                {search ? 'No se encontraron productos' : 'No hay productos disponibles'}
              </div>
            ) : (
              <>
                {/* Popular / Featured section */}
                {!search && popularItems.length > 0 && (
                  <div
                    ref={el => { categoryRefs.current['__popular'] = el; }}
                    data-category="__popular"
                    className="scroll-mt-36"
                  >
                    <div className="sticky top-[120px] lg:top-[120px] z-10 bg-background/95 backdrop-blur-sm px-4 py-2.5 border-b">
                      <h2 className="text-sm font-black text-accent uppercase tracking-wide flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 fill-accent" />
                        Destacados
                      </h2>
                    </div>
                    {/* Horizontal scroll on mobile, grid on desktop */}
                    <div className="lg:hidden">
                      <div className="flex gap-3 overflow-x-auto px-4 py-3 scrollbar-none">
                        {popularItems.map(item => (
                          <div key={item.id} className="shrink-0 w-[160px]">
                            {renderProductCard(item, 'grid')}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="hidden lg:block px-4 py-3">
                      <div className={`grid gap-3 ${cartPanelVisible ? 'grid-cols-2' : 'grid-cols-2 xl:grid-cols-3'}`}>
                        {popularItems.map(item => renderProductCard(item, 'desktop'))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Regular categories */}
                {categories.map(cat => (
                  <div
                    key={cat.nombre}
                    ref={el => { categoryRefs.current[cat.nombre] = el; }}
                    data-category={cat.nombre}
                    className="scroll-mt-36"
                  >
                    <div className="sticky top-[120px] lg:top-[120px] z-10 bg-background/95 backdrop-blur-sm px-4 py-2.5 border-b">
                      <h2 className="text-sm font-black text-primary uppercase tracking-wide">
                        {cat.nombre}
                        <span className="text-xs font-normal text-muted-foreground ml-2 lowercase tracking-normal">
                          {cat.items.length} {cat.items.length === 1 ? 'producto' : 'productos'}
                        </span>
                      </h2>
                    </div>

                    {/* Mobile: grid or list view */}
                    <div className="lg:hidden">
                      {viewMode === 'grid' ? (
                        <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                          {cat.items.map(item => renderProductCard(item, 'grid'))}
                        </div>
                      ) : (
                        <div className="px-4 py-2 space-y-2">
                          {cat.items.map(item => renderProductCard(item, 'list'))}
                        </div>
                      )}
                    </div>

                    {/* Desktop: horizontal cards */}
                    <div className="hidden lg:block px-4 py-3">
                      <div className={`grid gap-3 ${cartPanelVisible ? 'grid-cols-2' : 'grid-cols-2 xl:grid-cols-3'}`}>
                        {cat.items.map(item => renderProductCard(item, 'desktop'))}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
