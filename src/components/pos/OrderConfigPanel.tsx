/**
 * OrderConfigPanel - Selector de canal de venta y número de llamador
 * Fase 1: canal mostrador/apps, tipo servicio (takeaway, comer acá, delivery), llamadores
 */
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Store, Utensils, Bike, ShoppingCart, Hash, ChevronRight, Pencil, FileText, ChevronDown } from 'lucide-react';
import type { CanalVenta, TipoServicio, CanalApp, TipoFactura, OrderConfig } from '@/types/pos';

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

const TIPO_FACTURA_OPTS: { value: TipoFactura; label: string; short: string }[] = [
  { value: 'B', label: 'Factura B (CF / Mono)', short: 'B' },
  { value: 'A', label: 'Factura A (RI)', short: 'A' },
];

const CANAL_LABELS: Record<CanalVenta, string> = { mostrador: 'Mostrador', apps: 'Apps' };
const TIPO_LABELS: Record<TipoServicio, string> = { takeaway: 'Para llevar', comer_aca: 'Comer acá', delivery: 'Delivery' };
const APP_LABELS: Record<CanalApp, string> = { rappi: 'Rappi', pedidos_ya: 'PedidosYa', mp_delivery: 'MP Delivery' };

const APP_REF_DIGITS: Record<CanalApp, { maxLength: number; placeholder: string } | null> = {
  rappi: { maxLength: 6, placeholder: '6 dígitos' },
  mp_delivery: { maxLength: 3, placeholder: '3 dígitos' },
  pedidos_ya: null,
};

interface OrderConfigPanelProps {
  config: OrderConfig;
  onChange: (config: OrderConfig) => void;
  compact?: boolean;
  onConfirm?: () => void;
  /** Si true, el botón Delivery se deshabilita y muestra tooltip con motivo */
  deliveryDisabled?: boolean;
  deliveryDisabledReason?: string;
}

function ConfigSummaryLine({ config }: { config: OrderConfig }) {
  const parts: string[] = [];
  parts.push(CANAL_LABELS[config.canalVenta] || config.canalVenta);

  if (config.canalVenta === 'mostrador' && config.tipoServicio) {
    parts.push(TIPO_LABELS[config.tipoServicio] || config.tipoServicio);
  }
  if (config.canalVenta === 'apps' && config.canalApp) {
    parts.push(APP_LABELS[config.canalApp] || config.canalApp);
  }

  // Build detail chips
  const details: string[] = [];
  if (config.numeroLlamador) details.push(`#${config.numeroLlamador}`);
  if (config.referenciaApp && config.canalVenta === 'apps') details.push(config.referenciaApp);
  if ((config.costoDelivery ?? 0) > 0) {
    details.push(`Envío $${(config.costoDelivery ?? 0).toLocaleString('es-AR')}`);
  }
  if ((config.descuentoPlataforma ?? 0) > 0) {
    details.push(`Desc.plat -$${(config.descuentoPlataforma ?? 0).toLocaleString('es-AR')}`);
  }
  if ((config.descuentoRestaurante ?? 0) > 0) {
    details.push(`Desc.rest -$${(config.descuentoRestaurante ?? 0).toLocaleString('es-AR')}`);
  }
  if (config.clienteNombre && !config.clienteNombre.startsWith('Llamador #')) {
    details.push(config.clienteNombre);
  } else if (config.clienteNombre) {
    details.push(config.clienteNombre);
  }
  if (config.canalVenta === 'mostrador') {
    if (config.clienteTelefono) details.push(config.clienteTelefono);
    if (config.clienteDireccion) details.push(config.clienteDireccion);
  }
  if (config.tipoFactura === 'A' && config.canalVenta === 'mostrador') {
    details.push('Fact. A');
  }

  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="flex items-center gap-1.5 text-sm font-medium truncate">
        {parts.map((p, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
            <span>{p}</span>
          </span>
        ))}
      </span>
      {details.length > 0 && (
        <span className="text-xs text-muted-foreground truncate">
          {details.join(' · ')}
        </span>
      )}
    </div>
  );
}

/** Parse a combined referenciaApp back into digits + name parts */
function parseRefParts(ref: string): { digits: string; name: string } {
  const trimmed = ref.trim();
  const match = trimmed.match(/^(\d+)\s*(.*)/);
  if (match) return { digits: match[1], name: match[2] };
  return { digits: '', name: trimmed };
}

