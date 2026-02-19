import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { UserPlus, Edit2, Trash2, RefreshCw, Clock, LogIn, LogOut } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import ActiveStaffWidget from '@/components/attendance/ActiveStaffWidget';

interface Employee {
  id: string;
  full_name: string;
  pin_code: string;
  current_status: 'WORKING' | 'OFF_DUTY';
  phone: string | null;
  position: string | null;
  hourly_rate: number | null;
  is_active: boolean;
}

interface ScheduleEntry {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_day_off: boolean;
}

interface AttendanceLog {
  id: string;
  employee_id: string;
  employee_name: string;
  log_type: 'IN' | 'OUT';
  timestamp: string;
}

interface OperationalStaffManagerProps {
  branchId: string;
  canManage: boolean;
}

export default function OperationalStaffManager({ branchId, canManage }: OperationalStaffManagerProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Record<string, ScheduleEntry[]>>({});
  const [todayLogs, setTodayLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    pin_code: '',
    phone: '',
    position: '',
    hourly_rate: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // First fetch employees
      const empRes = await supabase
        .from('employees')
        .select('*')
        .eq('branch_id', branchId)
        .order('full_name');

      if (empRes.error) throw empRes.error;
      const employeeList = (empRes.data || []).map(e => ({
        ...e,
        current_status: e.current_status as 'WORKING' | 'OFF_DUTY',
      }));
      setEmployees(employeeList);

      // Fetch schedules and logs in parallel
      const employeeIds = employeeList.map(e => e.id);
      
      const [schedRes, logsRes] = await Promise.all([
        employeeIds.length > 0
          ? supabase
              .from('employee_schedules')
              .select('*')
              .in('employee_id', employeeIds)
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from('attendance_logs')
          .select('*, employees(full_name)')
          .eq('branch_id', branchId)
          .gte('timestamp', new Date().toISOString().split('T')[0])
          .order('timestamp', { ascending: false })
          .limit(50),
      ]);

      // Group schedules by employee
      const grouped: Record<string, ScheduleEntry[]> = {};
      if (schedRes.data) {
        schedRes.data.forEach((s: any) => {
          if (!grouped[s.employee_id]) {
            grouped[s.employee_id] = [];
          }
          grouped[s.employee_id].push({
            day_of_week: s.day_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
            is_day_off: s.is_day_off,
          });
        });
      }
      setSchedules(grouped);

      if (logsRes.data) {
        const logs: AttendanceLog[] = logsRes.data.map((l: any) => ({
          id: l.id,
          employee_id: l.employee_id,
          employee_name: l.employees?.full_name || 'Desconocido',
          log_type: l.log_type,
          timestamp: l.timestamp,
        }));
        setTodayLogs(logs);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const getTodaySchedule = (employeeId: string): { start: string; end: string } | null => {
    const today = new Date().getDay();
    const empSchedule = schedules[employeeId]?.find(s => s.day_of_week === today && !s.is_day_off);
    if (empSchedule) {
      return { start: empSchedule.start_time.slice(0, 5), end: empSchedule.end_time.slice(0, 5) };
    }
    return null;
  };

  useEffect(() => {
    if (branchId) {
      fetchData();

      // Subscribe to realtime
      const channel = supabase
        .channel(`attendance-logs-${branchId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'attendance_logs',
            filter: `branch_id=eq.${branchId}`,
          },
          () => {
            fetchData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [branchId]);

  const resetForm = () => {
    setForm({
      full_name: '',
      pin_code: '',
      phone: '',
      position: '',
      hourly_rate: '',
    });
    setEditingEmployee(null);
  };

  const openEditDialog = (emp: Employee) => {
    setEditingEmployee(emp);
    setForm({
      full_name: emp.full_name,
      pin_code: emp.pin_code,
      phone: emp.phone || '',
      position: emp.position || '',
      hourly_rate: emp.hourly_rate?.toString() || '',
    });
    setShowEmployeeDialog(true);
  };

  const handleSave = async () => {
    if (!form.full_name || !form.pin_code) {
      toast.error('Nombre y PIN son requeridos');
      return;
    }

    if (form.pin_code.length !== 4 || !/^\d{4}$/.test(form.pin_code)) {
      toast.error('El PIN debe ser de 4 dígitos numéricos');
      return;
    }

    setSaving(true);
    try {
      const data = {
        full_name: form.full_name,
        pin_code: form.pin_code,
        phone: form.phone || null,
        position: form.position || null,
        hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
        branch_id: branchId,
      };

      if (editingEmployee) {
        const { error } = await supabase
          .from('employees')
          .update(data)
          .eq('id', editingEmployee.id);

        if (error) {
          if (error.code === '23505') {
            toast.error('Ya existe un empleado con ese PIN en esta sucursal');
            setSaving(false);
            return;
          }
          throw error;
        }
        toast.success('Empleado actualizado');
      } else {
        const { error } = await supabase
          .from('employees')
          .insert(data);

        if (error) {
          if (error.code === '23505') {
            toast.error('Ya existe un empleado con ese PIN en esta sucursal');
            setSaving(false);
            return;
          }
          throw error;
        }
        toast.success('Empleado creado');
      }

      setShowEmployeeDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving employee:', error);
      toast.error('Error al guardar empleado');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (emp: Employee) => {
    try {
      const { error } = await supabase
        .from('employees')
        .update({ is_active: !emp.is_active })
        .eq('id', emp.id);

      if (error) throw error;

      setEmployees(prev => prev.map(e => 
        e.id === emp.id ? { ...e, is_active: !e.is_active } : e
      ));
      toast.success(emp.is_active ? 'Empleado desactivado' : 'Empleado activado');
    } catch (error) {
      console.error('Error toggling employee:', error);
      toast.error('Error al actualizar empleado');
    }
  };

  const handleDelete = async () => {
    if (!deletingEmployee) return;

    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', deletingEmployee.id);

      if (error) throw error;

      setEmployees(prev => prev.filter(e => e.id !== deletingEmployee.id));
      toast.success('Empleado eliminado');
      setShowDeleteDialog(false);
      setDeletingEmployee(null);
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('Error al eliminar empleado');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Staff Widget */}
      <Card>
        <CardContent className="pt-6">
          <ActiveStaffWidget branchId={branchId} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Employees List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Empleados Operativos</CardTitle>
              <CardDescription>Personal que ficha con PIN</CardDescription>
            </div>
            {canManage && (
              <Button onClick={() => { resetForm(); setShowEmployeeDialog(true); }}>
                <UserPlus className="h-4 w-4 mr-2" />
                Nuevo
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {employees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay empleados registrados</p>
                <p className="text-sm">Agregá empleados para que puedan fichar</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Puesto</TableHead>
                    <TableHead>Horario Ingreso</TableHead>
                    <TableHead>Horario Egreso</TableHead>
                    {canManage && <TableHead className="text-right">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => {
                    const todaySchedule = getTodaySchedule(emp.id);
                    return (
                      <TableRow key={emp.id} className={!emp.is_active ? 'opacity-50' : ''}>
                        <TableCell>
                          <p className="font-medium">{emp.full_name}</p>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">
                            {emp.position || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {todaySchedule ? (
                            <span className="font-mono text-sm">{todaySchedule.start}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {todaySchedule ? (
                            <span className="font-mono text-sm">{todaySchedule.end}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(emp)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => { setDeletingEmployee(emp); setShowDeleteDialog(true); }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Today's Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Fichajes de Hoy</CardTitle>
            <CardDescription>Registro de entradas y salidas</CardDescription>
          </CardHeader>
          <CardContent>
            {todayLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Sin fichajes hoy</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {todayLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        log.log_type === 'IN' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                      }`}>
                        {log.log_type === 'IN' ? <LogIn className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="font-medium">{log.employee_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.log_type === 'IN' ? 'Entrada' : 'Salida'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm">
                        {format(new Date(log.timestamp), 'HH:mm', { locale: es })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true, locale: es })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Employee Dialog */}
      <Dialog open={showEmployeeDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowEmployeeDialog(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEmployee ? 'Editar Empleado' : 'Nuevo Empleado'}</DialogTitle>
            <DialogDescription>
              Los empleados operativos fichan entrada y salida con su PIN
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nombre Completo *</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => setForm(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Juan Pérez"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin_code">PIN de Fichaje (4 dígitos) *</Label>
              <Input
                id="pin_code"
                value={form.pin_code}
                onChange={(e) => setForm(prev => ({ ...prev, pin_code: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                placeholder="1234"
                maxLength={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="position">Puesto</Label>
                <Input
                  id="position"
                  value={form.position}
                  onChange={(e) => setForm(prev => ({ ...prev, position: e.target.value }))}
                  placeholder="Cocina, Caja, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+54 11..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hourly_rate">Valor Hora (opcional)</Label>
              <Input
                id="hourly_rate"
                type="number"
                value={form.hourly_rate}
                onChange={(e) => setForm(prev => ({ ...prev, hourly_rate: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmployeeDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : editingEmployee ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar empleado?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará a {deletingEmployee?.full_name} y todo su historial de fichajes.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}