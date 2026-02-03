/**
 * useLaborHours Hook
 * 
 * Calcula horas trabajadas según el convenio colectivo del
 * Sindicato de Trabajadores de Servicios Rápidos (PASTELEROS - CCT 301/75 y afines)
 * 
 * Fórmulas:
 * - horas_turno = hora_fin - hora_inicio (horas decimales)
 * - hs_trabajadas_mes = SUM(horas_turno del mes)
 * - feriados_hs = SUM(horas_turno donde fecha es feriado)
 * - hs_franco_feriado = SUM(horas_turno donde fecha es feriado O es franco del empleado)
 * - extra_dia_alerta = max(0, horas_del_dia - 9)
 * - extra_mes = max(0, hs_trabajadas_mes - 190)
 * - hs_extras_dia_habil = max(0, extra_mes - hs_franco_feriado)
 * - hs_extras_franco_feriado = hs_franco_feriado (se pagan al 100%)
 * - presentismo = "SI" si faltas_injustificadas_mes == 0
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  startOfMonth, 
  endOfMonth, 
  differenceInMinutes, 
  format,
  eachDayOfInterval,
  parseISO,
  isSameDay,
  getDay
} from 'date-fns';
import type { LocalRole } from './usePermissionsV2';

export interface ClockEntryRaw {
  id: string;
  user_id: string;
  entry_type: 'clock_in' | 'clock_out';
  created_at: string;
  branch_id: string;
}

export interface DayEntry {
  date: string;
  checkIn: string;
  checkOut: string | null;
  minutesWorked: number;
  hoursDecimal: number;
  isHoliday: boolean;
  isDayOff: boolean; // Franco programado
}

export interface EmployeeLaborSummary {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  localRole: LocalRole;
  cuil: string | null;
  hireDate: string | null;
  contractType: string; // '0% BLANCO', '60hs blanco', etc.
  
  // Horas básicas
  hsTrabajadasMes: number; // Total horas trabajadas
  diasTrabajados: number;
  
  // Feriados y francos
  feriadosHs: number; // Horas trabajadas en feriados
  hsFrancoFeriado: number; // Horas en feriados + francos trabajados
  
  // Extras (ley)
  extraMes: number; // max(0, hs_trabajadas - 190)
  hsExtrasDiaHabil: number; // Extras en días hábiles
  hsExtrasFrancoFeriado: number; // Extras en feriados/francos (100%)
  
  // Alertas diarias (días > 9hs)
  diasConExceso: number;
  alertasDiarias: { date: string; horasExtra: number }[];
  
  // Presentismo
  faltasInjustificadas: number;
  faltasJustificadas: number;
  presentismo: boolean;
  
  // Control
  entries: DayEntry[];
  hasUnpairedEntries: boolean;
  unpairedCount: number;
}

export interface LaborStats {
  totalEmpleados: number;
  totalHsEquipo: number;
  totalExtrasMes: number;
  empleadosConPresentismo: number;
  empleadosSinPresentismo: number;
}

// Constantes del convenio
const HORAS_MENSUALES_LIMITE = 190;
const HORAS_DIARIAS_LIMITE = 9;

/**
 * Empareja las entradas de fichaje (clock_in con clock_out)
 * Los turnos que cruzan medianoche se asignan al día de entrada
 */
function pairClockEntries(
  entries: ClockEntryRaw[],
  holidays: Set<string>,
  scheduledDaysOff: Set<string>
): DayEntry[] {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  
  const paired: DayEntry[] = [];
  let pendingClockIn: ClockEntryRaw | null = null;
  
  for (const entry of sorted) {
    if (entry.entry_type === 'clock_in') {
      if (pendingClockIn) {
        const date = format(new Date(pendingClockIn.created_at), 'yyyy-MM-dd');
        paired.push({
          date,
          checkIn: pendingClockIn.created_at,
          checkOut: null,
          minutesWorked: 0,
          hoursDecimal: 0,
          isHoliday: holidays.has(date),
          isDayOff: scheduledDaysOff.has(date),
        });
      }
      pendingClockIn = entry;
    } else if (entry.entry_type === 'clock_out') {
      if (pendingClockIn) {
        const checkInTime = new Date(pendingClockIn.created_at);
        const checkOutTime = new Date(entry.created_at);
        const minutes = differenceInMinutes(checkOutTime, checkInTime);
        const date = format(checkInTime, 'yyyy-MM-dd');
        
        paired.push({
          date,
          checkIn: pendingClockIn.created_at,
          checkOut: entry.created_at,
          minutesWorked: Math.max(0, minutes),
          hoursDecimal: Math.max(0, minutes) / 60,
          isHoliday: holidays.has(date),
          isDayOff: scheduledDaysOff.has(date),
        });
        pendingClockIn = null;
      }
    }
  }
  
  if (pendingClockIn) {
    const date = format(new Date(pendingClockIn.created_at), 'yyyy-MM-dd');
    paired.push({
      date,
      checkIn: pendingClockIn.created_at,
      checkOut: null,
      minutesWorked: 0,
      hoursDecimal: 0,
      isHoliday: holidays.has(date),
      isDayOff: scheduledDaysOff.has(date),
    });
  }
  
  return paired;
}

