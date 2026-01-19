import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Users, 
  Shield, 
  Key, 
  UserPlus,
  RefreshCw,
  AlertCircle,
  Wallet,
  Clock,
  Plus,
  LogIn,
  LogOut,
  DollarSign
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Tables, Enums } from '@/integrations/supabase/types';
import WeeklyStaffSchedule from '@/components/schedules/WeeklyStaffSchedule';
import OperationalStaffManager from '@/components/hr/OperationalStaffManager';

type AppRole = Enums<'app_role'>;

interface StaffMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  has_pin: boolean;
  roles: AppRole[];
  permissions: {
    can_manage_inventory: boolean;
    can_manage_orders: boolean;
    can_manage_products: boolean;
    can_manage_staff: boolean;
    can_view_reports: boolean;
  } | null;
}

interface HRPayment {
  id: string;
  employee_name: string;
  amount: number;
  type: 'adelanto' | 'jornal' | 'comida';
  date: string;
  notes: string | null;
}

interface AttendanceRecord {
  id: string;
  user_id: string;
  full_name: string;
  check_in: string;
  check_out: string | null;
}

const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Admin de Marca',
  franquiciado: 'Dueño Franquicia',
  gerente: 'Encargado',
  empleado: 'Empleado',
};

const ROLE_HIERARCHY: AppRole[] = ['admin', 'franquiciado', 'gerente', 'empleado'];

