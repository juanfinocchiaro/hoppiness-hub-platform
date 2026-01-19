import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Trash2, Plus, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';

interface Schedule {
  id: string;
  schedule_type: 'daily' | 'weekly' | 'date_range';
  start_time: string | null;
  end_time: string | null;
  days_of_week: number[];
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  name: string | null;
}

interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId?: string;
  productId?: string;
  itemName: string;
}

const DAYS = [
  { value: 0, label: 'Dom', short: 'D' },
  { value: 1, label: 'Lun', short: 'L' },
  { value: 2, label: 'Mar', short: 'M' },
  { value: 3, label: 'Mié', short: 'X' },
  { value: 4, label: 'Jue', short: 'J' },
  { value: 5, label: 'Vie', short: 'V' },
  { value: 6, label: 'Sáb', short: 'S' },
];

export function ScheduleDialog({ 
  open, 
  onOpenChange, 
  categoryId, 
  productId, 
  itemName 
}: ScheduleDialogProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'date_range'>('daily');

  // New schedule form state
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    start_time: '09:00',
    end_time: '23:00',
    days_of_week: [1, 2, 3, 4, 5] as number[],
    start_date: '',
    end_date: '',
  });

  const fetchSchedules = async () => {
    setLoading(true);
    const query = supabase
      .from('availability_schedules')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (categoryId) {
      query.eq('category_id', categoryId);
    } else if (productId) {
      query.eq('product_id', productId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching schedules:', error);
    } else {
      setSchedules((data || []).map(s => ({
        ...s,
        schedule_type: s.schedule_type as 'daily' | 'weekly' | 'date_range',
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      fetchSchedules();
    }
  }, [open, categoryId, productId]);

  const handleAddSchedule = async () => {
    try {
      const insertData = {
        schedule_type: activeTab,
        is_active: true,
        name: newSchedule.name || null,
        category_id: categoryId || null,
        product_id: productId || null,
        start_time: (activeTab === 'daily' || activeTab === 'weekly' || activeTab === 'date_range') 
          ? newSchedule.start_time : null,
        end_time: (activeTab === 'daily' || activeTab === 'weekly' || activeTab === 'date_range') 
          ? newSchedule.end_time : null,
        days_of_week: activeTab === 'weekly' ? newSchedule.days_of_week : [],
        start_date: activeTab === 'date_range' ? newSchedule.start_date : null,
        end_date: activeTab === 'date_range' ? newSchedule.end_date : null,
      };

      const { error } = await supabase
        .from('availability_schedules')
        .insert(insertData);

      if (error) throw error;

      toast.success('Horario programado agregado');
      fetchSchedules();
      
      // Reset form
      setNewSchedule({
        name: '',
        start_time: '09:00',
        end_time: '23:00',
        days_of_week: [1, 2, 3, 4, 5],
        start_date: '',
        end_date: '',
      });
    } catch (error) {
      console.error('Error adding schedule:', error);
      toast.error('Error al agregar horario');
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('availability_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      toast.success('Horario eliminado');
      fetchSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error('Error al eliminar horario');
    }
  };

  const handleToggleSchedule = async (scheduleId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('availability_schedules')
        .update({ is_active: !currentValue })
        .eq('id', scheduleId);

      if (error) throw error;

      setSchedules(prev => prev.map(s => 
        s.id === scheduleId ? { ...s, is_active: !currentValue } : s
      ));
    } catch (error) {
      console.error('Error toggling schedule:', error);
      toast.error('Error al actualizar horario');
    }
  };

  const toggleDay = (day: number) => {
    setNewSchedule(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day].sort()
    }));
  };

  const formatSchedule = (schedule: Schedule) => {
    const formatTime = (time: string | null) => time?.slice(0, 5) || '';
    
    switch (schedule.schedule_type) {
      case 'daily':
        return `Todos los días ${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}`;
      case 'weekly':
        const days = schedule.days_of_week
          .map(d => DAYS.find(day => day.value === d)?.short)
          .join(', ');
        return `${days} ${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}`;
      case 'date_range':
        const dateStr = `${schedule.start_date} al ${schedule.end_date}`;
        if (schedule.start_time && schedule.end_time) {
          return `${dateStr} (${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)})`;
        }
        return dateStr;
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Horarios de {itemName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing Schedules */}
          {schedules.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Horarios activos</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {schedules.map(schedule => (
                  <div 
                    key={schedule.id}
                    className={`flex items-center justify-between p-2 rounded-lg border ${schedule.is_active ? 'bg-card' : 'bg-muted/50 opacity-60'}`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Switch
                        checked={schedule.is_active}
                        onCheckedChange={() => handleToggleSchedule(schedule.id, schedule.is_active)}
                        className="shrink-0"
                      />
                      <div className="min-w-0">
                        {schedule.name && (
                          <p className="font-medium text-sm truncate">{schedule.name}</p>
                        )}
                        <p className="text-xs text-muted-foreground truncate">
                          {formatSchedule(schedule)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteSchedule(schedule.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Schedule */}
          <div className="space-y-3 pt-2 border-t">
            <Label className="text-xs uppercase text-muted-foreground">Agregar horario</Label>
            
            <Input
              placeholder="Nombre (ej: Happy Hour, Almuerzo)"
              value={newSchedule.name}
              onChange={(e) => setNewSchedule(prev => ({ ...prev, name: e.target.value }))}
              className="h-8 text-sm"
            />

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList className="grid grid-cols-3 h-8">
                <TabsTrigger value="daily" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Diario
                </TabsTrigger>
                <TabsTrigger value="weekly" className="text-xs">
                  <CalendarDays className="h-3 w-3 mr-1" />
                  Semanal
                </TabsTrigger>
                <TabsTrigger value="date_range" className="text-xs">
                  <Calendar className="h-3 w-3 mr-1" />
                  Fechas
                </TabsTrigger>
              </TabsList>

              <TabsContent value="daily" className="space-y-3 mt-3">
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <Label className="text-xs">Desde</Label>
                    <Input
                      type="time"
                      value={newSchedule.start_time}
                      onChange={(e) => setNewSchedule(prev => ({ ...prev, start_time: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Hasta</Label>
                    <Input
                      type="time"
                      value={newSchedule.end_time}
                      onChange={(e) => setNewSchedule(prev => ({ ...prev, end_time: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="weekly" className="space-y-3 mt-3">
                <div>
                  <Label className="text-xs mb-2 block">Días</Label>
                  <div className="flex gap-1">
                    {DAYS.map(day => (
                      <button
                        key={day.value}
                        onClick={() => toggleDay(day.value)}
                        className={`
                          w-8 h-8 rounded-full text-xs font-medium transition-all
                          ${newSchedule.days_of_week.includes(day.value)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }
                        `}
                      >
                        {day.short}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <Label className="text-xs">Desde</Label>
                    <Input
                      type="time"
                      value={newSchedule.start_time}
                      onChange={(e) => setNewSchedule(prev => ({ ...prev, start_time: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Hasta</Label>
                    <Input
                      type="time"
                      value={newSchedule.end_time}
                      onChange={(e) => setNewSchedule(prev => ({ ...prev, end_time: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="date_range" className="space-y-3 mt-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Fecha inicio</Label>
                    <Input
                      type="date"
                      value={newSchedule.start_date}
                      onChange={(e) => setNewSchedule(prev => ({ ...prev, start_date: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Fecha fin</Label>
                    <Input
                      type="date"
                      value={newSchedule.end_date}
                      onChange={(e) => setNewSchedule(prev => ({ ...prev, end_date: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <Label className="text-xs">Horario (opcional)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="time"
                        value={newSchedule.start_time}
                        onChange={(e) => setNewSchedule(prev => ({ ...prev, start_time: e.target.value }))}
                        className="h-8 text-sm"
                        placeholder="Desde"
                      />
                      <Input
                        type="time"
                        value={newSchedule.end_time}
                        onChange={(e) => setNewSchedule(prev => ({ ...prev, end_time: e.target.value }))}
                        className="h-8 text-sm"
                        placeholder="Hasta"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <Button onClick={handleAddSchedule} className="w-full" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Agregar Horario
            </Button>
          </div>

          {schedules.length === 0 && !loading && (
            <p className="text-xs text-center text-muted-foreground py-2">
              Sin horarios programados. El item estará siempre disponible.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
