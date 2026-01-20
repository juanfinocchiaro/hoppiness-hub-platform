import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Building2, 
  Clock, 
  Users, 
  Receipt, 
  Save, 
  Loader2, 
  MapPin,
  UserPlus,
  X,
  Circle
} from 'lucide-react';
import BranchScheduleEditor from '@/components/schedules/BranchScheduleEditor';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface BranchEditDrawerProps {
  branch: Branch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

interface TeamMember {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  is_working: boolean;
  clock_in_time: string | null;
}

interface FiscalData {
  razon_social?: string;
  cuit?: string;
  condicion_iva?: string;
  domicilio_fiscal?: string;
  inicio_actividades?: string;
  punto_venta?: string;
}

const IVA_CONDITIONS = [
  { value: 'responsable_inscripto', label: 'Responsable Inscripto' },
  { value: 'monotributista', label: 'Monotributista' },
  { value: 'exento', label: 'Exento' },
];

const BRANCH_ROLES = [
  { value: 'franquiciado', label: 'Franquiciado' },
  { value: 'encargado', label: 'Encargado' },
  { value: 'cajero', label: 'Cajero' },
  { value: 'kds', label: 'KDS / Cocina' },
];

export default function BranchEditDrawer({ 
  branch, 
  open, 
  onOpenChange, 
  onSaved 
}: BranchEditDrawerProps) {
  const [activeTab, setActiveTab] = useState('datos');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Datos básicos
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  // Datos fiscales
  const [fiscalData, setFiscalData] = useState<FiscalData>({});
  
  // Equipo
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('cajero');
  const [inviting, setInviting] = useState(false);

  // Cargar datos cuando cambia la sucursal
  useEffect(() => {
    if (branch && open) {
      setName(branch.name || '');
      setAddress(branch.address || '');
      setCity(branch.city || '');
      setPhone(branch.phone || '');
      setEmail(branch.email || '');
      setLatitude((branch as any).latitude?.toString() || '');
      setLongitude((branch as any).longitude?.toString() || '');
      setIsActive(branch.is_active);
      setFiscalData((branch as any).fiscal_data || {});
      fetchTeamMembers();
    }
  }, [branch, open]);

  const fetchTeamMembers = async () => {
    if (!branch) return;
    
    setLoadingTeam(true);
    try {
      // Obtener usuarios asignados a esta sucursal
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select(`
          id,
          user_id,
          role,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq('branch_id', branch.id)
        .eq('is_active', true);

      if (error) throw error;

      // Verificar quién está trabajando (usando employees table)
      const { data: workingEmployees } = await supabase
        .from('employees')
        .select('id, full_name, current_status')
        .eq('branch_id', branch.id)
        .eq('current_status', 'WORKING');

      const workingSet = new Set(
        (workingEmployees || []).map(e => e.full_name?.toLowerCase())
      );

      const members: TeamMember[] = (roles || []).map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        email: r.profiles?.email || '',
        full_name: r.profiles?.full_name || 'Sin nombre',
        role: r.role,
        is_working: workingSet.has(r.profiles?.full_name?.toLowerCase()),
        clock_in_time: null, // Simplificado por ahora
      }));

      setTeamMembers(members);
    } catch (error) {
      console.error('Error fetching team:', error);
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleSave = async () => {
    if (!branch) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('branches')
        .update({
          name,
          address,
          city,
          phone: phone || null,
          email: email || null,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          is_active: isActive,
          fiscal_data: fiscalData,
        } as any)
        .eq('id', branch.id);

      if (error) throw error;

      toast.success('Sucursal actualizada');
      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving branch:', error);
      toast.error('Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveUser = async (roleId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ is_active: false })
        .eq('id', roleId);

      if (error) throw error;

      toast.success('Usuario removido de la sucursal');
      fetchTeamMembers();
    } catch (error) {
      console.error('Error removing user:', error);
      toast.error('Error al remover usuario');
    }
  };

  const handleInviteUser = async () => {
    if (!branch || !inviteEmail) return;
    
    setInviting(true);
    try {
      // Buscar usuario por email
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', inviteEmail)
        .single();

      if (!profile) {
        toast.error('Usuario no encontrado. Debe registrarse primero.');
        return;
      }

      // Verificar si ya tiene rol en esta sucursal
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id, is_active')
        .eq('user_id', profile.user_id)
        .eq('branch_id', branch.id)
        .single();

      if (existingRole) {
        if (existingRole.is_active) {
          toast.error('Este usuario ya está asignado a esta sucursal');
          return;
        }
        // Reactivar rol existente
        await supabase
          .from('user_roles')
          .update({ is_active: true, role: inviteRole as any })
          .eq('id', existingRole.id);
      } else {
        // Crear nuevo rol
        const { error } = await supabase
          .from('user_roles')
          .insert({
            user_id: profile.user_id,
            branch_id: branch.id,
            role: inviteRole as any,
            is_active: true,
          } as any);

        if (error) throw error;
      }

      toast.success('Usuario agregado a la sucursal');
      setInviteEmail('');
      fetchTeamMembers();
    } catch (error) {
      console.error('Error inviting user:', error);
      toast.error('Error al agregar usuario');
    } finally {
      setInviting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatClockInTime = (time: string | null) => {
    if (!time) return '';
    const date = new Date(time);
    return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  };

  const getRoleLabel = (role: string) => {
    return BRANCH_ROLES.find(r => r.value === role)?.label || role;
  };

  if (!branch) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col">
        <SheetHeader className="p-6 pb-2">
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Editar: {branch.name}
          </SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 grid grid-cols-4 mb-2">
            <TabsTrigger value="datos" className="gap-1 text-xs sm:text-sm">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Datos</span>
            </TabsTrigger>
            <TabsTrigger value="horarios" className="gap-1 text-xs sm:text-sm">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Horarios</span>
            </TabsTrigger>
            <TabsTrigger value="equipo" className="gap-1 text-xs sm:text-sm">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Equipo</span>
            </TabsTrigger>
            <TabsTrigger value="fiscal" className="gap-1 text-xs sm:text-sm">
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Fiscal</span>
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 px-6">
            {/* TAB: DATOS BÁSICOS */}
            <TabsContent value="datos" className="mt-0 space-y-4 pb-24">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la sucursal *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Manantiales"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Dirección *</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ej: Wilfredo Meioni 3778, Local 6"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Ciudad / Zona</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ej: Ribera de Manantiales, Córdoba"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono del local</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="351-1234567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email del local</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="local@hoppiness.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Coordenadas (para delivery)
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Latitud</Label>
                    <Input
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      placeholder="-31.4234"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Longitud</Label>
                    <Input
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      placeholder="-64.1234"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Estado de la sucursal</p>
                  <p className="text-sm text-muted-foreground">
                    {isActive ? 'Sucursal activa y operativa' : 'Sucursal inactiva'}
                  </p>
                </div>
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </TabsContent>

            {/* TAB: HORARIOS */}
            <TabsContent value="horarios" className="mt-0 pb-24">
              <BranchScheduleEditor branchId={branch.id} canEdit={true} />
            </TabsContent>

            {/* TAB: EQUIPO */}
            <TabsContent value="equipo" className="mt-0 space-y-4 pb-24">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Usuarios asignados</h3>
                <Badge variant="secondary">{teamMembers.length} miembros</Badge>
              </div>

              {loadingTeam ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-2">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(member.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{member.full_name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {member.email} · {getRoleLabel(member.role)}
                        </p>
                        {member.is_working && (
                          <p className="text-xs text-primary flex items-center gap-1 mt-0.5">
                            <Circle className="h-2 w-2 fill-current" />
                            Trabajando desde {formatClockInTime(member.clock_in_time)}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveUser(member.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {teamMembers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No hay usuarios asignados</p>
                    </div>
                  )}
                </div>
              )}

              {/* Agregar usuario */}
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Agregar usuario
                </h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="inviteEmail">Email del usuario</Label>
                    <Input
                      id="inviteEmail"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="usuario@email.com"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Select value={inviteRole} onValueChange={setInviteRole}>
                        <SelectTrigger>
                          <SelectValue placeholder="Rol" />
                        </SelectTrigger>
                        <SelectContent>
                          {BRANCH_ROLES.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={handleInviteUser}
                      disabled={!inviteEmail || inviting}
                    >
                      {inviting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Agregar'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB: DATOS FISCALES */}
            <TabsContent value="fiscal" className="mt-0 space-y-4 pb-24">
              <div className="space-y-2">
                <Label htmlFor="razon_social">Razón Social</Label>
                <Input
                  id="razon_social"
                  value={fiscalData.razon_social || ''}
                  onChange={(e) => setFiscalData({ ...fiscalData, razon_social: e.target.value })}
                  placeholder="Ej: Hoppiness Manantiales SRL"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cuit">CUIT</Label>
                <Input
                  id="cuit"
                  value={fiscalData.cuit || ''}
                  onChange={(e) => setFiscalData({ ...fiscalData, cuit: e.target.value })}
                  placeholder="30-12345678-9"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="condicion_iva">Condición IVA</Label>
                <Select
                  value={fiscalData.condicion_iva || ''}
                  onValueChange={(v) => setFiscalData({ ...fiscalData, condicion_iva: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar condición" />
                  </SelectTrigger>
                  <SelectContent>
                    {IVA_CONDITIONS.map((cond) => (
                      <SelectItem key={cond.value} value={cond.value}>
                        {cond.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="domicilio_fiscal">Domicilio Fiscal</Label>
                <Input
                  id="domicilio_fiscal"
                  value={fiscalData.domicilio_fiscal || ''}
                  onChange={(e) => setFiscalData({ ...fiscalData, domicilio_fiscal: e.target.value })}
                  placeholder="Av. Colón 1234, Córdoba"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inicio_actividades">Inicio de Actividades</Label>
                  <Input
                    id="inicio_actividades"
                    type="date"
                    value={fiscalData.inicio_actividades || ''}
                    onChange={(e) => setFiscalData({ ...fiscalData, inicio_actividades: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="punto_venta">Punto de Venta AFIP</Label>
                  <Input
                    id="punto_venta"
                    value={fiscalData.punto_venta || ''}
                    onChange={(e) => setFiscalData({ ...fiscalData, punto_venta: e.target.value })}
                    placeholder="0001"
                  />
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Footer fijo con botones */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t">
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={saving || !name || !address}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
