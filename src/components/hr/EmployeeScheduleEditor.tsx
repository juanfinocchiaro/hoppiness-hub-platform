import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Calendar, Clock, Save, Loader2, Edit2 } from 'lucide-react';

interface Employee {
  id: string;
  full_name: string;
  position: string | null;
}

interface ScheduleEntry {
  id?: string;
  employee_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_day_off: boolean;
}

interface EmployeeScheduleEditorProps {
  branchId: string;
  canManage: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

export default function EmployeeScheduleEditor({ branchId, canManage }: EmployeeScheduleEditorProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Record<string, ScheduleEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingSchedules, setEditingSchedules] = useState<ScheduleEntry[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, schedRes] = await Promise.all([
        supabase
          .from('employees')
          .select('id, full_name, position')
          .eq('branch_id', branchId)
          .eq('is_active', true)
          .order('full_name'),
        supabase
          .from('employee_schedules')
          .select('*')
          .in('employee_id', 
            (await supabase.from('employees').select('id').eq('branch_id', branchId)).data?.map(e => e.id) || []
          ),
      ]);

      if (empRes.error) throw empRes.error;
      setEmployees(empRes.data || []);

      // Group schedules by employee
      const grouped: Record<string, ScheduleEntry[]> = {};
      if (schedRes.data) {
        schedRes.data.forEach((s: any) => {
          if (!grouped[s.employee_id]) {
            grouped[s.employee_id] = [];
          }
          grouped[s.employee_id].push({
            id: s.id,
            employee_id: s.employee_id,
            day_of_week: s.day_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
            is_day_off: s.is_day_off,
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
    const weekSchedule: ScheduleEntry[] = DAYS_OF_WEEK.map(day => {
      const existing = empSchedules.find(s => s.day_of_week === day.value);
      return existing || {
        employee_id: emp.id,
        day_of_week: day.value,
        start_time: '09:00',
        end_time: '17:00',
        is_day_off: true,
      };
    });
    
    setEditingSchedules(weekSchedule);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!selectedEmployee) return;
    
    setSaving(true);
    try {
      // Delete existing schedules for this employee
      await supabase
        .from('employee_schedules')
        .delete()
        .eq('employee_id', selectedEmployee.id);

      // Insert non-day-off schedules
      const toInsert = editingSchedules
        .filter(s => !s.is_day_off)
        .map(s => ({
          employee_id: s.employee_id,
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
          is_day_off: s.is_day_off,
        }));

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

  const updateScheduleEntry = (dayOfWeek: number, field: keyof ScheduleEntry, value: any) => {
    setEditingSchedules(prev => prev.map(s => 
      s.day_of_week === dayOfWeek ? { ...s, [field]: value } : s
    ));
  };

  const getTodaySchedule = (employeeId: string): { start: string; end: string } | null => {
    const today = new Date().getDay();
    const empSchedule = schedules[employeeId]?.find(s => s.day_of_week === today && !s.is_day_off);
    if (empSchedule) {
      return { start: empSchedule.start_time.slice(0, 5), end: empSchedule.end_time.slice(0, 5) };
    }
    return null;
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Planilla de Horarios
          </CardTitle>
          <CardDescription>
            Configurá los horarios semanales de cada empleado
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay empleados activos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {employees.map((emp) => {
                const todaySchedule = getTodaySchedule(emp.id);
                const hasSchedule = schedules[emp.id]?.length > 0;
                
                return (
                  <div
                    key={emp.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{emp.full_name}</p>
                      {emp.position && (
                        <p className="text-sm text-muted-foreground">{emp.position}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {hasSchedule ? (
                        <div className="text-right">
                          {todaySchedule ? (
                            <>
                              <p className="text-sm font-mono">
                                {todaySchedule.start} - {todaySchedule.end}
                              </p>
                              <p className="text-xs text-muted-foreground">Horario de hoy</p>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">Día libre hoy</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sin horario configurado</p>
                      )}
                      {canManage && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(emp)}
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Editor Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horarios de {selectedEmployee?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {editingSchedules.map((schedule) => {
              const day = DAYS_OF_WEEK.find(d => d.value === schedule.day_of_week);
              return (
                <div
                  key={schedule.day_of_week}
                  className={`flex items-center gap-4 p-3 border rounded-lg ${
                    schedule.is_day_off ? 'bg-muted/50 opacity-60' : ''
                  }`}
                >
                  <div className="w-24">
                    <p className="font-medium">{day?.label}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!schedule.is_day_off}
                      onCheckedChange={(checked) => updateScheduleEntry(schedule.day_of_week, 'is_day_off', !checked)}
                    />
                    <span className="text-sm text-muted-foreground">
                      {schedule.is_day_off ? 'Libre' : 'Trabaja'}
                    </span>
                  </div>
                  {!schedule.is_day_off && (
                    <>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Entrada:</Label>
                        <Input
                          type="time"
                          className="w-32"
                          value={schedule.start_time}
                          onChange={(e) => updateScheduleEntry(schedule.day_of_week, 'start_time', e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Salida:</Label>
                        <Input
                          type="time"
                          className="w-32"
                          value={schedule.end_time}
                          onChange={(e) => updateScheduleEntry(schedule.day_of_week, 'end_time', e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
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