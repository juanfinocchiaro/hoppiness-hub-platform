import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Search, User, Shield, Settings, Store, RefreshCw, ArrowUpDown, Clock, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import type { Tables, Enums } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;
type AppRole = Enums<'app_role'>;
type Branch = Tables<'branches'>;

interface UserWithRole extends Profile {
  role: AppRole | null;
  allRoles: AppRole[];
  branchAccess?: {
    branch_id: string;
    branch_name: string;
    permissionCount: number;
  }[];
  lastLogin?: string | null;
  overrideCount?: number;
}

const roleLabels: Record<AppRole, string> = {
  admin: 'Superadmin',
  coordinador: 'Coordinador Digital',
  socio: 'Brandpartner',
  franquiciado: 'Franquiciado',
  encargado: 'Encargado',
  cajero: 'Cajero',
  kds: 'KDS',
  // Legacy (no usar)
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
  // Legacy
  gerente: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  empleado: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

const ROLES_HIERARCHY: AppRole[] = ['admin', 'coordinador', 'socio', 'franquiciado', 'encargado', 'cajero', 'kds'];

type SortField = 'name' | 'role' | 'branch' | 'lastLogin';
type SortDirection = 'asc' | 'desc';

export default function Users() {
  const { user: currentUser } = useAuth();
  const { isAdmin, isGerente, isFranquiciado, accessibleBranches } = useUserRole();
  
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Filters and sorting
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Dialog states
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole | ''>('');
  const [saving, setSaving] = useState(false);

  const canManageUsers = isAdmin || isGerente || isFranquiciado;

  // Determina si un usuario está "trabajando" según el horario de sus sucursales
  const isUserWorking = (user: UserWithRole): boolean => {
    if (!user.branchAccess || user.branchAccess.length === 0) return false;
    
    const now = new Date();
    const currentTime = format(now, 'HH:mm');
    
    return user.branchAccess.some(access => {
      const branch = branches.find(b => b.id === access.branch_id);
      if (!branch || !branch.opening_time || !branch.closing_time) return false;
      if (!branch.is_active || !branch.is_open) return false;
      
      const opening = branch.opening_time.slice(0, 5);
      const closing = branch.closing_time.slice(0, 5);
      
      return currentTime >= opening && currentTime <= closing;
    });
  };

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
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (profilesError) throw profilesError;

      // Fetch all branches
      const { data: branchesData } = await supabase
        .from('branches')
        .select('*')
        .order('name');

      setBranches(branchesData || []);

      if (profiles) {
        // Fetch all roles at once
        const { data: allRoles } = await supabase
          .from('user_roles')
          .select('user_id, role');

        // Fetch granular permissions (user_branch_permissions) with override_type
        const { data: allGranularPerms } = await supabase
          .from('user_branch_permissions')
          .select('user_id, branch_id, permission_key, override_type');

        // Fetch role default permissions for override calculation
        const { data: roleDefaults } = await supabase
          .from('role_default_permissions')
          .select('role, permission_key');

        const roleDefaultsMap = new Map<string, Set<string>>();
        roleDefaults?.forEach(rd => {
          if (!roleDefaultsMap.has(rd.role)) {
            roleDefaultsMap.set(rd.role, new Set());
          }
          roleDefaultsMap.get(rd.role)!.add(rd.permission_key);
        });

        const usersWithRoles: UserWithRole[] = profiles.map((profile) => {
          const userRoles = allRoles?.filter(r => r.user_id === profile.user_id).map(r => r.role) || [];
          const highestRole = getHighestRole(userRoles);
          
          // Aggregate granular permissions by branch
          const userPerms = allGranularPerms?.filter(p => p.user_id === profile.user_id) || [];
          const branchPermMap = new Map<string, number>();
          userPerms.forEach(p => {
            branchPermMap.set(p.branch_id, (branchPermMap.get(p.branch_id) || 0) + 1);
          });
          
          const branchAccess = Array.from(branchPermMap.entries()).map(([branch_id, count]) => {
            const branch = branchesData?.find(b => b.id === branch_id);
            return {
              branch_id,
              branch_name: branch?.name || 'Sucursal desconocida',
              permissionCount: count,
            };
          });

          // Calculate override count (permissions different from role defaults)
          let overrideCount = 0;
          if (highestRole) {
            const roleDefaultPerms = roleDefaultsMap.get(highestRole) || new Set();
            userPerms.forEach(p => {
              // Override grant: permission not in role defaults
              if (p.override_type === 'grant' && !roleDefaultPerms.has(p.permission_key)) {
                overrideCount++;
              }
              // Override revoke: permission revoked from role defaults
              if (p.override_type === 'revoke' && roleDefaultPerms.has(p.permission_key)) {
                overrideCount++;
              }
            });
          } else {
            // No role means all permissions are overrides
            overrideCount = userPerms.length;
          }

          return {
            ...profile,
            role: highestRole,
            allRoles: userRoles,
            branchAccess,
            lastLogin: profile.updated_at,
            overrideCount,
          };
        });

        setUsers(usersWithRoles);
      }
    } catch (error: any) {
      toast.error('Error al cargar usuarios: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openEditDialog = (user: UserWithRole) => {
    setEditingUser(user);
    setSelectedRole(user.role || '');
  };

  const saveUserRole = async () => {
    if (!editingUser) return;
    
    setSaving(true);
    try {
      // Update role if admin
      if (isAdmin && selectedRole) {
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', editingUser.user_id);
        
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: editingUser.user_id,
            role: selectedRole as AppRole,
          });
        
        if (roleError) throw roleError;
      }

      toast.success('Rol actualizado. Para gestionar permisos granulares, usa el panel de Permisos.');
      setEditingUser(null);
      fetchData();
    } catch (error: any) {
      toast.error('Error al guardar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getAvailableRoles = (): AppRole[] => {
    if (isAdmin) return ROLES_HIERARCHY;
    if (isFranquiciado) return ['encargado', 'cajero', 'kds'];
    if (isGerente) return ['cajero', 'kds'];
    return [];
  };

  // Filtered and sorted users
  const filteredAndSortedUsers = useMemo(() => {
    let result = users.filter(user => {
      const matchesSearch = 
        user.full_name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase());
      
      const matchesBranch = filterBranch === 'all' || 
        user.branchAccess?.some(ba => ba.branch_id === filterBranch);
      
      const matchesRole = filterRole === 'all' || user.role === filterRole;
      
      return matchesSearch && matchesBranch && matchesRole;
    });

    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.full_name.localeCompare(b.full_name);
          break;
        case 'role':
          const aRoleIndex = a.role ? ROLES_HIERARCHY.indexOf(a.role) : 999;
          const bRoleIndex = b.role ? ROLES_HIERARCHY.indexOf(b.role) : 999;
          comparison = aRoleIndex - bRoleIndex;
          break;
        case 'branch':
          const aBranch = a.branchAccess?.[0]?.branch_name || 'zzz';
          const bBranch = b.branchAccess?.[0]?.branch_name || 'zzz';
          comparison = aBranch.localeCompare(bBranch);
          break;
        case 'lastLogin':
          const aDate = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
          const bDate = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
          comparison = bDate - aDate;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [users, search, filterBranch, filterRole, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Equipo</h1>
          <p className="text-muted-foreground">Identidad, roles y estado de los miembros del equipo</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/accesos">
            <Button variant="outline">
              <Shield className="h-4 w-4 mr-2" />
              Ver Accesos
            </Button>
          </Link>
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuarios..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Select value={filterBranch} onValueChange={setFilterBranch}>
                <SelectTrigger className="w-[180px]">
                  <Store className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Sucursal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las sucursales</SelectItem>
                  {branches.filter(b => b.is_active).map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-[160px]">
                  <Shield className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  {ROLES_HIERARCHY.map(role => (
                    <SelectItem key={role} value={role}>{roleLabels[role]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <ArrowUpDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => toggleSort('name')}>
                    Nombre {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleSort('role')}>
                    Rol {sortField === 'role' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleSort('branch')}>
                    Sucursal {sortField === 'branch' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleSort('lastLogin')}>
                    Último ingreso {sortField === 'lastLogin' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {filteredAndSortedUsers.length} usuario{filteredAndSortedUsers.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : filteredAndSortedUsers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No se encontraron usuarios</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('name')}>
                    Usuario {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('role')}>
                    Rol {sortField === 'role' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('branch')}>
                    Sucursales {sortField === 'branch' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('lastLogin')}>
                    Último ingreso {sortField === 'lastLogin' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  {canManageUsers && <TableHead>Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedUsers.map((user) => {
                  const working = isUserWorking(user);
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                              {user.avatar_url ? (
                                <img
                                  src={user.avatar_url}
                                  alt={user.full_name}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <User className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
                              working ? 'bg-green-500' : 'bg-gray-400'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium">{user.full_name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.role ? (
                            <Badge className={roleColors[user.role]}>
                              <Shield className="w-3 h-3 mr-1" />
                              {roleLabels[user.role]}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Cliente</Badge>
                          )}
                          {user.overrideCount && user.overrideCount > 0 ? (
                            <Badge variant="outline" className="text-xs border-amber-500 text-amber-600 dark:text-amber-400">
                              ⚠️ Custom ({user.overrideCount})
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.branchAccess && user.branchAccess.length > 0 ? (
                            <>
                              {user.branchAccess.slice(0, 2).map((ba) => (
                                <Badge key={ba.branch_id} variant="secondary" className="text-xs">
                                  <Store className="w-3 h-3 mr-1" />
                                  {ba.branch_name}
                                  <span className="ml-1 opacity-60">({ba.permissionCount})</span>
                                </Badge>
                              ))}
                              {user.branchAccess.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{user.branchAccess.length - 2}
                                </Badge>
                              )}
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground">Sin sucursales</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.branchAccess && user.branchAccess.length > 0 ? (
                          working ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              En horario
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <XCircle className="w-3 h-3 mr-1" />
                              Fuera de horario
                            </Badge>
                          )
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.lastLogin ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {format(new Date(user.lastLogin), "dd MMM yyyy, HH:mm", { locale: es })}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      {canManageUsers && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(user)}
                            >
                              <Settings className="w-4 h-4 mr-1" />
                              Editar
                            </Button>
                            {isAdmin && user.branchAccess && user.branchAccess.length > 0 && (
                              <Link to={`/admin/accesos?user=${user.user_id}`}>
                                <Button variant="ghost" size="sm" title="Ver accesos">
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              </Link>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog - Role only, permisos en otro lugar */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              {editingUser?.full_name} ({editingUser?.email})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Role Selection - Only for admins */}
            {isAdmin && (
              <div className="space-y-2">
                <Label>Rol del usuario</Label>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableRoles().map((role) => (
                      <SelectItem key={role} value={role}>
                        {roleLabels[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  El rol define las capacidades base del usuario en la plataforma.
                </p>
              </div>
            )}

            {/* Summary of current branch access */}
            <div className="space-y-2">
              <Label>Acceso a sucursales</Label>
              {editingUser?.branchAccess && editingUser.branchAccess.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {editingUser.branchAccess.map((ba) => (
                    <Badge key={ba.branch_id} variant="secondary" className="text-xs">
                      <Store className="w-3 h-3 mr-1" />
                      {ba.branch_name}
                      <span className="ml-1 opacity-60">({ba.permissionCount})</span>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin acceso a sucursales</p>
              )}
              <p className="text-xs text-muted-foreground">
                Para modificar permisos y acceso a sucursales, usa el panel de Permisos.
              </p>
            </div>

            {/* Link to permissions */}
            <Link to={`/admin/accesos?user=${editingUser?.user_id}`} onClick={() => setEditingUser(null)}>
              <Button variant="outline" className="w-full">
                <Shield className="w-4 h-4 mr-2" />
                Personalizar Accesos
                <ExternalLink className="w-4 h-4 ml-auto" />
              </Button>
            </Link>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancelar
            </Button>
            <Button onClick={saveUserRole} disabled={saving || !isAdmin}>
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Rol'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