export function ConfigForm({
  config,
  onChange,
  onConfirm,
  deliveryDisabled = false,
  deliveryDisabledReason = 'Configurá delivery en Caja para habilitar este canal.',
}: {
  config: OrderConfig;
  onChange: (config: OrderConfig) => void;
  onConfirm?: () => void;
  deliveryDisabled?: boolean;
  deliveryDisabledReason?: string;
}) {
  const [receptorOpen, setReceptorOpen] = useState(false);

  const parsed = parseRefParts(config.referenciaApp);
  const [refDigits, setRefDigits] = useState(parsed.digits);
  const [refName, setRefName] = useState(parsed.name);

  const set = (partial: Partial<OrderConfig>) => {
    if (partial.tipoFactura && partial.tipoFactura !== config.tipoFactura) {
      setReceptorOpen(false);
    }
    onChange({ ...config, ...partial });
  };

  useEffect(() => {
    const p = parseRefParts(config.referenciaApp);
    setRefDigits(p.digits);
    setRefName(p.name);
  }, [config.canalApp, config.referenciaApp]);

  const updateRef = (digits: string, name: string) => {
    setRefDigits(digits);
    setRefName(name);
    const combined = [digits, name].filter(Boolean).join(' ');
    set({ referenciaApp: combined });
  };

  return (
    <div className="space-y-4">
      {/* Canal: Mostrador | Apps */}
      <div className="space-y-2">
        <Label className="text-xs">Canal de venta</Label>
        <div className="flex gap-2 flex-wrap">
          {CANAL_OPTS.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              variant={config.canalVenta === opt.value ? 'default' : 'outline'}
              size="sm"
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

          {(config.tipoServicio === 'comer_aca' || config.tipoServicio === 'takeaway') && (
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <Hash className="w-3.5 h-3.5" />
                Número de llamador
              </Label>
              <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5">
                {CALLER_NUMBERS.map((num) => (
                  <Button
                    key={num}
                    type="button"
                    variant={config.numeroLlamador === String(num) ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 text-xs font-medium"
                    onClick={() => {
                      const updates: Partial<OrderConfig> = { numeroLlamador: String(num) };
                      if (!config.clienteNombre || config.clienteNombre.startsWith('Llamador #')) {
                        updates.clienteNombre = `Llamador #${num}`;
                      }
                      set(updates);
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
                  value={config.clienteNombre?.startsWith('Llamador #') ? '' : (config.clienteNombre ?? '')}
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

          {config.tipoServicio === 'delivery' && (
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Nombre *</Label>
                <Input placeholder="Cliente" value={config.clienteNombre} onChange={(e) => set({ clienteNombre: e.target.value })} className="h-9 mt-1" />
              </div>
              <div>
                <Label className="text-xs">Teléfono *</Label>
                <Input placeholder="Teléfono" value={config.clienteTelefono} onChange={(e) => set({ clienteTelefono: e.target.value })} className="h-9 mt-1" />
              </div>
              <div>
                <Label className="text-xs">Dirección *</Label>
                <Input placeholder="Dirección de entrega" value={config.clienteDireccion} onChange={(e) => set({ clienteDireccion: e.target.value })} className="h-9 mt-1" />
              </div>
            </div>
          )}

          {/* Descuento restaurante — siempre disponible para promos propias */}
          <div className="space-y-2">
            <Label className="text-xs">Descuento del restaurante ($)</Label>
            <Input
              type="number"
              min={0}
              step={100}
              placeholder="0"
              value={config.descuentoRestaurante ?? 0}
              onChange={(e) => set({ descuentoRestaurante: Math.max(0, Number(e.target.value) || 0) })}
              className="h-9"
            />
          </div>
        </>
      )}

      {config.canalVenta === 'apps' && (
        <>
          <div className="space-y-2">
            <Label className="text-xs">Plataforma</Label>
            <div className="flex gap-2 flex-wrap">
              {CANAL_APP_OPTS.map((opt) => (
                <Button key={opt.value} type="button" variant={config.canalApp === opt.value ? 'default' : 'outline'} size="sm" onClick={() => set({ canalApp: opt.value })}>
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1"><Hash className="w-3.5 h-3.5" /> Referencia del pedido</Label>
            {APP_REF_DIGITS[config.canalApp] ? (
              <div className="flex gap-2">
                <Input
                  placeholder={APP_REF_DIGITS[config.canalApp]!.placeholder}
                  value={refDigits}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, APP_REF_DIGITS[config.canalApp]!.maxLength);
                    updateRef(v, refName);
                  }}
                  className="h-9 w-28 shrink-0"
                  inputMode="numeric"
                />
                <Input
                  placeholder="Nombre"
                  value={refName}
                  onChange={(e) => updateRef(refDigits, e.target.value)}
                  className="h-9 flex-1"
                />
              </div>
            ) : (
              <Input
                placeholder="Nombre de la persona"
                value={config.referenciaApp}
                onChange={(e) => set({ referenciaApp: e.target.value })}
                className="h-9"
              />
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Costo envío cobrado al cliente ($)</Label>
            <Input
              type="number"
              min={0}
              step={100}
              placeholder="0"
              value={config.costoDelivery ?? 0}
              onChange={(e) => set({ costoDelivery: Math.max(0, Number(e.target.value) || 0) })}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Descuento de plataforma ($)</Label>
            <Input
              type="number"
              min={0}
              step={100}
              placeholder="0"
              value={config.descuentoPlataforma ?? 0}
              onChange={(e) => set({ descuentoPlataforma: Math.max(0, Number(e.target.value) || 0) })}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Descuento del restaurante ($)</Label>
            <Input
              type="number"
              min={0}
              step={100}
              placeholder="0"
              value={config.descuentoRestaurante ?? 0}
              onChange={(e) => set({ descuentoRestaurante: Math.max(0, Number(e.target.value) || 0) })}
              className="h-9"
            />
          </div>
        </>
      )}

      {/* Tipo de factura - solo mostrador (apps siempre CF) */}
      {config.canalVenta === 'mostrador' && (
        <div className="space-y-2 border-t pt-4 mt-2">
          <Label className="text-xs flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            Comprobante
          </Label>
          <div className="flex gap-2 flex-wrap">
            {TIPO_FACTURA_OPTS.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                variant={config.tipoFactura === opt.value ? 'default' : 'outline'}
                size="sm"
                className="flex-1 min-w-0"
                onClick={() => set({
                  tipoFactura: opt.value,
                })}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          {config.tipoFactura === 'A' && (
            <div className="space-y-2 mt-2 p-3 rounded-md bg-muted/50 border">
              <div>
                <Label className="text-xs">CUIT *</Label>
                <Input
                  placeholder="20-12345678-9"
                  value={config.receptorCuit}
                  onChange={(e) => set({ receptorCuit: e.target.value })}
                  className="h-9 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Razón Social *</Label>
                <Input
                  placeholder="Nombre o razón social"
                  value={config.receptorRazonSocial}
                  onChange={(e) => set({ receptorRazonSocial: e.target.value })}
                  className="h-9 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Email (opcional)</Label>
                <Input
                  placeholder="email@ejemplo.com"
                  value={config.receptorEmail}
                  onChange={(e) => set({ receptorEmail: e.target.value })}
                  className="h-9 mt-1"
                  type="email"
                />
              </div>
            </div>
          )}

          {config.tipoFactura === 'B' && (
            <Collapsible open={receptorOpen} onOpenChange={setReceptorOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="mt-1 gap-1.5 text-xs text-muted-foreground w-full justify-start">
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${receptorOpen ? '' : '-rotate-90'}`} />
                  Datos del receptor (opcional)
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-2 mt-1 p-3 rounded-md bg-muted/50 border">
                  <div>
                    <Label className="text-xs">CUIT (opcional)</Label>
                    <Input
                      placeholder="20-12345678-9"
                      value={config.receptorCuit}
                      onChange={(e) => set({ receptorCuit: e.target.value })}
                      className="h-9 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Razón Social (opcional)</Label>
                    <Input
                      placeholder="Nombre o razón social"
                      value={config.receptorRazonSocial}
                      onChange={(e) => set({ receptorRazonSocial: e.target.value })}
                      className="h-9 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Email (opcional)</Label>
                    <Input
                      placeholder="email@ejemplo.com"
                      value={config.receptorEmail}
                      onChange={(e) => set({ receptorEmail: e.target.value })}
                      className="h-9 mt-1"
                      type="email"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}

      {onConfirm && (
        <Button size="lg" className="w-full" onClick={onConfirm}>
          Comenzar venta
        </Button>
      )}
    </div>
  );
}

export function OrderConfigPanel({
  config,
  onChange,
  compact,
  onConfirm,
  deliveryDisabled = false,
  deliveryDisabledReason = 'Configurá delivery en Caja para habilitar este canal.',
}: OrderConfigPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (compact) {
    return (
      <Card>
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CardContent className="py-2.5 px-4">
            <div className="flex items-center justify-between gap-2">
              <ConfigSummaryLine config={config} />
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="shrink-0 gap-1.5 text-xs">
                  <Pencil className="w-3.5 h-3.5" />
                  Editar
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardContent>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4 px-4 border-t">
              <div className="pt-3">
                <ConfigForm
                  config={config}
                  onChange={onChange}
                  onConfirm={() => setExpanded(false)}
                  deliveryDisabled={deliveryDisabled}
                  deliveryDisabledReason={deliveryDisabledReason}
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-4 px-4">
        <p className="text-sm font-medium mb-3">Canal y cliente</p>
        <ConfigForm
          config={config}
          onChange={onChange}
          onConfirm={onConfirm}
          deliveryDisabled={deliveryDisabled}
          deliveryDisabledReason={deliveryDisabledReason}
        />
      </CardContent>
    </Card>
  );
}
