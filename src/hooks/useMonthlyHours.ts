/**
 * useMonthlyHours Hook
 * 
 * Calcula las horas trabajadas por empleado en un mes dado.
 * Los turnos que cruzan medianoche se asignan al día de entrada.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, differenceInMinutes, format } from 'date-fns';
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
}

export interface EmployeeHoursSummary {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  localRole: LocalRole;
  totalMinutes: number;
  daysWorked: number;
  averageMinutesPerDay: number;
  entries: DayEntry[];
  hasUnpairedEntries: boolean;
  unpairedCount: number;
}

/**
 * Empareja las entradas de fichaje (clock_in con clock_out)
 * Los turnos que cruzan medianoche se asignan al día de entrada
 */
function pairClockEntries(entries: ClockEntryRaw[]): DayEntry[] {
  // Ordenar por timestamp
  const sorted = [...entries].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  
  const paired: DayEntry[] = [];
  let pendingClockIn: ClockEntryRaw | null = null;
  
  for (const entry of sorted) {
    if (entry.entry_type === 'clock_in') {
      // Si había un clock_in pendiente sin par, lo agregamos como incompleto
      if (pendingClockIn) {
        paired.push({
          date: format(new Date(pendingClockIn.created_at), 'yyyy-MM-dd'),
          checkIn: pendingClockIn.created_at,
          checkOut: null,
          minutesWorked: 0,
        });
      }
      pendingClockIn = entry;
    } else if (entry.entry_type === 'clock_out') {
      if (pendingClockIn) {
        const checkInTime = new Date(pendingClockIn.created_at);
        const checkOutTime = new Date(entry.created_at);
        const minutes = differenceInMinutes(checkOutTime, checkInTime);
        
        // Asignar al día del clock_in (entrada)
        paired.push({
          date: format(checkInTime, 'yyyy-MM-dd'),
          checkIn: pendingClockIn.created_at,
          checkOut: entry.created_at,
          minutesWorked: Math.max(0, minutes),
        });
        pendingClockIn = null;
      }
      // Si hay clock_out sin clock_in previo, lo ignoramos
    }
  }
  
  // Si quedó un clock_in sin par al final
  if (pendingClockIn) {
    paired.push({
      date: format(new Date(pendingClockIn.created_at), 'yyyy-MM-dd'),
      checkIn: pendingClockIn.created_at,
      checkOut: null,
      minutesWorked: 0,
    });
  }
  
  return paired;
}

interface UseMonthlyHoursOptions {
  branchId: string;
  year: number;
  month: number; // 0-indexed (0 = January)
}

export function useMonthlyHours({ branchId, year, month }: UseMonthlyHoursOptions) {
  // Calcular rango del mes
  const monthStart = startOfMonth(new Date(year, month));
  const monthEnd = endOfMonth(new Date(year, month));
  
  // Query para obtener todas las entradas del mes para la sucursal
  const { data: rawEntries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ['monthly-clock-entries', branchId, year, month],
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
  
  // Query para obtener datos de usuarios que ficharon
  const userIds = [...new Set(rawEntries.map(e => e.user_id))];
  
  const { data: usersData = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['monthly-hours-users', branchId, userIds.join(',')],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);
      
      if (profilesError) throw profilesError;
      
      // Obtener roles de branch
      const { data: roles, error: rolesError } = await supabase
        .from('user_branch_roles')
        .select('user_id, local_role')
        .eq('branch_id', branchId)
        .in('user_id', userIds)
        .eq('is_active', true);
      
      if (rolesError) throw rolesError;
      
      // Combinar
      return (profiles || []).map(p => {
        const role = roles?.find(r => r.user_id === p.user_id);
        return {
          user_id: p.user_id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          local_role: role?.local_role as LocalRole || null,
        };
      });
    },
    enabled: userIds.length > 0,
    staleTime: 60 * 1000,
  });
  
  // Calcular resumen por empleado
  const summaries: EmployeeHoursSummary[] = userIds.map(userId => {
    const userData = usersData.find(u => u.user_id === userId);
    const userEntries = rawEntries.filter(e => e.user_id === userId);
    const paired = pairClockEntries(userEntries);
    
    const unpairedEntries = paired.filter(p => p.checkOut === null);
    const completedEntries = paired.filter(p => p.checkOut !== null);
    
    const totalMinutes = completedEntries.reduce((sum, e) => sum + e.minutesWorked, 0);
    const uniqueDays = new Set(completedEntries.map(e => e.date)).size;
    
    return {
      userId,
      userName: userData?.full_name || 'Usuario desconocido',
      avatarUrl: userData?.avatar_url || null,
      localRole: userData?.local_role || null,
      totalMinutes,
      daysWorked: uniqueDays,
      averageMinutesPerDay: uniqueDays > 0 ? Math.round(totalMinutes / uniqueDays) : 0,
      entries: paired,
      hasUnpairedEntries: unpairedEntries.length > 0,
      unpairedCount: unpairedEntries.length,
    };
  });
  
  // Ordenar por total de horas (descendente)
  summaries.sort((a, b) => b.totalMinutes - a.totalMinutes);
  
  // Totales generales
  const totalTeamMinutes = summaries.reduce((sum, s) => sum + s.totalMinutes, 0);
  const totalTeamDays = summaries.reduce((sum, s) => sum + s.daysWorked, 0);
  const employeesWithUnpaired = summaries.filter(s => s.hasUnpairedEntries).length;
  
  return {
    summaries,
    totalTeamMinutes,
    totalTeamDays,
    employeesWithUnpaired,
    loading: loadingEntries || loadingUsers,
    monthStart,
    monthEnd,
  };
}

/**
 * Formatea minutos a string legible (ej: "176h 30m")
 */
export function formatMinutesToHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Genera datos CSV para exportar
 */
export function generateHoursCSV(summaries: EmployeeHoursSummary[], monthLabel: string): string {
  const headers = ['Empleado', 'Rol', 'Horas Trabajadas', 'Días Trabajados', 'Promedio por Día', 'Fichajes Sin Par'];
  
  const rows = summaries.map(s => [
    s.userName,
    s.localRole || '-',
    formatMinutesToHours(s.totalMinutes),
    s.daysWorked.toString(),
    formatMinutesToHours(s.averageMinutesPerDay),
    s.unpairedCount.toString(),
  ]);
  
  const totalRow = [
    'TOTAL EQUIPO',
    '',
    formatMinutesToHours(summaries.reduce((sum, s) => sum + s.totalMinutes, 0)),
    summaries.reduce((sum, s) => sum + s.daysWorked, 0).toString(),
    '',
    '',
  ];
  
  const allRows = [headers, ...rows, totalRow];
  
  return allRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

export default useMonthlyHours;
