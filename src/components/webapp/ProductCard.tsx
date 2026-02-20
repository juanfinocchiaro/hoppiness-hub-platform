import { Plus, Minus } from 'lucide-react';
import type { WebappMenuItem } from '@/types/webapp';

interface Props {
  item: WebappMenuItem;
  qty: number;
  onTap: () => void;
  onQuickAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}

function formatPrice(n: number) {
  return `$${n.toLocaleString('es-AR')}`;
}

export function ProductCard({ item, qty, onTap, onQuickAdd, onIncrement, onDecrement }: Props) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors cursor-pointer active:scale-[0.98]"
      onClick={onTap}
    >
      {/* Image */}
      {item.imagen_url ? (
        <div className="w-28 h-28 rounded-xl overflow-hidden shrink-0 bg-muted">
          <img
            src={item.imagen_url}
            alt={item.nombre}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="w-28 h-28 rounded-xl shrink-0 bg-muted flex items-center justify-center">
          <span className="text-3xl">🍔</span>
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-sm text-foreground leading-tight truncate">
          {item.nombre_corto || item.nombre}
        </h3>
        {item.descripcion && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.descripcion}</p>
        )}
        <p className="text-sm font-bold text-primary mt-1">{formatPrice(item.precio_base)}</p>
      </div>

      {/* Add / quantity control */}
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
