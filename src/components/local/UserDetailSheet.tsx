import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  User, 
  ShoppingBag, 
  Briefcase,
  Mail,
  Phone,
  Calendar,
  UserMinus,
  UserPlus,
  Star,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface UserProfile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  total_orders: number;
  total_spent: number;
  last_order_at: string | null;
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  branch_id: string | null;
  is_active: boolean;
}

interface CombinedUser {
  profile: UserProfile;
  roles: UserRole[];
  isStaff: boolean;
  isCustomer: boolean;
  highestRole: string | null;
  requiresAttendance: boolean;
}

interface UserDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: CombinedUser;
  branchId: string;
  onUpdate: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Superadmin',
  admin: 'Admin',
  franquiciado: 'Franquiciado',
  encargado: 'Encargado',
  cajero: 'Cajero',
  kds: 'KDS',
  marketing: 'Marketing',
};

const ASSIGNABLE_ROLES = ['kds', 'cajero', 'encargado'];

export default function UserDetailSheet({
  open,
  onOpenChange,
  user,
  branchId,
  onUpdate,
}: UserDetailSheetProps) {
  const { isAdmin, isFranquiciado, isGerente } = useUserRole();
  const [selectedRole, setSelectedRole] = useState(user.highestRole || 'cajero');
  const [saving, setSaving] = useState(false);

  const canManageStaff = isAdmin || isFranquiciado || isGerente;
  const canAssignRole = (role: string) => {
    if (isAdmin) return true;
    if (isFranquiciado) return ['kds', 'cajero', 'encargado'].includes(role);
    if (isGerente) return ['kds', 'cajero'].includes(role);
    return false;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleAddToTeam = async () => {
    if (!canManageStaff || !canAssignRole(selectedRole)) {
      toast.error('No tenés permisos para esta acción');
      return;
    }

    setSaving(true);
    try {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.profile.id,
          role: selectedRole as any,
          branch_id: branchId,
          is_active: true,
        });

      if (roleError) throw roleError;

      toast.success(`${user.profile.full_name} agregado al equipo como ${ROLE_LABELS[selectedRole]}`);
      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error adding to team:', error);
      toast.error('Error al agregar al equipo');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFromTeam = async () => {
    if (!canManageStaff) {
      toast.error('No tenés permisos para esta acción');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ is_active: false })
        .eq('user_id', user.profile.id)
        .eq('branch_id', branchId);

      if (error) throw error;

      toast.success(`${user.profile.full_name} removido del equipo`);
      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error removing from team:', error);
      toast.error('Error al remover del equipo');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!canManageStaff || !canAssignRole(selectedRole)) {
      toast.error('No tenés permisos para esta acción');
      return;
    }

    setSaving(true);
    try {
      await supabase
        .from('user_roles')
        .update({ is_active: false })
        .eq('user_id', user.profile.id)
        .eq('branch_id', branchId);

      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.profile.id,
          role: selectedRole as any,
          branch_id: branchId,
          is_active: true,
        });

      if (error) throw error;

      toast.success(`Rol actualizado a ${ROLE_LABELS[selectedRole]}`);
      onUpdate();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error('Error al actualizar rol');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.profile.avatar_url || undefined} />
              <AvatarFallback className="text-lg">{getInitials(user.profile.full_name)}</AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle className="text-xl">{user.profile.full_name}</SheetTitle>
              <div className="flex gap-2 mt-1">
                {user.isStaff && user.highestRole && (
                  <Badge variant="secondary">
                    <Briefcase className="w-3 h-3 mr-1" />
                    {ROLE_LABELS[user.highestRole]}
                  </Badge>
                )}
                {user.isCustomer && user.profile.total_orders >= 10 && (
                  <Badge variant="outline">
                    <Star className="w-3 h-3 mr-1" />
                    VIP
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="perfil" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="perfil"><User className="w-4 h-4 mr-1" />Perfil</TabsTrigger>
            <TabsTrigger value="cliente" disabled={!user.isCustomer}><ShoppingBag className="w-4 h-4 mr-1" />Cliente</TabsTrigger>
            <TabsTrigger value="equipo"><Briefcase className="w-4 h-4 mr-1" />Equipo</TabsTrigger>
          </TabsList>

          <TabsContent value="perfil" className="space-y-4 mt-6">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span>{user.profile.email || 'Sin email'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>{user.profile.phone || 'Sin teléfono'}</span>
            </div>
          </TabsContent>

          <TabsContent value="cliente" className="space-y-6 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold">{user.profile.total_orders}</div>
                <div className="text-sm text-muted-foreground">Pedidos</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold">{formatCurrency(user.profile.total_spent)}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="equipo" className="space-y-6 mt-6">
            {user.isStaff ? (
              <>
                <div className="space-y-3">
                  <Label>Rol</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole} disabled={!canManageStaff}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ASSIGNABLE_ROLES.filter(canAssignRole).map(role => (
                        <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedRole !== user.highestRole && canManageStaff && (
                    <Button size="sm" onClick={handleUpdateRole} disabled={saving}>Actualizar</Button>
                  )}
                </div>
                {canManageStaff && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full"><UserMinus className="w-4 h-4 mr-2" />Quitar del equipo</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Quitar del equipo?</AlertDialogTitle>
                        <AlertDialogDescription>{user.profile.full_name} ya no tendrá acceso.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRemoveFromTeam}>Confirmar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </>
            ) : canManageStaff ? (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No forma parte del equipo</p>
                </div>
                <div className="space-y-2">
                  <Label>Rol</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ASSIGNABLE_ROLES.filter(canAssignRole).map(role => (
                        <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={handleAddToTeam} disabled={saving}>
                  <UserPlus className="w-4 h-4 mr-2" />Agregar al equipo
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No forma parte del equipo</p>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
