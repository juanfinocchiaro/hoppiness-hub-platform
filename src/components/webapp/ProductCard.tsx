import { Plus, Minus } from 'lucide-react';
import type { WebappMenuItem } from '@/types/webapp';

interface Props {
  item: WebappMenuItem;
  qty: number;
  onTap: () => void;
  onQuickAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  layout?: 'list' | 'grid';
}

function formatPrice(n: number) {
  return `$${n.toLocaleString('es-AR')}`;
}

export function ProductCard({ item, qty, onTap, onQuickAdd, onIncrement, onDecrement, layout = 'list' }: Props) {
  const isGrid = layout === 'grid';

  if (isGrid) {
    return (
      <div
        className="flex flex-col rounded-2xl bg-card border border-border overflow-hidden hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98]"
        onClick={onTap}
      >
        {/* Image */}
        {item.imagen_url ? (
          <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
            <img
              src={item.imagen_url}
              alt={item.nombre}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="aspect-[4/3] w-full bg-muted flex items-center justify-center">
            <span className="text-4xl">🍔</span>
          </div>
        )}

        {/* Info */}
        <div className="p-3 flex-1 flex flex-col">
          <h3 className="font-bold text-sm text-foreground leading-tight line-clamp-2">
            {item.nombre_corto || item.nombre}
          </h3>
          {item.descripcion && (
            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{item.descripcion}</p>
          )}
          <div className="flex items-center justify-between mt-auto pt-2">
            <p className="text-sm font-bold text-primary">{formatPrice(item.precio_base)}</p>
            <div onClick={e => e.stopPropagation()}>
              {qty === 0 ? (
                <button
                  onClick={onQuickAdd}
                  className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={onDecrement}
                    className="w-7 h-7 rounded-full bg-muted text-foreground flex items-center justify-center active:scale-95"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-5 text-center text-xs font-bold">{qty}</span>
                  <button
                    onClick={onIncrement}
                    className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-95"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List layout (original)
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors cursor-pointer active:scale-[0.98]"
      onClick={onTap}
    >
      {item.imagen_url ? (
        <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-muted">
          <img
            src={item.imagen_url}
            alt={item.nombre}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="w-24 h-24 rounded-xl shrink-0 bg-muted flex items-center justify-center">
          <span className="text-3xl">🍔</span>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-sm text-foreground leading-tight truncate">
          {item.nombre_corto || item.nombre}
        </h3>
        {item.descripcion && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.descripcion}</p>
        )}
        <p className="text-sm font-bold text-primary mt-1">{formatPrice(item.precio_base)}</p>
      </div>

      <div className="shrink-0" onClick={e => e.stopPropagation()}>
        {qty === 0 ? (
          <button
            onClick={onQuickAdd}
            className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors active:scale-95"
          >
            <Plus className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={onDecrement}
              className="w-8 h-8 rounded-full bg-muted text-foreground flex items-center justify-center hover:bg-muted/80 active:scale-95"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-6 text-center text-sm font-bold text-foreground">{qty}</span>
            <button
              onClick={onIncrement}
              className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
