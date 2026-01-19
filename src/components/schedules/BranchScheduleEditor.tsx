import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Store, Truck, ShoppingBag, RefreshCw, Copy, Save } from 'lucide-react';

interface Schedule {
  id: string;
  branch_id: string;
  service_type: 'dine_in' | 'delivery' | 'takeaway';
  day_of_week: number;
  opens_at: string;
  closes_at: string;
  is_enabled: boolean;
}

interface BranchScheduleEditorProps {
  branchId: string;
  canEdit: boolean;
}

const DAYS = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miércoles', short: 'Mié' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
];

const SERVICE_TYPES = [
  { value: 'dine_in', label: 'Local', icon: Store, description: 'Atención en el local' },
  { value: 'delivery', label: 'Delivery', icon: Truck, description: 'Envío a domicilio' },
  { value: 'takeaway', label: 'Take Away', icon: ShoppingBag, description: 'Para llevar' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return { value: `${hour}:00:00`, label: `${hour}:00` };
});

// Add half hours
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2).toString().padStart(2, '0');
  const minutes = i % 2 === 0 ? '00' : '30';
  return { value: `${hour}:${minutes}:00`, label: `${hour}:${minutes}` };
});

export default function BranchScheduleEditor({ branchId, canEdit }: BranchScheduleEditorProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('dine_in');
  const [hasChanges, setHasChanges] = useState(false);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('branch_schedules')
        .select('*')
        .eq('branch_id', branchId)
        .order('day_of_week', { ascending: true });

      if (error) throw error;
      setSchedules((data || []) as Schedule[]);
      setHasChanges(false);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error('Error al cargar horarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (branchId) {
      fetchSchedules();
    }
  }, [branchId]);

  const updateSchedule = (serviceType: string, dayOfWeek: number, field: keyof Schedule, value: any) => {
    setSchedules(prev => prev.map(s => {
      if (s.service_type === serviceType && s.day_of_week === dayOfWeek) {
        return { ...s, [field]: value };
      }
      return s;
    }));
    setHasChanges(true);
  };

  const getSchedule = (serviceType: string, dayOfWeek: number): Schedule | undefined => {
    return schedules.find(s => s.service_type === serviceType && s.day_of_week === dayOfWeek);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update all schedules for current service type
      const currentServiceSchedules = schedules.filter(s => s.service_type === activeTab);
      
      for (const schedule of currentServiceSchedules) {
        const { error } = await supabase
          .from('branch_schedules')
          .update({
            opens_at: schedule.opens_at,
            closes_at: schedule.closes_at,
            is_enabled: schedule.is_enabled,
          })
          .eq('id', schedule.id);

        if (error) throw error;
      }

      toast.success('Horarios guardados');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving schedules:', error);
      toast.error('Error al guardar horarios');
    } finally {
      setSaving(false);
    }
  };

  const copyToAllDays = (sourceDay: number) => {
    const source = getSchedule(activeTab, sourceDay);
    if (!source) return;

    setSchedules(prev => prev.map(s => {
      if (s.service_type === activeTab && s.day_of_week !== sourceDay) {
        return {
          ...s,
          opens_at: source.opens_at,
          closes_at: source.closes_at,
          is_enabled: source.is_enabled,
        };
      }
      return s;
    }));
    setHasChanges(true);
    toast.success(`Horario copiado a todos los días`);
  };

  const copyFromService = (fromService: string) => {
    const sourceSchedules = schedules.filter(s => s.service_type === fromService);
    
    setSchedules(prev => prev.map(s => {
      if (s.service_type === activeTab) {
        const source = sourceSchedules.find(src => src.day_of_week === s.day_of_week);
        if (source) {
          return {
            ...s,
            opens_at: source.opens_at,
            closes_at: source.closes_at,
            is_enabled: source.is_enabled,
          };
        }
      }
      return s;
    }));
    setHasChanges(true);
    toast.success(`Horarios copiados desde ${SERVICE_TYPES.find(st => st.value === fromService)?.label}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Horarios de Atención</CardTitle>
          {hasChanges && canEdit && (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            {SERVICE_TYPES.map(service => {
              const Icon = service.icon;
              return (
                <TabsTrigger key={service.value} value={service.value} className="gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{service.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {SERVICE_TYPES.map(service => (
            <TabsContent key={service.value} value={service.value} className="space-y-4">
              {/* Quick actions */}
              {canEdit && (
                <div className="flex flex-wrap gap-2 pb-2 border-b">
                  <span className="text-sm text-muted-foreground mr-2">Copiar desde:</span>
                  {SERVICE_TYPES.filter(s => s.value !== activeTab).map(s => (
                    <Button
                      key={s.value}
                      variant="outline"
                      size="sm"
                      onClick={() => copyFromService(s.value)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      {s.label}
                    </Button>
                  ))}
                </div>
              )}

              {/* Schedule grid */}
              <div className="space-y-2">
                {DAYS.map(day => {
                  const schedule = getSchedule(service.value, day.value);
                  if (!schedule) return null;

                  return (
                    <div
                      key={day.value}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        schedule.is_enabled ? 'bg-background' : 'bg-muted/50'
                      }`}
                    >
                      {/* Day name */}
                      <div className="w-24 flex items-center gap-2">
                        <Switch
                          checked={schedule.is_enabled}
                          onCheckedChange={(v) => updateSchedule(service.value, day.value, 'is_enabled', v)}
                          disabled={!canEdit}
                        />
                        <span className={`font-medium ${!schedule.is_enabled ? 'text-muted-foreground' : ''}`}>
                          {day.short}
                        </span>
                      </div>

                      {schedule.is_enabled ? (
                        <>
                          {/* Opens at */}
                          <Select
                            value={schedule.opens_at}
                            onValueChange={(v) => updateSchedule(service.value, day.value, 'opens_at', v)}
                            disabled={!canEdit}
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

                          {/* Closes at */}
                          <Select
                            value={schedule.closes_at}
                            onValueChange={(v) => updateSchedule(service.value, day.value, 'closes_at', v)}
                            disabled={!canEdit}
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

                          {/* Copy to all */}
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-auto"
                              onClick={() => copyToAllDays(day.value)}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">Copiar a todos</span>
                            </Button>
                          )}
                        </>
                      ) : (
                        <Badge variant="secondary" className="ml-2">Cerrado</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
