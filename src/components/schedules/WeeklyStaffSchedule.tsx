import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { format, addDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Users, Clock } from 'lucide-react';

interface StaffMember {
  user_id: string;
  full_name: string;
}

interface ScheduleShift {
  day_of_week: number;
  shift_number: number;
  opens_at: string;
  closes_at: string;
  is_enabled: boolean;
  service_type: string;
}

interface Props {
  branchId: string;
  staffMembers: StaffMember[];
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function WeeklyStaffSchedule({ branchId, staffMembers }: Props) {
  const [schedules, setSchedules] = useState<ScheduleShift[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate next 7 days starting from today
  const weekDays = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(today, i);
      return {
        date,
        dayOfWeek: date.getDay(),
        label: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : format(date, 'EEEE', { locale: es }),
        shortLabel: DAY_NAMES[date.getDay()],
        dateLabel: format(date, 'd MMM', { locale: es }),
      };
    });
  }, []);

  useEffect(() => {
    if (!branchId) return;

    async function fetchSchedules() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('branch_schedules')
          .select('day_of_week, shift_number, opens_at, closes_at, is_enabled, service_type')
          .eq('branch_id', branchId)
          .eq('service_type', 'dine_in')
          .eq('is_enabled', true)
          .order('day_of_week')
          .order('shift_number');

        if (error) throw error;
        setSchedules(data || []);
      } catch (error) {
        console.error('Error fetching schedules:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSchedules();
  }, [branchId]);

  const getShiftsForDay = (dayOfWeek: number) => {
    return schedules.filter(s => s.day_of_week === dayOfWeek);
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center text-muted-foreground">
            <Calendar className="h-5 w-5 animate-pulse mr-2" />
            Cargando horarios...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Horarios de la Semana</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Próximos 7 días - horario de atención del local
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="flex gap-3 pb-3">
            {weekDays.map((day, idx) => {
              const shifts = getShiftsForDay(day.dayOfWeek);
              const isOpen = shifts.length > 0;
              const isToday = idx === 0;

              return (
                <div
                  key={idx}
                  className={`flex-shrink-0 w-36 rounded-lg border p-3 ${
                    isToday 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border'
                  }`}
                >
                  <div className="text-center mb-3">
                    <p className={`font-semibold capitalize ${isToday ? 'text-primary' : ''}`}>
                      {day.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{day.dateLabel}</p>
                  </div>

                  {isOpen ? (
                    <div className="space-y-2">
                      {shifts.map((shift, shiftIdx) => (
                        <div 
                          key={shiftIdx}
                          className="bg-green-50 dark:bg-green-950/30 rounded p-2 text-center"
                        >
                          <div className="flex items-center justify-center gap-1 text-green-700 dark:text-green-400">
                            <Clock className="h-3 w-3" />
                            <span className="text-xs font-medium">
                              Turno {shift.shift_number}
                            </span>
                          </div>
                          <p className="text-sm font-mono mt-1">
                            {formatTime(shift.opens_at)} - {formatTime(shift.closes_at)}
                          </p>
                        </div>
                      ))}
                      
                      {/* Staff working */}
                      <div className="pt-2 border-t mt-2">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <Users className="h-3 w-3" />
                          <span className="text-xs">Personal</span>
                        </div>
                        <div className="flex flex-wrap gap-1 justify-center">
                          {staffMembers.slice(0, 3).map((staff) => (
                            <Badge 
                              key={staff.user_id} 
                              variant="secondary" 
                              className="text-xs px-1.5"
                            >
                              {staff.full_name.split(' ')[0]}
                            </Badge>
                          ))}
                          {staffMembers.length > 3 && (
                            <Badge variant="outline" className="text-xs px-1.5">
                              +{staffMembers.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-muted/50 rounded p-3 text-center">
                      <Badge variant="secondary" className="text-xs">
                        Cerrado
                      </Badge>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          💡 Los horarios se configuran en Configuración → Mi Sucursal
        </p>
      </CardContent>
    </Card>
  );
}
