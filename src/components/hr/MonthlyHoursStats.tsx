import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Clock, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, differenceInMinutes, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface AttendanceLogRaw {
  id: string;
  employee_id: string;
  log_type: string;
  timestamp: string;
}

interface EmployeeHoursData {
  employee_id: string;
  full_name: string;
  position: string | null;
  totalMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  dailyBreakdown: { date: string; minutes: number; overtime: number }[];
}

interface MonthlyHoursStatsProps {
  branchId: string;
}

/**
 * Reglas del Convenio Colectivo CCT 329/2000:
 * - Jornada máxima diaria: 8 horas (pero se pagan extras a partir de 9 horas diarias)
 * - Jornada máxima mensual: 190 horas (las que excedan son extras)
 * - Art. 45: "Las horas trabajadas en exceso de las 9 horas diarias o de las 190 horas mensuales 
 *   se les abonarán como horas extraordinarias"
 */
const MAX_DAILY_HOURS_BEFORE_OVERTIME = 9; // 9 horas diarias antes de extras
const MAX_MONTHLY_HOURS_BEFORE_OVERTIME = 190; // 190 horas mensuales antes de extras

export default function MonthlyHoursStats({ branchId }: MonthlyHoursStatsProps) {
  const [loading, setLoading] = useState(true);
  const [employeesData, setEmployeesData] = useState<EmployeeHoursData[]>([]);
  const [monthLabel, setMonthLabel] = useState('');

  useEffect(() => {
    const fetchMonthlyData = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        
        setMonthLabel(format(now, 'MMMM yyyy', { locale: es }));

        // Fetch employees for this branch
        const { data: employees, error: empError } = await supabase
          .from('employees')
          .select('id, full_name, position')
          .eq('branch_id', branchId)
          .eq('is_active', true);

        if (empError) throw empError;
        if (!employees?.length) {
          setEmployeesData([]);
          setLoading(false);
          return;
        }

        const employeeIds = employees.map(e => e.id);

        // Fetch all attendance logs for the month
        const { data: logs, error: logsError } = await supabase
          .from('attendance_logs')
          .select('id, employee_id, log_type, timestamp')
          .in('employee_id', employeeIds)
          .gte('timestamp', monthStart.toISOString())
          .lte('timestamp', monthEnd.toISOString())
          .order('timestamp', { ascending: true });

        if (logsError) throw logsError;

        // Process logs to calculate hours per employee
        const employeeHours = calculateEmployeeHours(employees, logs || []);
        setEmployeesData(employeeHours);

      } catch (error) {
        console.error('Error fetching monthly hours:', error);
      } finally {
        setLoading(false);
      }
    };

    if (branchId) {
      fetchMonthlyData();
    }
  }, [branchId]);

  const calculateEmployeeHours = (
    employees: { id: string; full_name: string; position: string | null }[],
    logs: AttendanceLogRaw[]
  ): EmployeeHoursData[] => {
    const result: EmployeeHoursData[] = [];

    for (const emp of employees) {
      const empLogs = logs.filter(l => l.employee_id === emp.id);
      const dailyMinutes: Record<string, number> = {};
      
      // Pair IN/OUT logs to calculate worked time
      let lastIn: Date | null = null;
      
      for (const log of empLogs) {
        const logTime = parseISO(log.timestamp);
        const dateKey = format(logTime, 'yyyy-MM-dd');

        if (log.log_type === 'IN') {
          lastIn = logTime;
        } else if (log.log_type === 'OUT' && lastIn) {
          const minutes = differenceInMinutes(logTime, lastIn);
          if (minutes > 0 && minutes < 24 * 60) { // Sanity check: less than 24 hours
            const inDateKey = format(lastIn, 'yyyy-MM-dd');
            // Attribute to the day they clocked in
            dailyMinutes[inDateKey] = (dailyMinutes[inDateKey] || 0) + minutes;
          }
          lastIn = null;
        }
      }

      // Calculate regular vs overtime based on CCT 329/2000 rules
      let totalMinutes = 0;
      let regularMinutes = 0;
      let overtimeMinutes = 0;
      const dailyBreakdown: { date: string; minutes: number; overtime: number }[] = [];

      // First pass: calculate daily overtime (hours > 9 per day)
      for (const [date, minutes] of Object.entries(dailyMinutes)) {
        const maxDailyMinutes = MAX_DAILY_HOURS_BEFORE_OVERTIME * 60;
        const dayOT = Math.max(0, minutes - maxDailyMinutes);
        const dayRegular = minutes - dayOT;
        
        dailyBreakdown.push({ date, minutes, overtime: dayOT });
        totalMinutes += minutes;
        overtimeMinutes += dayOT;
        regularMinutes += dayRegular;
      }

      // Second pass: check monthly cap (190 hours = 11400 minutes)
      // If total regular hours exceed 190, the excess becomes overtime too
      const maxMonthlyMinutes = MAX_MONTHLY_HOURS_BEFORE_OVERTIME * 60;
      if (regularMinutes > maxMonthlyMinutes) {
        const monthlyExcess = regularMinutes - maxMonthlyMinutes;
        overtimeMinutes += monthlyExcess;
        regularMinutes = maxMonthlyMinutes;
      }

      result.push({
        employee_id: emp.id,
        full_name: emp.full_name,
        position: emp.position,
        totalMinutes,
        regularMinutes,
        overtimeMinutes,
        dailyBreakdown,
      });
    }

    return result.sort((a, b) => b.totalMinutes - a.totalMinutes);
  };

  const formatHours = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins.toString().padStart(2, '0')}m`;
  };

  const formatHoursShort = (minutes: number): string => {
    const hours = (minutes / 60).toFixed(1);
    return `${hours}h`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const totals = employeesData.reduce(
    (acc, emp) => ({
      total: acc.total + emp.totalMinutes,
      regular: acc.regular + emp.regularMinutes,
      overtime: acc.overtime + emp.overtimeMinutes,
    }),
    { total: 0, regular: 0, overtime: 0 }
  );

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Horas totales del mes</p>
                <p className="text-2xl font-bold">{formatHoursShort(totals.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Horas regulares</p>
                <p className="text-2xl font-bold text-green-600">{formatHoursShort(totals.regular)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Horas extras (CCT 329)</p>
                <p className="text-2xl font-bold text-orange-600">{formatHoursShort(totals.overtime)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per Employee Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Horas por empleado - {monthLabel}
          </CardTitle>
          <CardDescription>
            Según CCT 329/2000: Extras después de 9hs/día o 190hs/mes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employeesData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay datos de fichajes este mes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {employeesData.map((emp) => (
                <div
                  key={emp.employee_id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{emp.full_name}</p>
                    {emp.position && (
                      <p className="text-sm text-muted-foreground">{emp.position}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <p className="text-sm text-muted-foreground">Acumuladas</p>
                      <p className="font-mono font-medium">{formatHours(emp.totalMinutes)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Regulares</p>
                      <p className="font-mono font-medium text-green-600">
                        {formatHours(emp.regularMinutes)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Extras</p>
                      <p className={`font-mono font-medium ${emp.overtimeMinutes > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                        {formatHours(emp.overtimeMinutes)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}