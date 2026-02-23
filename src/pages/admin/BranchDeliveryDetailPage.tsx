import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, MapPin, ArrowLeft, RefreshCw, ShieldAlert, CheckCircle2, AlertTriangle, Ban, ArrowUpDown, ArrowDownAZ, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, Fragment } from 'react';
import { toast } from 'sonner';
import {
  useBranchDeliveryConfig,
  useUpdateBranchDeliveryConfig,
  useBranchNeighborhoods,
  useUpdateNeighborhoodStatus,
  useRegenerateBranchNeighborhoods,
  useDeliveryPricingConfig,
} from '@/hooks/useDeliveryConfig';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RequireBrandPermission } from '@/components/guards';
import { StaticBranchMap } from '@/components/webapp/StaticBranchMap';

function BranchDeliveryDetailContent() {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: branch, isLoading: branchLoading } = useQuery({
    queryKey: ['branch-detail-delivery', branchId],
    queryFn: async () => {
      const { data } = await supabase
        .from('branches')
        .select('id, name, slug, latitude, longitude')
        .eq('id', branchId!)
        .single();
      return data;
    },
    enabled: !!branchId,
  });

  const { data: config, isLoading: configLoading } = useBranchDeliveryConfig(branchId);
  const { data: pricingConfig } = useDeliveryPricingConfig();
  const { data: neighborhoods = [], isLoading: neighLoading } = useBranchNeighborhoods(branchId);
  const updateConfig = useUpdateBranchDeliveryConfig();
  const updateNeighborhood = useUpdateNeighborhoodStatus();
  const regenerate = useRegenerateBranchNeighborhoods();

  const [radius, setRadius] = useState<number | null>(null);
  const [blockNeighborhoodId, setBlockNeighborhoodId] = useState('');
  const [blockReason, setBlockReason] = useState('Zona de riesgo');
  const [neighborhoodSort, setNeighborhoodSort] = useState<'distance' | 'alpha'>('distance');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<any | null>(null);

  const isLoading = branchLoading || configLoading || neighLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!branch || !config) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Local no encontrado o sin configuración de delivery.
      </div>
    );
  }

  const maxRadius = pricingConfig?.max_allowed_radius_km ?? 10;
  const currentRadius = radius ?? config.default_radius_km;
  const assignedCount = neighborhoods.filter((n: any) => n.status === 'enabled').length;
  const blockedCount = neighborhoods.filter((n: any) => n.status === 'blocked_security').length;
  const assignedNeighborhoods = neighborhoods.filter((n: any) => n.status === 'enabled');

  const sortedNeighborhoods = [...neighborhoods].sort((a: any, b: any) => {
    if (neighborhoodSort === 'distance') {
      const da = a.distance_km ?? Infinity;
      const db = b.distance_km ?? Infinity;
      return da - db;
    }
    const na = (a.city_neighborhoods?.name ?? '').toLowerCase();
    const nb = (b.city_neighborhoods?.name ?? '').toLowerCase();
    return na.localeCompare(nb);
  });

  const handleSaveRadius = () => {
    if (radius == null) return;
    updateConfig.mutate(
      { branchId: branch.id, values: { default_radius_km: radius } },
      {
        onSuccess: () => {
          toast.success('Radio actualizado');
          if (branch.latitude && branch.longitude) {
            regenerate.mutate({
              branchId: branch.id,
              branchLat: Number(branch.latitude),
              branchLng: Number(branch.longitude),
              radiusKm: radius,
            });
          }
        },
      }
    );
  };

  const handleToggleEnabled = (enabled: boolean) => {
    updateConfig.mutate({ branchId: branch.id, values: { delivery_enabled: enabled } });
  };

  const handleBlockNeighborhood = () => {
    if (!blockNeighborhoodId) return;
    updateNeighborhood.mutate({
      id: blockNeighborhoodId,
      status: 'blocked_security',
      blockReason,
    });
    setBlockNeighborhoodId('');
  };

  const handleUnblock = (id: string) => {
    updateNeighborhood.mutate({ id, status: 'enabled' });
  };

  const handleRegenerate = () => {
    if (!branch.latitude || !branch.longitude) {
      toast.error('El local no tiene coordenadas configuradas');
      return;
    }
    regenerate.mutate({
      branchId: branch.id,
      branchLat: Number(branch.latitude),
      branchLng: Number(branch.longitude),
      radiusKm: currentRadius,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/mimarca/delivery">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title={`${branch.name} — Zonas de Delivery`}
          subtitle={`Radio: ${currentRadius} km · ${assignedCount} asignados · ${blockedCount} bloqueados`}
          icon={<MapPin className="w-6 h-6" />}
        />
      </div>

      {/* Toggle + Radio */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuración del Local</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Delivery habilitado</Label>
              <p className="text-sm text-muted-foreground">
                Habilitar o deshabilitar el delivery para este local
              </p>
            </div>
            <Switch
              checked={config.delivery_enabled}
              onCheckedChange={handleToggleEnabled}
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <Label>Radio default: {currentRadius} km (máx {maxRadius} km)</Label>
            <Slider
              value={[currentRadius]}
              onValueChange={([v]) => setRadius(v)}
              min={1}
              max={maxRadius}
              step={0.5}
              className="w-full"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>1 km</span>
              <span>{maxRadius} km</span>
            </div>
            {radius != null && radius !== config.default_radius_km && (
              <Button onClick={handleSaveRadius} disabled={updateConfig.isPending} size="sm">
                {updateConfig.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar radio ({radius} km)
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Neighborhoods */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Barrios dentro del radio</CardTitle>
              <CardDescription>
                {assignedCount} asignados, {blockedCount} bloqueados
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={regenerate.isPending}
            >
              {regenerate.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Regenerar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {neighborhoods.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No hay barrios asignados. Hacé click en "Regenerar" para detectar barrios dentro del radio.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-muted-foreground">Ordenar:</span>
                <Select value={neighborhoodSort} onValueChange={(v: 'distance' | 'alpha') => setNeighborhoodSort(v)}>
                  <SelectTrigger className="w-[180px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="distance" className="flex items-center gap-2">
                      <ArrowUpDown className="h-3.5 w-3.5" />
                      Por distancia
                    </SelectItem>
                    <SelectItem value="alpha" className="flex items-center gap-2">
                      <ArrowDownAZ className="h-3.5 w-3.5" />
                      Alfabético
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
              {sortedNeighborhoods.map((n: any) => {
                const hood = n.city_neighborhoods;
                const isBlocked = n.status === 'blocked_security';
                return (
                  <Fragment key={n.id}>
                  <div
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedNeighborhood((prev: any) => prev?.id === n.id ? null : n)}
                      className="flex flex-1 min-w-0 items-center gap-2 text-left cursor-pointer hover:bg-muted/50 rounded -ml-1 pl-1 py-1 -my-1 transition-colors"
                    >
                      {isBlocked ? (
                        <Ban className="h-4 w-4 text-red-500 shrink-0" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      )}
                      <span className="text-sm font-medium truncate">{hood?.name ?? '—'}</span>
                      {n.distance_km != null && (
                        <span className="text-xs text-muted-foreground shrink-0">({n.distance_km} km)</span>
                      )}
                      {selectedNeighborhood?.id === n.id ? (
                        <ChevronUp className="h-4 w-4 shrink-0 ml-auto text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 ml-auto text-muted-foreground" />
                      )}
                    </button>
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {n.status === 'blocked_security' && (
                        <Badge variant="destructive" className="text-xs">
                          <ShieldAlert className="mr-1 h-3 w-3" />
                          {n.block_reason || 'Bloqueado'}
                        </Badge>
                      )}
                      {/* Acciones solo dentro del detalle expandido */}
                    </div>
                  </div>
                  {/* Inline detalle + mapa */}
                  {selectedNeighborhood?.id === n.id && (() => {
                    const sh = selectedNeighborhood;
                    const h = sh.city_neighborhoods;
                    const isBl = sh.status === 'blocked_security';
                    const lat = h?.centroid_lat != null && h?.centroid_lng != null ? Number(h.centroid_lat) : null;
                    const lng = h?.centroid_lng != null && h?.centroid_lat != null ? Number(h.centroid_lng) : null;
                    const mapsUrl = lat != null && lng != null ? `https://www.google.com/maps?q=${lat},${lng}` : null;
                    return (
                      <div className="rounded-md border border-t-0 bg-muted/30 px-3 py-3 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          {h?.city && <p><span className="text-muted-foreground">Ciudad:</span> {h.city}</p>}
                          {sh.distance_km != null && <p><span className="text-muted-foreground">Distancia:</span> {sh.distance_km} km</p>}
                          <p>
                            <span className="text-muted-foreground">Estado:</span>{' '}
                            {isBl ? (
                              <Badge variant="destructive" className="text-xs ml-1">
                                {sh.block_reason || 'Bloqueado'}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs ml-1 bg-green-600 text-white">Asignado</Badge>
                            )}
                          </p>
                          <p><span className="text-muted-foreground">Decidido por:</span> {sh.decided_by === 'brand_admin' ? 'Marca' : 'Automático'}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
                          {isBl ? (
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleUnblock(sh.id)}
                              disabled={updateNeighborhood.isPending}
                            >
                              Habilitar barrio
                            </Button>
                          ) : blockNeighborhoodId === sh.id ? (
                            <div className="w-full space-y-3 rounded-md border border-red-200 bg-red-50/50 dark:bg-red-950/20 p-3">
                              <Label className="text-sm font-medium">Motivo del bloqueo</Label>
                              <Select value={blockReason} onValueChange={setBlockReason}>
                                <SelectTrigger className="w-full max-w-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Zona de riesgo">Zona de riesgo</SelectItem>
                                  <SelectItem value="Sin acceso vial">Sin acceso vial</SelectItem>
                                  <SelectItem value="Fuera de cobertura real">Fuera de cobertura real</SelectItem>
                                  <SelectItem value="Otro motivo">Otro motivo</SelectItem>
                                </SelectContent>
                              </Select>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setBlockNeighborhoodId('')}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={handleBlockNeighborhood}
                                  disabled={updateNeighborhood.isPending}
                                >
                                  {updateNeighborhood.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                  Confirmar bloqueo
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setBlockNeighborhoodId(sh.id)}
                              disabled={updateNeighborhood.isPending}
                            >
                              Bloquear barrio
                            </Button>
                          )}
                        </div>
                        {lat != null && lng != null && mapsUrl && (
                          <StaticBranchMap
                            latitude={lat}
                            longitude={lng}
                            mapsUrl={mapsUrl}
                            height={200}
                            linkLabel="Ver en mapa"
                            className="w-full"
                          />
                        )}
                      </div>
                    );
                  })()}
                  </Fragment>
                );
              })}
            </div>
            </>
          )}

        </CardContent>
      </Card>

    </div>
  );
}

export default function BranchDeliveryDetailPage() {
  return (
    <RequireBrandPermission permission="canManageDeliveryZones">
      <BranchDeliveryDetailContent />
    </RequireBrandPermission>
  );
}
