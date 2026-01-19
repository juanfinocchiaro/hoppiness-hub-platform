import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  Search, Shield, Store, RefreshCw, Save, User, CheckCircle2, 
  ShoppingCart, Utensils, DollarSign, Truck, Package, Users, 
  Settings, BarChart3, Lock
} from 'lucide-react';
import { toast } from 'sonner';
import type { Tables, Enums } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;
type Branch = Tables<'branches'>;
type AppRole = Enums<'app_role'>;

interface PermissionDefinition {
  id: string;
  key: string;
  name: string;
  description: string | null;
  module: string;
  min_role: AppRole;
}

interface UserPermission {
  id: string;
  permission_key: string;
}

interface UserWithRole extends Profile {
  role: AppRole | null;
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
};

const roleLabels: Record<AppRole, string> = {
  admin: 'Admin',
  franquiciado: 'Franquiciado',
  gerente: 'Gerente',
  empleado: 'Empleado',
};

const roleColors: Record<AppRole, string> = {
  admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  franquiciado: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  gerente: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  empleado: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

const ROLES_HIERARCHY: AppRole[] = ['admin', 'franquiciado', 'gerente', 'empleado'];

export default function Permissions() {
  const { user: currentUser } = useAuth();
  
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [permissionDefinitions, setPermissionDefinitions] = useState<PermissionDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Selection state
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [userSearch, setUserSearch] = useState('');
  
  // Permissions state
  const [currentPermissions, setCurrentPermissions] = useState<Set<string>>(new Set());
  const [originalPermissions, setOriginalPermissions] = useState<Set<string>>(new Set());

  // Get highest priority role
  const getHighestRole = (roles: AppRole[]): AppRole | null => {
    if (!roles || roles.length === 0) return null;
    for (const role of ROLES_HIERARCHY) {
      if (roles.includes(role)) return role;
    }
    return roles[0];
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch permission definitions
      const { data: definitions, error: defError } = await supabase
        .from('permission_definitions')
        .select('*')
        .order('module, key');
      
      if (defError) throw defError;
      setPermissionDefinitions(definitions || []);

      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .order('full_name');

      if (profilesError) throw profilesError;

      // Fetch branches
      const { data: branchesData } = await supabase
        .from('branches')
        .select('*')
        .eq('is_active', true)
        .order('name');

      setBranches(branchesData || []);

      if (profiles) {
        // Fetch all roles
        const { data: allRoles } = await supabase
          .from('user_roles')
          .select('user_id, role');

        const usersWithRoles: UserWithRole[] = profiles.map((profile) => {
          const userRoles = allRoles?.filter(r => r.user_id === profile.user_id).map(r => r.role) || [];
          return {
            ...profile,
            role: getHighestRole(userRoles),
          };
        });

        setUsers(usersWithRoles);
      }
    } catch (error: any) {
      toast.error('Error al cargar datos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPermissions = async (userId: string, branchId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_branch_permissions')
        .select('permission_key')
        .eq('user_id', userId)
        .eq('branch_id', branchId);

      if (error) throw error;

      const perms = new Set(data?.map(p => p.permission_key) || []);
      setCurrentPermissions(perms);
      setOriginalPermissions(new Set(perms));
    } catch (error: any) {
      toast.error('Error al cargar permisos: ' + error.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedUserId && selectedBranchId) {
      fetchUserPermissions(selectedUserId, selectedBranchId);
    } else {
      setCurrentPermissions(new Set());
      setOriginalPermissions(new Set());
    }
  }, [selectedUserId, selectedBranchId]);

  // Group permissions by module
  const permissionsByModule = useMemo(() => {
    const grouped: Record<string, PermissionDefinition[]> = {};
    permissionDefinitions.forEach(perm => {
      if (!grouped[perm.module]) {
        grouped[perm.module] = [];
      }
      grouped[perm.module].push(perm);
    });
    return grouped;
  }, [permissionDefinitions]);

  // Filter users by search
  const filteredUsers = useMemo(() => {
    if (!userSearch) return users;
    const search = userSearch.toLowerCase();
    return users.filter(u => 
      u.full_name.toLowerCase().includes(search) ||
      u.email.toLowerCase().includes(search)
    );
  }, [users, userSearch]);

  const selectedUser = users.find(u => u.user_id === selectedUserId);

  const togglePermission = (key: string) => {
    setCurrentPermissions(prev => {
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
    setCurrentPermissions(prev => {
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

  const applyRoleDefaults = async () => {
    if (!selectedUser?.role || !selectedUserId || !selectedBranchId) return;
    
    try {
      const { error } = await supabase.rpc('grant_role_defaults', {
        _user_id: selectedUserId,
        _branch_id: selectedBranchId,
        _role: selectedUser.role,
      });
      
      if (error) throw error;
      
      await fetchUserPermissions(selectedUserId, selectedBranchId);
      toast.success('Permisos por defecto aplicados');
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  };

  const hasChanges = useMemo(() => {
    if (currentPermissions.size !== originalPermissions.size) return true;
    for (const perm of currentPermissions) {
      if (!originalPermissions.has(perm)) return true;
    }
    return false;
  }, [currentPermissions, originalPermissions]);

  const savePermissions = async () => {
    if (!selectedUserId || !selectedBranchId || !currentUser?.id) return;
    
    setSaving(true);
    try {
      // Calculate granted and revoked permissions for audit
      const granted: string[] = [];
      const revoked: string[] = [];
      
      currentPermissions.forEach(key => {
        if (!originalPermissions.has(key)) granted.push(key);
      });
      originalPermissions.forEach(key => {
        if (!currentPermissions.has(key)) revoked.push(key);
      });

      // Delete all existing permissions for this user/branch
      await supabase
        .from('user_branch_permissions')
        .delete()
        .eq('user_id', selectedUserId)
        .eq('branch_id', selectedBranchId);

      // Insert new permissions
      if (currentPermissions.size > 0) {
        const inserts = Array.from(currentPermissions).map(key => ({
          user_id: selectedUserId,
          branch_id: selectedBranchId,
          permission_key: key,
          granted_by: currentUser.id,
        }));

        const { error } = await supabase
          .from('user_branch_permissions')
          .insert(inserts);

        if (error) throw error;
      }

      // Log audit entries
      const auditLogs = [];
      
      if (granted.length > 0) {
        auditLogs.push({
          user_id: currentUser.id,
          branch_id: selectedBranchId,
          target_user_id: selectedUserId,
          action: granted.length > 1 ? 'bulk_grant' : 'grant',
          permission_keys: granted,
        });
      }
      
      if (revoked.length > 0) {
        auditLogs.push({
          user_id: currentUser.id,
          branch_id: selectedBranchId,
          target_user_id: selectedUserId,
          action: revoked.length > 1 ? 'bulk_revoke' : 'revoke',
          permission_keys: revoked,
        });
      }

      if (auditLogs.length > 0) {
        await supabase.from('permission_audit_logs').insert(auditLogs);
      }

      setOriginalPermissions(new Set(currentPermissions));
      toast.success('Permisos guardados correctamente');
    } catch (error: any) {
      toast.error('Error al guardar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getModulePermissionCount = (module: string) => {
    const modulePerms = permissionsByModule[module] || [];
    const granted = modulePerms.filter(p => currentPermissions.has(p.key)).length;
    return { granted, total: modulePerms.length };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Gestión de Permisos
          </h1>
          <p className="text-muted-foreground">Asigna permisos granulares a usuarios por sucursal</p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User & Branch Selection */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Seleccionar Usuario</CardTitle>
            <CardDescription>Elige un usuario y sucursal para gestionar sus permisos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* User Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuario..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* User List */}
            <ScrollArea className="h-[300px] border rounded-md">
              <div className="p-2 space-y-1">
                {loading ? (
                  <div className="space-y-2 p-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No se encontraron usuarios</p>
                ) : (
                  filteredUsers.map(user => (
                    <button
                      key={user.user_id}
                      onClick={() => setSelectedUserId(user.user_id)}
                      className={`w-full text-left p-3 rounded-md transition-colors ${
                        selectedUserId === user.user_id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{user.full_name}</p>
                          <p className={`text-xs ${selectedUserId === user.user_id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                            {user.email}
                          </p>
                        </div>
                        {user.role && (
                          <Badge variant="outline" className={`text-xs ${selectedUserId === user.user_id ? 'border-primary-foreground/30' : roleColors[user.role]}`}>
                            {roleLabels[user.role]}
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>

            <Separator />

            {/* Branch Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                Sucursal
              </Label>
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId} disabled={!selectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sucursal..." />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selected User Info */}
            {selectedUser && selectedBranchId && (
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{selectedUser.full_name}</span>
                </div>
                {selectedUser.role && (
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <Badge className={roleColors[selectedUser.role]}>
                      {roleLabels[selectedUser.role]}
                    </Badge>
                  </div>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={applyRoleDefaults}
                >
                  Aplicar permisos por defecto del rol
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Permissions Editor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Permisos
                </CardTitle>
                <CardDescription>
                  {currentPermissions.size} de {permissionDefinitions.length} permisos activos
                </CardDescription>
              </div>
              {hasChanges && (
                <Button onClick={savePermissions} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedUserId || !selectedBranchId ? (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecciona un usuario y una sucursal para ver los permisos</p>
              </div>
            ) : (
              <Accordion type="multiple" defaultValue={Object.keys(permissionsByModule)} className="space-y-2">
                {Object.entries(permissionsByModule).map(([module, permissions]) => {
                  const { granted, total } = getModulePermissionCount(module);
                  const allGranted = granted === total;
                  const someGranted = granted > 0 && granted < total;

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
                          <div className="flex items-center gap-2 mr-4">
                            <Checkbox
                              checked={allGranted}
                              ref={(el) => {
                                if (el && someGranted) {
                                  (el as HTMLButtonElement).dataset.state = 'indeterminate';
                                }
                              }}
                              onCheckedChange={(checked) => {
                                toggleModuleAll(module, !!checked);
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="text-xs text-muted-foreground">Todo</span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-4">
                          {permissions.map(perm => (
                            <label
                              key={perm.key}
                              className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                                currentPermissions.has(perm.key)
                                  ? 'bg-primary/5 border-primary/30'
                                  : 'hover:bg-muted'
                              }`}
                            >
                              <Checkbox
                                checked={currentPermissions.has(perm.key)}
                                onCheckedChange={() => togglePermission(perm.key)}
                                className="mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm">{perm.name}</p>
                                  <Badge variant="outline" className={`text-[10px] ${roleColors[perm.min_role]}`}>
                                    {roleLabels[perm.min_role]}+
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {perm.description}
                                </p>
                                <code className="text-[10px] text-muted-foreground/70 font-mono">
                                  {perm.key}
                                </code>
                              </div>
                              {currentPermissions.has(perm.key) && (
                                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                              )}
                            </label>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
