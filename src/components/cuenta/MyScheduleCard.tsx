import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Store, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, startOfMonth, endOfMonth, isToday, isTomorrow, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface ScheduleEntry {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_day_off: boolean;
  schedule_month: number | null;
  schedule_year: number | null;
  shift_number: number;
  employee: {
    branch_id: string;
    branch: {
      name: string;
    };
  };
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAY_NAMES_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function MyScheduleCard() {
  const { user } = useAuth();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Fetch employee IDs for this user
  const { data: employeeIds, isLoading: employeesLoading } = useQuery({
    queryKey: ['my-employee-ids', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Get employees linked to this user via profiles.phone or direct assignment
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('user_id', user.id)
        .single();
      
      if (!profile?.phone) return [];
      
      const { data, error } = await supabase
        .from('employees')
        .select('id, branch_id, branches:branch_id(name)')
        .eq('phone', profile.phone)
        .eq('is_active', true);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch schedules for next 7 days
  const { data: schedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ['my-schedules', employeeIds?.map(e => e.id), currentMonth, currentYear],
    queryFn: async () => {
      if (!employeeIds?.length) return [];
      
      const ids = employeeIds.map(e => e.id);
      
      const { data, error } = await supabase
        .from('employee_schedules')
        .select(`
          id,
          day_of_week,
          start_time,
          end_time,
          is_day_off,
          schedule_month,
          schedule_year,
          shift_number,
          employee_id
        `)
        .in('employee_id', ids)
        .or(`schedule_month.is.null,and(schedule_month.eq.${currentMonth},schedule_year.eq.${currentYear})`);
      
      if (error) throw error;
      
      // Map employee data to schedules
      return (data || []).map(schedule => ({
        ...schedule,
        employee: employeeIds.find(e => e.id === schedule.employee_id),
      }));
    },
    enabled: !!employeeIds?.length,
  });

  const isLoading = employeesLoading || schedulesLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!employeeIds?.length) {
    return null; // No employee record, don't show card
  }

  // Get next 7 days schedule
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(now, i);
    const dayOfWeek = date.getDay();
    const daySchedules = schedules?.filter(s => s.day_of_week === dayOfWeek) || [];
    
    return {
      date,
      dayOfWeek,
      schedules: daySchedules,
      isToday: isToday(date),
      isTomorrow: isTomorrow(date),
    };
  });

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
  };

  const todaySchedule = next7Days[0];
  const hasWorkToday = todaySchedule.schedules.some(s => !s.is_day_off);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Mi Horario</CardTitle>
        </div>
        <CardDescription>
          Próximos 7 días
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Today highlight */}
        <div className={`p-3 rounded-lg border ${hasWorkToday ? 'bg-primary/5 border-primary/20' : 'bg-muted'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                Hoy - {format(now, "EEEE d", { locale: es })}
              </p>
              {hasWorkToday ? (
                todaySchedule.schedules
                  .filter(s => !s.is_day_off)
                  .map((s, idx) => (
                    <div key={idx} className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{formatTime(s.start_time)} - {formatTime(s.end_time)}</span>
                      {s.employee?.branches && (
                        <>
                          <Store className="w-3 h-3 ml-2" />
                          <span>{(s.employee.branches as any)?.name}</span>
                        </>
                      )}
                    </div>
                  ))
              ) : (
                <p className="text-sm text-muted-foreground">Franco</p>
              )}
            </div>
            {hasWorkToday && (
              <Badge variant="default" className="bg-primary">Trabajás</Badge>
            )}
          </div>
        </div>

        {/* Next days */}
        <div className="space-y-2">
          {next7Days.slice(1).map((day, idx) => {
            const hasWork = day.schedules.some(s => !s.is_day_off);
            const workSchedules = day.schedules.filter(s => !s.is_day_off);
            
            return (
              <div 
                key={idx}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="w-10 text-xs font-medium text-muted-foreground">
                    {DAY_NAMES_SHORT[day.dayOfWeek]}
                  </span>
                  <span className="text-sm">
                    {format(day.date, "d MMM", { locale: es })}
                  </span>
                </div>
                
                {hasWork ? (
                  <div className="flex items-center gap-2">
                    {workSchedules.map((s, sIdx) => (
                      <Badge key={sIdx} variant="outline" className="text-xs">
                        {formatTime(s.start_time)} - {formatTime(s.end_time)}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Franco</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Link to full schedule if needed */}
        {employeeIds.length > 0 && (
          <Link to="/local" className="block">
            <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
              Ver horario completo
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
