import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  Circle,
  Copy,
  CheckCircle2
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import BranchLocationMap from '@/components/maps/BranchLocationMap';

type Branch = Tables<'branches'>;

interface BranchEditPanelProps {
  branch: Branch;
  onSaved: () => void;
  onCancel: () => void;
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

interface Schedule {
  id: string;
  day_of_week: number;
  opens_at: string;
  closes_at: string;
  is_enabled: boolean;
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

const DAYS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2).toString().padStart(2, '0');
  const minutes = i % 2 === 0 ? '00' : '30';
  return { value: `${hour}:${minutes}:00`, label: `${hour}:${minutes}` };
});

export default function BranchEditPanel({ branch, onSaved, onCancel }: BranchEditPanelProps) {
  const [activeTab, setActiveTab] = useState('datos');
  const [saving, setSaving] = useState(false);
  
  // Datos básicos
  const [name, setName] = useState(branch.name || '');
  const [address, setAddress] = useState(branch.address || '');
  const [city, setCity] = useState(branch.city || '');
  const [phone, setPhone] = useState(branch.phone || '');
  const [email, setEmail] = useState(branch.email || '');
  const [latitude, setLatitude] = useState((branch as any).latitude?.toString() || '');
  const [longitude, setLongitude] = useState((branch as any).longitude?.toString() || '');
  const [isActive, setIsActive] = useState(branch.is_active);
  
  // Datos fiscales
  const [fiscalData, setFiscalData] = useState<FiscalData>((branch as any).fiscal_data || {});
  
  // Horarios
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [hasScheduleChanges, setHasScheduleChanges] = useState(false);
  
  // Equipo
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('cajero');
  
  // Mapa (on-demand)
  const [showMap, setShowMap] = useState(false);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    fetchTeamMembers();
    fetchSchedules();
  }, [branch.id]);

  const fetchSchedules = async () => {
    setLoadingSchedules(true);
    try {
      const { data } = await supabase
        .from('branch_schedules')
        .select('id, day_of_week, opens_at, closes_at, is_enabled')
        .eq('branch_id', branch.id)
        .eq('service_type', 'dine_in')
        .eq('shift_number', 1)
        .order('day_of_week');

      setSchedules((data || []) as Schedule[]);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const fetchTeamMembers = async () => {
    setLoadingTeam(true);
    try {
      const { data: roles } = await supabase
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
        clock_in_time: null,
      }));

      setTeamMembers(members);
    } catch (error) {
      console.error('Error fetching team:', error);
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Guardar datos básicos
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

      // Guardar horarios si hay cambios
      if (hasScheduleChanges) {
        for (const schedule of schedules) {
          await supabase
            .from('branch_schedules')
            .update({
              opens_at: schedule.opens_at,
              closes_at: schedule.closes_at,
              is_enabled: schedule.is_enabled,
            })
            .eq('id', schedule.id);
        }
      }

      toast.success('Sucursal actualizada');
      onSaved();
    } catch (error) {
      console.error('Error saving branch:', error);
      toast.error('Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const updateSchedule = (dayOfWeek: number, field: keyof Schedule, value: any) => {
    setSchedules(prev => prev.map(s => {
      if (s.day_of_week === dayOfWeek) {
        return { ...s, [field]: value };
      }
      return s;
    }));
    setHasScheduleChanges(true);
  };

  const copyMondayToAll = () => {
    const monday = schedules.find(s => s.day_of_week === 1);
    if (!monday) return;

    setSchedules(prev => prev.map(s => ({
      ...s,
      opens_at: monday.opens_at,
      closes_at: monday.closes_at,
      is_enabled: monday.is_enabled,
    })));
    setHasScheduleChanges(true);
    toast.success('Horario del lunes copiado a todos los días');
  };

  const handleRemoveUser = async (roleId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ is_active: false })
        .eq('id', roleId);

      if (error) throw error;

      toast.success('Usuario removido');
      fetchTeamMembers();
    } catch (error) {
      toast.error('Error al remover usuario');
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail) return;
    
    setInviting(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', inviteEmail)
        .single();

      if (!profile) {
        toast.error('Usuario no encontrado. Debe registrarse primero.');
        return;
      }

      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id, is_active')
        .eq('user_id', profile.user_id)
        .eq('branch_id', branch.id)
        .single();

      if (existingRole) {
        if (existingRole.is_active) {
          toast.error('Este usuario ya está asignado');
          return;
        }
        await supabase
          .from('user_roles')
          .update({ is_active: true, role: inviteRole as any })
          .eq('id', existingRole.id);
      } else {
        await supabase
          .from('user_roles')
          .insert({
            user_id: profile.user_id,
            branch_id: branch.id,
            role: inviteRole as any,
            is_active: true,
          } as any);
      }

      toast.success('Usuario agregado');
      setInviteEmail('');
      fetchTeamMembers();
    } catch (error) {
      toast.error('Error al agregar usuario');
    } finally {
      setInviting(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleLabel = (role: string) => {
    return BRANCH_ROLES.find(r => r.value === role)?.label || role;
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="datos" className="gap-1.5">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Datos</span>
          </TabsTrigger>
          <TabsTrigger value="horarios" className="gap-1.5">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Horarios</span>
          </TabsTrigger>
          <TabsTrigger value="equipo" className="gap-1.5">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Equipo</span>
          </TabsTrigger>
          <TabsTrigger value="fiscal" className="gap-1.5">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Fiscal</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB: DATOS */}
        <TabsContent value="datos" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Manantiales"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="351-1234567"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="address">Dirección *</Label>
                {latitude && longitude && (
                  <span className="flex items-center gap-1 text-xs text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Ubicado en el mapa
                  </span>
                )}
              </div>
              {!showMap && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMap(true)}
                  className="gap-1.5"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  Ubicar en el mapa
                </Button>
              )}
            </div>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Wilfredo Meioni 3778, Local 6, Ribera de Manantiales"
            />
            {showMap && (
              <div className="space-y-2 mt-2">
                <BranchLocationMap
                  address={address}
                  city={city}
                  latitude={latitude}
                  longitude={longitude}
                  onLocationChange={(lat, lng) => {
                    setLatitude(lat);
                    setLongitude(lng);
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMap(false)}
                  className="gap-1.5"
                >
                  <X className="h-3 w-3" />
                  Cerrar mapa
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Ciudad / Zona</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Córdoba"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="local@hoppiness.com"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 py-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>Sucursal activa</Label>
          </div>
        </TabsContent>

        {/* TAB: HORARIOS */}
        <TabsContent value="horarios" className="mt-4 space-y-3">
          {loadingSchedules ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {DAYS.map((day) => {
                const schedule = schedules.find(s => s.day_of_week === day.value);
                if (!schedule) return null;

                return (
                  <div
                    key={day.value}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                  >
                    <Switch
                      checked={schedule.is_enabled}
                      onCheckedChange={(v) => updateSchedule(day.value, 'is_enabled', v)}
                    />
                    <span className={`w-24 font-medium ${!schedule.is_enabled ? 'text-muted-foreground' : ''}`}>
                      {day.label}
                    </span>
                    
                    {schedule.is_enabled ? (
                      <div className="flex items-center gap-2">
                        <Select
                          value={schedule.opens_at}
                          onValueChange={(v) => updateSchedule(day.value, 'opens_at', v)}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.map(t => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-muted-foreground">a</span>
                        <Select
                          value={schedule.closes_at}
                          onValueChange={(v) => updateSchedule(day.value, 'closes_at', v)}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.map(t => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <Badge variant="secondary">Cerrado</Badge>
                    )}
                  </div>
                );
              })}

              <Button variant="outline" size="sm" onClick={copyMondayToAll} className="gap-1.5">
                <Copy className="h-3 w-3" />
                Copiar horario del lunes a todos
              </Button>
            </>
          )}
        </TabsContent>

        {/* TAB: EQUIPO */}
        <TabsContent value="equipo" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuarios asignados
            </h4>
            <Badge variant="secondary">{teamMembers.length}</Badge>
          </div>

          {loadingTeam ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {getInitials(member.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {member.full_name} · <span className="text-muted-foreground font-normal">{member.email}</span>
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      Rol: {getRoleLabel(member.role)}
                      {member.is_working && (
                        <span className="text-primary flex items-center gap-1">
                          <Circle className="h-2 w-2 fill-current" />
                          Trabajando ahora
                        </span>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveUser(member.id)}
                  >
                    Quitar
                  </Button>
                </div>
              ))}

              {teamMembers.length === 0 && (
                <p className="text-center py-6 text-muted-foreground text-sm">
                  No hay usuarios asignados
                </p>
              )}
            </div>
          )}

          {/* Agregar usuario */}
          <div className="pt-3 border-t">
            <h5 className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <UserPlus className="h-4 w-4" />
              Agregar usuario
            </h5>
            <div className="flex gap-2 flex-wrap">
              <Input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Email del usuario"
                className="flex-1 min-w-[200px]"
              />
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRANCH_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleInviteUser} disabled={!inviteEmail || inviting}>
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Invitar'}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* TAB: FISCAL */}
        <TabsContent value="fiscal" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Razón Social</Label>
              <Input
                value={fiscalData.razon_social || ''}
                onChange={(e) => setFiscalData({ ...fiscalData, razon_social: e.target.value })}
                placeholder="Hoppiness Manantiales SRL"
              />
            </div>
            <div className="space-y-2">
              <Label>CUIT</Label>
              <Input
                value={fiscalData.cuit || ''}
                onChange={(e) => setFiscalData({ ...fiscalData, cuit: e.target.value })}
                placeholder="30-12345678-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Condición IVA</Label>
              <Select
                value={fiscalData.condicion_iva || ''}
                onValueChange={(v) => setFiscalData({ ...fiscalData, condicion_iva: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
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
              <Label>Domicilio Fiscal</Label>
              <Input
                value={fiscalData.domicilio_fiscal || ''}
                onChange={(e) => setFiscalData({ ...fiscalData, domicilio_fiscal: e.target.value })}
                placeholder="Av. Colón 1234, Córdoba"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Inicio de Actividades</Label>
              <Input
                type="date"
                value={fiscalData.inicio_actividades || ''}
                onChange={(e) => setFiscalData({ ...fiscalData, inicio_actividades: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Punto de Venta AFIP</Label>
              <Input
                value={fiscalData.punto_venta || ''}
                onChange={(e) => setFiscalData({ ...fiscalData, punto_venta: e.target.value })}
                placeholder="0001"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer con botones */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving || !name || !address}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
