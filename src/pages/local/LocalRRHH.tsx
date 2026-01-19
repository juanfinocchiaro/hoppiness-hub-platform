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
  DollarSign, 
  Calendar, 
  Plus, 
  Shield, 
  Key, 
  Clock,
  Edit2,
  Trash2,
  UserPlus,
  Wallet,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Tables, Enums } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;
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
  const [monthTotals, setMonthTotals] = useState({ adelantos: 0, jornales: 0, comida: 0 });
  
  // Dialogs
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [newPin, setNewPin] = useState('');
  
  // Payment form
  const [paymentForm, setPaymentForm] = useState({
    employee_id: '',
    amount: '',
    type: 'adelanto' as 'adelanto' | 'jornal' | 'comida',
    notes: '',
  });
  
  // Invite form
  const [inviteForm, setInviteForm] = useState({
    email: '',
    full_name: '',
    role: 'empleado' as AppRole,
  });
  
  // Permissions form
  const [permissionsForm, setPermissionsForm] = useState({
    can_manage_inventory: false,
    can_manage_orders: true,
    can_manage_products: false,
    can_manage_staff: false,
    can_view_reports: false,
  });

  // Fetch staff members
  useEffect(() => {
    if (!branchId) return;
    
    async function fetchStaff() {
      setLoading(true);
      try {
        // Get all users with permissions for this branch
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

        // Get profiles for these users
        const { data: profilesData, error: profError } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', userIds);

        if (profError) throw profError;

        // Get roles for these users
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('*')
          .in('user_id', userIds);

        if (rolesError) throw rolesError;

        // Combine data
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

        // Sort by role hierarchy
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

  // Fetch HR payments (from transactions with category RRHH)
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
          // Parse concept to extract type and employee name
          // Format: "RRHH - Adelanto - Juan Perez"
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

        // Calculate totals
        const totals = hrPayments.reduce((acc, p) => {
          acc[`${p.type}s` as 'adelantos' | 'jornales'] = (acc[`${p.type}s` as 'adelantos' | 'jornales'] || 0) + p.amount;
          return acc;
        }, { adelantos: 0, jornales: 0, comida: 0 });

        setMonthTotals(totals);
      } catch (error) {
        console.error('Error fetching payments:', error);
      }
    }

    fetchPayments();
  }, [branchId]);

  // Handle PIN update
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
      
      // Update local state
      setStaffMembers(prev => prev.map(s => 
        s.user_id === selectedStaff.user_id ? { ...s, has_pin: true } : s
      ));
    } catch (error) {
      console.error('Error setting PIN:', error);
      toast.error('Error al actualizar el PIN');
    }
  };

  // Handle payment registration
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

      toast.success('Pago registrado correctamente');
      setShowPaymentDialog(false);
      setPaymentForm({ employee_id: '', amount: '', type: 'adelanto', notes: '' });
      
      // Refresh payments
      const newPayment: HRPayment = {
        id: crypto.randomUUID(),
        employee_name: employee.full_name,
        amount: parseFloat(paymentForm.amount),
        type: paymentForm.type,
        date: new Date().toISOString().split('T')[0],
        notes: paymentForm.notes || null,
      };
      setPayments(prev => [newPayment, ...prev]);
      setMonthTotals(prev => ({
        ...prev,
        [`${paymentForm.type}s`]: prev[`${paymentForm.type}s` as keyof typeof prev] + parseFloat(paymentForm.amount)
      }));
    } catch (error) {
      console.error('Error registering payment:', error);
      toast.error('Error al registrar el pago');
    }
  };

  // Handle permissions update
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
      
      // Update local state
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
          <p className="text-muted-foreground">Personal de la sucursal y pagos</p>
        </div>
      </div>

      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="personal" className="gap-2">
            <Users className="h-4 w-4" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="pagos" className="gap-2">
            <Wallet className="h-4 w-4" />
            Pagos RRHH
          </TabsTrigger>
        </TabsList>

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

        {/* TAB: Pagos RRHH */}
        <TabsContent value="pagos" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowPaymentDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Registrar Pago
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Adelantos del Mes</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${monthTotals.adelantos.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Jornales Pagados</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${monthTotals.jornales.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Comida Personal</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${monthTotals.comida.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>

          {/* Payments List */}
          <Card>
            <CardHeader>
              <CardTitle>Movimientos del Mes</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay movimientos de RRHH registrados este mes
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
                          {format(new Date(payment.date), 'dd/MM/yyyy', { locale: es })}
                        </TableCell>
                        <TableCell>{payment.employee_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {payment.type === 'adelanto' ? 'Adelanto' 
                              : payment.type === 'jornal' ? 'Jornal' : 'Comida'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
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

      {/* Dialog: Register Payment */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago RRHH</DialogTitle>
            <DialogDescription>
              Adelantos, jornales y comida del personal
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Empleado</Label>
              <Select
                value={paymentForm.employee_id}
                onValueChange={(v) => setPaymentForm({ ...paymentForm, employee_id: v })}
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
                onValueChange={(v) => setPaymentForm({ ...paymentForm, type: v as 'adelanto' | 'jornal' | 'comida' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="adelanto">Adelanto de Sueldo</SelectItem>
                  <SelectItem value="jornal">Pago de Jornal</SelectItem>
                  <SelectItem value="comida">Comida del Personal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Monto</Label>
              <Input
                type="number"
                placeholder="0"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                placeholder="Observaciones..."
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
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

      {/* Dialog: Invite Employee (placeholder) */}
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
            <Button disabled>
              Próximamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
