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
import { Store, Truck, ShoppingBag, RefreshCw, Copy, Save, Plus, Trash2 } from 'lucide-react';

interface Schedule {
  id: string;
  branch_id: string;
  service_type: 'dine_in' | 'delivery' | 'takeaway';
  day_of_week: number;
  opens_at: string;
  closes_at: string;
  is_enabled: boolean;
  shift_number: number;
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
        .order('day_of_week', { ascending: true })
        .order('shift_number', { ascending: true });

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

  const getSchedulesForDay = (serviceType: string, dayOfWeek: number): Schedule[] => {
    return schedules
      .filter(s => s.service_type === serviceType && s.day_of_week === dayOfWeek)
      .sort((a, b) => a.shift_number - b.shift_number);
  };

  const updateSchedule = (scheduleId: string, field: keyof Schedule, value: any) => {
    setSchedules(prev => prev.map(s => {
      if (s.id === scheduleId) {
        return { ...s, [field]: value };
      }
      return s;
    }));
    setHasChanges(true);
  };

  const addShift = async (serviceType: string, dayOfWeek: number) => {
    const existingShifts = getSchedulesForDay(serviceType, dayOfWeek);
    const newShiftNumber = existingShifts.length > 0 
      ? Math.max(...existingShifts.map(s => s.shift_number)) + 1 
      : 1;

    // Determine default times based on existing shifts
    let defaultOpens = '19:00:00';
    let defaultCloses = '23:00:00';
    
    if (existingShifts.length > 0) {
      const lastShift = existingShifts[existingShifts.length - 1];
      defaultOpens = lastShift.closes_at;
      // Add 4 hours to closes
      const closeHour = parseInt(defaultOpens.split(':')[0]) + 4;
      defaultCloses = `${Math.min(closeHour, 23).toString().padStart(2, '0')}:00:00`;
    }

    try {
      const { data, error } = await supabase
        .from('branch_schedules')
        .insert({
          branch_id: branchId,
          service_type: serviceType,
          day_of_week: dayOfWeek,
          shift_number: newShiftNumber,
          opens_at: defaultOpens,
          closes_at: defaultCloses,
          is_enabled: true,
        })
        .select()
        .single();

      if (error) throw error;

      setSchedules(prev => [...prev, data as Schedule]);
      toast.success('Turno agregado');
    } catch (error) {
      console.error('Error adding shift:', error);
      toast.error('Error al agregar turno');
    }
  };

  const removeShift = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('branch_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      setSchedules(prev => prev.filter(s => s.id !== scheduleId));
      toast.success('Turno eliminado');
    } catch (error) {
      console.error('Error removing shift:', error);
      toast.error('Error al eliminar turno');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
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
    const sourceShifts = getSchedulesForDay(activeTab, sourceDay);
    if (sourceShifts.length === 0) return;

    // For simplicity, copy only the first shift's settings
    const source = sourceShifts[0];

    setSchedules(prev => prev.map(s => {
      if (s.service_type === activeTab && s.day_of_week !== sourceDay && s.shift_number === 1) {
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
    toast.success(`Horario del turno 1 copiado a todos los días`);
  };

  const copyFromService = (fromService: string) => {
    const sourceSchedules = schedules.filter(s => s.service_type === fromService);
    
    setSchedules(prev => prev.map(s => {
      if (s.service_type === activeTab) {
        const source = sourceSchedules.find(
          src => src.day_of_week === s.day_of_week && src.shift_number === s.shift_number
        );
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

  const isDayEnabled = (serviceType: string, dayOfWeek: number): boolean => {
    const shifts = getSchedulesForDay(serviceType, dayOfWeek);
    return shifts.some(s => s.is_enabled);
  };

  const toggleDayEnabled = (serviceType: string, dayOfWeek: number, enabled: boolean) => {
    setSchedules(prev => prev.map(s => {
      if (s.service_type === serviceType && s.day_of_week === dayOfWeek) {
        return { ...s, is_enabled: enabled };
      }
      return s;
    }));
    setHasChanges(true);
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
              <div className="space-y-3">
                {DAYS.map(day => {
                  const shifts = getSchedulesForDay(service.value, day.value);
                  const dayEnabled = isDayEnabled(service.value, day.value);

                  return (
                    <div
                      key={day.value}
                      className={`p-3 rounded-lg border ${
                        dayEnabled ? 'bg-background' : 'bg-muted/50'
                      }`}
                    >
                      {/* Day header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={dayEnabled}
                            onCheckedChange={(v) => toggleDayEnabled(service.value, day.value, v)}
                            disabled={!canEdit}
                          />
                          <span className={`font-medium ${!dayEnabled ? 'text-muted-foreground' : ''}`}>
                            {day.label}
                          </span>
                          {!dayEnabled && <Badge variant="secondary">Cerrado</Badge>}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {canEdit && dayEnabled && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToAllDays(day.value)}
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Copiar a todos</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addShift(service.value, day.value)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Turno
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Shifts */}
                      {dayEnabled && (
                        <div className="space-y-2 pl-8">
                          {shifts.map((schedule, idx) => (
                            <div
                              key={schedule.id}
                              className="flex items-center gap-3 py-2 px-3 bg-muted/30 rounded-md"
                            >
                              <Badge variant="outline" className="shrink-0">
                                Turno {idx + 1}
                              </Badge>

                              <Select
                                value={schedule.opens_at}
                                onValueChange={(v) => updateSchedule(schedule.id, 'opens_at', v)}
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

                              <Select
                                value={schedule.closes_at}
                                onValueChange={(v) => updateSchedule(schedule.id, 'closes_at', v)}
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

                              {canEdit && shifts.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="ml-auto text-destructive hover:text-destructive"
                                  onClick={() => removeShift(schedule.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}

                          {shifts.length === 0 && (
                            <p className="text-sm text-muted-foreground py-2">
                              Sin turnos configurados
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Example hint */}
              <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 mt-4">
                <p className="font-medium mb-1">💡 Ejemplo: Mediodía y Noche</p>
                <p>Agregá múltiples turnos para definir franjas horarias discontinuas. Ej: 12:00-15:00 (mediodía) y 19:00-23:00 (noche).</p>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
