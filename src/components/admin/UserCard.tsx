import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  Shield,
  Store,
  Building2,
  Landmark,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ExternalLink,
  History,
  Eye,
  X,
  Search,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import type { Tables, Enums } from '@/integrations/supabase/types';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

type AppRole = Enums<'app_role'>;
type Branch = Tables<'branches'>;

interface PanelAccess {
  can_use_local_panel: boolean;
  can_use_brand_panel: boolean;
  brand_access: boolean;
  local_template_id: string | null;
  brand_template_id: string | null;
}

interface UserData {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url?: string | null;
  role: AppRole | null;
  panelAccess?: PanelAccess;
  allowedBranches?: { id: string; name: string }[];
  overrideCount?: number;
  lastLogin?: string | null;
  isActive?: boolean;
}

interface AuditLog {
  id: string;
  action: string;
  changed_by_name: string;
  created_at: string;
  details: string;
}

interface EffectivePermission {
  key: string;
  name: string;
  source: 'template' | 'override_grant' | 'override_revoke';
  branch_name?: string;
}

interface UserCardProps {
  user: UserData | null;
  open: boolean;
  onClose: () => void;
  branches: Branch[];
  onSave: () => void;
}

const roleLabels: Record<AppRole, string> = {
  admin: 'Superadmin',
  coordinador: 'Coordinador Digital',
  socio: 'Brandpartner',
  franquiciado: 'Franquiciado',
  encargado: 'Encargado',
  cajero: 'Cajero',
  kds: 'KDS',
  gerente: 'Encargado',
  empleado: 'Cajero',
};

