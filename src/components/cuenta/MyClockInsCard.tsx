import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, Timer } from 'lucide-react';
import { format, startOfMonth, endOfMonth, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface AttendanceRecord {
  id: string;
  check_in: string;
  check_out: string | null;
  branch_id: string;
  branch?: { name: string };
}

interface EmployeeRecord {
  id: string;
  full_name: string;
  branch_id: string;
}

export default function MyClockInsCard() {
  const { user } = useAuth();
  
  // Get employee record for current user
  const { data: employee, isLoading: employeeLoading } = useQuery<EmployeeRecord | null>({
    queryKey: ['my-employee-record', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (supabase as any)
        .from('employees')
        .select('id, full_name, branch_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      
      if (result.error) throw result.error;
      return result.data as EmployeeRecord | null;
    },
    enabled: !!user,
  });

  // Get attendance records for current month
  const { data: attendanceRecords, isLoading: attendanceLoading } = useQuery({
    queryKey: ['my-attendance', user?.id, employee?.id],
    queryFn: async () => {
      if (!user || !employee) return [];
      
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      
      const { data, error } = await supabase
        .from('attendance_records')
        .select('id, check_in, check_out, branch_id')
        .eq('user_id', user.id)
        .gte('check_in', monthStart.toISOString())
        .lte('check_in', monthEnd.toISOString())
        .order('check_in', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as AttendanceRecord[];
    },
    enabled: !!user && !!employee,
  });

  // Calculate total hours this month
  const totalMinutesThisMonth = attendanceRecords?.reduce((acc, record) => {
    if (!record.check_out) return acc;
    const checkIn = new Date(record.check_in);
    const checkOut = new Date(record.check_out);
    return acc + differenceInMinutes(checkOut, checkIn);
  }, 0) || 0;

  const totalHours = Math.floor(totalMinutesThisMonth / 60);
  const totalMins = totalMinutesThisMonth % 60;

  // Check if currently clocked in
  const currentlyWorking = attendanceRecords?.some(r => !r.check_out);

  // Don't show if not an employee
  if (!employeeLoading && !employee) {
    return null;
  }

  if (employeeLoading || attendanceLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Mis Fichajes</CardTitle>
          </div>
          {currentlyWorking && (
            <Badge className="bg-green-500 text-white animate-pulse">
              Trabajando
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Monthly summary */}
        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
          <Timer className="w-8 h-8 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Horas este mes</p>
            <p className="text-2xl font-bold">
              {totalHours}h {totalMins > 0 ? `${totalMins}m` : ''}
            </p>
          </div>
        </div>

        {/* Recent records */}
        {attendanceRecords && attendanceRecords.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Últimos fichajes
            </h4>
            <div className="space-y-1">
              {attendanceRecords.slice(0, 5).map((record) => {
                const checkIn = new Date(record.check_in);
                const checkOut = record.check_out ? new Date(record.check_out) : null;
                const duration = checkOut 
                  ? differenceInMinutes(checkOut, checkIn)
                  : differenceInMinutes(new Date(), checkIn);
                const hours = Math.floor(duration / 60);
                const mins = duration % 60;

                return (
                  <div 
                    key={record.id} 
                    className="flex items-center justify-between text-sm p-2 rounded hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-24">
                        {format(checkIn, "EEE d MMM", { locale: es })}
                      </span>
                      <span>
                        {format(checkIn, 'HH:mm')} - {checkOut ? format(checkOut, 'HH:mm') : '...'}
                      </span>
                    </div>
                    <Badge variant={checkOut ? 'secondary' : 'default'}>
                      {hours}h {mins}m
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay fichajes este mes
          </p>
        )}
      </CardContent>
    </Card>
  );
}
