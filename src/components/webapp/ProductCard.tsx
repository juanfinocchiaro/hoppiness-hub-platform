import { Plus, Minus } from 'lucide-react';
import type { WebappMenuItem } from '@/types/webapp';

interface Props {
  item: WebappMenuItem;
  qty: number;
  onTap: () => void;
  onQuickAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  layout?: 'list' | 'grid' | 'desktop';
}

function formatPrice(n: number) {
  return `$${n.toLocaleString('es-AR')}`;
}

function PromoBadge({ label }: { label: string }) {
  return (
    <span className="absolute top-2 left-2 z-10 bg-accent text-accent-foreground text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm uppercase tracking-wide">
      {label}
    </span>
  );
}

function PriceDisplay({ base, promo }: { base: number; promo: number | null }) {
  if (promo != null && promo < base) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-bold text-accent">{formatPrice(promo)}</span>
        <span className="text-xs text-muted-foreground line-through">{formatPrice(base)}</span>
      </div>
    );
  }
  return <p className="text-sm font-bold text-primary">{formatPrice(base)}</p>;
}

function QtyControls({ qty, onQuickAdd, onIncrement, onDecrement, size = 'sm' }: {
  qty: number;
  onQuickAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  size?: 'sm' | 'md';
}) {
  const btnSize = size === 'md' ? 'w-8 h-8' : 'w-7 h-7';
  const plusSize = size === 'md' ? 'w-9 h-9' : 'w-8 h-8';
  const iconSize = size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';

  if (qty === 0) {
    return (
      <button
        onClick={onQuickAdd}
        className={`${plusSize} rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-transform`}
      >
        <Plus className={iconSize} />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onDecrement}
        className={`${btnSize} rounded-full bg-muted text-foreground flex items-center justify-center active:scale-95`}
      >
        <Minus className="w-3 h-3" />
      </button>
      <span className="w-5 text-center text-xs font-bold">{qty}</span>
      <button
        onClick={onIncrement}
        className={`${btnSize} rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-95`}
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}

export function ProductCard({ item, qty, onTap, onQuickAdd, onIncrement, onDecrement, layout = 'list' }: Props) {
  const effectivePrice = item.precio_promo != null && item.precio_promo < item.precio_base ? item.precio_promo : item.precio_base;

  // Desktop horizontal card
  if (layout === 'desktop') {
    return (
      <div
        className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/20 hover:shadow-sm transition-all cursor-pointer active:scale-[0.99] relative"
        onClick={onTap}
      >
        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
          <div>
            {item.promo_etiqueta && (
              <span className="inline-block bg-accent text-accent-foreground text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide mb-1">
                {item.promo_etiqueta}
              </span>
            )}
            <h3 className="font-bold text-sm text-foreground leading-tight line-clamp-2">
              {item.nombre_corto || item.nombre}
            </h3>
            {item.descripcion && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{item.descripcion}</p>
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            <PriceDisplay base={item.precio_base} promo={item.precio_promo} />
            <div onClick={e => e.stopPropagation()}>
              <QtyControls qty={qty} onQuickAdd={onQuickAdd} onIncrement={onIncrement} onDecrement={onDecrement} size="sm" />
            </div>
          </div>
        </div>

        {item.imagen_url ? (
          <div className="w-[100px] h-[100px] rounded-lg overflow-hidden shrink-0 bg-muted relative">
            <img src={item.imagen_url} alt={item.nombre} className="w-full h-full object-cover" loading="lazy" />
          </div>
        ) : (
          <div className="w-[100px] h-[100px] rounded-lg shrink-0 bg-muted flex items-center justify-center">
            <span className="text-3xl">🍔</span>
          </div>
        )}
      </div>
    );
  }

  // Grid layout
  if (layout === 'grid') {
    return (
      <div
        className="flex flex-col rounded-2xl bg-card border border-border overflow-hidden hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98] relative"
        onClick={onTap}
      >
        {item.promo_etiqueta && <PromoBadge label={item.promo_etiqueta} />}
        {item.imagen_url ? (
          <div className="aspect-[3/2] w-full overflow-hidden bg-muted">
            <img src={item.imagen_url} alt={item.nombre} className="w-full h-full object-cover" loading="lazy" />
          </div>
        ) : (
          <div className="aspect-[3/2] w-full bg-muted flex items-center justify-center">
            <span className="text-4xl">🍔</span>
          </div>
        )}

        <div className="p-3 flex-1 flex flex-col">
          <h3 className="font-bold text-sm text-foreground leading-tight line-clamp-2">
            {item.nombre_corto || item.nombre}
          </h3>
          {item.descripcion && (
            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{item.descripcion}</p>
          )}
          <div className="flex items-center justify-between mt-auto pt-2">
            <PriceDisplay base={item.precio_base} promo={item.precio_promo} />
            <div onClick={e => e.stopPropagation()}>
              <QtyControls qty={qty} onQuickAdd={onQuickAdd} onIncrement={onIncrement} onDecrement={onDecrement} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List layout
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors cursor-pointer active:scale-[0.98] relative"
      onClick={onTap}
    >
      <div className="relative shrink-0">
        {item.promo_etiqueta && (
          <span className="absolute -top-1 -left-1 z-10 bg-accent text-accent-foreground text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm uppercase">
            {item.promo_etiqueta}
          </span>
        )}
        {item.imagen_url ? (
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted">
            <img src={item.imagen_url} alt={item.nombre} className="w-full h-full object-cover" loading="lazy" />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center">
            <span className="text-3xl">🍔</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-sm text-foreground leading-tight line-clamp-2">
          {item.nombre_corto || item.nombre}
        </h3>
        {item.descripcion && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.descripcion}</p>
        )}
        <div className="mt-1">
          <PriceDisplay base={item.precio_base} promo={item.precio_promo} />
        </div>
      </div>

      <div className="shrink-0" onClick={e => e.stopPropagation()}>
        <QtyControls qty={qty} onQuickAdd={onQuickAdd} onIncrement={onIncrement} onDecrement={onDecrement} size="md" />
      </div>
    </div>
  );
}