const roleColors: Record<AppRole, string> = {
  admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  coordinador: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  socio: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  franquiciado: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  encargado: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  cajero: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  kds: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  gerente: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  empleado: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

const ROLES_HIERARCHY: AppRole[] = ['admin', 'coordinador', 'socio', 'franquiciado', 'encargado', 'cajero', 'kds'];

export function UserCard({ user, open, onClose, branches, onSave }: UserCardProps) {
  const { isAdmin } = useUserRole();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('identity');
  
  // Templates
  const [localTemplates, setLocalTemplates] = useState<{ id: string; name: string }[]>([]);
  const [brandTemplates, setBrandTemplates] = useState<{ id: string; name: string }[]>([]);
  
  // Editable state
  const [selectedRole, setSelectedRole] = useState<AppRole | ''>(user?.role || '');
  const [canUseLocalPanel, setCanUseLocalPanel] = useState(user?.panelAccess?.can_use_local_panel ?? false);
  const [canUseBrandPanel, setCanUseBrandPanel] = useState(user?.panelAccess?.can_use_brand_panel ?? false);
  const [brandAccess, setBrandAccess] = useState(user?.panelAccess?.brand_access ?? false);
  const [localTemplateId, setLocalTemplateId] = useState<string>(user?.panelAccess?.local_template_id || '');
  const [brandTemplateId, setBrandTemplateId] = useState<string>(user?.panelAccess?.brand_template_id || '');
  const [selectedBranches, setSelectedBranches] = useState<string[]>(
    user?.allowedBranches?.map(b => b.id) || []
  );
  const [branchSearch, setBranchSearch] = useState('');
  
  // Audit logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  
  // Effective permissions
  const [effectivePermissions, setEffectivePermissions] = useState<EffectivePermission[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [showEffectivePermissions, setShowEffectivePermissions] = useState(false);

  // Fetch templates on mount
  useState(() => {
    const fetchTemplates = async () => {
      const [{ data: local }, { data: brand }] = await Promise.all([
        supabase.from('local_templates').select('id, name').eq('is_active', true),
        supabase.from('brand_templates').select('id, name').eq('is_active', true),
      ]);
      setLocalTemplates(local || []);
      setBrandTemplates(brand || []);
    };
    fetchTemplates();
  });

  // Sync state when user changes
  useState(() => {
    if (user) {
      setSelectedRole(user.role || '');
      setCanUseLocalPanel(user.panelAccess?.can_use_local_panel ?? false);
      setCanUseBrandPanel(user.panelAccess?.can_use_brand_panel ?? false);
      setBrandAccess(user.panelAccess?.brand_access ?? false);
      setLocalTemplateId(user.panelAccess?.local_template_id || '');
      setBrandTemplateId(user.panelAccess?.brand_template_id || '');
      setSelectedBranches(user.allowedBranches?.map(b => b.id) || []);
    }
  });

  const fetchAuditLogs = async () => {
    if (!user) return;
    setLoadingAudit(true);
    try {
      // Note: permission_audit_log table may not exist yet
      // Simulating audit data for now - will be connected when table exists
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock data until audit table is created
      setAuditLogs([
        {
          id: '1',
          action: 'Rol actualizado',
          changed_by_name: 'Sistema',
          created_at: new Date().toISOString(),
          details: 'Cambio de rol aplicado',
        }
      ]);
    } catch (error: any) {
      toast.error('Error al cargar auditoría');
    } finally {
      setLoadingAudit(false);
    }
  };

  const fetchEffectivePermissions = async () => {
    if (!user) return;
    setLoadingPermissions(true);
    try {
      // Fetch role defaults
      const roleToQuery = user.role || 'cajero'; // default fallback
      const { data: roleDefaults } = await supabase
        .from('role_default_permissions')
        .select('permission_key')
        .eq('role', roleToQuery);

      // Fetch user overrides
      const { data: overrides } = await supabase
        .from('user_branch_permissions')
        .select('permission_key, override_type, branch_id')
        .eq('user_id', user.user_id);

      const permissions: EffectivePermission[] = [];

      // Add template permissions
      if (roleDefaults && Array.isArray(roleDefaults)) {
        roleDefaults.forEach(rd => {
          permissions.push({
            key: rd.permission_key,
            name: rd.permission_key.replace(/\./g, ' › '),
            source: 'template',
          });
        });
      }

      // Add/modify with overrides
      if (overrides && Array.isArray(overrides)) overrides.forEach(ov => {
        const branch = branches.find(b => b.id === ov.branch_id);
        const existing = permissions.find(p => p.key === ov.permission_key);
        
        if (ov.override_type === 'grant' && !existing) {
          permissions.push({
            key: ov.permission_key,
            name: ov.permission_key.replace(/\./g, ' › '),
            source: 'override_grant',
            branch_name: branch?.name,
          });
        } else if (ov.override_type === 'revoke' && existing) {
          existing.source = 'override_revoke';
          existing.branch_name = branch?.name;
        }
      });

      setEffectivePermissions(permissions);
      setShowEffectivePermissions(true);
    } catch (error: any) {
      toast.error('Error al cargar permisos efectivos');
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handleSave = async () => {
    if (!user || !isAdmin) return;
    setSaving(true);
    
    try {
      // 1. Update role
      if (selectedRole) {
        const validRole = selectedRole as AppRole;
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', user.user_id);
        
        await supabase
          .from('user_roles')
          .insert({ user_id: user.user_id, role: validRole });
      }

      // 2. Update panel access with templates
      const { error: panelError } = await supabase
        .from('user_panel_access')
        .upsert({
          user_id: user.user_id,
          can_use_local_panel: canUseLocalPanel,
          can_use_brand_panel: canUseBrandPanel,
          brand_access: brandAccess,
          local_template_id: canUseLocalPanel && localTemplateId ? localTemplateId : null,
          brand_template_id: canUseBrandPanel && brandTemplateId ? brandTemplateId : null,
        }, { onConflict: 'user_id' });

      if (panelError) throw panelError;

      // 3. Update branch access
      await supabase
        .from('user_branch_access')
        .delete()
        .eq('user_id', user.user_id);

      if (selectedBranches.length > 0) {
        const { error: branchError } = await supabase
          .from('user_branch_access')
          .insert(
            selectedBranches.map(branchId => ({
              user_id: user.user_id,
              branch_id: branchId,
            }))
          );
        
        if (branchError) throw branchError;
      }

      toast.success('Usuario actualizado');
      onSave();
      onClose();
    } catch (error: any) {
      toast.error('Error al guardar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };


  const toggleBranch = (branchId: string) => {
    setSelectedBranches(prev =>
      prev.includes(branchId)
        ? prev.filter(id => id !== branchId)
        : [...prev, branchId]
    );
  };

  const filteredBranches = branches.filter(b =>
    b.is_active && b.name.toLowerCase().includes(branchSearch.toLowerCase())
  );

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <User className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <SheetTitle>{user.full_name}</SheetTitle>
              <SheetDescription>{user.email}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="identity">Identidad</TabsTrigger>
            <TabsTrigger value="access">Accesos</TabsTrigger>
            <TabsTrigger value="audit">Auditoría</TabsTrigger>
          </TabsList>

          {/* A) Identidad y Estado */}
          <TabsContent value="identity" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Información del usuario
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Nombre</span>
                  <span className="font-medium">{user.full_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="font-medium">{user.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Último ingreso</span>
                  <span className="text-sm">
                    {user.lastLogin
                      ? format(new Date(user.lastLogin), "dd MMM yyyy, HH:mm", { locale: es })
                      : '-'}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Estado</span>
                  <Badge variant={user.isActive !== false ? 'default' : 'secondary'}>
                    {user.isActive !== false ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* D) Plantillas */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Plantillas asignadas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Local Template */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4" />
                    Plantilla Local
                    {!canUseLocalPanel && <Badge variant="outline" className="text-xs">Panel deshabilitado</Badge>}
                  </Label>
                  <Select 
                    value={localTemplateId} 
                    onValueChange={setLocalTemplateId}
                    disabled={!isAdmin || !canUseLocalPanel}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sin plantilla local" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin plantilla</SelectItem>
                      {localTemplates.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Brand Template */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Landmark className="w-4 h-4" />
                    Plantilla Marca
                    {!canUseBrandPanel && <Badge variant="outline" className="text-xs">Panel deshabilitado</Badge>}
                  </Label>
                  <Select 
                    value={brandTemplateId} 
                    onValueChange={setBrandTemplateId}
                    disabled={!isAdmin || !canUseBrandPanel}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sin plantilla marca" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin plantilla</SelectItem>
                      {brandTemplates.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <p className="text-xs text-muted-foreground">
                  Las plantillas definen los permisos base del usuario en cada panel.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* B) Paneles + C) Scope + E) Overrides */}
          <TabsContent value="access" className="space-y-4 mt-4">
            {/* B) Paneles habilitados */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Paneles habilitados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <Label htmlFor="local-panel">Panel Mi Local</Label>
                  </div>
                  <Switch
                    id="local-panel"
                    checked={canUseLocalPanel}
                    onCheckedChange={setCanUseLocalPanel}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-muted-foreground" />
                    <Label htmlFor="brand-panel">Panel Marca</Label>
                  </div>
                  <Switch
                    id="brand-panel"
                    checked={canUseBrandPanel}
                    onCheckedChange={setCanUseBrandPanel}
                    disabled={!isAdmin}
                  />
                </div>
              </CardContent>
            </Card>

            {/* C) Scope */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Alcance (Scope)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Brand Access */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-muted-foreground" />
                    <Label htmlFor="brand-access">Acceso global a marca</Label>
                  </div>
                  <Switch
                    id="brand-access"
                    checked={brandAccess}
                    onCheckedChange={setBrandAccess}
                    disabled={!isAdmin}
                  />
                </div>

                <Separator />

                {/* Branch Selector */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-muted-foreground" />
                    Sucursales permitidas
                    <Badge variant="secondary" className="ml-auto">
                      {selectedBranches.length} seleccionadas
                    </Badge>
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar sucursal..."
                      value={branchSearch}
                      onChange={(e) => setBranchSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <ScrollArea className="h-40 border rounded-md p-2">
                    {filteredBranches.map((branch) => (
                      <div
                        key={branch.id}
                        className="flex items-center space-x-2 py-2 px-1 hover:bg-muted rounded cursor-pointer"
                        onClick={() => isAdmin && toggleBranch(branch.id)}
                      >
                        <Checkbox
                          id={`branch-${branch.id}`}
                          checked={selectedBranches.includes(branch.id)}
                          disabled={!isAdmin}
                        />
                        <label
                          htmlFor={`branch-${branch.id}`}
                          className="text-sm flex-1 cursor-pointer"
                        >
                          {branch.name}
                        </label>
                      </div>
                    ))}
                    {filteredBranches.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No se encontraron sucursales
                      </p>
                    )}
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>

            {/* E) Overrides */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span>Overrides por sucursal</span>
                  {(user.overrideCount ?? 0) > 0 && (
                    <Badge variant="outline" className="border-amber-500 text-amber-600">
                      {user.overrideCount} activos
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Permisos que difieren de la plantilla asignada.
                </p>
                
                {isAdmin && (
                  <div className="flex gap-2">
                    <Link to={`/admin/overrides?user=${user.user_id}`} className="flex-1">
                      <Button variant="outline" className="w-full" onClick={onClose}>
                        <Shield className="w-4 h-4 mr-2" />
                        Editar overrides
                        <ExternalLink className="w-4 h-4 ml-auto" />
                      </Button>
                    </Link>
                  </div>
                )}

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={fetchEffectivePermissions}
                  disabled={loadingPermissions}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {loadingPermissions ? 'Cargando...' : 'Ver permisos efectivos'}
                </Button>

                {showEffectivePermissions && (
                  <div className="border rounded-md p-3 space-y-2 bg-muted/50">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Permisos efectivos</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowEffectivePermissions(false)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <ScrollArea className="h-48">
                      {effectivePermissions.map((perm) => (
                        <div key={perm.key} className="flex items-center justify-between py-1 text-sm">
                          <span className="text-muted-foreground truncate flex-1">
                            {perm.name}
                          </span>
                          <Badge
                            variant={
                              perm.source === 'template'
                                ? 'secondary'
                                : perm.source === 'override_grant'
                                ? 'default'
                                : 'destructive'
                            }
                            className="text-xs ml-2"
                          >
                            {perm.source === 'template'
                              ? 'Heredado'
                              : perm.source === 'override_grant'
                              ? 'Override +'
                              : 'Override -'}
                          </Badge>
                        </div>
                      ))}
                      {effectivePermissions.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Sin permisos definidos
                        </p>
                      )}
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* F) Auditoría */}
          <TabsContent value="audit" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Historial de cambios
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchAuditLogs}
                    disabled={loadingAudit}
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingAudit ? 'animate-spin' : ''}`} />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {auditLogs.length > 0 ? (
                  <ScrollArea className="h-64">
                    <div className="space-y-3">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="border-b pb-2 last:border-0">
                          <div className="flex justify-between items-start">
                            <span className="text-sm font-medium">{log.action}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: es })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Por: {log.changed_by_name}
                          </p>
                          {log.details && (
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {log.details}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8">
                    <History className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {loadingAudit ? 'Cargando...' : 'Presiona actualizar para ver el historial'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          {isAdmin && (
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar cambios'
              )}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