interface UseLaborHoursOptions {
  branchId: string;
  year: number;
  month: number; // 0-indexed
}

export function useLaborHours({ branchId, year, month }: UseLaborHoursOptions) {
  const monthStart = startOfMonth(new Date(year, month));
  const monthEnd = endOfMonth(new Date(year, month));
  const startStr = format(monthStart, 'yyyy-MM-dd');
  const endStr = format(monthEnd, 'yyyy-MM-dd');
  
  // Query fichajes del mes
  const { data: rawEntries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ['labor-clock-entries', branchId, year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clock_entries')
        .select('id, user_id, entry_type, created_at, branch_id')
        .eq('branch_id', branchId)
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString())
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return (data || []) as ClockEntryRaw[];
    },
    enabled: !!branchId,
    staleTime: 60 * 1000,
  });
  
  // Query feriados del mes
  const { data: holidays = [], isLoading: loadingHolidays } = useQuery({
    queryKey: ['labor-holidays', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('special_days')
        .select('day_date')
        .is('branch_id', null)
        .gte('day_date', startStr)
        .lte('day_date', endStr);
      
      if (error) throw error;
      return (data || []).map(h => h.day_date);
    },
    staleTime: 60 * 1000,
  });
  
  // Query horarios del mes (para detectar francos programados)
  const { data: schedules = [], isLoading: loadingSchedules } = useQuery({
    queryKey: ['labor-schedules', branchId, year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_schedules')
        .select('user_id, schedule_date, is_day_off')
        .eq('branch_id', branchId)
        .gte('schedule_date', startStr)
        .lte('schedule_date', endStr);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!branchId,
    staleTime: 60 * 1000,
  });
  
  // Query ausencias (para presentismo)
  const { data: absences = [], isLoading: loadingAbsences } = useQuery({
    queryKey: ['labor-absences', branchId, year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_requests')
        .select('user_id, request_date, request_type, status')
        .eq('branch_id', branchId)
        .gte('request_date', startStr)
        .lte('request_date', endStr)
        .in('request_type', ['absence', 'sick_leave', 'justified_absence', 'unjustified_absence']);
      
      if (error) return []; // Puede no existir el tipo
      return data || [];
    },
    enabled: !!branchId,
    staleTime: 60 * 1000,
  });
  
  // Query datos de usuarios
  const userIds = [...new Set(rawEntries.map(e => e.user_id))];
  
  const { data: usersData = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['labor-users', branchId, userIds.join(',')],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      
      if (profilesError) throw profilesError;
      
      const { data: roles, error: rolesError } = await supabase
        .from('user_branch_roles')
        .select('user_id, local_role')
        .eq('branch_id', branchId)
        .in('user_id', userIds)
        .eq('is_active', true);
      
      if (rolesError) throw rolesError;
      
      // Obtener datos de empleado
      const { data: employeeData, error: empError } = await supabase
        .from('employee_data')
        .select('user_id, cuil, hire_date')
        .eq('branch_id', branchId)
        .in('user_id', userIds);
      
      return (profiles || []).map(p => {
        const role = roles?.find(r => r.user_id === p.id);
        const empData = employeeData?.find(e => e.user_id === p.id);
        return {
          user_id: p.id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          local_role: role?.local_role as LocalRole || null,
          cuil: empData?.cuil || null,
          hire_date: empData?.hire_date || null,
        };
      });
    },
    enabled: userIds.length > 0,
    staleTime: 60 * 1000,
  });
  
  const holidaySet = new Set(holidays);
  
  // Calcular resumen por empleado
  const summaries: EmployeeLaborSummary[] = userIds.map(userId => {
    const userData = usersData.find(u => u.user_id === userId);
    const userEntries = rawEntries.filter(e => e.user_id === userId);
    
    // Francos programados del empleado
    const userDaysOff = new Set(
      schedules
        .filter(s => s.user_id === userId && s.is_day_off)
        .map(s => s.schedule_date)
    );
    
    const paired = pairClockEntries(userEntries, holidaySet, userDaysOff);
    
    const unpairedEntries = paired.filter(p => p.checkOut === null);
    const completedEntries = paired.filter(p => p.checkOut !== null);
    
    // Horas totales del mes
    const hsTrabajadasMes = completedEntries.reduce((sum, e) => sum + e.hoursDecimal, 0);
    
    // Días únicos trabajados
    const uniqueDays = new Set(completedEntries.map(e => e.date)).size;
    
    // Horas en feriados
    const feriadosHs = completedEntries
      .filter(e => e.isHoliday)
      .reduce((sum, e) => sum + e.hoursDecimal, 0);
    
    // Horas en feriados O francos trabajados
    const hsFrancoFeriado = completedEntries
      .filter(e => e.isHoliday || e.isDayOff)
      .reduce((sum, e) => sum + e.hoursDecimal, 0);
    
    // Agrupar horas por día para calcular excesos diarios
    const hoursByDay: Record<string, number> = {};
    for (const entry of completedEntries) {
      hoursByDay[entry.date] = (hoursByDay[entry.date] || 0) + entry.hoursDecimal;
    }
    
    const alertasDiarias = Object.entries(hoursByDay)
      .filter(([_, hours]) => hours > HORAS_DIARIAS_LIMITE)
      .map(([date, hours]) => ({
        date,
        horasExtra: hours - HORAS_DIARIAS_LIMITE,
      }));
    
    // Extras mensuales según convenio
    const extraMes = Math.max(0, hsTrabajadasMes - HORAS_MENSUALES_LIMITE);
    const hsExtrasFrancoFeriado = hsFrancoFeriado;
    const hsExtrasDiaHabil = Math.max(0, extraMes - hsFrancoFeriado);
    
    // Presentismo (faltas injustificadas)
    const userAbsences = absences.filter(a => a.user_id === userId);
    const faltasInjustificadas = userAbsences.filter(
      a => a.request_type === 'unjustified_absence' || 
           (a.request_type === 'absence' && a.status !== 'approved')
    ).length;
    const faltasJustificadas = userAbsences.filter(
      a => a.request_type === 'justified_absence' || 
           a.request_type === 'sick_leave' ||
           (a.request_type === 'absence' && a.status === 'approved')
    ).length;
    
    return {
      userId,
      userName: userData?.full_name || 'Usuario desconocido',
      avatarUrl: userData?.avatar_url || null,
      localRole: userData?.local_role || null,
      cuil: userData?.cuil || null,
      hireDate: userData?.hire_date || null,
      contractType: '0% BLANCO', // TODO: obtener de employee_data cuando exista
      
      hsTrabajadasMes: Number(hsTrabajadasMes.toFixed(2)),
      diasTrabajados: uniqueDays,
      
      feriadosHs: Number(feriadosHs.toFixed(2)),
      hsFrancoFeriado: Number(hsFrancoFeriado.toFixed(2)),
      
      extraMes: Number(extraMes.toFixed(2)),
      hsExtrasDiaHabil: Number(hsExtrasDiaHabil.toFixed(2)),
      hsExtrasFrancoFeriado: Number(hsExtrasFrancoFeriado.toFixed(2)),
      
      diasConExceso: alertasDiarias.length,
      alertasDiarias,
      
      faltasInjustificadas,
      faltasJustificadas,
      presentismo: faltasInjustificadas === 0,
      
      entries: paired,
      hasUnpairedEntries: unpairedEntries.length > 0,
      unpairedCount: unpairedEntries.length,
    };
  });
  
  summaries.sort((a, b) => b.hsTrabajadasMes - a.hsTrabajadasMes);
  
  // Stats generales
  const stats: LaborStats = {
    totalEmpleados: summaries.length,
    totalHsEquipo: summaries.reduce((sum, s) => sum + s.hsTrabajadasMes, 0),
    totalExtrasMes: summaries.reduce((sum, s) => sum + s.extraMes, 0),
    empleadosConPresentismo: summaries.filter(s => s.presentismo).length,
    empleadosSinPresentismo: summaries.filter(s => !s.presentismo).length,
  };
  
  return {
    summaries,
    stats,
    holidays: holidaySet,
    loading: loadingEntries || loadingHolidays || loadingSchedules || loadingUsers || loadingAbsences,
    monthStart,
    monthEnd,
  };
}

