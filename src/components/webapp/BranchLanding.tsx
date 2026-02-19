import { MapPin, Clock, Truck, ShoppingBag, UtensilsCrossed, AlertCircle, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WebappConfig, TipoServicioWebapp } from '@/types/webapp';
import logoHoppiness from '@/assets/logo-hoppiness-blue.png';

interface Props {
  branch: { name: string; address: string; city: string; opening_time: string | null; closing_time: string | null };
  config: WebappConfig;
  onSelectService: (tipo: TipoServicioWebapp) => void;
  onViewMenu: () => void;
}

export function BranchLanding({ branch, config, onSelectService, onViewMenu }: Props) {
  const isOpen = config.estado === 'abierto';
  const isPaused = config.estado === 'pausado';
  const isClosed = config.estado === 'cerrado';

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full">
      {/* Logo & branch info */}
      <div className="text-center mb-8">
        <img
          src={logoHoppiness}
          alt="Hoppiness"
          className="w-20 h-20 rounded-full mx-auto mb-4 shadow-lg object-contain"
        />
        <h1 className="text-2xl font-black font-brand text-primary">{branch.name}</h1>
        <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mt-1">
          <MapPin className="w-3.5 h-3.5" />
          <span>{branch.address}, {branch.city}</span>
        </div>
      </div>

      {/* Status badge */}
      <div className="mb-8">
        {isOpen && (
          <div className="flex items-center gap-2 text-sm font-medium text-green-700 bg-green-50 px-4 py-2 rounded-full">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Abierto
            {branch.closing_time && <span className="text-green-600/70">· Cierra {branch.closing_time}</span>}
          </div>
        )}
        {isPaused && (
          <div className="flex items-center gap-2 text-sm font-medium text-amber-700 bg-amber-50 px-4 py-2 rounded-full">
            <Pause className="w-3.5 h-3.5" />
            Pausado temporalmente
          </div>
        )}
        {isClosed && (
          <div className="flex items-center gap-2 text-sm font-medium text-red-700 bg-red-50 px-4 py-2 rounded-full">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Cerrado
            {branch.opening_time && <span className="text-red-600/70">· Abre {branch.opening_time}</span>}
          </div>
        )}
      </div>

      {/* Service selection */}
      {isOpen ? (
        <div className="w-full space-y-3">
          <p className="text-center text-sm font-semibold text-foreground mb-2">
            ¿Cómo querés tu pedido?
          </p>

          {config.retiro_habilitado && (
            <button
              onClick={() => onSelectService('retiro')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <ShoppingBag className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-foreground">Retiro en local</p>
                <p className="text-xs text-muted-foreground">
                  Paso a buscarlo · ~{config.tiempo_estimado_retiro_min} min
                </p>
              </div>
            </button>
          )}

          {config.delivery_habilitado && (
            <button
              onClick={() => onSelectService('delivery')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-accent/50 hover:bg-accent/5 transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                <Truck className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-bold text-foreground">Delivery</p>
                <p className="text-xs text-muted-foreground">
                  Que me lo traigan · ~{config.tiempo_estimado_delivery_min} min
                </p>
              </div>
            </button>
          )}

          {config.comer_aca_habilitado && (
            <button
              onClick={() => onSelectService('comer_aca')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <UtensilsCrossed className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-foreground">Comer acá</p>
                <p className="text-xs text-muted-foreground">Pido desde la mesa</p>
              </div>
            </button>
          )}
        </div>
      ) : (
        <div className="w-full space-y-4 text-center">
          {isPaused && config.mensaje_pausa && (
            <p className="text-sm text-muted-foreground">{config.mensaje_pausa}</p>
          )}
          <Button variant="outline" onClick={onViewMenu} className="w-full">
            Ver menú igualmente
          </Button>
        </div>
      )}

      {/* Estimated time */}
      {isOpen && (
        <div className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          Tiempo estimado: {config.tiempo_estimado_retiro_min}-{config.tiempo_estimado_delivery_min} min
        </div>
      )}
    </div>
  );
}
