import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { handleError } from '@/lib/errorHandler';
import { Calendar, Clock, Save, Loader2, Edit2, Plus, Trash2, AlertTriangle, Info, ChevronLeft, ChevronRight, Scale, DollarSign, Moon, Settings } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';

// Shift cost types for CCT 329/00
type CostType = 'standard' | 'night' | 'overtime_50' | 'overtime_100';

interface ShiftCostBreakdown {
  standardMinutes: number;
  nightMinutes: number;
  overtime50Minutes: number;
  overtime100Minutes: number;
  totalCost: number;
}

interface RuleViolation {
  type: 'daily_max' | 'daily_hard_max' | 'weekly_max' | 'rest_period' | 'days_off' | 'overlap' | 'consecutive_rest';
  dayOfWeek?: number;
  message: string;
  severity: 'error' | 'warning';
  tooltip?: string;
}

interface Employee {
  id: string;
  full_name: string;
  position: string | null;
  hourly_rate: number | null;
}

interface ScheduleShift {
  shift_number: number;
  start_time: string;
  end_time: string;
}

interface DaySchedule {
  day_of_week: number;
  is_day_off: boolean;
  shifts: ScheduleShift[];
}

interface EmployeeScheduleEditorProps {
  branchId: string;
  canManage: boolean;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miércoles', short: 'Mié' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
  { value: 0, label: 'Domingo', short: 'Dom' },
];

const MONTHS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];

// CCT 329/2000 Rules - Argentina Fast Food
const CCT_RULES = {
  maxDailySoftHours: 9,    // Soft warning - exceeds normal
  maxDailyHardHours: 12,   // Hard block - illegal
  maxWeeklyHours: 48,      // Art. 44 - Jornada semanal máxima
  normalWeeklyHours: 44,   // Jornada normal semanal
  maxMonthlyHours: 190,    // Art. 45 - Más de 190hs mensuales = hora extra
  minRestBetweenShifts: 12, // Minimum 12 hours rest between shifts
  minConsecutiveRestHours: 35, // Preferred: 35 consecutive hours off per week
  minDaysOff: 1,           // Mínimo 1 día libre por semana
  // Time windows for cost calculation
  nightStart: 21,          // 21:00 - Start of night shift
  nightEnd: 6,             // 06:00 - End of night shift
  saturdayOvertimeStart: 13, // 13:00 on Saturday starts 100% overtime
};

// Cost multipliers
const COST_MULTIPLIERS = {
  standard: 1.0,
  night: 1.25,      // 25% surcharge for night work
  overtime_50: 1.5, // 50% overtime
  overtime_100: 2.0, // 100% overtime (Sunday, Holiday, Franco, Sat > 13:00)
};