export default function LocalRRHH() {
  const { branchId } = useParams<{ branchId: string }>();
  const { user } = useAuth();
  const { isAdmin, isFranquiciado, isGerente } = useUserRole();
  
  const [loading, setLoading] = useState(true);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [payments, setPayments] = useState<HRPayment[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [monthTotals, setMonthTotals] = useState({ adelantos: 0, jornales: 0, comida: 0 });
  
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [newPin, setNewPin] = useState('');
  
  const [inviteForm, setInviteForm] = useState({
    email: '',
    full_name: '',
    role: 'empleado' as AppRole,
  });
  
  const [permissionsForm, setPermissionsForm] = useState({
    can_manage_inventory: false,
    can_manage_orders: true,
    can_manage_products: false,
    can_manage_staff: false,
    can_view_reports: false,
  });

  const [paymentForm, setPaymentForm] = useState({
    employee_id: '',
    amount: '',
    type: 'adelanto' as 'adelanto' | 'jornal' | 'comida',
    notes: '',
  });

  // Fetch staff members
  useEffect(() => {
    if (!branchId) return;
    
    async function fetchStaff() {
      setLoading(true);
      try {
        const { data: permissionsData, error: permError } = await supabase
          .from('branch_permissions')
          .select('*')
          .eq('branch_id', branchId);

        if (permError) throw permError;

        const userIds = permissionsData?.map(p => p.user_id) || [];
        
        if (userIds.length === 0) {
          setStaffMembers([]);
          setLoading(false);
          return;
        }

        const { data: profilesData, error: profError } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', userIds);

        if (profError) throw profError;

        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('*')
          .in('user_id', userIds);

        if (rolesError) throw rolesError;

        const staff: StaffMember[] = (profilesData || []).map(profile => {
          const perms = permissionsData?.find(p => p.user_id === profile.user_id);
          const userRoles = rolesData?.filter(r => r.user_id === profile.user_id).map(r => r.role) || [];
          
          return {
            id: profile.id,
            user_id: profile.user_id,
            full_name: profile.full_name,
            email: profile.email,
            phone: profile.phone,
            has_pin: !!profile.pin_hash,
            roles: userRoles,
            permissions: perms ? {
              can_manage_inventory: perms.can_manage_inventory ?? false,
              can_manage_orders: perms.can_manage_orders ?? false,
              can_manage_products: perms.can_manage_products ?? false,
              can_manage_staff: perms.can_manage_staff ?? false,
              can_view_reports: perms.can_view_reports ?? false,
            } : null,
          };
        });

        staff.sort((a, b) => {
          const aHighest = Math.min(...a.roles.map(r => ROLE_HIERARCHY.indexOf(r)));
          const bHighest = Math.min(...b.roles.map(r => ROLE_HIERARCHY.indexOf(r)));
          return aHighest - bHighest;
        });

        setStaffMembers(staff);
      } catch (error) {
        console.error('Error fetching staff:', error);
        toast.error('Error al cargar el personal');
      } finally {
        setLoading(false);
      }
    }

    fetchStaff();
  }, [branchId]);

  // Fetch HR payments
  useEffect(() => {
    if (!branchId) return;
    
    async function fetchPayments() {
      try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('branch_id', branchId)
          .eq('type', 'expense')
          .gte('transaction_date', startOfMonth.toISOString().split('T')[0])
          .ilike('concept', '%RRHH%')
          .order('transaction_date', { ascending: false });

        if (error) throw error;

        const hrPayments: HRPayment[] = (data || []).map(t => {
          const parts = t.concept.split(' - ');
          const type = parts[1]?.toLowerCase().includes('adelanto') ? 'adelanto' 
            : parts[1]?.toLowerCase().includes('jornal') ? 'jornal' : 'comida';
          
          return {
            id: t.id,
            employee_name: parts[2] || 'N/A',
            amount: t.amount,
            type,
            date: t.transaction_date,
            notes: t.notes,
          };
        });

        setPayments(hrPayments);

        const totals = hrPayments.reduce((acc, p) => {
          if (p.type === 'adelanto') acc.adelantos += p.amount;
          else if (p.type === 'jornal') acc.jornales += p.amount;
          else acc.comida += p.amount;
          return acc;
        }, { adelantos: 0, jornales: 0, comida: 0 });

        setMonthTotals(totals);
      } catch (error) {
        console.error('Error fetching payments:', error);
      }
    }

    fetchPayments();
  }, [branchId]);

  // Fetch attendance records
  useEffect(() => {
    if (!branchId) return;
    
    async function fetchAttendance() {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
          .from('attendance_records')
          .select('*, profiles!attendance_records_user_id_fkey(full_name)')
          .eq('branch_id', branchId)
          .gte('check_in', today.toISOString())
          .order('check_in', { ascending: false });

        if (error) throw error;

        const records: AttendanceRecord[] = (data || []).map(r => ({
          id: r.id,
          user_id: r.user_id,
          full_name: (r.profiles as any)?.full_name || 'Empleado',
          check_in: r.check_in,
          check_out: r.check_out,
        }));

        setAttendance(records);
      } catch (error) {
        console.error('Error fetching attendance:', error);
      }
    }

    fetchAttendance();
  }, [branchId]);

  const handleSetPin = async () => {
    if (!selectedStaff || !newPin || newPin.length !== 4) {
      toast.error('El PIN debe ser de 4 dígitos');
      return;
    }

    try {
      const response = await supabase.functions.invoke('attendance-token', {
        body: {
          action: 'set-pin',
          userId: selectedStaff.user_id,
          pin: newPin,
        }
      });

      if (response.error) throw response.error;

      toast.success(`PIN actualizado para ${selectedStaff.full_name}`);
      setShowPinDialog(false);
      setNewPin('');
      
      setStaffMembers(prev => prev.map(s => 
        s.user_id === selectedStaff.user_id ? { ...s, has_pin: true } : s
      ));
    } catch (error) {
      console.error('Error setting PIN:', error);
      toast.error('Error al actualizar el PIN');
    }
  };

  const handleUpdatePermissions = async () => {
    if (!selectedStaff || !branchId) return;

    try {
      const { error } = await supabase
        .from('branch_permissions')
        .update(permissionsForm)
        .eq('user_id', selectedStaff.user_id)
        .eq('branch_id', branchId);

      if (error) throw error;

      toast.success('Permisos actualizados');
      setShowPermissionsDialog(false);
      
      setStaffMembers(prev => prev.map(s => 
        s.user_id === selectedStaff.user_id 
          ? { ...s, permissions: { ...permissionsForm } } 
          : s
      ));
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast.error('Error al actualizar permisos');
    }
  };

  const handleRegisterPayment = async () => {
    if (!branchId || !paymentForm.employee_id || !paymentForm.amount) {
      toast.error('Completá todos los campos requeridos');
      return;
    }

    const employee = staffMembers.find(s => s.user_id === paymentForm.employee_id);
    if (!employee) return;

    const typeLabel = paymentForm.type === 'adelanto' ? 'Adelanto' 
      : paymentForm.type === 'jornal' ? 'Jornal' : 'Comida Personal';

    try {
      const { error } = await supabase
        .from('transactions')
        .insert({
          branch_id: branchId,
          type: 'expense',
          amount: parseFloat(paymentForm.amount),
          concept: `RRHH - ${typeLabel} - ${employee.full_name}`,
          notes: paymentForm.notes || null,
          payment_origin: 'cash',
          receipt_type: 'INTERNAL',
          recorded_by: user?.id,
        });

      if (error) throw error;

      toast.success('Pago registrado');
      setShowPaymentDialog(false);
      setPaymentForm({ employee_id: '', amount: '', type: 'adelanto', notes: '' });
      
      const newPayment: HRPayment = {
        id: crypto.randomUUID(),
        employee_name: employee.full_name,
        amount: parseFloat(paymentForm.amount),
        type: paymentForm.type,
        date: new Date().toISOString().split('T')[0],
        notes: paymentForm.notes || null,
      };
      setPayments(prev => [newPayment, ...prev]);
      
      if (paymentForm.type === 'adelanto') {
        setMonthTotals(prev => ({ ...prev, adelantos: prev.adelantos + parseFloat(paymentForm.amount) }));
      } else if (paymentForm.type === 'jornal') {
        setMonthTotals(prev => ({ ...prev, jornales: prev.jornales + parseFloat(paymentForm.amount) }));
      } else {
        setMonthTotals(prev => ({ ...prev, comida: prev.comida + parseFloat(paymentForm.amount) }));
      }
    } catch (error) {
      console.error('Error registering payment:', error);
      toast.error('Error al registrar el pago');
    }
  };

  const [inviteLoading, setInviteLoading] = useState(false);

  const handleInviteEmployee = async () => {
    if (!branchId || !inviteForm.email || !inviteForm.full_name) {
      toast.error('Completá todos los campos requeridos');
      return;
    }

    setInviteLoading(true);

    try {
      // First, check if a profile with this email already exists
      const { data: existingProfile, error: searchError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('email', inviteForm.email.toLowerCase().trim())
        .maybeSingle();

      if (searchError) throw searchError;

      let targetUserId: string;

      if (existingProfile) {
        // User already exists - just assign them to this branch
        targetUserId = existingProfile.user_id;
        
        // Check if they already have permissions for this branch
        const { data: existingPerm } = await supabase
          .from('branch_permissions')
          .select('id')
          .eq('user_id', targetUserId)
          .eq('branch_id', branchId)
          .maybeSingle();

        if (existingPerm) {
          toast.error(`${existingProfile.full_name} ya está asignado a esta sucursal`);
          setInviteLoading(false);
          return;
        }

        toast.info(`Usuario encontrado: ${existingProfile.full_name}. Asignando a sucursal...`);
      } else {
        // User doesn't exist - we need them to sign up first
        // For now, we'll create a placeholder that they can claim later
        toast.error('El usuario debe registrarse primero en la aplicación. Pedile que se registre con ese email y luego podrás agregarlo.');
        setInviteLoading(false);
        return;
      }

      // Add branch permissions
      const defaultPerms = {
        can_manage_orders: true,
        can_manage_products: inviteForm.role !== 'empleado',
        can_manage_inventory: inviteForm.role !== 'empleado',
        can_view_reports: inviteForm.role !== 'empleado',
        can_manage_staff: inviteForm.role === 'franquiciado' || inviteForm.role === 'gerente',
      };

      const { error: permError } = await supabase
        .from('branch_permissions')
        .insert({
          user_id: targetUserId,
          branch_id: branchId,
          ...defaultPerms,
        });

      if (permError) throw permError;

      // Update user role if needed
      if (inviteForm.role !== 'empleado') {
        // Check if they already have this role
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', targetUserId)
          .eq('role', inviteForm.role)
          .maybeSingle();

        if (!existingRole) {
          await supabase
            .from('user_roles')
            .insert({
              user_id: targetUserId,
              role: inviteForm.role,
            });
        }
      }

      toast.success(`${inviteForm.full_name} agregado al equipo`);
      setShowInviteDialog(false);
      setInviteForm({ email: '', full_name: '', role: 'empleado' });

      // Refresh staff list
      const { data: newProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', targetUserId)
        .single();

      const { data: newRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', targetUserId);

      if (newProfile) {
        setStaffMembers(prev => [...prev, {
          id: newProfile.id,
          user_id: newProfile.user_id,
          full_name: newProfile.full_name,
          email: newProfile.email,
          phone: newProfile.phone,
          has_pin: !!newProfile.pin_hash,
          roles: newRoles?.map(r => r.role) || ['empleado'],
          permissions: defaultPerms,
        }]);
      }

    } catch (error) {
      console.error('Error inviting employee:', error);
      toast.error('Error al agregar empleado');
    } finally {
      setInviteLoading(false);
    }
  };

  const canManageStaff = isAdmin || isFranquiciado || isGerente;

  const getHighestRole = (roles: AppRole[]): AppRole => {
    for (const role of ROLE_HIERARCHY) {
      if (roles.includes(role)) return role;
    }
    return 'empleado';
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'franquiciado': return 'default';
      case 'gerente': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Recursos Humanos</h1>
          <p className="text-muted-foreground">Personal, asistencia y pagos</p>
        </div>
      </div>

      {/* Weekly Schedule */}
      {branchId && (
        <WeeklyStaffSchedule 
          branchId={branchId} 
          staffMembers={staffMembers.map(s => ({ user_id: s.user_id, full_name: s.full_name }))} 
        />
      )}

      <Tabs defaultValue="operativo" className="space-y-4">
        <TabsList>
          <TabsTrigger value="operativo" className="gap-2">
            <Clock className="h-4 w-4" />
            Fichajes
          </TabsTrigger>
          <TabsTrigger value="personal" className="gap-2">
            <Users className="h-4 w-4" />
            Usuarios Sistema
          </TabsTrigger>
          <TabsTrigger value="pagos" className="gap-2">
            <Wallet className="h-4 w-4" />
            Sueldos
          </TabsTrigger>
        </TabsList>

        {/* TAB: Empleados Operativos */}
        <TabsContent value="operativo">
          {branchId && (
            <OperationalStaffManager branchId={branchId} canManage={canManageStaff} />
          )}
        </TabsContent>

        {/* TAB: Personal */}
        <TabsContent value="personal" className="space-y-4">
          <div className="flex justify-end">
            {canManageStaff && (
              <Button onClick={() => setShowInviteDialog(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Agregar Empleado
              </Button>
            )}
          </div>

          {staffMembers.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay personal asignado a este local</p>
                  <p className="text-sm">Invitá empleados para que puedan operar</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Equipo del Local</CardTitle>
                <CardDescription>{staffMembers.length} persona(s) asignadas</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>PIN Fichada</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffMembers.map((staff) => {
                      const highestRole = getHighestRole(staff.roles);
                      return (
                        <TableRow key={staff.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{staff.full_name}</p>
                              <p className="text-sm text-muted-foreground">{staff.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(highestRole)}>
                              {ROLE_LABELS[highestRole]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {staff.has_pin ? (
                              <Badge variant="outline" className="text-green-600">
                                <Key className="h-3 w-3 mr-1" />
                                Configurado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-yellow-600">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Sin PIN
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {canManageStaff && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedStaff(staff);
                                      setNewPin('');
                                      setShowPinDialog(true);
                                    }}
                                  >
                                    <Key className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedStaff(staff);
                                      if (staff.permissions) {
                                        setPermissionsForm(staff.permissions);
                                      }
                                      setShowPermissionsDialog(true);
                                    }}
                                  >
                                    <Shield className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Role explanation card */}
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-2">Niveles de Acceso</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li><strong>Admin de Marca:</strong> Control total sobre todas las sucursales</li>
                    <li><strong>Dueño Franquicia:</strong> Gestión completa de su local, P&L y finanzas</li>
                    <li><strong>Encargado:</strong> Operación diaria, stock y gestión de personal</li>
                    <li><strong>Empleado:</strong> POS y KDS únicamente</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Asistencia */}
        <TabsContent value="asistencia" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Registro del Día</CardTitle>
              <CardDescription>Ingresos y egresos de hoy</CardDescription>
            </CardHeader>
            <CardContent>
              {attendance.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay registros de asistencia hoy</p>
                  <p className="text-sm">Los empleados pueden fichar desde el kiosko de asistencia</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Entrada</TableHead>
                      <TableHead>Salida</TableHead>
                      <TableHead>Horas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map((record) => {
                      const checkIn = new Date(record.check_in);
                      const checkOut = record.check_out ? new Date(record.check_out) : null;
                      const hoursWorked = checkOut 
                        ? ((checkOut.getTime() - checkIn.getTime()) / 1000 / 60 / 60).toFixed(1)
                        : null;

                      return (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{record.full_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <LogIn className="h-4 w-4 text-green-600" />
                              {format(checkIn, 'HH:mm', { locale: es })}
                            </div>
                          </TableCell>
                          <TableCell>
                            {checkOut ? (
                              <div className="flex items-center gap-2">
                                <LogOut className="h-4 w-4 text-red-500" />
                                {format(checkOut, 'HH:mm', { locale: es })}
                              </div>
                            ) : (
                              <Badge variant="secondary">Trabajando</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {hoursWorked ? `${hoursWorked}h` : (
                              <span className="text-muted-foreground">
                                {formatDistanceToNow(checkIn, { locale: es })}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Sueldos/Pagos */}
        <TabsContent value="pagos" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowPaymentDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Registrar Pago
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                    <DollarSign className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Adelantos</p>
                    <p className="text-2xl font-bold">${monthTotals.adelantos.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <Wallet className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Jornales</p>
                    <p className="text-2xl font-bold">${monthTotals.jornales.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                    <Users className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Comida Personal</p>
                    <p className="text-2xl font-bold">${monthTotals.comida.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Pagos del Mes</CardTitle>
              <CardDescription>Adelantos, jornales y comida del personal</CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay pagos registrados este mes
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {format(new Date(payment.date + 'T12:00:00'), 'dd/MM', { locale: es })}
                        </TableCell>
                        <TableCell className="font-medium">{payment.employee_name}</TableCell>
                        <TableCell>
                          <Badge variant={
                            payment.type === 'adelanto' ? 'outline' :
                            payment.type === 'jornal' ? 'secondary' : 'default'
                          }>
                            {payment.type === 'adelanto' ? 'Adelanto' :
                             payment.type === 'jornal' ? 'Jornal' : 'Comida'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${payment.amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Set PIN */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar PIN de Fichada</DialogTitle>
            <DialogDescription>
              PIN de 4 dígitos para {selectedStaff?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pin">Nuevo PIN</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="****"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="text-center text-2xl tracking-widest"
              />
              <p className="text-sm text-muted-foreground">
                El empleado usará este PIN para fichar entrada/salida
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPinDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSetPin} disabled={newPin.length !== 4}>
              Guardar PIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Permissions */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permisos de {selectedStaff?.full_name}</DialogTitle>
            <DialogDescription>
              Configura los permisos específicos para esta sucursal
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              {[
                { key: 'can_manage_orders', label: 'Gestionar Pedidos', desc: 'Ver y modificar pedidos' },
                { key: 'can_manage_products', label: 'Gestionar Productos', desc: 'Modificar disponibilidad y precios' },
                { key: 'can_manage_inventory', label: 'Gestionar Inventario', desc: 'Control de stock' },
                { key: 'can_view_reports', label: 'Ver Reportes', desc: 'Acceso a estadísticas y finanzas' },
                { key: 'can_manage_staff', label: 'Gestionar Personal', desc: 'Administrar usuarios y configuración' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={permissionsForm[key as keyof typeof permissionsForm]}
                    onChange={(e) => setPermissionsForm({ 
                      ...permissionsForm, 
                      [key]: e.target.checked 
                    })}
                    className="h-5 w-5"
                  />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPermissionsDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdatePermissions}>
              Guardar Permisos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Register Payment */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago RRHH</DialogTitle>
            <DialogDescription>Adelantos, jornales y comida del personal</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Empleado</Label>
              <Select 
                value={paymentForm.employee_id} 
                onValueChange={(v) => setPaymentForm(prev => ({ ...prev, employee_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar empleado" />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map((staff) => (
                    <SelectItem key={staff.user_id} value={staff.user_id}>
                      {staff.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Pago</Label>
              <Select 
                value={paymentForm.type} 
                onValueChange={(v) => setPaymentForm(prev => ({ ...prev, type: v as typeof paymentForm.type }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="adelanto">Adelanto de Sueldo</SelectItem>
                  <SelectItem value="jornal">Jornal</SelectItem>
                  <SelectItem value="comida">Comida Personal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input
                type="number"
                placeholder="0"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                placeholder="Detalle adicional..."
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRegisterPayment}>
              Registrar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Invite Employee */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Empleado</DialogTitle>
            <DialogDescription>
              Invita a un nuevo miembro al equipo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="empleado@email.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre Completo</Label>
              <Input
                placeholder="Juan Pérez"
                value={inviteForm.full_name}
                onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(v) => setInviteForm({ ...inviteForm, role: v as AppRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="empleado">Empleado (Cajero/Cocinero)</SelectItem>
                  <SelectItem value="gerente">Encargado</SelectItem>
                  {(isAdmin || isFranquiciado) && (
                    <SelectItem value="franquiciado">Dueño Franquicia</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleInviteEmployee} 
              disabled={inviteLoading || !inviteForm.email || !inviteForm.full_name}
            >
              {inviteLoading ? 'Agregando...' : 'Agregar Empleado'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
