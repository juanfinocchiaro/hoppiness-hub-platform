import { useOutletContext } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, MapPin, CheckCircle2, Ban, ShieldAlert, Info, Truck } from 'lucide-react';
import {
  useDeliveryPricingConfig,
  useBranchDeliveryConfig,
  useBranchNeighborhoods,
} from '@/hooks/useDeliveryConfig';

export default function LocalDeliveryZonesPage() {
  const ctx = useOutletContext<{ branch: { id: string; name: string } | null }>();
  const branch = ctx?.branch ?? null;
  const branchId = branch?.id;

  const { data: pricingConfig, isLoading: pricingLoading } = useDeliveryPricingConfig();
  const { data: config, isLoading: configLoading } = useBranchDeliveryConfig(branchId);
  const { data: neighborhoods = [], isLoading: neighLoading } = useBranchNeighborhoods(branchId);

  if (!branchId) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isLoading = pricingLoading || configLoading || neighLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const enabledNeighborhoods = neighborhoods.filter((n: { status?: string }) => n.status === 'enabled');
  const blockedNeighborhoods = neighborhoods.filter((n: { status?: string }) => typeof n.status === 'string' && n.status.startsWith('blocked'));

  const effectiveRadius = config
    ? (config.radius_override_km != null &&
       (!config.radius_override_until || new Date(config.radius_override_until) > new Date()))
      ? config.radius_override_km
      : config.default_radius_km
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Zonas de Delivery"
        subtitle="Configuración definida por la marca para tu local"
        icon={<MapPin className="w-6 h-6" />}
      />

      {/* Pricing formula */}
      {pricingConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-4 w-4" />
              Fórmula vigente
            </CardTitle>
            <CardDescription>Definida por la marca</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-muted-foreground">Base</p>
                <p className="text-lg font-semibold">
                  {pricingConfig.base_distance_km} km → ${pricingConfig.base_price.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-muted-foreground">Excedente</p>
                <p className="text-lg font-semibold">
                  ${pricingConfig.price_per_extra_km.toLocaleString()}/km
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-muted-foreground">Radio</p>
                <p className="text-lg font-semibold">
                  {effectiveRadius ?? '—'} km
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enabled neighborhoods */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Barrios habilitados ({enabledNeighborhoods.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {enabledNeighborhoods.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay barrios habilitados para delivery.
            </p>
          ) : (
            <div className="space-y-1.5">
              {enabledNeighborhoods.map((n: any) => (
                <div key={n.id} className="flex items-center gap-2 text-sm rounded-md px-2 py-1.5 hover:bg-muted/50">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <span>{n.city_neighborhoods?.name ?? '—'}</span>
                  {n.distance_km != null && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {n.distance_km} km
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blocked neighborhoods */}
      {blockedNeighborhoods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-red-600">
              Barrios bloqueados ({blockedNeighborhoods.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {blockedNeighborhoods.map((n: any) => (
                <div key={n.id} className="flex items-center gap-2 text-sm rounded-md px-2 py-1.5">
                  <Ban className="h-4 w-4 text-red-500 shrink-0" />
                  <span>{n.city_neighborhoods?.name ?? '—'}</span>
                  {n.block_reason && (
                    <Badge variant="outline" className="text-xs ml-auto">
                      {n.block_reason}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info message */}
      <div className="flex items-start gap-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-4 text-sm text-blue-800 dark:text-blue-300">
        <Info className="h-5 w-5 shrink-0 mt-0.5" />
        <p>
          Para modificar zonas, precios o el radio de cobertura, contactá a la marca.
          Podés ajustar el radio temporalmente desde el panel de operación (Dashboard).
        </p>
      </div>
    </div>
  );
}
