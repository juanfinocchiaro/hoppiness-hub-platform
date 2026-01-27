import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Building2, 
  Clock, 
  Receipt, 
  Save, 
  Loader2, 
  MapPin,
  X,
  Copy,
  CheckCircle2
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import BranchLocationMap from '@/components/maps/BranchLocationMap';

type Branch = Tables<'branches'>;

interface BranchEditPanelProps {
  branch: Branch;
  onSaved: () => void;
  onCancel: () => void;
}

interface FiscalData {
  razon_social?: string;
  cuit?: string;
  condicion_iva?: string;
  domicilio_fiscal?: string;
  inicio_actividades?: string;
  punto_venta?: string;
}

interface Schedule {
  id: string;
  day_of_week: number;
  opens_at: string;
  closes_at: string;
  is_enabled: boolean;
}

const IVA_CONDITIONS = [
  { value: 'responsable_inscripto', label: 'Responsable Inscripto' },
  { value: 'monotributista', label: 'Monotributista' },
  { value: 'exento', label: 'Exento' },
];

const DAYS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2).toString().padStart(2, '0');
  const minutes = i % 2 === 0 ? '00' : '30';
  return { value: `${hour}:${minutes}:00`, label: `${hour}:${minutes}` };
});

export default function BranchEditPanel({ branch, onSaved, onCancel }: BranchEditPanelProps) {
  const [activeTab, setActiveTab] = useState('datos');
  const [saving, setSaving] = useState(false);
  
  // Datos básicos
  const [name, setName] = useState(branch.name || '');
  const [address, setAddress] = useState(branch.address || '');
  const [city, setCity] = useState(branch.city || '');
  const [phone, setPhone] = useState(branch.phone || '');
  const [email, setEmail] = useState(branch.email || '');
  const [latitude, setLatitude] = useState((branch as any).latitude?.toString() || '');
  const [longitude, setLongitude] = useState((branch as any).longitude?.toString() || '');
  
  // Datos fiscales
  const [fiscalData, setFiscalData] = useState<FiscalData>((branch as any).fiscal_data || {});
  
  // Horarios
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [hasScheduleChanges, setHasScheduleChanges] = useState(false);
  
  // Mapa (on-demand)
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    fetchSchedules();
  }, [branch.id]);

  const fetchSchedules = async () => {
    setLoadingSchedules(true);
    try {
      const { data } = await supabase
        .from('branch_schedules')
        .select('id, day_of_week, opens_at, closes_at, is_enabled')
        .eq('branch_id', branch.id)
        .eq('service_type', 'dine_in')
        .eq('shift_number', 1)
        .order('day_of_week');

      setSchedules((data || []) as Schedule[]);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('branches')
        .update({
          name,
          address,
          city,
          phone: phone || null,
          email: email || null,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          fiscal_data: fiscalData,
        } as any)
        .eq('id', branch.id);

      if (error) throw error;

      if (hasScheduleChanges) {
        for (const schedule of schedules) {
          await supabase
            .from('branch_schedules')
            .update({
              opens_at: schedule.opens_at,
              closes_at: schedule.closes_at,
              is_enabled: schedule.is_enabled,
            })
            .eq('id', schedule.id);
        }
      }

      toast.success('Sucursal actualizada');
      onSaved();
    } catch (error) {
      console.error('Error saving branch:', error);
      toast.error('Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const updateSchedule = (dayOfWeek: number, field: keyof Schedule, value: any) => {
    setSchedules(prev => prev.map(s => {
      if (s.day_of_week === dayOfWeek) {
        return { ...s, [field]: value };
      }
      return s;
    }));
    setHasScheduleChanges(true);
  };

  const copyMondayToAll = () => {
    const monday = schedules.find(s => s.day_of_week === 1);
    if (!monday) return;

    setSchedules(prev => prev.map(s => ({
      ...s,
      opens_at: monday.opens_at,
      closes_at: monday.closes_at,
      is_enabled: monday.is_enabled,
    })));
    setHasScheduleChanges(true);
    toast.success('Horario del lunes copiado a todos los días');
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-sm">
          <TabsTrigger value="datos" className="gap-1.5">
            <Building2 className="h-4 w-4" />
            Datos
          </TabsTrigger>
          <TabsTrigger value="horarios" className="gap-1.5">
            <Clock className="h-4 w-4" />
            Horarios
          </TabsTrigger>
          <TabsTrigger value="fiscal" className="gap-1.5">
            <Receipt className="h-4 w-4" />
            Fiscal
          </TabsTrigger>
        </TabsList>

        {/* TAB: DATOS */}
        <TabsContent value="datos" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Manantiales"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="351-1234567"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="address">Dirección *</Label>
                {latitude && longitude && (
                  <span className="flex items-center gap-1 text-xs text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Ubicado
                  </span>
                )}
              </div>
              {!showMap && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMap(true)}
                  className="gap-1.5"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  Ubicar en mapa
                </Button>
              )}
            </div>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Dirección completa"
            />
            {showMap && (
              <div className="space-y-2 mt-2">
                <BranchLocationMap
                  address={address}
                  city={city}
                  latitude={latitude}
                  longitude={longitude}
                  onLocationChange={(lat, lng) => {
                    setLatitude(lat);
                    setLongitude(lng);
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMap(false)}
                  className="gap-1.5"
                >
                  <X className="h-3 w-3" />
                  Cerrar mapa
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Ciudad / Zona</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Córdoba"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="local@hoppiness.com"
              />
            </div>
          </div>
        </TabsContent>

        {/* TAB: HORARIOS */}
        <TabsContent value="horarios" className="mt-4 space-y-3">
          {loadingSchedules ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {DAYS.map((day) => {
                const schedule = schedules.find(s => s.day_of_week === day.value);
                if (!schedule) return null;

                return (
                  <div
                    key={day.value}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                  >
                    <Switch
                      checked={schedule.is_enabled}
                      onCheckedChange={(v) => updateSchedule(day.value, 'is_enabled', v)}
                    />
                    <span className={`w-24 font-medium ${!schedule.is_enabled ? 'text-muted-foreground' : ''}`}>
                      {day.label}
                    </span>
                    <div className="flex items-center gap-2 flex-1">
                      <Select
                        value={schedule.opens_at}
                        onValueChange={(v) => updateSchedule(day.value, 'opens_at', v)}
                        disabled={!schedule.is_enabled}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map(t => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground">a</span>
                      <Select
                        value={schedule.closes_at}
                        onValueChange={(v) => updateSchedule(day.value, 'closes_at', v)}
                        disabled={!schedule.is_enabled}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map(t => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                onClick={copyMondayToAll}
                className="gap-1.5"
              >
                <Copy className="h-3.5 w-3.5" />
                Copiar Lunes a todos
              </Button>
            </>
          )}
        </TabsContent>

        {/* TAB: FISCAL */}
        <TabsContent value="fiscal" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Razón Social</Label>
              <Input
                value={fiscalData.razon_social || ''}
                onChange={(e) => setFiscalData(prev => ({ ...prev, razon_social: e.target.value }))}
                placeholder="EMPRESA S.A.S."
              />
            </div>
            <div className="space-y-2">
              <Label>CUIT</Label>
              <Input
                value={fiscalData.cuit || ''}
                onChange={(e) => setFiscalData(prev => ({ ...prev, cuit: e.target.value }))}
                placeholder="30-12345678-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Condición IVA</Label>
            <Select
              value={fiscalData.condicion_iva || ''}
              onValueChange={(v) => setFiscalData(prev => ({ ...prev, condicion_iva: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {IVA_CONDITIONS.map(c => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Domicilio Fiscal</Label>
            <Input
              value={fiscalData.domicilio_fiscal || ''}
              onChange={(e) => setFiscalData(prev => ({ ...prev, domicilio_fiscal: e.target.value }))}
              placeholder="Dirección fiscal completa"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Inicio Actividades</Label>
              <Input
                type="date"
                value={fiscalData.inicio_actividades || ''}
                onChange={(e) => setFiscalData(prev => ({ ...prev, inicio_actividades: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Punto de Venta</Label>
              <Input
                value={fiscalData.punto_venta || ''}
                onChange={(e) => setFiscalData(prev => ({ ...prev, punto_venta: e.target.value }))}
                placeholder="0001"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Acciones */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Guardar
        </Button>
      </div>
    </div>
  );
}
