import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissionsV2 } from '@/hooks/usePermissionsV2';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Shield, Store, RefreshCw, Save, User, ArrowLeft,
  ShoppingCart, Utensils, DollarSign, Truck, Package, Users, 
  Settings, BarChart3, RotateCcw, Info, Search, AlertTriangle
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
  min_role: string;
  scope: 'local' | 'brand';
}

// 3 estados: heredado (null), override ON (grant), override OFF (revoke)
type OverrideState = 'inherited' | 'grant' | 'revoke';

interface PermissionWithState {
  definition: PermissionDefinition;
  inheritedValue: boolean; // from role template
  overrideState: OverrideState;
  effectiveValue: boolean;
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

// Solo permisos locales se muestran en overrides por sucursal
// Los permisos brand NO tienen overrides por sucursal
const moduleOrder = ['pos', 'orders', 'kds', 'cash', 'inventory', 'finance', 'hr', 'suppliers', 'config', 'reports'];

export default function UserBranchOverrides() {
  const { user: currentUser } = useAuth();
  const { isSuperadmin } = usePermissionsV2();
  const [searchParams] = useSearchParams();
  
  const preselectedUserId = searchParams.get('user');
  
  const [users, setUsers] = useState<(Profile & { role: AppRole | null })[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [permissionDefinitions, setPermissionDefinitions] = useState<PermissionDefinition[]>([]);
  const [roleDefaults, setRoleDefaults] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Selection
  const [selectedUserId, setSelectedUserId] = useState<string>(preselectedUserId || '');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [permissionSearch, setPermissionSearch] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showOnlyOverrides, setShowOnlyOverrides] = useState(true);
  const [showKeys, setShowKeys] = useState(false);
  
  // Working state: Map<permission_key, OverrideState>
  const [overrides, setOverrides] = useState<Map<string, OverrideState>>(new Map());
  const [originalOverrides, setOriginalOverrides] = useState<Map<string, OverrideState>>(new Map());

  const selectedUser = users.find(u => u.user_id === selectedUserId);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: definitions }, { data: defaults }, { data: profiles }, { data: branchesData }, { data: allRoles }] = await Promise.all([
        supabase.from('permission_definitions').select('*').eq('scope', 'local').order('module, key'),
        supabase.from('role_default_permissions').select('role, permission_key'),
        supabase.from('profiles').select('*').eq('is_active', true).order('full_name'),
        supabase.from('branches').select('*').eq('is_active', true).order('name'),
        supabase.from('user_roles').select('user_id, role'),
      ]);
      
      // Solo permisos scope='local' (ya filtrado en query)
      setPermissionDefinitions((definitions || []) as PermissionDefinition[]);
      
      // Build role defaults map
      const defaultsMap = new Map<string, Set<string>>();
      (defaults || []).forEach(rd => {
        if (!defaultsMap.has(rd.role)) {
          defaultsMap.set(rd.role, new Set());
        }
        defaultsMap.get(rd.role)!.add(rd.permission_key);
      });
      setRoleDefaults(defaultsMap);
      
      setBranches(branchesData || []);
      
      // Attach role to profiles
      const usersWithRoles = (profiles || []).map(p => {
        const userRoles = (allRoles || []).filter(r => r.user_id === p.user_id).map(r => r.role);
        const role = userRoles.includes('admin') ? 'admin' as AppRole 
          : userRoles.includes('franquiciado') ? 'franquiciado' as AppRole
          : userRoles.includes('encargado') ? 'encargado' as AppRole
          : userRoles.includes('cajero') ? 'cajero' as AppRole
          : userRoles.includes('kds') ? 'kds' as AppRole
          : userRoles[0] as AppRole || null;
        return { ...p, role };
      });
      setUsers(usersWithRoles);
    } catch (error: any) {
      toast.error('Error al cargar datos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserOverrides = async (userId: string, branchId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_branch_permissions')
        .select('permission_key, override_type')
        .eq('user_id', userId)
        .eq('branch_id', branchId);

      if (error) throw error;

      const overridesMap = new Map<string, OverrideState>();
      (data || []).forEach(row => {
        overridesMap.set(row.permission_key, (row.override_type || 'grant') as OverrideState);
      });
      
      setOverrides(overridesMap);
      setOriginalOverrides(new Map(overridesMap));
    } catch (error: any) {
      toast.error('Error al cargar overrides: ' + error.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedUserId && selectedBranchId) {
      fetchUserOverrides(selectedUserId, selectedBranchId);
    } else {
      setOverrides(new Map());
      setOriginalOverrides(new Map());
    }
  }, [selectedUserId, selectedBranchId]);

  // Calculate permissions with state
  const permissionsWithState: PermissionWithState[] = useMemo(() => {
    if (!selectedUser?.role) return [];
    
    const rolePerms = roleDefaults.get(selectedUser.role) || new Set();
    
    return permissionDefinitions.map(def => {
      const inheritedValue = rolePerms.has(def.key);
      const overrideState = overrides.get(def.key) || 'inherited';
      
      let effectiveValue = inheritedValue;
      if (overrideState === 'grant') effectiveValue = true;
      if (overrideState === 'revoke') effectiveValue = false;
      
      return {
        definition: def,
        inheritedValue,
        overrideState,
        effectiveValue,
      };
    });
  }, [selectedUser, permissionDefinitions, roleDefaults, overrides]);

  // Filter and group
  const filteredPermissions = useMemo(() => {
    let filtered = permissionsWithState;
    
    // Search filter
    if (permissionSearch) {
      const searchLower = permissionSearch.toLowerCase();
      filtered = filtered.filter(p => 
        p.definition.name.toLowerCase().includes(searchLower) ||
        p.definition.key.toLowerCase().includes(searchLower) ||
        (p.definition.description?.toLowerCase().includes(searchLower))
      );
    }
    
    // Only overrides filter (default ON)
    if (showOnlyOverrides && !showAdvanced) {
      filtered = filtered.filter(p => p.overrideState !== 'inherited');
    }
    
    return filtered;
  }, [permissionsWithState, permissionSearch, showOnlyOverrides, showAdvanced]);

  // Group by module
  const permissionsByModule = useMemo(() => {
    const grouped: Record<string, PermissionWithState[]> = {};
    
    filteredPermissions.forEach(perm => {
      const mod = perm.definition.module;
      if (!grouped[mod]) grouped[mod] = [];
      grouped[mod].push(perm);
    });
    
    const sorted: Record<string, PermissionWithState[]> = {};
    moduleOrder.forEach(mod => {
      if (grouped[mod]) sorted[mod] = grouped[mod];
    });
    Object.keys(grouped).forEach(mod => {
      if (!sorted[mod]) sorted[mod] = grouped[mod];
    });
    
    return sorted;
  }, [filteredPermissions]);

  const overrideCount = useMemo(() => {
    return Array.from(overrides.values()).filter(v => v !== 'inherited').length;
  }, [overrides]);

  const hasChanges = useMemo(() => {
    if (overrides.size !== originalOverrides.size) return true;
    for (const [key, val] of overrides) {
      if (originalOverrides.get(key) !== val) return true;
    }
    for (const [key, val] of originalOverrides) {
      if (overrides.get(key) !== val) return true;
    }
    return false;
  }, [overrides, originalOverrides]);

  const cycleOverrideState = (key: string, currentState: OverrideState, inheritedValue: boolean) => {
    // Cycle: inherited -> grant -> revoke -> inherited
    let nextState: OverrideState;
    
    if (currentState === 'inherited') {
      nextState = inheritedValue ? 'revoke' : 'grant';
    } else if (currentState === 'grant') {
      nextState = 'revoke';
    } else {
      nextState = 'inherited';
    }
    
    setOverrides(prev => {
      const next = new Map(prev);
      if (nextState === 'inherited') {
        next.delete(key);
      } else {
        next.set(key, nextState);
      }
      return next;
    });
  };

  const resetToTemplate = () => {
    setOverrides(new Map());
  };

  const saveOverrides = async () => {
    if (!selectedUserId || !selectedBranchId || !currentUser?.id) return;
    
    setSaving(true);
    try {
      // Delete all existing for this user/branch
      await supabase
        .from('user_branch_permissions')
        .delete()
        .eq('user_id', selectedUserId)
        .eq('branch_id', selectedBranchId);

      // Insert overrides
      const inserts = Array.from(overrides.entries())
        .filter(([_, state]) => state !== 'inherited')
        .map(([key, state]) => ({
          user_id: selectedUserId,
          branch_id: selectedBranchId,
          permission_key: key,
          override_type: state,
          granted_by: currentUser.id,
        }));

      if (inserts.length > 0) {
        const { error } = await supabase
          .from('user_branch_permissions')
          .insert(inserts);

        if (error) throw error;
      }

      setOriginalOverrides(new Map(overrides));
      toast.success('Overrides guardados');
    } catch (error: any) {
      toast.error('Error al guardar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getStateLabel = (state: OverrideState, inherited: boolean) => {
    if (state === 'inherited') return inherited ? 'Heredado ✓' : 'Heredado ✗';
    if (state === 'grant') return 'Override ON';
    return 'Override OFF';
  };

  const getStateBadgeVariant = (state: OverrideState, inherited: boolean) => {
    if (state === 'inherited') return inherited ? 'secondary' : 'outline';
    if (state === 'grant') return 'default';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link to="/admin/equipo">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Volver a Equipo
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Overrides por Sucursal
          </h1>
          <p className="text-muted-foreground">Excepciones a la plantilla (solo permisos locales)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          {hasChanges && (
            <Button onClick={saveOverrides} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Selection Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Selección</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* User */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Usuario
              </Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      <div className="flex items-center gap-2">
                        <span>{user.full_name}</span>
                        {user.role && (
                          <Badge variant="outline" className="text-xs">
                            {roleLabels[user.role]}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Branch */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                Sucursal
              </Label>
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId} disabled={!selectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
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

            <Separator />

            {/* Info Panel */}
            {selectedUser && selectedBranchId && (
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{selectedUser.full_name}</span>
                </div>
                {selectedUser.role && (
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="secondary">{roleLabels[selectedUser.role]}</Badge>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm text-muted-foreground">
                    {overrideCount} override{overrideCount !== 1 ? 's' : ''} activo{overrideCount !== 1 ? 's' : ''}
                  </span>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={resetToTemplate}
                  disabled={overrideCount === 0}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Resetear a plantilla
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Permissions Panel */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">Overrides</CardTitle>
                <CardDescription>
                  {showOnlyOverrides && !showAdvanced 
                    ? 'Mostrando solo permisos con overrides' 
                    : 'Mostrando todos los permisos'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-4">
                {isSuperadmin && (
                  <div className="flex items-center gap-2">
                    <Switch 
                      id="advanced" 
                      checked={showAdvanced} 
                      onCheckedChange={(v) => {
                        setShowAdvanced(v);
                        if (v) setShowOnlyOverrides(false);
                      }} 
                    />
                    <Label htmlFor="advanced" className="text-sm">Modo avanzado</Label>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Switch 
                    id="show-keys" 
                    checked={showKeys} 
                    onCheckedChange={setShowKeys} 
                  />
                  <Label htmlFor="show-keys" className="text-sm">Keys</Label>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!selectedUserId || !selectedBranchId ? (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecciona un usuario y una sucursal</p>
              </div>
            ) : filteredPermissions.length === 0 && showOnlyOverrides ? (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay overrides configurados</p>
                <p className="text-sm mt-1">Este usuario hereda todos los permisos de su plantilla.</p>
                {isSuperadmin && (
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowAdvanced(true)}>
                    Ver todos los permisos
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
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

                <ScrollArea className="h-[450px]">
                  <Accordion type="multiple" defaultValue={moduleOrder} className="space-y-2">
                    {Object.entries(permissionsByModule).map(([module, permissions]) => (
                      <AccordionItem key={module} value={module} className="border rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline py-3">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="p-2 rounded-md bg-muted">
                              {moduleIcons[module] || <Package className="h-4 w-4" />}
                            </div>
                            <div className="text-left">
                              <p className="font-medium">{moduleLabels[module] || module}</p>
                              <p className="text-xs text-muted-foreground">
                                {permissions.length} permiso{permissions.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pb-4">
                            {permissions.map(perm => (
                              <div
                                key={perm.definition.key}
                                className={`flex items-center justify-between p-3 rounded-md border transition-colors ${
                                  perm.overrideState !== 'inherited'
                                    ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
                                    : 'hover:bg-muted'
                                }`}
                              >
                                <div className="flex-1 min-w-0 mr-4">
                                  <p className="font-medium text-sm">{perm.definition.name}</p>
                                  {perm.definition.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {perm.definition.description}
                                    </p>
                                  )}
                                  {showKeys && (
                                    <code className="text-[10px] text-muted-foreground/70 font-mono">
                                      {perm.definition.key}
                                    </code>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => cycleOverrideState(
                                          perm.definition.key, 
                                          perm.overrideState, 
                                          perm.inheritedValue
                                        )}
                                        className="h-8"
                                      >
                                        <Badge variant={getStateBadgeVariant(perm.overrideState, perm.inheritedValue)}>
                                          {getStateLabel(perm.overrideState, perm.inheritedValue)}
                                        </Badge>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Click para cambiar estado</p>
                                      <p className="text-xs text-muted-foreground">
                                        Valor de plantilla: {perm.inheritedValue ? 'Permitido' : 'Denegado'}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
