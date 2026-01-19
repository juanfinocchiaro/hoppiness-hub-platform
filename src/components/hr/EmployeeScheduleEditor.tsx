import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Calendar, Clock, Save, Loader2, Edit2, Plus, Trash2, AlertTriangle } from 'lucide-react';

interface ShiftConflict {
  dayOfWeek: number;
  shift1: number;
  shift2: number;
  message: string;
}

interface Employee {
  id: string;
  full_name: string;
  position: string | null;
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

export default function EmployeeScheduleEditor({ branchId, canManage }: EmployeeScheduleEditorProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Record<string, DaySchedule[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingSchedules, setEditingSchedules] = useState<DaySchedule[]>([]);
  const [conflicts, setConflicts] = useState<ShiftConflict[]>([]);

  // Check for overlapping shifts within a day
  const detectConflicts = (schedules: DaySchedule[]): ShiftConflict[] => {
    const foundConflicts: ShiftConflict[] = [];
    
    schedules.forEach(day => {
      if (day.is_day_off || day.shifts.length < 2) return;
      
      const sortedShifts = [...day.shifts].sort((a, b) => a.start_time.localeCompare(b.start_time));
      
      for (let i = 0; i < sortedShifts.length - 1; i++) {
        const current = sortedShifts[i];
        const next = sortedShifts[i + 1];
        
        // Check if current shift ends after next shift starts
        if (current.end_time > next.start_time) {
          const dayName = DAYS_OF_WEEK.find(d => d.value === day.day_of_week)?.label || '';
          foundConflicts.push({
            dayOfWeek: day.day_of_week,
            shift1: current.shift_number,
            shift2: next.shift_number,
            message: `${dayName}: Turno ${current.shift_number} (${current.start_time}-${current.end_time}) se solapa con Turno ${next.shift_number} (${next.start_time}-${next.end_time})`,
          });
        }
      }
      
      // Also check if any shift has end_time <= start_time
      day.shifts.forEach(shift => {
        if (shift.end_time <= shift.start_time) {
          const dayName = DAYS_OF_WEEK.find(d => d.value === day.day_of_week)?.label || '';
          foundConflicts.push({
            dayOfWeek: day.day_of_week,
            shift1: shift.shift_number,
            shift2: shift.shift_number,
            message: `${dayName}: Turno ${shift.shift_number} tiene hora de salida anterior o igual a la entrada`,
          });
        }
      });
    });
    
    return foundConflicts;
  };

  // Update conflicts whenever editingSchedules changes
  useEffect(() => {
    if (showDialog) {
      setConflicts(detectConflicts(editingSchedules));
    }
  }, [editingSchedules, showDialog]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // First fetch employees
      const empRes = await supabase
        .from('employees')
        .select('id, full_name, position')
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

      // Fetch schedules
      const schedRes = await supabase
        .from('employee_schedules')
        .select('*')
        .in('employee_id', employeeList.map(e => e.id));

      // Group schedules by employee and day
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
        
        // Sort shifts within each day
        Object.values(grouped).forEach(empSchedules => {
          empSchedules.forEach(day => {
            day.shifts.sort((a, b) => a.shift_number - b.shift_number);
          });
        });
      }
      setSchedules(grouped);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error('Error al cargar horarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (branchId) {
      fetchData();
    }
  }, [branchId]);

  const openEditDialog = (emp: Employee) => {
    setSelectedEmployee(emp);
    const empSchedules = schedules[emp.id] || [];
    
    // Create a complete week schedule
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
    
    // Validate before saving
    const currentConflicts = detectConflicts(editingSchedules);
    if (currentConflicts.length > 0) {
      toast.error('Corrige los conflictos de horarios antes de guardar');
      return;
    }
    
    setSaving(true);
    try {
      // Delete existing schedules for this employee
      await supabase
        .from('employee_schedules')
        .delete()
        .eq('employee_id', selectedEmployee.id);

      // Insert new schedules
      const toInsert: any[] = [];
      
      editingSchedules.forEach(day => {
        if (day.is_day_off) {
          // Insert a single record for day off
          toInsert.push({
            employee_id: selectedEmployee.id,
            day_of_week: day.day_of_week,
            is_day_off: true,
            start_time: '00:00',
            end_time: '00:00',
            shift_number: 1,
          });
        } else {
          // Insert each shift
          day.shifts.forEach((shift, idx) => {
            toInsert.push({
              employee_id: selectedEmployee.id,
              day_of_week: day.day_of_week,
              is_day_off: false,
              start_time: shift.start_time,
              end_time: shift.end_time,
              shift_number: idx + 1,
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
      console.error('Error saving schedules:', error);
      toast.error('Error al guardar horarios');
    } finally {
      setSaving(false);
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
    const hasSplitShift = empSchedule.some(d => d.shifts.length > 1);
    
    if (workingDays === 0) return 'Sin horario';
    return `${workingDays} días${hasSplitShift ? ' (turno cortado)' : ''}`;
  };

  const formatDaySchedule = (employeeId: string, dayOfWeek: number): string => {
    const empSchedule = schedules[employeeId]?.find(d => d.day_of_week === dayOfWeek);
    if (!empSchedule || empSchedule.is_day_off || empSchedule.shifts.length === 0) return '—';
    
    return empSchedule.shifts
      .map(s => `${s.start_time.slice(0, 5)}-${s.end_time.slice(0, 5)}`)
      .join(' / ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weekly Overview Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Horarios de la Semana
          </CardTitle>
          <CardDescription>
            Vista general de horarios por empleado. Soporta turnos cortados.
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

      {/* Schedule Editor Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horarios de {selectedEmployee?.full_name}
            </DialogTitle>
          </DialogHeader>
          {conflicts.length > 0 && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <span className="font-medium">Conflictos detectados:</span>
                <ul className="list-disc list-inside mt-1 text-sm">
                  {conflicts.map((c, idx) => (
                    <li key={idx}>{c.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-3 overflow-y-auto flex-1 pr-2">
            {editingSchedules.map((schedule) => {
              const hasConflict = conflicts.some(c => c.dayOfWeek === schedule.day_of_week);
              const day = DAYS_OF_WEEK.find(d => d.value === schedule.day_of_week);
              return (
                <div
                  key={schedule.day_of_week}
                  className={`p-4 border rounded-lg ${schedule.is_day_off ? 'bg-muted/50' : ''} ${hasConflict ? 'border-destructive bg-destructive/5' : ''}`}
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
                          {schedule.is_day_off ? 'Libre' : 'Trabaja'}
                        </span>
                      </div>
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
                      {schedule.shifts.map((shift, idx) => (
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
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || conflicts.length > 0}>
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
  );
}