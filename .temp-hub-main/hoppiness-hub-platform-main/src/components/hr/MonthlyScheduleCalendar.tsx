import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Trash2,
  User
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameMonth, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

interface Employee {
  id: string;
  full_name: string;
  position: string | null;
  is_active: boolean;
}

interface DaySchedule {
  id: string;
  employee_id: string;
  day_of_week: number; // Used as day_of_month when schedule_month/year are set
  start_time: string;
  end_time: string;
  is_day_off: boolean;
  schedule_month: number | null;
  schedule_year: number | null;
}

interface MonthlyScheduleCalendarProps {
  branchId: string;
}

const WEEKDAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function MonthlyScheduleCalendar({ branchId }: MonthlyScheduleCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [schedules, setSchedules] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<DaySchedule | null>(null);
  const [formEmployee, setFormEmployee] = useState<string>('');
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('18:00');
  const [formIsDayOff, setFormIsDayOff] = useState(false);
  const [saving, setSaving] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  useEffect(() => {
    fetchEmployees();
  }, [branchId]);

  useEffect(() => {
    fetchSchedules();
  }, [branchId, currentMonth, selectedEmployee]);

  async function fetchEmployees() {
    const { data } = await supabase
      .from('employees')
      .select('id, full_name, position, is_active')
      .eq('branch_id', branchId)
      .eq('is_active', true)
      .order('full_name');
    
    setEmployees(data || []);
    if (data && data.length > 0 && !formEmployee) {
      setFormEmployee(data[0].id);
    }
  }

  async function fetchSchedules() {
    setLoading(true);
    const month = currentMonth.getMonth() + 1;
    const year = currentMonth.getFullYear();

    let query = supabase
      .from('employee_schedules')
      .select('*')
      .eq('schedule_month', month)
      .eq('schedule_year', year);

    if (selectedEmployee !== 'all') {
      query = query.eq('employee_id', selectedEmployee);
    } else {
      // Get all employees for this branch
      const { data: branchEmployees } = await supabase
        .from('employees')
        .select('id')
        .eq('branch_id', branchId)
        .eq('is_active', true);
      
      if (branchEmployees && branchEmployees.length > 0) {
        query = query.in('employee_id', branchEmployees.map(e => e.id));
      }
    }

    const { data } = await query;
    setSchedules(data || []);
    setLoading(false);
  }

  function getSchedulesForDay(dayOfMonth: number): DaySchedule[] {
    return schedules.filter(s => s.day_of_week === dayOfMonth);
  }

  function handleDayClick(date: Date) {
    setSelectedDate(date);
    setEditingSchedule(null);
    setFormIsDayOff(false);
    setFormStartTime('09:00');
    setFormEndTime('18:00');
    if (selectedEmployee !== 'all') {
      setFormEmployee(selectedEmployee);
    } else if (employees.length > 0) {
      setFormEmployee(employees[0].id);
    }
    setModalOpen(true);
  }

  function handleEditSchedule(schedule: DaySchedule, date: Date) {
    setSelectedDate(date);
    setEditingSchedule(schedule);
    setFormEmployee(schedule.employee_id);
    setFormStartTime(schedule.start_time.slice(0, 5));
    setFormEndTime(schedule.end_time.slice(0, 5));
    setFormIsDayOff(schedule.is_day_off || false);
    setModalOpen(true);
  }

  async function handleSaveSchedule() {
    if (!selectedDate || !formEmployee) return;
    
    setSaving(true);
    const dayOfMonth = selectedDate.getDate();
    const month = selectedDate.getMonth() + 1;
    const year = selectedDate.getFullYear();

    const scheduleData = {
      employee_id: formEmployee,
      day_of_week: dayOfMonth,
      start_time: formStartTime,
      end_time: formEndTime,
      is_day_off: formIsDayOff,
      schedule_month: month,
      schedule_year: year,
      shift_number: 1,
    };

    try {
      if (editingSchedule) {
        const { error } = await supabase
          .from('employee_schedules')
          .update(scheduleData)
          .eq('id', editingSchedule.id);
        
        if (error) throw error;
        toast.success('Horario actualizado');
      } else {
        const { error } = await supabase
          .from('employee_schedules')
          .insert(scheduleData);
        
        if (error) throw error;
        toast.success('Horario asignado');
      }
      
      setModalOpen(false);
      fetchSchedules();
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSchedule() {
    if (!editingSchedule) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('employee_schedules')
        .delete()
        .eq('id', editingSchedule.id);
      
      if (error) throw error;
      toast.success('Horario eliminado');
      setModalOpen(false);
      fetchSchedules();
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  function getEmployeeName(employeeId: string): string {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.full_name?.split(' ')[0] || 'Empleado';
  }

  function getEmployeeInitials(employeeId: string): string {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return '?';
    const parts = emp.full_name.split(' ');
    return parts.map(p => p[0]).join('').slice(0, 2).toUpperCase();
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Calendario de Horarios
          </CardTitle>
          
          <div className="flex items-center gap-3">
            {/* Employee Filter */}
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-[180px]">
                <User className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filtrar empleado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Month Navigation */}
            <div className="flex items-center gap-1">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="w-[140px] text-center font-medium capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: es })}
              </div>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAY_NAMES.map(day => (
            <div 
              key={day} 
              className="text-center text-xs font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before month starts */}
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[100px] bg-muted/30 rounded" />
          ))}

          {/* Days of the month */}
          {daysInMonth.map(date => {
            const dayOfMonth = date.getDate();
            const daySchedules = getSchedulesForDay(dayOfMonth);
            const isCurrentDay = isToday(date);

            return (
              <div
                key={date.toISOString()}
                className={`min-h-[100px] border rounded p-1 cursor-pointer transition-colors hover:bg-muted/50 ${
                  isCurrentDay ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                onClick={() => handleDayClick(date)}
              >
                {/* Day Number */}
                <div className={`text-sm font-medium mb-1 ${
                  isCurrentDay ? 'text-primary' : 'text-foreground'
                }`}>
                  {dayOfMonth}
                </div>

                {/* Schedules for this day */}
                <div className="space-y-0.5">
                  {daySchedules.slice(0, 3).map(schedule => (
                    <div
                      key={schedule.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditSchedule(schedule, date);
                      }}
                      className={`text-[10px] px-1 py-0.5 rounded truncate cursor-pointer transition-colors ${
                        schedule.is_day_off 
                          ? 'bg-destructive/20 text-destructive hover:bg-destructive/30' 
                          : 'bg-primary/20 text-primary hover:bg-primary/30'
                      }`}
                      title={`${getEmployeeName(schedule.employee_id)}: ${schedule.start_time.slice(0,5)}-${schedule.end_time.slice(0,5)}`}
                    >
                      <span className="font-medium">{getEmployeeInitials(schedule.employee_id)}</span>
                      {!schedule.is_day_off && (
                        <span className="ml-1">
                          {schedule.start_time.slice(0,5)}
                        </span>
                      )}
                      {schedule.is_day_off && <span className="ml-1">Franco</span>}
                    </div>
                  ))}
                  {daySchedules.length > 3 && (
                    <div className="text-[10px] text-muted-foreground text-center">
                      +{daySchedules.length - 3} más
                    </div>
                  )}
                </div>

                {/* Add indicator when empty */}
                {daySchedules.length === 0 && (
                  <div className="flex items-center justify-center h-12 text-muted-foreground/40">
                    <Plus className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-primary/20" />
            <span>Turno asignado</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-destructive/20" />
            <span>Franco / Día libre</span>
          </div>
        </div>
      </CardContent>

      {/* Schedule Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {editingSchedule ? 'Editar Horario' : 'Asignar Horario'}
              {selectedDate && (
                <Badge variant="outline" className="ml-2 capitalize">
                  {format(selectedDate, 'EEEE d MMMM', { locale: es })}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Employee Select */}
            <div className="space-y-2">
              <Label>Empleado</Label>
              <Select value={formEmployee} onValueChange={setFormEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar empleado" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name} {emp.position && `(${emp.position})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Day Off Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="dayOff" 
                checked={formIsDayOff}
                onCheckedChange={(checked) => setFormIsDayOff(checked as boolean)}
              />
              <Label htmlFor="dayOff" className="cursor-pointer">
                Marcar como Franco / Día libre
              </Label>
            </div>

            {/* Time Inputs (hidden if day off) */}
            {!formIsDayOff && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hora Entrada</Label>
                  <Input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora Salida</Label>
                  <Input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {editingSchedule && (
              <Button 
                variant="destructive" 
                onClick={handleDeleteSchedule}
                disabled={saving}
                className="sm:mr-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </Button>
            )}
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSchedule} disabled={saving || !formEmployee}>
              {saving ? 'Guardando...' : (editingSchedule ? 'Actualizar' : 'Asignar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}