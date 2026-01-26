import { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePermissionsV2 } from '@/hooks/usePermissionsV2';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, Truck, Store, RefreshCw, Zap, Settings2, ShoppingBag } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';
import BranchScheduleEditor from '@/components/schedules/BranchScheduleEditor';

type Branch = Tables<'branches'>;
type PrepTimeMode = 'dynamic' | 'custom';

export default function LocalConfig() {
  const { branchId } = useParams();
  const { branch: contextBranch } = useOutletContext<{ branch: Branch | null }>();
  const { isSuperadmin, isEncargado, isFranquiciado, local } = usePermissionsV2(branchId);
  
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [isOpen, setIsOpen] = useState(true);
  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  const [takeawayEnabled, setTakeawayEnabled] = useState(true);
  const [prepTimeMode, setPrepTimeMode] = useState<PrepTimeMode>('custom');
  const [customPrepTime, setCustomPrepTime] = useState(20);
  
  // Dynamic prep time calculation
  const [dynamicPrepTime, setDynamicPrepTime] = useState<number | null>(null);
  const [loadingDynamic, setLoadingDynamic] = useState(false);

  const canEdit = isSuperadmin || isFranquiciado || isEncargado || local.canEditLocalConfig;

  const fetchBranch = async () => {
    if (!branchId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('id', branchId)
        .single();

      if (error) throw error;
      
      setBranch(data);
      setIsOpen(data.is_open ?? true);
      setDeliveryEnabled(data.delivery_enabled ?? true);
      setTakeawayEnabled(data.takeaway_enabled ?? true);
      
      
      const storedPrepTime = data.estimated_prep_time_min;
      if (storedPrepTime === null || storedPrepTime === 0) {
        setPrepTimeMode('dynamic');
        setCustomPrepTime(20);
      } else {
        setPrepTimeMode('custom');
        setCustomPrepTime(storedPrepTime);
      }
    } catch (error: any) {
      toast.error('Error al cargar sucursal: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateDynamicPrepTime = async () => {
    if (!branchId) return;
    
    setLoadingDynamic(true);
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: orders, error } = await supabase
        .from('orders')
        .select('created_at, updated_at, status')
        .eq('branch_id', branchId)
        .in('status', ['ready', 'delivered'])
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (!orders || orders.length === 0) {
        setDynamicPrepTime(null);
        return;
      }

      const prepTimes = orders.map(order => {
        const created = new Date(order.created_at).getTime();
        const updated = new Date(order.updated_at).getTime();
        return (updated - created) / 1000 / 60;
      }).filter(time => time > 0 && time < 180);

      if (prepTimes.length === 0) {
        setDynamicPrepTime(null);
        return;
      }

      const avgTime = prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length;
      const roundedTime = Math.round(avgTime / 5) * 5;
      setDynamicPrepTime(Math.max(5, Math.min(120, roundedTime)));
    } catch (error) {
      console.error('Error calculating dynamic prep time:', error);
      setDynamicPrepTime(null);
    } finally {
      setLoadingDynamic(false);
    }
  };

  useEffect(() => {
    fetchBranch();
  }, [branchId]);

  useEffect(() => {
    if (branchId) {
      calculateDynamicPrepTime();
    }
  }, [branchId]);

  const handleSave = async () => {
    if (!canEdit || !branchId) {
      toast.error('No tenés permisos para modificar la configuración');
      return;
    }

    setSaving(true);
    try {
      const prepTimeToSave = prepTimeMode === 'dynamic' ? 0 : customPrepTime;

      const { error } = await supabase
        .from('branches')
        .update({
          is_open: isOpen,
          delivery_enabled: deliveryEnabled,
          takeaway_enabled: takeawayEnabled,
          estimated_prep_time_min: prepTimeToSave,
        })
        .eq('id', branchId);

      if (error) throw error;
      
      toast.success('Configuración guardada');
      fetchBranch();
    } catch (error: any) {
      toast.error('Error al guardar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getDisplayedPrepTime = (): number => {
    if (prepTimeMode === 'dynamic') {
      return dynamicPrepTime ?? 20;
    }
    return customPrepTime;
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
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-muted-foreground">{branch?.name}</p>
      </div>

      {!canEdit && (
        <Card className="bg-muted">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              Modo lectura: no tenés permisos para modificar la configuración.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Control Rápido de Servicios */}
      <Card className="border-2 border-dashed border-primary/30">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Control Rápido de Servicios</h3>
            <Badge variant="outline" className="ml-auto">Pausa temporal</Badge>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Local */}
            <div className={`p-4 rounded-lg border-2 transition-colors ${
              isOpen 
                ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' 
                : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <Store className={`h-5 w-5 ${isOpen ? 'text-green-600' : 'text-red-500'}`} />
                <Switch
                  checked={isOpen}
                  onCheckedChange={async (checked) => {
                    setIsOpen(checked);
                    if (canEdit && branchId) {
                      await supabase.from('branches').update({ is_open: checked }).eq('id', branchId);
                      toast.success(checked ? 'Local abierto' : 'Local cerrado');
                    }
                  }}
                  disabled={!canEdit}
                />
              </div>
              <p className="font-medium">Local</p>
              <p className="text-xs text-muted-foreground">Atención presencial</p>
            </div>

            {/* Delivery */}
            <div className={`p-4 rounded-lg border-2 transition-colors ${
              deliveryEnabled 
                ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' 
                : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <Truck className={`h-5 w-5 ${deliveryEnabled ? 'text-green-600' : 'text-red-500'}`} />
                <Switch
                  checked={deliveryEnabled}
                  onCheckedChange={async (checked) => {
                    setDeliveryEnabled(checked);
                    if (canEdit && branchId) {
                      await supabase.from('branches').update({ delivery_enabled: checked }).eq('id', branchId);
                      toast.success(checked ? 'Delivery activado' : 'Delivery pausado');
                    }
                  }}
                  disabled={!canEdit}
                />
              </div>
              <p className="font-medium">Delivery</p>
              <p className="text-xs text-muted-foreground">Envío a domicilio</p>
            </div>

            {/* Take Away */}
            <div className={`p-4 rounded-lg border-2 transition-colors ${
              takeawayEnabled 
                ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' 
                : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <ShoppingBag className={`h-5 w-5 ${takeawayEnabled ? 'text-green-600' : 'text-red-500'}`} />
                <Switch
                  checked={takeawayEnabled}
                  onCheckedChange={async (checked) => {
                    setTakeawayEnabled(checked);
                    if (canEdit && branchId) {
                      await supabase.from('branches').update({ takeaway_enabled: checked }).eq('id', branchId);
                      toast.success(checked ? 'Take Away activado' : 'Take Away pausado');
                    }
                  }}
                  disabled={!canEdit}
                />
              </div>
              <p className="font-medium">Take Away</p>
              <p className="text-xs text-muted-foreground">Para llevar</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            💡 Usá estos controles cuando estés saturado. Los clientes verán el servicio como no disponible temporalmente.
          </p>
        </CardContent>
      </Card>

      {/* Tiempo de Preparación */}
      <Card>
        <CardContent className="pt-6">

          {/* Tiempo de Preparación */}
          <div className="py-4 last:pb-6">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 space-y-4">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Tiempo de Preparación</Label>
                  <p className="text-sm text-muted-foreground">
                    Desde que entra el pedido hasta que está listo para entregar.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    No incluye el tiempo de delivery.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Select
                    value={prepTimeMode}
                    onValueChange={(v) => setPrepTimeMode(v as PrepTimeMode)}
                    disabled={!canEdit}
                  >
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dynamic">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          Dinámico
                        </div>
                      </SelectItem>
                      <SelectItem value="custom">
                        <div className="flex items-center gap-2">
                          <Settings2 className="h-4 w-4" />
                          Personalizado
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {prepTimeMode === 'custom' ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={5}
                        max={120}
                        value={customPrepTime}
                        onChange={(e) => setCustomPrepTime(Number(e.target.value))}
                        disabled={!canEdit}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">min</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      {loadingDynamic ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Calculando...</span>
                        </div>
                      ) : dynamicPrepTime !== null ? (
                        <Badge variant="secondary" className="text-base px-3 py-1">
                          ~{dynamicPrepTime} min
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-base px-3 py-1">
                          ~20 min (sin datos)
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {prepTimeMode === 'dynamic' && (
                  <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      <span>
                        Calculado automáticamente según el tiempo promedio de los últimos 50 pedidos completados (7 días).
                      </span>
                    </p>
                    {dynamicPrepTime !== null && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="mt-2 h-7 px-2"
                        onClick={calculateDynamicPrepTime}
                        disabled={loadingDynamic}
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${loadingDynamic ? 'animate-spin' : ''}`} />
                        Recalcular ahora
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Link a Integraciones */}
      <Card className="border-dashed">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Integraciones y Facturación</p>
              <p className="text-sm text-muted-foreground">
                MercadoPago, Rappi, PedidosYa, Facturante y otras configuraciones
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => window.location.href = `/local/${branchId}/config/integraciones`}
            >
              Ir a Integraciones
            </Button>
          </div>
        </CardContent>
      </Card>


      {/* Horarios de Atención */}
      {branchId && (
        <BranchScheduleEditor branchId={branchId} canEdit={canEdit} />
      )}

      {/* Preview Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Vista previa para clientes</p>
              <p className="text-muted-foreground text-sm">
                {isOpen ? 'Abierto' : 'Cerrado'} · Tiempo estimado: ~{getDisplayedPrepTime()} min
              </p>
            </div>
            <Badge variant={isOpen ? 'default' : 'secondary'}>
              {isOpen ? '🟢 Abierto' : '🔴 Cerrado'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
