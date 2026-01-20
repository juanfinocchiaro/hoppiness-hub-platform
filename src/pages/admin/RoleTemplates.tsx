import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Shield, RefreshCw, Save, 
  ShoppingCart, Utensils, DollarSign, Truck, Package, Users, 
  Settings, BarChart3, CheckCircle2, Info, Search
} from 'lucide-react';
import { toast } from 'sonner';
import type { Enums } from '@/integrations/supabase/types';

type AppRole = Enums<'app_role'>;

interface PermissionDefinition {
  id: string;
  key: string;
  name: string;
  description: string | null;
  module: string;
  min_role: AppRole;
}

interface RoleDefaultPermission {
  role: string;
  permission_key: string;
}

const moduleIcons: Record<string, React.ReactNode> = {
  orders: <ShoppingCart className="h-4 w-4" />,
  pos: <DollarSign className="h-4 w-4" />,
  kds: <Utensils className="h-4 w-4" />,
  cash: <DollarSign className="h-4 w-4" />,
  finance: <BarChart3 className="h-4 w-4" />,
  suppliers: <Truck className="h-4 w-4" />,
  inventory: <Package className="h-4 w-4" />,
  hr: <Users className="h-4 w-4" />,
  config: <Settings className="h-4 w-4" />,
  reports: <BarChart3 className="h-4 w-4" />,
  users: <Users className="h-4 w-4" />,
};

const moduleLabels: Record<string, string> = {
  orders: 'Pedidos',
  pos: 'Punto de Venta',
  kds: 'Cocina (KDS)',
  cash: 'Caja',
  finance: 'Finanzas',
  suppliers: 'Proveedores',
  inventory: 'Inventario & Menú',
  hr: 'Recursos Humanos',
  config: 'Configuración',
  reports: 'Reportes',
  users: 'Usuarios',
};

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

const roleDescriptions: Record<string, string> = {
  admin: 'Acceso total al sistema. No requiere plantilla.',
  coordinador: 'Gestión de catálogo y operaciones a nivel marca.',
  socio: 'Vista de reportes y métricas a nivel marca.',
  franquiciado: 'Gestión completa de sus sucursales asignadas.',
  encargado: 'Operación diaria y gestión de staff en sucursal.',
  cajero: 'Operación básica: ventas, pedidos, caja.',
  kds: 'Solo visualización de cocina (KDS).',
};

// Roles editables (excluye admin que tiene todo)
const EDITABLE_ROLES: AppRole[] = ['franquiciado', 'encargado', 'cajero', 'kds', 'coordinador', 'socio'];

const moduleOrder = ['pos', 'orders', 'kds', 'cash', 'inventory', 'finance', 'hr', 'suppliers', 'config', 'reports', 'users'];