/**
 * Formatea horas decimales a string (ej: 176.5 -> "176h 30m")
 */
export function formatHoursDecimal(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Genera CSV para liquidación según formato requerido
 */
export function generateLaborCSV(summaries: EmployeeLaborSummary[], monthLabel: string): string {
  const headers = [
    'QTY',
    'LEGAJO',
    'RECURSO',
    'CUIL',
    'PUESTO',
    'INGRESO',
    'BAJA',
    'CONTRATO',
    'JORNADA',
    'HS trabajadas',
    'FALTAS INJUSTIFICADAS',
    'LICENCIA ENFERMEDAD',
    'PRESENTISMO',
    'FERIADOS (hs)',
    'HS EXTRAS DÍA HÁBIL',
    'HS EXTRAS FRANCO/FERIADO',
  ];
  
  const rows = summaries.map((s, idx) => [
    (idx + 1).toString(),
    '', // Legajo - no tenemos
    s.userName,
    s.cuil || '-',
    s.localRole?.toUpperCase() || '-',
    s.hireDate || '-',
    '-', // Baja
    s.contractType,
    'Por hora',
    s.hsTrabajadasMes.toFixed(2),
    s.faltasInjustificadas.toString(),
    s.faltasJustificadas.toString(),
    s.presentismo ? 'SI' : 'NO',
    s.feriadosHs.toFixed(2),
    s.hsExtrasDiaHabil.toFixed(2),
    s.hsExtrasFrancoFeriado.toFixed(2),
  ]);
  
  const allRows = [headers, ...rows];
  return allRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

export default useLaborHours;
