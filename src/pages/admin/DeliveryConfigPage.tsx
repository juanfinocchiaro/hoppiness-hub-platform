import { Component, type ReactNode } from 'react';
import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Truck, MapPin, Save, ExternalLink, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  useDeliveryPricingConfig,
  useUpdateDeliveryPricingConfig,
  useAllBranchDeliveryConfigs,
} from '@/hooks/useDeliveryConfig';
import { RequireBrandPermission } from '@/components/guards';

class DeliveryPageErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="space-y-6">
          <PageHeader title="Delivery" subtitle="Configuración global de delivery" icon={Truck} />
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Ocurrió un error al cargar esta página. Revisá la consola del navegador o intentá de nuevo.
            </CardContent>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}

function DeliveryPricingForm() {
  const { data: config, isLoading, isError } = useDeliveryPricingConfig();
  const updateConfig = useUpdateDeliveryPricingConfig();

  const [form, setForm] = useState<{
    base_distance_km: string;
    base_price: string;
    price_per_extra_km: string;
    max_allowed_radius_km: string;
    estimated_speed_kmh: string;
    prep_time_minutes: string;
    time_disclaimer: string;
  } | null>(null);

  const values = form ?? {
    base_distance_km: String(config?.base_distance_km ?? 2.5),
    base_price: String(config?.base_price ?? 2000),
    price_per_extra_km: String(config?.price_per_extra_km ?? 1000),
    max_allowed_radius_km: String(config?.max_allowed_radius_km ?? 10),
    estimated_speed_kmh: String(config?.estimated_speed_kmh ?? 25),
    prep_time_minutes: String(config?.prep_time_minutes ?? 15),
    time_disclaimer: config?.time_disclaimer ?? '',
  };

  const setField = (key: string, value: string) => {
    setForm((prev) => ({ ...(prev ?? values), [key]: value }));
  };

  const exampleDistance = 4.2;
  const baseDist = parseFloat(values.base_distance_km) || 0;
  const basePrice = parseInt(values.base_price) || 0;
  const perKm = parseInt(values.price_per_extra_km) || 0;
  const exampleCost = basePrice + Math.max(0, exampleDistance - baseDist) * perKm;

  const handleSave = () => {
    updateConfig.mutate({
      base_distance_km: parseFloat(values.base_distance_km),
      base_price: parseInt(values.base_price),
      price_per_extra_km: parseInt(values.price_per_extra_km),
      max_allowed_radius_km: parseFloat(values.max_allowed_radius_km),
      estimated_speed_kmh: parseInt(values.estimated_speed_kmh),
      prep_time_minutes: parseInt(values.prep_time_minutes),
      time_disclaimer: values.time_disclaimer || null,
    });
    setForm(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No se pudo cargar la configuración de pricing. Revisá que la migración de delivery esté aplicada.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Fórmula de Pricing
        </CardTitle>
        <CardDescription>
          Define cómo se calcula el costo de envío para todos los locales de la red.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Distancia base incluida (km)</Label>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={values.base_distance_km}
              onChange={(e) => setField('base_distance_km', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Costo base ($)</Label>
            <Input
              type="number"
              step="100"
              min="0"
              value={values.base_price}
              onChange={(e) => setField('base_price', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Costo por km excedente ($)</Label>
            <Input
              type="number"
              step="100"
              min="0"
              value={values.price_per_extra_km}
              onChange={(e) => setField('price_per_extra_km', e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 p-4 text-sm">
          <p className="font-medium mb-1">Ejemplo de cálculo</p>
          <p className="text-muted-foreground">
            Un cliente a {exampleDistance} km paga: ${basePrice.toLocaleString()} + ({exampleDistance} - {baseDist}) × ${perKm.toLocaleString()} = <span className="font-semibold text-foreground">${Math.round(exampleCost).toLocaleString()}</span>
          </p>
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Radio máximo permitido (km)</Label>
            <Input
              type="number"
              step="0.5"
              min="1"
              value={values.max_allowed_radius_km}
              onChange={(e) => setField('max_allowed_radius_km', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Velocidad estimada (km/h)</Label>
            <Input
              type="number"
              min="5"
              value={values.estimated_speed_kmh}
              onChange={(e) => setField('estimated_speed_kmh', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Tiempo preparación (min)</Label>
            <Input
              type="number"
              min="0"
              value={values.prep_time_minutes}
              onChange={(e) => setField('prep_time_minutes', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Mensaje al cliente (disclaimer)</Label>
          <Textarea
            value={values.time_disclaimer}
            onChange={(e) => setField('time_disclaimer', e.target.value)}
            placeholder="Ej: El cadete puede tener hasta 2 pedidos más"
            rows={2}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateConfig.isPending}>
            {updateConfig.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Guardar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BranchDeliveryOverviewList() {
  const { data: configs, isLoading, isError } = useAllBranchDeliveryConfigs();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !configs || configs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {isError
            ? 'No se pudo cargar la lista de locales. Revisá que la migración de delivery esté aplicada.'
            : 'No hay locales con delivery configurado.'}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Cobertura por Local
        </CardTitle>
        <CardDescription>
          Configuración de delivery y radio de cobertura de cada local.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {configs.map((cfg: any) => {
          const branch = cfg.branches;
          const isOverridden = cfg.radius_override_km != null &&
            (!cfg.radius_override_until || new Date(cfg.radius_override_until) > new Date());
          const effectiveRadius = isOverridden ? cfg.radius_override_km : cfg.default_radius_km;

          return (
            <div
              key={cfg.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{branch?.name ?? 'Local'}</span>
                  {cfg.delivery_enabled ? (
                    <Badge variant="default" className="bg-green-600 text-xs">Activo</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Inactivo</Badge>
                  )}
                  {isOverridden && (
                    <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      Radio reducido
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Radio default: {cfg.default_radius_km} km
                  {isOverridden && ` · Actual: ${effectiveRadius} km`}
                </p>
              </div>
              <Link to={`/mimarca/delivery/${branch?.id}`}>
                <Button variant="outline" size="sm">
                  Ver detalle
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function DeliveryConfigPageContent() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery"
        subtitle="Configuración global de delivery para toda la red"
        icon={Truck}
      />
      <DeliveryPricingForm />
      <BranchDeliveryOverviewList />
    </div>
  );
}

export default function DeliveryConfigPage() {
  return (
    <RequireBrandPermission permission="canManageDeliveryZones">
      <DeliveryPageErrorBoundary>
        <DeliveryConfigPageContent />
      </DeliveryPageErrorBoundary>
    </RequireBrandPermission>
  );
}
