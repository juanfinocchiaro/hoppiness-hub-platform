import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { toast } from 'sonner';
import { 
  Users, 
  Shield, 
  Key, 
  UserPlus,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import type { Enums } from '@/integrations/supabase/types';
import WeeklyStaffSchedule from '@/components/schedules/WeeklyStaffSchedule';

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
  
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  
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
          <p className="text-muted-foreground">Personal y horarios de la sucursal</p>
        </div>
        {canManageStaff && (
          <Button onClick={() => setShowInviteDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Agregar Empleado
          </Button>
        )}
      </div>

      {/* Weekly Schedule */}
      {branchId && (
        <WeeklyStaffSchedule 
          branchId={branchId} 
          staffMembers={staffMembers.map(s => ({ user_id: s.user_id, full_name: s.full_name }))} 
        />
      )}

      {/* Staff List */}
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
            <Button disabled>
              Próximamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
