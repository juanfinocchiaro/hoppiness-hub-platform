import { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Plus, Pencil, Trash2, DollarSign, Clock, RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface DeliveryZone {
  id: string;
  branch_id: string;
  name: string;
  description: string | null;
  neighborhoods: string[] | null;
  delivery_fee: number;
  min_order_amount: number;
  estimated_time_min: number;
  is_active: boolean;
  display_order: number;
}

export default function LocalDeliveryZones() {
  const { branchId } = useParams<{ branchId: string }>();
  const { branch } = useOutletContext<{ branch: Branch | null }>();
  const { isAdmin, isGerente, branchPermissions } = useUserRole();

  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    neighborhoods: '',
    delivery_fee: 0,
    min_order_amount: 0,
    estimated_time_min: 30,
    is_active: true,
  });

  const currentPermissions = branchPermissions.find(p => p.branch_id === branchId);
  const canEdit = isAdmin || isGerente || currentPermissions?.can_manage_staff;

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
      setZones((data as DeliveryZone[]) || []);
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

      const zoneData = {
        branch_id: branchId,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        neighborhoods: neighborhoods.length > 0 ? neighborhoods : null,
        delivery_fee: formData.delivery_fee,
        min_order_amount: formData.min_order_amount,
        estimated_time_min: formData.estimated_time_min,
        is_active: formData.is_active,
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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Zona
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="delivery_fee">Costo de Envío</Label>
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
        )}
      </div>

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
              Agregá zonas para definir dónde pueden pedir tus clientes
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
                    <span>Envío: {formatCurrency(zone.delivery_fee)}</span>
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

                {canEdit && (
                  <div className="flex justify-end gap-2 pt-2 border-t">
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
