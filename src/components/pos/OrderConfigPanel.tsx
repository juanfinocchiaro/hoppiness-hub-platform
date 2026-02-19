/**
 * OrderConfigPanel - Selector de canal de venta y número de llamador
 * Fase 1: canal mostrador/apps, tipo servicio (takeaway, comer acá, delivery), llamadores
 */
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Store, Utensils, Bike, ShoppingCart, User, Hash } from 'lucide-react';
import type { CanalVenta, TipoServicio, CanalApp, OrderConfig } from '@/types/pos';

const CANAL_OPTS: { value: CanalVenta; label: string; icon: React.ElementType }[] = [
  { value: 'mostrador', label: 'Mostrador', icon: Store },
  { value: 'apps', label: 'Apps Delivery', icon: Bike },
];

const TIPO_SERVICIO_OPTS: { value: TipoServicio; label: string; icon: React.ElementType }[] = [
  { value: 'takeaway', label: 'Para llevar', icon: ShoppingCart },
  { value: 'comer_aca', label: 'Comer acá', icon: Utensils },
  { value: 'delivery', label: 'Delivery', icon: Bike },
];

const CANAL_APP_OPTS: { value: CanalApp; label: string }[] = [
  { value: 'rappi', label: 'Rappi' },
  { value: 'pedidos_ya', label: 'Pedidos Ya' },
  { value: 'mp_delivery', label: 'MP Delivery' },
];

const CALLER_NUMBERS = Array.from({ length: 30 }, (_, i) => i + 1);

interface OrderConfigPanelProps {
  config: OrderConfig;
  onChange: (config: OrderConfig) => void;
  compact?: boolean;
  /** Si true, el botón Delivery se deshabilita y muestra tooltip con motivo */
  deliveryDisabled?: boolean;
  deliveryDisabledReason?: string;
}

export function OrderConfigPanel({
  config,
  onChange,
  compact,
  deliveryDisabled = false,
  deliveryDisabledReason = 'Configurá delivery en Caja para habilitar este canal.',
}: OrderConfigPanelProps) {
  const set = (partial: Partial<OrderConfig>) => onChange({ ...config, ...partial });

  return (
    <Card>
      <CardHeader className="py-3">
        <span className="text-sm font-medium">Canal y cliente</span>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Canal: Mostrador | Apps */}
        <div className="space-y-2">
          <Label className="text-xs">Canal de venta</Label>
          <div className="flex gap-2 flex-wrap">
            {CANAL_OPTS.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                variant={config.canalVenta === opt.value ? 'default' : 'outline'}
                size={compact ? 'sm' : 'default'}
                onClick={() => set({ canalVenta: opt.value })}
                className="flex-1 min-w-0"
              >
                <opt.icon className="w-4 h-4 mr-1.5 shrink-0" />
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {config.canalVenta === 'mostrador' && (
          <>
            {/* Tipo de servicio */}
            <div className="space-y-2">
              <Label className="text-xs">Tipo de servicio</Label>
              <div className="flex gap-2 flex-wrap">
                {TIPO_SERVICIO_OPTS.map((opt) => {
                  const isDelivery = opt.value === 'delivery';
                  const isDisabled = isDelivery && deliveryDisabled;
                  const btn = (
                    <Button
                      key={opt.value}
                      type="button"
                      variant={config.tipoServicio === opt.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => !isDisabled && set({ tipoServicio: opt.value })}
                      disabled={isDisabled}
                      className={isDisabled ? 'opacity-60' : ''}
                    >
                      <opt.icon className="w-3.5 h-3.5 mr-1" />
                      {opt.label}
                    </Button>
                  );
                  return isDisabled ? (
                    <Tooltip key={opt.value}>
                      <TooltipTrigger asChild>{btn}</TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        {deliveryDisabledReason}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    btn
                  );
                })}
              </div>
            </div>

            {/* Número de llamador (comer acá o para llevar) */}
            {(config.tipoServicio === 'comer_aca' || config.tipoServicio === 'takeaway') && (
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5" />
                  Número de llamador
                </Label>
                <div className="grid grid-cols-6 gap-2 max-h-44 overflow-y-auto p-1">
                  {CALLER_NUMBERS.map((num) => (
                    <Button
                      key={num}
                      type="button"
                      variant={config.numeroLlamador === String(num) ? 'default' : 'outline'}
                      size="sm"
                      className="h-10 font-medium"
                      onClick={() => {
                        set({ numeroLlamador: String(num) });
                        if (!config.clienteNombre || config.clienteNombre.startsWith('Llamador #')) {
                          set({ clienteNombre: `Llamador #${num}` });
                        }
                      }}
                    >
                      {num}
                    </Button>
                  ))}
                </div>
                <div className="pt-1">
                  <Label className="text-xs text-muted-foreground">Nombre (opcional)</Label>
                  <Input
                    placeholder="Nombre del cliente"
                    value={config.clienteNombre.startsWith('Llamador #') ? '' : config.clienteNombre}
                    onChange={(e) => {
                      const v = e.target.value;
                      set({
                        clienteNombre: v || (config.numeroLlamador ? `Llamador #${config.numeroLlamador}` : ''),
                      });
                    }}
                    className="h-9 mt-1"
                  />
                </div>
              </div>
            )}

            {/* Delivery mostrador: nombre, teléfono, dirección */}
            {config.tipoServicio === 'delivery' && (
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Nombre *</Label>
                  <Input
                    placeholder="Cliente"
                    value={config.clienteNombre}
                    onChange={(e) => set({ clienteNombre: e.target.value })}
                    className="h-9 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Teléfono *</Label>
                  <Input
                    placeholder="Teléfono"
                    value={config.clienteTelefono}
                    onChange={(e) => set({ clienteTelefono: e.target.value })}
                    className="h-9 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Dirección *</Label>
                  <Input
                    placeholder="Dirección de entrega"
                    value={config.clienteDireccion}
                    onChange={(e) => set({ clienteDireccion: e.target.value })}
                    className="h-9 mt-1"
                  />
                </div>
              </div>
            )}
          </>
        )}

        {config.canalVenta === 'apps' && (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Plataforma</Label>
              <div className="flex gap-2 flex-wrap">
                {CANAL_APP_OPTS.map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={config.canalApp === opt.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => set({ canalApp: opt.value })}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1"><User className="w-3.5 h-3.5" /> Nombre *</Label>
              <Input
                placeholder="Cliente"
                value={config.clienteNombre}
                onChange={(e) => set({ clienteNombre: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Teléfono</Label>
              <Input
                placeholder="Teléfono"
                value={config.clienteTelefono}
                onChange={(e) => set({ clienteTelefono: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Dirección *</Label>
              <Input
                placeholder="Dirección"
                value={config.clienteDireccion}
                onChange={(e) => set({ clienteDireccion: e.target.value })}
                className="h-9"
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