export default function EmployeeScheduleEditor({ branchId, canManage }: EmployeeScheduleEditorProps) {
  const { isAdmin, isFranquiciado } = useUserRole();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Record<string, DaySchedule[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingSchedules, setEditingSchedules] = useState<DaySchedule[]>([]);
  const [violations, setViolations] = useState<RuleViolation[]>([]);
  const [enforceLaborLaw, setEnforceLaborLaw] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  
  // Month/Year selection
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // Fetch branch settings
  useEffect(() => {
    async function fetchBranchSettings() {
      const { data } = await supabase
        .from('branches')
        .select('enforce_labor_law')
        .eq('id', branchId)
        .single();
      
      if (data) {
        setEnforceLaborLaw(data.enforce_labor_law ?? true);
      }
    }
    fetchBranchSettings();
  }, [branchId]);

  // Calculate minutes worked in time windows for cost calculation
  const calculateShiftCost = (
    startTime: string,
    endTime: string,
    dayOfWeek: number,
    hourlyRate: number,
    isRestDay: boolean = false
  ): ShiftCostBreakdown => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    
    let standardMinutes = 0;
    let nightMinutes = 0;
    let overtime50Minutes = 0;
    let overtime100Minutes = 0;
    
    const isSunday = dayOfWeek === 0;
    const isSaturday = dayOfWeek === 6;
    
    // If rest day (Franco), all is 100% overtime
    if (isRestDay || isSunday) {
      const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
      overtime100Minutes = Math.max(0, totalMinutes);
      
      // Still calculate night surcharge on top of 100%
      for (let h = startH; h < endH; h++) {
        const isNight = h >= CCT_RULES.nightStart || h < CCT_RULES.nightEnd;
        if (isNight) nightMinutes += 60;
      }
    } else {
      // Calculate minute by minute
      for (let h = startH; h < endH; h++) {
        const isNight = h >= CCT_RULES.nightStart || h < CCT_RULES.nightEnd;
        
        // Saturday after 13:00 = 100% overtime
        if (isSaturday && h >= CCT_RULES.saturdayOvertimeStart) {
          overtime100Minutes += 60;
        } else {
          standardMinutes += 60;
        }
        
        if (isNight) {
          nightMinutes += 60;
        }
      }
    }
    
    // Calculate cost
    const hourlyRateValue = hourlyRate || 0;
    const standardCost = (standardMinutes / 60) * hourlyRateValue * COST_MULTIPLIERS.standard;
    const nightSurcharge = (nightMinutes / 60) * hourlyRateValue * 0.25; // Additional 25%
    const overtime100Cost = (overtime100Minutes / 60) * hourlyRateValue * COST_MULTIPLIERS.overtime_100;
    
    const totalCost = standardCost + nightSurcharge + overtime100Cost;
    
    return {
      standardMinutes,
      nightMinutes,
      overtime50Minutes,
      overtime100Minutes,
      totalCost,
    };
  };

  // Calculate hours for a day's shifts
  const calculateDayHours = (shifts: ScheduleShift[]): number => {
    return shifts.reduce((total, shift) => {
      const [startH, startM] = shift.start_time.split(':').map(Number);
      const [endH, endM] = shift.end_time.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      const duration = endMinutes > startMinutes ? endMinutes - startMinutes : 0;
      return total + duration / 60;
    }, 0);
  };

  // Get end time of last shift on a day
  const getLastEndTime = (schedule: DaySchedule): { hours: number; minutes: number } | null => {
    if (schedule.is_day_off || schedule.shifts.length === 0) return null;
    const lastShift = schedule.shifts.reduce((latest, shift) => 
      shift.end_time > latest.end_time ? shift : latest
    );
    const [hours, minutes] = lastShift.end_time.split(':').map(Number);
    return { hours, minutes };
  };

  // Get start time of first shift on a day  
  const getFirstStartTime = (schedule: DaySchedule): { hours: number; minutes: number } | null => {
    if (schedule.is_day_off || schedule.shifts.length === 0) return null;
    const firstShift = schedule.shifts.reduce((earliest, shift) => 
      shift.start_time < earliest.start_time ? shift : earliest
    );
    const [hours, minutes] = firstShift.start_time.split(':').map(Number);
    return { hours, minutes };
  };

  // Calculate rest hours between two consecutive days
  const calculateRestBetweenDays = (endDay: DaySchedule, startDay: DaySchedule): number => {
    const endTime = getLastEndTime(endDay);
    const startTime = getFirstStartTime(startDay);
    
    if (!endTime || !startTime) return 24; // Full day off counts as 24h rest
    
    // Hours from end of shift to midnight + hours from midnight to start
    const hoursToMidnight = 24 - endTime.hours - (endTime.minutes / 60);
    const hoursFromMidnight = startTime.hours + (startTime.minutes / 60);
    
    return hoursToMidnight + hoursFromMidnight;
  };

  // Validate schedules against CCT 329/2000 rules
  const validateSchedules = (schedules: DaySchedule[]): RuleViolation[] => {
    if (!enforceLaborLaw) return [];
    
    const foundViolations: RuleViolation[] = [];
    
    let totalWeeklyHours = 0;
    let daysOff = 0;
    
    schedules.forEach((day, index) => {
      if (day.is_day_off) {
        daysOff++;
        return;
      }
      
      // Check for overlapping shifts
      if (day.shifts.length >= 2) {
        const sortedShifts = [...day.shifts].sort((a, b) => a.start_time.localeCompare(b.start_time));
        for (let i = 0; i < sortedShifts.length - 1; i++) {
          const current = sortedShifts[i];
          const next = sortedShifts[i + 1];
          if (current.end_time > next.start_time) {
            const dayName = DAYS_OF_WEEK.find(d => d.value === day.day_of_week)?.label || '';
            foundViolations.push({
              type: 'overlap',
              dayOfWeek: day.day_of_week,
              message: `${dayName}: Los turnos se solapan`,
              severity: 'error',
            });
          }
        }
      }
      
      // Check end_time > start_time
      day.shifts.forEach(shift => {
        if (shift.end_time <= shift.start_time) {
          const dayName = DAYS_OF_WEEK.find(d => d.value === day.day_of_week)?.label || '';
          foundViolations.push({
            type: 'overlap',
            dayOfWeek: day.day_of_week,
            message: `${dayName}: Hora de salida debe ser posterior a la entrada`,
            severity: 'error',
          });
        }
      });
      
      // Check daily hours
      const dayHours = calculateDayHours(day.shifts);
      totalWeeklyHours += dayHours;
      
      const dayName = DAYS_OF_WEEK.find(d => d.value === day.day_of_week)?.label || '';
      
      // Hard block: > 12 hours
      if (dayHours > CCT_RULES.maxDailyHardHours) {
        foundViolations.push({
          type: 'daily_hard_max',
          dayOfWeek: day.day_of_week,
          message: `${dayName}: ${dayHours.toFixed(1)}hs - BLOQUEO: Máximo legal ${CCT_RULES.maxDailyHardHours}hs`,
          severity: 'error',
          tooltip: 'No se puede programar más de 12hs en un día',
        });
      } 
      // Soft warning: > 9 hours
      else if (dayHours > CCT_RULES.maxDailySoftHours) {
        foundViolations.push({
          type: 'daily_max',
          dayOfWeek: day.day_of_week,
          message: `${dayName}: ${dayHours.toFixed(1)}hs excede las ${CCT_RULES.maxDailySoftHours}hs normales (genera horas extra)`,
          severity: 'warning',
        });
      }
      
      // Check 12-hour rest between consecutive days
      if (index > 0) {
        const previousDayIndex = index - 1;
        const previousDay = schedules[previousDayIndex];
        
        if (!previousDay.is_day_off && !day.is_day_off) {
          const restHours = calculateRestBetweenDays(previousDay, day);
          
          if (restHours < CCT_RULES.minRestBetweenShifts) {
            const prevDayName = DAYS_OF_WEEK.find(d => d.value === previousDay.day_of_week)?.label || '';
            foundViolations.push({
              type: 'rest_period',
              dayOfWeek: day.day_of_week,
              message: `Descanso insuficiente entre ${prevDayName} y ${dayName}: ${restHours.toFixed(1)}hs (mínimo ${CCT_RULES.minRestBetweenShifts}hs)`,
              severity: 'error',
              tooltip: '⚠️ Descanso insuficiente (Menos de 12hs)',
            });
          }
        }
      }
    });
    
    // Check weekly hours
    if (totalWeeklyHours > CCT_RULES.maxWeeklyHours) {
      foundViolations.push({
        type: 'weekly_max',
        message: `Total semanal ${totalWeeklyHours.toFixed(1)}hs excede el máximo de ${CCT_RULES.maxWeeklyHours}hs (CCT Art. 44)`,
        severity: 'error',
      });
    } else if (totalWeeklyHours > CCT_RULES.normalWeeklyHours) {
      foundViolations.push({
        type: 'weekly_max',
        message: `Total semanal ${totalWeeklyHours.toFixed(1)}hs excede las ${CCT_RULES.normalWeeklyHours}hs normales (genera horas extra)`,
        severity: 'warning',
      });
    }
    
    // Check minimum days off
    if (daysOff < CCT_RULES.minDaysOff) {
      foundViolations.push({
        type: 'days_off',
        message: `Debe tener al menos ${CCT_RULES.minDaysOff} día libre por semana`,
        severity: 'error',
      });
    }
    
    return foundViolations;
  };

  // Calculate estimated weekly cost for current editing schedule
  const calculateWeeklyCost = useMemo(() => {
    if (!selectedEmployee?.hourly_rate) return null;
    
    let totalCost = 0;
    const daysOff = editingSchedules.filter(d => d.is_day_off).map(d => d.day_of_week);
    
    editingSchedules.forEach(day => {
      if (day.is_day_off) return;
      
      const isRestDay = false; // Would need to track designated rest days
      
      day.shifts.forEach(shift => {
        const cost = calculateShiftCost(
          shift.start_time,
          shift.end_time,
          day.day_of_week,
          selectedEmployee.hourly_rate || 0,
          isRestDay
        );
        totalCost += cost.totalCost;
      });
    });
    
    return totalCost;
  }, [editingSchedules, selectedEmployee]);

  // Calculate per-shift cost breakdown
  const getShiftCostDisplay = (shift: ScheduleShift, dayOfWeek: number): ShiftCostBreakdown | null => {
    if (!selectedEmployee?.hourly_rate) return null;
    return calculateShiftCost(shift.start_time, shift.end_time, dayOfWeek, selectedEmployee.hourly_rate);
  };

  // Update violations whenever editingSchedules changes
  useEffect(() => {
    if (showDialog) {
      setViolations(validateSchedules(editingSchedules));
    }
  }, [editingSchedules, showDialog, enforceLaborLaw]);

  // Calculate total hours for current editing schedule
  const editingTotalHours = useMemo(() => {
    return editingSchedules
      .filter(d => !d.is_day_off)
      .reduce((total, day) => total + calculateDayHours(day.shifts), 0);
  }, [editingSchedules]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const empRes = await supabase
        .from('employees')
        .select('id, full_name, position, hourly_rate')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .order('full_name');

      if (empRes.error) throw empRes.error;
      const employeeList = empRes.data || [];
      setEmployees(employeeList);

      if (employeeList.length === 0) {
        setSchedules({});
        setLoading(false);
        return;
      }

      // Fetch schedules for selected month
      const schedRes = await supabase
        .from('employee_schedules')
        .select('*')
        .in('employee_id', employeeList.map(e => e.id))
        .eq('schedule_month', selectedMonth)
        .eq('schedule_year', selectedYear);

      const grouped: Record<string, DaySchedule[]> = {};
      if (schedRes.data) {
        schedRes.data.forEach((s: any) => {
          if (!grouped[s.employee_id]) {
            grouped[s.employee_id] = [];
          }
          
          let daySchedule = grouped[s.employee_id].find(d => d.day_of_week === s.day_of_week);
          if (!daySchedule) {
            daySchedule = {
              day_of_week: s.day_of_week,
              is_day_off: s.is_day_off,
              shifts: [],
            };
            grouped[s.employee_id].push(daySchedule);
          }
          
          if (!s.is_day_off) {
            daySchedule.shifts.push({
              shift_number: s.shift_number || 1,
              start_time: s.start_time,
              end_time: s.end_time,
            });
          }
        });
        
        Object.values(grouped).forEach(empSchedules => {
          empSchedules.forEach(day => {
            day.shifts.sort((a, b) => a.shift_number - b.shift_number);
          });
        });
      }
      setSchedules(grouped);
    } catch (error) {
      handleError(error, { userMessage: 'Error al cargar horarios', context: 'EmployeeScheduleEditor.fetchData' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (branchId) {
      fetchData();
    }
  }, [branchId, selectedMonth, selectedYear]);

  const openEditDialog = (emp: Employee) => {
    setSelectedEmployee(emp);
    const empSchedules = schedules[emp.id] || [];
    
    const weekSchedule: DaySchedule[] = DAYS_OF_WEEK.map(day => {
      const existing = empSchedules.find(s => s.day_of_week === day.value);
      if (existing) {
        return { ...existing, shifts: existing.shifts.length > 0 ? [...existing.shifts] : [{ shift_number: 1, start_time: '09:00', end_time: '17:00' }] };
      }
      return {
        day_of_week: day.value,
        is_day_off: true,
        shifts: [{ shift_number: 1, start_time: '09:00', end_time: '17:00' }],
      };
    });
    
    setEditingSchedules(weekSchedule);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!selectedEmployee) return;
    
    if (enforceLaborLaw) {
      const currentViolations = validateSchedules(editingSchedules);
      const hasErrors = currentViolations.some(v => v.severity === 'error');
      
      if (hasErrors) {
        toast.error('Corrige las violaciones al convenio antes de guardar');
        return;
      }
    }
    
    setSaving(true);
    try {
      // Delete existing schedules for this employee/month/year
      await supabase
        .from('employee_schedules')
        .delete()
        .eq('employee_id', selectedEmployee.id)
        .eq('schedule_month', selectedMonth)
        .eq('schedule_year', selectedYear);

      const toInsert: any[] = [];
      
      editingSchedules.forEach(day => {
        if (day.is_day_off) {
          toInsert.push({
            employee_id: selectedEmployee.id,
            day_of_week: day.day_of_week,
            is_day_off: true,
            start_time: '00:00',
            end_time: '00:00',
            shift_number: 1,
            schedule_month: selectedMonth,
            schedule_year: selectedYear,
          });
        } else {
          day.shifts.forEach((shift, idx) => {
            toInsert.push({
              employee_id: selectedEmployee.id,
              day_of_week: day.day_of_week,
              is_day_off: false,
              start_time: shift.start_time,
              end_time: shift.end_time,
              shift_number: idx + 1,
              schedule_month: selectedMonth,
              schedule_year: selectedYear,
            });
          });
        }
      });

      if (toInsert.length > 0) {
        const { error } = await supabase
          .from('employee_schedules')
          .insert(toInsert);
        
        if (error) throw error;
      }

      toast.success('Horarios guardados');
      setShowDialog(false);
      fetchData();
    } catch (error) {
      handleError(error, { userMessage: 'Error al guardar horarios', context: 'EmployeeScheduleEditor.handleSave' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('branches')
        .update({ enforce_labor_law: enforceLaborLaw })
        .eq('id', branchId);
      
      if (error) throw error;
      
      toast.success(enforceLaborLaw ? 'Validación laboral activada' : 'Validación laboral desactivada');
      setShowSettingsDialog(false);
    } catch (error) {
      handleError(error, { userMessage: 'Error al guardar configuración', context: 'EmployeeScheduleEditor.handleSaveSettings' });
    } finally {
      setSavingSettings(false);
    }
  };

  const toggleDayOff = (dayOfWeek: number) => {
    setEditingSchedules(prev => prev.map(d => 
      d.day_of_week === dayOfWeek 
        ? { ...d, is_day_off: !d.is_day_off }
        : d
    ));
  };

  const updateShift = (dayOfWeek: number, shiftNumber: number, field: 'start_time' | 'end_time', value: string) => {
    setEditingSchedules(prev => prev.map(d => {
      if (d.day_of_week !== dayOfWeek) return d;
      return {
        ...d,
        shifts: d.shifts.map(s => 
          s.shift_number === shiftNumber ? { ...s, [field]: value } : s
        ),
      };
    }));
  };

  const addShift = (dayOfWeek: number) => {
    setEditingSchedules(prev => prev.map(d => {
      if (d.day_of_week !== dayOfWeek) return d;
      const nextNumber = d.shifts.length + 1;
      return {
        ...d,
        shifts: [...d.shifts, { shift_number: nextNumber, start_time: '14:00', end_time: '22:00' }],
      };
    }));
  };

  const removeShift = (dayOfWeek: number, shiftNumber: number) => {
    setEditingSchedules(prev => prev.map(d => {
      if (d.day_of_week !== dayOfWeek) return d;
      return {
        ...d,
        shifts: d.shifts.filter(s => s.shift_number !== shiftNumber).map((s, idx) => ({ ...s, shift_number: idx + 1 })),
      };
    }));
  };

  const getEmployeeWeekSummary = (employeeId: string): string => {
    const empSchedule = schedules[employeeId] || [];
    const workingDays = empSchedule.filter(d => !d.is_day_off && d.shifts.length > 0).length;
    const totalHours = empSchedule
      .filter(d => !d.is_day_off)
      .reduce((total, day) => total + calculateDayHours(day.shifts), 0);
    
    if (workingDays === 0) return 'Sin horario';
    return `${workingDays} días · ${totalHours.toFixed(0)}hs`;
  };

  const formatDaySchedule = (employeeId: string, dayOfWeek: number): string => {
    const empSchedule = schedules[employeeId]?.find(d => d.day_of_week === dayOfWeek);
    if (!empSchedule || empSchedule.is_day_off || empSchedule.shifts.length === 0) return '—';
    
    return empSchedule.shifts
      .map(s => `${s.start_time.slice(0, 5)}-${s.end_time.slice(0, 5)}`)
      .join(' / ');
  };

  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const hasErrors = violations.some(v => v.severity === 'error');
  const hasWarnings = violations.some(v => v.severity === 'warning');
  const canDisableLaborLaw = isAdmin || isFranquiciado;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Settings / Labor Law Toggle */}
        {canDisableLaborLaw && (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowSettingsDialog(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Configuración
            </Button>
          </div>
        )}

        {/* CCT Rules Card - Only show if enforcement is enabled */}
        {enforceLaborLaw && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Scale className="h-5 w-5 text-primary" />
                Reglas del Convenio CCT 329/2000 (Fast Food Argentina)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Diario (advertencia)</p>
                  <p className="font-semibold">{CCT_RULES.maxDailySoftHours}hs</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Diario (bloqueo)</p>
                  <p className="font-semibold text-destructive">{CCT_RULES.maxDailyHardHours}hs</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Descanso entre turnos</p>
                  <p className="font-semibold">{CCT_RULES.minRestBetweenShifts}hs mín.</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Semanal máximo</p>
                  <p className="font-semibold">{CCT_RULES.maxWeeklyHours}hs (Art. 44)</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Nocturno (recargo)</p>
                  <p className="font-semibold">{CCT_RULES.nightStart}:00 - {CCT_RULES.nightEnd}:00</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t text-xs text-muted-foreground space-y-1">
                <p><strong>Horas Extra 50%:</strong> Horas extra Lun-Vie o Sábado hasta 13:00</p>
                <p><strong>Horas Extra 100%:</strong> Domingo, Feriados, Franco, Sábado después de 13:00</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Month Selector */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Horarios Mensuales
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2">
                  <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map(m => (
                        <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[selectedYear - 1, selectedYear, selectedYear + 1].map(y => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" size="icon" onClick={goToNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardDescription>
              Planilla de horarios para {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}
              {!enforceLaborLaw && (
                <Badge variant="outline" className="ml-2 text-yellow-600">
                  Validación laboral desactivada
                </Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {employees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No hay empleados activos</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Empleado</th>
                      {DAYS_OF_WEEK.map(day => (
                        <th key={day.value} className="text-center py-3 px-2 font-medium min-w-[80px]">
                          {day.short}
                        </th>
                      ))}
                      {canManage && <th className="text-right py-3 px-2 w-20"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr key={emp.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2">
                          <div>
                            <p className="font-medium">{emp.full_name}</p>
                            <p className="text-xs text-muted-foreground">{getEmployeeWeekSummary(emp.id)}</p>
                          </div>
                        </td>
                        {DAYS_OF_WEEK.map(day => (
                          <td key={day.value} className="text-center py-3 px-1">
                            <span className="text-xs font-mono">
                              {formatDaySchedule(emp.id, day.value)}
                            </span>
                          </td>
                        ))}
                        {canManage && (
                          <td className="text-right py-3 px-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(emp)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Settings Dialog */}
        <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuración de Horarios
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Validación Ley Laboral</Label>
                  <p className="text-sm text-muted-foreground">
                    Aplica reglas del CCT 329/2000 al programar turnos
                  </p>
                </div>
                <Switch
                  checked={enforceLaborLaw}
                  onCheckedChange={setEnforceLaborLaw}
                />
              </div>
              {!enforceLaborLaw && (
                <Alert className="border-yellow-500 bg-yellow-50 text-yellow-800">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Atención</AlertTitle>
                  <AlertDescription>
                    Al deshabilitar la validación, podrás crear horarios sin restricciones pero
                    asumís la responsabilidad legal de cumplir con la normativa vigente.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveSettings} disabled={savingSettings}>
                {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Schedule Editor Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Horarios de {selectedEmployee?.full_name} - {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}
              </DialogTitle>
            </DialogHeader>

            {/* Hours & Cost Summary */}
            <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Total semanal</p>
                <p className={`text-xl font-bold ${
                  enforceLaborLaw && editingTotalHours > CCT_RULES.maxWeeklyHours ? 'text-destructive' : 
                  enforceLaborLaw && editingTotalHours > CCT_RULES.normalWeeklyHours ? 'text-yellow-600' : 'text-primary'
                }`}>
                  {editingTotalHours.toFixed(1)}hs
                </p>
              </div>
              {calculateWeeklyCost !== null && (
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Costo estimado</p>
                  <p className="text-xl font-bold text-green-600">
                    ${calculateWeeklyCost.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              )}
              {enforceLaborLaw && (
                <div className="text-right text-sm">
                  <p className="text-muted-foreground">Límites:</p>
                  <p>Normal: {CCT_RULES.normalWeeklyHours}hs · Máx: {CCT_RULES.maxWeeklyHours}hs</p>
                </div>
              )}
            </div>

            {/* Violations Alert */}
            {enforceLaborLaw && hasErrors && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Violaciones al Convenio</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-1 text-sm">
                    {violations.filter(v => v.severity === 'error').map((v, idx) => (
                      <li key={idx}>{v.message}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {enforceLaborLaw && hasWarnings && !hasErrors && (
              <Alert className="border-yellow-500 bg-yellow-50 text-yellow-800">
                <Info className="h-4 w-4" />
                <AlertTitle>Advertencias</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-1 text-sm">
                    {violations.filter(v => v.severity === 'warning').map((v, idx) => (
                      <li key={idx}>{v.message}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3 overflow-y-auto flex-1 pr-2">
              {editingSchedules.map((schedule) => {
                const dayViolation = violations.find(v => v.dayOfWeek === schedule.day_of_week && v.severity === 'error');
                const restViolation = violations.find(v => v.type === 'rest_period' && v.dayOfWeek === schedule.day_of_week);
                const dayHours = calculateDayHours(schedule.shifts);
                const day = DAYS_OF_WEEK.find(d => d.value === schedule.day_of_week);
                
                return (
                  <Tooltip key={schedule.day_of_week}>
                    <TooltipTrigger asChild>
                      <div
                        className={`p-4 border rounded-lg transition-all ${
                          schedule.is_day_off ? 'bg-muted/50' : ''
                        } ${
                          restViolation ? 'border-destructive border-2 bg-destructive/5' :
                          dayViolation ? 'border-destructive bg-destructive/5' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="font-medium w-24">{day?.label}</span>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={!schedule.is_day_off}
                                onCheckedChange={() => toggleDayOff(schedule.day_of_week)}
                              />
                              <span className="text-sm text-muted-foreground">
                                {schedule.is_day_off ? 'Libre (Franco)' : `${dayHours.toFixed(1)}hs`}
                              </span>
                            </div>
                            {!schedule.is_day_off && enforceLaborLaw && dayHours > CCT_RULES.maxDailyHardHours && (
                              <Badge variant="destructive" className="text-xs">
                                BLOQUEO: &gt;{CCT_RULES.maxDailyHardHours}hs
                              </Badge>
                            )}
                            {!schedule.is_day_off && enforceLaborLaw && dayHours > CCT_RULES.maxDailySoftHours && dayHours <= CCT_RULES.maxDailyHardHours && (
                              <Badge variant="outline" className="text-xs text-yellow-600">
                                Hora extra
                              </Badge>
                            )}
                            {restViolation && (
                              <Badge variant="destructive" className="text-xs animate-pulse">
                                ⚠️ Descanso insuficiente
                              </Badge>
                            )}
                          </div>
                          {!schedule.is_day_off && schedule.shifts.length < 3 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addShift(schedule.day_of_week)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Turno
                            </Button>
                          )}
                        </div>
                        
                        {!schedule.is_day_off && (
                          <div className="space-y-2 ml-4">
                            {schedule.shifts.map((shift, idx) => {
                              const shiftCost = getShiftCostDisplay(shift, schedule.day_of_week);
                              const hasNightHours = shiftCost && shiftCost.nightMinutes > 0;
                              const has100Overtime = shiftCost && shiftCost.overtime100Minutes > 0;
                              
                              return (
                                <div key={shift.shift_number} className="flex items-center gap-3 p-2 bg-background rounded border">
                                  <Badge variant="secondary" className="text-xs">
                                    Turno {idx + 1}
                                  </Badge>
                                  <div className="flex items-center gap-2">
                                    <Label className="text-xs text-muted-foreground">Entrada:</Label>
                                    <Input
                                      type="time"
                                      className="w-28 h-8"
                                      value={shift.start_time}
                                      onChange={(e) => updateShift(schedule.day_of_week, shift.shift_number, 'start_time', e.target.value)}
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Label className="text-xs text-muted-foreground">Salida:</Label>
                                    <Input
                                      type="time"
                                      className="w-28 h-8"
                                      value={shift.end_time}
                                      onChange={(e) => updateShift(schedule.day_of_week, shift.shift_number, 'end_time', e.target.value)}
                                    />
                                  </div>
                                  
                                  {/* Cost indicators */}
                                  <div className="flex items-center gap-1">
                                    {hasNightHours && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                                            <Moon className="h-3 w-3 mr-1" />
                                            Nocturno
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {Math.round(shiftCost.nightMinutes / 60)}hs con recargo nocturno (+25%)
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                    {has100Overtime && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                            <DollarSign className="h-3 w-3 mr-1" />
                                            100%
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {Math.round(shiftCost.overtime100Minutes / 60)}hs al 100% extra
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                    {shiftCost && selectedEmployee?.hourly_rate && (
                                      <Badge variant="secondary" className="text-xs bg-green-50 text-green-700">
                                        ${shiftCost.totalCost.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  {schedule.shifts.length > 1 && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive"
                                      onClick={() => removeShift(schedule.day_of_week, shift.shift_number)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </TooltipTrigger>
                    {restViolation && (
                      <TooltipContent side="right" className="bg-destructive text-destructive-foreground">
                        {restViolation.tooltip || restViolation.message}
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving || (enforceLaborLaw && hasErrors)}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
