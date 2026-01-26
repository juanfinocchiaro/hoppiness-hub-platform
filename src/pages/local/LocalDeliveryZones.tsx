import { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePermissionsV2 } from '@/hooks/usePermissionsV2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MapPin, Plus, Pencil, Trash2, DollarSign, Clock, RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';
import DeliveryZoneMap from '@/components/maps/DeliveryZoneMap';

type Branch = Tables<'branches'>;

interface ZoneShape {
  type: 'polygon' | 'circle';
  coordinates: any;
}

interface DeliveryZone {
  id: string;
  branch_id: string;
  name: string;
  description: string | null;
  neighborhoods: string[] | null;
  polygon_coords: ZoneShape | null;
  delivery_fee: number;
  min_order_amount: number;
  estimated_time_min: number;
  is_active: boolean;
  display_order: number;
  pricing_mode: 'fixed' | 'distance';
  base_fee: number;
  price_per_km: number;
  max_distance_km: number | null;
}

// Helper to safely parse polygon_coords from DB
const parsePolygonCoords = (data: any): ZoneShape | null => {
  if (!data) return null;
  if (typeof data === 'object' && data.type && data.coordinates) {
    return data as ZoneShape;
  }
  return null;
};

export default function LocalDeliveryZones() {
  const { branchId } = useParams<{ branchId: string }>();
  const { branch } = useOutletContext<{ branch: Branch | null }>();
  const { isSuperadmin, local } = usePermissionsV2();

  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [selectedZoneForMap, setSelectedZoneForMap] = useState<DeliveryZone | null>(null);

  // Branch location (hardcoded for now, could be in DB)
  // TODO: Add lat/lng columns to branches table
  const branchLocation = { lat: -31.4201, lng: -64.1888 };

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    neighborhoods: '',
    delivery_fee: 0,
    min_order_amount: 0,
    estimated_time_min: 30,
    is_active: true,
    polygon_coords: null as ZoneShape | null,
    pricing_mode: 'fixed' as 'fixed' | 'distance',
    base_fee: 0,
    price_per_km: 0,
    max_distance_km: null as number | null,
  });

  const canEdit = isSuperadmin || local.canConfigDeliveryZones;

  const fetchZones = async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('delivery_zones')
        .select('*')
        .eq('branch_id', branchId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      
      // Parse polygon_coords for each zone
      const parsedZones: DeliveryZone[] = (data || []).map((z: any) => ({
        ...z,
        polygon_coords: parsePolygonCoords(z.polygon_coords),
      }));
      
      setZones(parsedZones);
    } catch (error: any) {
      toast.error('Error al cargar zonas: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, [branchId]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      neighborhoods: '',
      delivery_fee: 0,
      min_order_amount: 0,
      estimated_time_min: 30,
      is_active: true,
      polygon_coords: null,
      pricing_mode: 'fixed',
      base_fee: 0,
      price_per_km: 0,
      max_distance_km: null,
    });
    setEditingZone(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (zone: DeliveryZone) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name,
      description: zone.description || '',
      neighborhoods: (zone.neighborhoods || []).join(', '),
      delivery_fee: zone.delivery_fee,
      min_order_amount: zone.min_order_amount,
      estimated_time_min: zone.estimated_time_min,
      is_active: zone.is_active,
      polygon_coords: zone.polygon_coords,
      pricing_mode: zone.pricing_mode || 'fixed',
      base_fee: zone.base_fee || 0,
      price_per_km: zone.price_per_km || 0,
      max_distance_km: zone.max_distance_km,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!canEdit || !branchId) {
      toast.error('No tenés permisos para modificar zonas');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('El nombre de la zona es requerido');
      return;
    }

    setSaving(true);
    try {
      const neighborhoods = formData.neighborhoods
        .split(',')
        .map(n => n.trim())
        .filter(n => n.length > 0);

      const zoneData: any = {
        branch_id: branchId,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        neighborhoods: neighborhoods.length > 0 ? neighborhoods : null,
        polygon_coords: formData.polygon_coords,
        delivery_fee: formData.pricing_mode === 'fixed' ? formData.delivery_fee : 0,
        min_order_amount: formData.min_order_amount,
        estimated_time_min: formData.estimated_time_min,
        is_active: formData.is_active,
        pricing_mode: formData.pricing_mode,
        base_fee: formData.pricing_mode === 'distance' ? formData.base_fee : 0,
        price_per_km: formData.pricing_mode === 'distance' ? formData.price_per_km : 0,
        max_distance_km: formData.pricing_mode === 'distance' ? formData.max_distance_km : null,
      };

      if (editingZone) {
        const { error } = await supabase
          .from('delivery_zones')
          .update(zoneData)
          .eq('id', editingZone.id);

        if (error) throw error;
        toast.success('Zona actualizada');
      } else {
        const { error } = await supabase
          .from('delivery_zones')
          .insert(zoneData);

        if (error) throw error;
        toast.success('Zona creada');
      }

      setDialogOpen(false);
      resetForm();
      fetchZones();
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleZoneActive = async (zone: DeliveryZone) => {
    if (!canEdit) return;

    try {
      const { error } = await supabase
        .from('delivery_zones')
        .update({ is_active: !zone.is_active })
        .eq('id', zone.id);

      if (error) throw error;

      setZones(prev =>
        prev.map(z => z.id === zone.id ? { ...z, is_active: !z.is_active } : z)
      );

      toast.success(zone.is_active ? 'Zona desactivada' : 'Zona activada');
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  };

  const deleteZone = async (zone: DeliveryZone) => {
    if (!canEdit) return;

    if (!confirm(`¿Eliminar la zona "${zone.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('delivery_zones')
        .delete()
        .eq('id', zone.id);

      if (error) throw error;

      setZones(prev => prev.filter(z => z.id !== zone.id));
      toast.success('Zona eliminada');
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getZoneTypeLabel = (zone: DeliveryZone) => {
    if (!zone.polygon_coords) return null;
    return zone.polygon_coords.type === 'circle' ? 'Círculo' : 'Polígono';
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Zonas de Delivery</h1>
          <p className="text-muted-foreground">{branch?.name}</p>
        </div>
        {canEdit && (
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Zona
          </Button>
        )}
      </div>

      {/* Zone Editor Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingZone ? 'Editar Zona' : 'Nueva Zona de Delivery'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la Zona *</Label>
              <Input
                id="name"
                placeholder="Ej: Centro, Nueva Córdoba"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* Map */}
            <div className="space-y-2">
              <Label>Zona de cobertura en el mapa</Label>
              <DeliveryZoneMap
                branchLocation={branchLocation}
                branchName={branch?.name}
                initialShape={formData.polygon_coords}
                onShapeChange={(shape) => setFormData({ ...formData, polygon_coords: shape })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="neighborhoods">Barrios (separados por coma)</Label>
              <Textarea
                id="neighborhoods"
                placeholder="Ej: Centro, Alberdi, Alta Córdoba"
                value={formData.neighborhoods}
                onChange={(e) => setFormData({ ...formData, neighborhoods: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Descripción opcional de la zona..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            {/* Pricing Mode */}
            <div className="space-y-4 p-4 rounded-lg bg-muted/50">
              <div className="space-y-2">
                <Label>Modo de Tarifa</Label>
                <Select
                  value={formData.pricing_mode}
                  onValueChange={(v: 'fixed' | 'distance') => setFormData({ ...formData, pricing_mode: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Tarifa Fija
                      </div>
                    </SelectItem>
                    <SelectItem value="distance">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Por Distancia ($/km)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.pricing_mode === 'fixed' ? (
                <div className="space-y-2">
                  <Label htmlFor="delivery_fee">Costo de Envío Fijo</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="delivery_fee"
                      type="number"
                      min={0}
                      value={formData.delivery_fee}
                      onChange={(e) => setFormData({ ...formData, delivery_fee: Number(e.target.value) })}
                      className="pl-7"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="base_fee">Tarifa Base</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          id="base_fee"
                          type="number"
                          min={0}
                          value={formData.base_fee}
                          onChange={(e) => setFormData({ ...formData, base_fee: Number(e.target.value) })}
                          className="pl-7"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price_per_km">Precio por Km</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          id="price_per_km"
                          type="number"
                          min={0}
                          value={formData.price_per_km}
                          onChange={(e) => setFormData({ ...formData, price_per_km: Number(e.target.value) })}
                          className="pl-7"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_distance">Distancia Máxima (km, opcional)</Label>
                    <Input
                      id="max_distance"
                      type="number"
                      min={0}
                      step={0.5}
                      value={formData.max_distance_km ?? ''}
                      onChange={(e) => setFormData({ ...formData, max_distance_km: e.target.value ? Number(e.target.value) : null })}
                      className="w-32"
                      placeholder="Sin límite"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ejemplo: Base $500 + $150/km → 3km = $500 + (3 × $150) = $950
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_order">Pedido Mínimo</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="min_order"
                  type="number"
                  min={0}
                  value={formData.min_order_amount}
                  onChange={(e) => setFormData({ ...formData, min_order_amount: Number(e.target.value) })}
                  className="pl-7"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimated_time">Tiempo estimado (min)</Label>
              <Input
                id="estimated_time"
                type="number"
                min={5}
                max={120}
                value={formData.estimated_time_min}
                onChange={(e) => setFormData({ ...formData, estimated_time_min: Number(e.target.value) })}
                className="w-24"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">Zona Activa</Label>
                <p className="text-xs text-muted-foreground">
                  Los clientes pueden pedir a esta zona
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editingZone ? 'Actualizar Zona' : 'Crear Zona'}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Zone Map Viewer Dialog */}
      <Dialog open={!!selectedZoneForMap} onOpenChange={() => setSelectedZoneForMap(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedZoneForMap?.name}</DialogTitle>
          </DialogHeader>
          {selectedZoneForMap && (
            <DeliveryZoneMap
              branchLocation={branchLocation}
              branchName={branch?.name}
              initialShape={selectedZoneForMap.polygon_coords}
              onShapeChange={() => {}}
              readOnly
            />
          )}
        </DialogContent>
      </Dialog>

      {!canEdit && (
        <Card className="bg-muted">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              Modo lectura: no tenés permisos para modificar zonas de delivery.
            </p>
          </CardContent>
        </Card>
      )}

      {zones.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Sin zonas de delivery</h3>
            <p className="text-muted-foreground mb-4">
              Agregá zonas dibujando en el mapa para definir dónde pueden pedir tus clientes
            </p>
            {canEdit && (
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Zona
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {zones.map((zone) => (
            <Card
              key={zone.id}
              className={`transition-colors ${!zone.is_active ? 'opacity-60 bg-muted' : ''}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className={`h-5 w-5 ${zone.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                    <CardTitle className="text-lg">{zone.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {getZoneTypeLabel(zone) && (
                      <Badge variant="outline" className="text-xs">
                        {getZoneTypeLabel(zone)}
                      </Badge>
                    )}
                    <Badge variant={zone.is_active ? 'default' : 'secondary'}>
                      {zone.is_active ? 'Activa' : 'Inactiva'}
                    </Badge>
                    {canEdit && (
                      <Switch
                        checked={zone.is_active}
                        onCheckedChange={() => toggleZoneActive(zone)}
                      />
                    )}
                  </div>
                </div>
                {zone.description && (
                  <CardDescription>{zone.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {zone.neighborhoods && zone.neighborhoods.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {zone.neighborhoods.map((n, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {n}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    {zone.pricing_mode === 'distance' ? (
                      <span>${zone.base_fee} + ${zone.price_per_km}/km</span>
                    ) : (
                      <span>Envío: {formatCurrency(zone.delivery_fee)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>Mín: {formatCurrency(zone.min_order_amount)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{zone.estimated_time_min} min</span>
                  </div>
                </div>

                <div className="flex justify-between gap-2 pt-2 border-t">
                  {zone.polygon_coords && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedZoneForMap(zone)}
                    >
                      <MapPin className="h-4 w-4 mr-1" />
                      Ver Mapa
                    </Button>
                  )}
                  {canEdit && (
                    <div className="flex gap-2 ml-auto">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(zone)}>
                        <Pencil className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteZone(zone)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