export default function RoleTemplates() {
  const { user: currentUser } = useAuth();
  const { isAdmin } = useUserRole();
  
  const [permissionDefinitions, setPermissionDefinitions] = useState<PermissionDefinition[]>([]);
  const [roleDefaults, setRoleDefaults] = useState<RoleDefaultPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AppRole>('encargado');
  const [permissionSearch, setPermissionSearch] = useState('');
  const [showKeys, setShowKeys] = useState(false);
  
  // Working copy of permissions for the selected role
  const [workingPermissions, setWorkingPermissions] = useState<Set<string>>(new Set());
  const [originalPermissions, setOriginalPermissions] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: definitions }, { data: defaults }] = await Promise.all([
        supabase.from('permission_definitions').select('*').order('module, key'),
        supabase.from('role_default_permissions').select('role, permission_key'),
      ]);
      
      setPermissionDefinitions(definitions || []);
      setRoleDefaults(defaults || []);
    } catch (error: any) {
      toast.error('Error al cargar datos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update working permissions when role changes
  useEffect(() => {
    const rolePerms = roleDefaults
      .filter(rd => rd.role === selectedRole)
      .map(rd => rd.permission_key);
    const permSet = new Set(rolePerms);
    setWorkingPermissions(permSet);
    setOriginalPermissions(new Set(permSet));
  }, [selectedRole, roleDefaults]);

  // Group permissions by module
  const permissionsByModule = useMemo(() => {
    const grouped: Record<string, PermissionDefinition[]> = {};
    const searchLower = permissionSearch.toLowerCase();
    
    permissionDefinitions.forEach(perm => {
      if (permissionSearch) {
        const matchesSearch = 
          perm.name.toLowerCase().includes(searchLower) ||
          perm.key.toLowerCase().includes(searchLower) ||
          (perm.description?.toLowerCase().includes(searchLower));
        if (!matchesSearch) return;
      }
      
      if (!grouped[perm.module]) {
        grouped[perm.module] = [];
      }
      grouped[perm.module].push(perm);
    });
    
    const sorted: Record<string, PermissionDefinition[]> = {};
    moduleOrder.forEach(mod => {
      if (grouped[mod]) sorted[mod] = grouped[mod];
    });
    Object.keys(grouped).forEach(mod => {
      if (!sorted[mod]) sorted[mod] = grouped[mod];
    });
    
    return sorted;
  }, [permissionDefinitions, permissionSearch]);

  const hasChanges = useMemo(() => {
    if (workingPermissions.size !== originalPermissions.size) return true;
    for (const perm of workingPermissions) {
      if (!originalPermissions.has(perm)) return true;
    }
    return false;
  }, [workingPermissions, originalPermissions]);

  const togglePermission = (key: string) => {
    setWorkingPermissions(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleModuleAll = (module: string, enable: boolean) => {
    const modulePerms = permissionsByModule[module] || [];
    setWorkingPermissions(prev => {
      const next = new Set(prev);
      modulePerms.forEach(p => {
        if (enable) {
          next.add(p.key);
        } else {
          next.delete(p.key);
        }
      });
      return next;
    });
  };

  const saveTemplate = async () => {
    if (!isAdmin) {
      toast.error('Solo administradores pueden modificar plantillas');
      return;
    }
    
    setSaving(true);
    try {
      // Delete existing defaults for this role
      await supabase
        .from('role_default_permissions')
        .delete()
        .eq('role', selectedRole);

      // Insert new defaults
      if (workingPermissions.size > 0) {
        const inserts = Array.from(workingPermissions).map(key => ({
          role: selectedRole,
          permission_key: key,
        }));

        const { error } = await supabase
          .from('role_default_permissions')
          .insert(inserts);

        if (error) throw error;
      }

      setOriginalPermissions(new Set(workingPermissions));
      toast.success(`Plantilla "${roleLabels[selectedRole]}" guardada`);
      
      // Refresh data
      const { data: newDefaults } = await supabase
        .from('role_default_permissions')
        .select('role, permission_key');
      setRoleDefaults(newDefaults || []);
    } catch (error: any) {
      toast.error('Error al guardar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getModuleStats = (module: string) => {
    const modulePerms = permissionsByModule[module] || [];
    const granted = modulePerms.filter(p => workingPermissions.has(p.key)).length;
    return { granted, total: modulePerms.length };
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-bold">Acceso restringido</h1>
          <p className="text-muted-foreground">Solo administradores pueden editar plantillas de rol.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Plantillas de Permisos
          </h1>
          <p className="text-muted-foreground">Define los permisos base que hereda cada rol</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          {hasChanges && (
            <Button onClick={saveTemplate} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Guardando...' : 'Guardar Plantilla'}
            </Button>
          )}
        </div>
      </div>

      <Tabs value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {EDITABLE_ROLES.map(role => {
            const rolePermCount = roleDefaults.filter(rd => rd.role === role).length;
            return (
              <TabsTrigger key={role} value={role} className="gap-2">
                {roleLabels[role]}
                <Badge variant="secondary" className="text-xs">
                  {rolePermCount}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {EDITABLE_ROLES.map(role => (
          <TabsContent key={role} value={role} className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Plantilla: {roleLabels[role]}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {roleDescriptions[role]}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch 
                        id="show-keys" 
                        checked={showKeys} 
                        onCheckedChange={setShowKeys} 
                      />
                      <Label htmlFor="show-keys" className="text-sm">Mostrar keys</Label>
                    </div>
                    <Badge variant="outline">
                      {workingPermissions.size} permisos
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar permisos..."
                    value={permissionSearch}
                    onChange={(e) => setPermissionSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Permissions by module */}
                <ScrollArea className="h-[500px]">
                  <Accordion type="multiple" defaultValue={moduleOrder} className="space-y-2">
                    {Object.entries(permissionsByModule).map(([module, permissions]) => {
                      const { granted, total } = getModuleStats(module);
                      const allGranted = granted === total && total > 0;

                      return (
                        <AccordionItem key={module} value={module} className="border rounded-lg px-4">
                          <AccordionTrigger className="hover:no-underline py-3">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="p-2 rounded-md bg-muted">
                                {moduleIcons[module] || <Package className="h-4 w-4" />}
                              </div>
                              <div className="text-left flex-1">
                                <p className="font-medium">{moduleLabels[module] || module}</p>
                                <p className="text-xs text-muted-foreground">
                                  {granted} de {total} permisos
                                </p>
                              </div>
                              <div className="flex items-center gap-2 mr-4" onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={allGranted}
                                  onCheckedChange={(checked) => toggleModuleAll(module, !!checked)}
                                />
                                <span className="text-xs text-muted-foreground">Todo</span>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-4">
                              {permissions.map(perm => {
                                const isGranted = workingPermissions.has(perm.key);
                                return (
                                  <label
                                    key={perm.key}
                                    className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                                      isGranted
                                        ? 'bg-primary/5 border-primary/30'
                                        : 'hover:bg-muted'
                                    }`}
                                  >
                                    <Checkbox
                                      checked={isGranted}
                                      onCheckedChange={() => togglePermission(perm.key)}
                                      className="mt-0.5"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm">{perm.name}</p>
                                      {perm.description && (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                          {perm.description}
                                        </p>
                                      )}
                                      {showKeys && (
                                        <code className="text-[10px] text-muted-foreground/70 font-mono">
                                          {perm.key}
                                        </code>
                                      )}
                                    </div>
                                    {isGranted && (
                                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                                    )}
                                  </label>
                                );
                              })}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
