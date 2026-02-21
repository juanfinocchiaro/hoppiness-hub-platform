import { MapPin, Clock, Truck, ShoppingBag, UtensilsCrossed, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WebappConfig, TipoServicioWebapp } from '@/types/webapp';
import logoHoppiness from '@/assets/logo-hoppiness-blue.png';

interface Props {
  branch: { name: string; address: string; city: string; opening_time: string | null; closing_time: string | null };
  config: WebappConfig;
  onSelectService: (tipo: TipoServicioWebapp) => void;
  onViewMenu: () => void;
}

function formatPrice(n: number) {
  return `$${n.toLocaleString('es-AR')}`;
}

export function BranchLanding({ branch, config, onSelectService, onViewMenu }: Props) {
  const isOpen = config.estado === 'abierto';
  const isPaused = config.estado === 'pausado';

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero */}
      <div className="bg-primary text-primary-foreground px-6 pt-10 pb-12 text-center">
        <img
          src={logoHoppiness}
          alt="Hoppiness"
          className="w-24 h-24 rounded-full mx-auto mb-5 shadow-xl object-contain ring-4 ring-white/20"
        />
        <h1 className="text-3xl font-black font-brand tracking-tight">{branch.name}</h1>
        <div className="flex items-center justify-center gap-1.5 text-sm text-primary-foreground/70 mt-2">
          <MapPin className="w-3.5 h-3.5" />
          <span>{branch.address}, {branch.city}</span>
        </div>

        {/* Status */}
        <div className="mt-4 inline-flex">
          {isOpen && (
            <span className="flex items-center gap-2 text-sm font-semibold bg-white/15 backdrop-blur px-4 py-2 rounded-full">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Abierto
              {branch.closing_time && <span className="text-primary-foreground/60">· Cierra {branch.closing_time}</span>}
            </span>
          )}
          {isPaused && (
            <span className="flex items-center gap-2 text-sm font-semibold bg-amber-500/20 backdrop-blur px-4 py-2 rounded-full text-amber-200">
              <Pause className="w-3.5 h-3.5" />
              Pausado temporalmente
            </span>
          )}
          {!isOpen && !isPaused && (
            <span className="flex items-center gap-2 text-sm font-semibold bg-white/10 backdrop-blur px-4 py-2 rounded-full text-primary-foreground/70">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              Cerrado
              {branch.opening_time && <span>· Abre {branch.opening_time}</span>}
            </span>
          )}
        </div>
      </div>

      {/* Service selection */}
      <div className="flex-1 flex flex-col items-center px-6 -mt-6 max-w-md mx-auto w-full">
        {isOpen ? (
          <div className="w-full bg-card rounded-2xl shadow-lg border p-5 space-y-3">
            <p className="text-center text-sm font-bold text-foreground">
              ¿Cómo querés tu pedido?
            </p>

            {config.retiro_habilitado && (
              <button
                onClick={() => onSelectService('retiro')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-foreground">Retiro en local</p>
                  <p className="text-xs text-muted-foreground">
                    Paso a buscarlo
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    ~{config.tiempo_estimado_retiro_min} min
                  </div>
                </div>
              </button>
            )}

            {config.delivery_habilitado && (
              <button
                onClick={() => onSelectService('delivery')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-accent/50 hover:bg-accent/5 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors shrink-0">
                  <Truck className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-foreground">Delivery</p>
                  <p className="text-xs text-muted-foreground">
                    Que me lo traigan
                    {config.delivery_costo != null && config.delivery_costo > 0 && (
                      <> · Envío {formatPrice(config.delivery_costo)}</>
                    )}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    ~{config.tiempo_estimado_delivery_min} min
                  </div>
                </div>
              </button>
            )}

            {config.comer_aca_habilitado && (
              <button
                onClick={() => onSelectService('comer_aca')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                  <UtensilsCrossed className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-foreground">Comer acá</p>
                  <p className="text-xs text-muted-foreground">Pido desde la mesa</p>
                </div>
              </button>
            )}

            {config.delivery_pedido_minimo != null && config.delivery_pedido_minimo > 0 && config.delivery_habilitado && (
              <p className="text-center text-[11px] text-muted-foreground pt-1">
                Pedido mínimo delivery: {formatPrice(config.delivery_pedido_minimo)}
              </p>
            )}
          </div>
        ) : (
          <div className="w-full bg-card rounded-2xl shadow-lg border p-6 text-center space-y-4">
            {isPaused && config.mensaje_pausa && (
              <p className="text-sm text-muted-foreground">{config.mensaje_pausa}</p>
            )}
            {!isPaused && (
              <p className="text-sm text-muted-foreground">
                Este local no está recibiendo pedidos en este momento.
              </p>
            )}
            <Button variant="outline" onClick={onViewMenu} className="w-full">
              Ver menú igualmente
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
