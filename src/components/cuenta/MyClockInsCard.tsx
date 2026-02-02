import { useAuth } from '@/hooks/useAuth';
import { usePermissionsV2 } from '@/hooks/usePermissionsV2';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, Timer, LogIn, LogOut } from 'lucide-react';
import { format, startOfMonth, endOfMonth, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface ClockEntry {
  id: string;
  entry_type: 'clock_in' | 'clock_out';
  created_at: string;
  branch_id: string;
  branch?: { name: string };
}

export default function MyClockInsCard() {
  const { user } = useAuth();
  const { branchRoles } = usePermissionsV2();
  
  // Only show for employees with at least one branch role
  const isEmployee = branchRoles.length > 0;

  // Get clock entries for current month from clock_entries table
  const { data: clockEntries, isLoading } = useQuery({
    queryKey: ['my-clock-entries', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      
      const { data, error } = await supabase
        .from('clock_entries')
        .select('id, entry_type, created_at, branch_id, branches:branch_id(name)')
        .eq('user_id', user.id)
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as ClockEntry[];
    },
    enabled: !!user && isEmployee,
  });

  // Calculate total hours worked this month
  const calculateTotalHours = () => {
    if (!clockEntries || clockEntries.length === 0) return { hours: 0, minutes: 0 };
    
    let totalMinutes = 0;
    const sortedEntries = [...clockEntries].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    let lastClockIn: Date | null = null;
    
    for (const entry of sortedEntries) {
      if (entry.entry_type === 'clock_in') {
        lastClockIn = new Date(entry.created_at);
      } else if (entry.entry_type === 'clock_out' && lastClockIn) {
        const clockOut = new Date(entry.created_at);
        totalMinutes += differenceInMinutes(clockOut, lastClockIn);
        lastClockIn = null;
      }
    }
    
    // If currently clocked in, add time until now
    if (lastClockIn) {
      totalMinutes += differenceInMinutes(new Date(), lastClockIn);
    }
    
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
    };
  };

  const totalTime = calculateTotalHours();

  // Check if currently clocked in
  const isCurrentlyWorking = clockEntries?.length 
    ? clockEntries[0].entry_type === 'clock_in'
    : false;

  // Group entries by date for display
  const groupedEntries = clockEntries?.reduce((acc, entry) => {
    const date = format(new Date(entry.created_at), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, ClockEntry[]>) || {};

  // Get last 5 unique dates
  const recentDates = Object.keys(groupedEntries).slice(0, 5);

  // Don't show if not an employee
  if (!isEmployee) {
    return null;
  }

  if (isLoading) {
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
          {isCurrentlyWorking && (
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
              {totalTime.hours}h {totalTime.minutes > 0 ? `${totalTime.minutes}m` : ''}
            </p>
          </div>
        </div>

        {/* Recent entries */}
        {recentDates.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Últimos fichajes
            </h4>
            <div className="space-y-2">
              {recentDates.map((date) => {
                const entries = groupedEntries[date];
                const dateObj = new Date(date);
                
                // Find pairs of clock_in/clock_out
                const clockIn = entries.find(e => e.entry_type === 'clock_in');
                const clockOut = entries.find(e => e.entry_type === 'clock_out');
                
                let duration = null;
                if (clockIn && clockOut) {
                  const mins = differenceInMinutes(
                    new Date(clockOut.created_at),
                    new Date(clockIn.created_at)
                  );
                  duration = { hours: Math.floor(mins / 60), mins: mins % 60 };
                }

                return (
                  <div 
                    key={date}
                    className="flex items-center justify-between text-sm p-2 rounded hover:bg-muted/50 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground w-20">
                        {format(dateObj, "EEE d", { locale: es })}
                      </span>
                      <div className="flex items-center gap-2 text-xs">
                        {clockIn && (
                          <span className="flex items-center gap-1 text-green-600">
                            <LogIn className="w-3 h-3" />
                            {format(new Date(clockIn.created_at), 'HH:mm')}
                          </span>
                        )}
                        {clockOut && (
                          <span className="flex items-center gap-1 text-red-600">
                            <LogOut className="w-3 h-3" />
                            {format(new Date(clockOut.created_at), 'HH:mm')}
                          </span>
                        )}
                        {clockIn && !clockOut && (
                          <Badge variant="outline" className="text-xs animate-pulse">
                            En curso
                          </Badge>
                        )}
                      </div>
                    </div>
                    {duration && (
                      <Badge variant="secondary">
                        {duration.hours}h {duration.mins}m
                      </Badge>
                    )}
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
