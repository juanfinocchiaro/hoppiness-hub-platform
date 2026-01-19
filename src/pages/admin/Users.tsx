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
import { Search, User, Shield, Settings, Store, RefreshCw, ArrowUpDown, Filter, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format, isWithinInterval, parse, setHours, setMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Tables, Enums } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;
type AppRole = Enums<'app_role'>;
type Branch = Tables<'branches'>;

interface UserWithRole extends Profile {
  role: AppRole | null;
  allRoles: AppRole[];
  branchPermissions?: {
    branch_id: string;
    branch_name: string;
    can_manage_inventory: boolean;
    can_manage_staff: boolean;
    can_view_reports: boolean;
    can_manage_orders: boolean;
    can_manage_products: boolean;
  }[];
  lastLogin?: string | null;
}

const roleLabels: Record<AppRole, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  empleado: 'Empleado',
  franquiciado: 'Franquiciado',
};

const roleColors: Record<AppRole, string> = {
  admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  gerente: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  empleado: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  franquiciado: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

const ROLES_HIERARCHY: AppRole[] = ['admin', 'franquiciado', 'gerente', 'empleado'];

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
  const [selectedBranches, setSelectedBranches] = useState<Record<string, {
    selected: boolean;
    can_manage_inventory: boolean;
    can_manage_staff: boolean;
    can_view_reports: boolean;
    can_manage_orders: boolean;
    can_manage_products: boolean;
  }>>({});
  const [saving, setSaving] = useState(false);

  const canManageUsers = isAdmin || isGerente || isFranquiciado;

  // Determina si un usuario está "trabajando" según el horario de sus sucursales
  const isUserWorking = (user: UserWithRole): boolean => {
    if (!user.branchPermissions || user.branchPermissions.length === 0) return false;
    
    const now = new Date();
    const currentTime = format(now, 'HH:mm');
    
    // Buscar si alguna de sus sucursales está en horario de trabajo
    return user.branchPermissions.some(perm => {
      const branch = branches.find(b => b.id === perm.branch_id);
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

        // Fetch all permissions at once
        const { data: allPermissions } = await supabase
          .from('branch_permissions')
          .select(`
            user_id,
            branch_id,
            can_manage_inventory,
            can_manage_staff,
            can_view_reports,
            can_manage_orders,
            can_manage_products
          `);

        const usersWithRoles: UserWithRole[] = profiles.map((profile) => {
          const userRoles = allRoles?.filter(r => r.user_id === profile.user_id).map(r => r.role) || [];
          const userPerms = allPermissions?.filter(p => p.user_id === profile.user_id) || [];
          
          const branchPermissions = userPerms.map(p => {
            const branch = branchesData?.find(b => b.id === p.branch_id);
            return {
              ...p,
              branch_name: branch?.name || 'Sucursal desconocida',
            };
          });

          return {
            ...profile,
            role: getHighestRole(userRoles),
            allRoles: userRoles,
            branchPermissions,
            lastLogin: profile.updated_at, // Using updated_at as proxy for last activity
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
    
    // Initialize branch permissions
    const branchPerms: typeof selectedBranches = {};
    
    // If admin, show all branches; otherwise show accessible branches
    const availableBranches = isAdmin ? branches : accessibleBranches;
    
    availableBranches.forEach(branch => {
      const existingPerm = user.branchPermissions?.find(p => p.branch_id === branch.id);
      branchPerms[branch.id] = {
        selected: !!existingPerm,
        can_manage_inventory: existingPerm?.can_manage_inventory || false,
        can_manage_staff: existingPerm?.can_manage_staff || false,
        can_view_reports: existingPerm?.can_view_reports || false,
        can_manage_orders: existingPerm?.can_manage_orders || false,
        can_manage_products: existingPerm?.can_manage_products || false,
      };
    });
    
    setSelectedBranches(branchPerms);
  };

  const saveUserPermissions = async () => {
    if (!editingUser) return;
    
    setSaving(true);
    try {
      // Update role if admin
      if (isAdmin && selectedRole) {
        // Delete existing roles
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', editingUser.user_id);
        
        // Insert new role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: editingUser.user_id,
            role: selectedRole as AppRole,
          });
        
        if (roleError) throw roleError;
      }

      // Update branch permissions
      const availableBranches = isAdmin ? branches : accessibleBranches;
      
      for (const branch of availableBranches) {
        const perm = selectedBranches[branch.id];
        
        if (perm?.selected) {
          // Upsert permission
          const { error } = await supabase
            .from('branch_permissions')
            .upsert({
              user_id: editingUser.user_id,
              branch_id: branch.id,
              can_manage_inventory: perm.can_manage_inventory,
              can_manage_staff: perm.can_manage_staff,
              can_view_reports: perm.can_view_reports,
              can_manage_orders: perm.can_manage_orders,
              can_manage_products: perm.can_manage_products,
            }, {
              onConflict: 'user_id,branch_id',
            });
          
          if (error) throw error;
        } else {
          // Remove permission if unchecked
          await supabase
            .from('branch_permissions')
            .delete()
            .eq('user_id', editingUser.user_id)
            .eq('branch_id', branch.id);
        }
      }

      toast.success('Permisos actualizados correctamente');
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
    if (isFranquiciado) return ['gerente', 'empleado'];
    if (isGerente) return ['empleado'];
    return [];
  };

  // Filtered and sorted users
  const filteredAndSortedUsers = useMemo(() => {
    let result = users.filter(user => {
      // Text search
      const matchesSearch = 
        user.full_name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase());
      
      // Branch filter
      const matchesBranch = filterBranch === 'all' || 
        user.branchPermissions?.some(bp => bp.branch_id === filterBranch);
      
      // Role filter
      const matchesRole = filterRole === 'all' || user.role === filterRole;
      
      return matchesSearch && matchesBranch && matchesRole;
    });

    // Sort
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
          const aBranch = a.branchPermissions?.[0]?.branch_name || 'zzz';
          const bBranch = b.branchPermissions?.[0]?.branch_name || 'zzz';
          comparison = aBranch.localeCompare(bBranch);
          break;
        case 'lastLogin':
          const aDate = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
          const bDate = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
          comparison = bDate - aDate; // More recent first
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

  const availableBranchesForEdit = isAdmin ? branches : accessibleBranches;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">Administra usuarios, roles y permisos</p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
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
              {/* Filter by Branch */}
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
              
              {/* Filter by Role */}
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
              
              {/* Sort Dropdown */}
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
                  <TableHead>Trabajando</TableHead>
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
                            {/* Working indicator */}
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
                        {user.role ? (
                          <Badge className={roleColors[user.role]}>
                            <Shield className="w-3 h-3 mr-1" />
                            {roleLabels[user.role]}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Sin rol</Badge>
                        )}
                        {user.allRoles.length > 1 && (
                          <span className="text-xs text-muted-foreground ml-1">
                            +{user.allRoles.length - 1}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.branchPermissions && user.branchPermissions.length > 0 ? (
                            user.branchPermissions.slice(0, 2).map((bp) => (
                              <Badge key={bp.branch_id} variant="secondary" className="text-xs">
                                <Store className="w-3 h-3 mr-1" />
                                {bp.branch_name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">Sin sucursales</span>
                          )}
                          {user.branchPermissions && user.branchPermissions.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{user.branchPermissions.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.branchPermissions && user.branchPermissions.length > 0 ? (
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(user)}
                          >
                            <Settings className="w-4 h-4 mr-1" />
                            Permisos
                          </Button>
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

      {/* Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Permisos</DialogTitle>
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
                {editingUser?.allRoles && editingUser.allRoles.length > 1 && (
                  <p className="text-xs text-muted-foreground">
                    Nota: Este usuario tiene múltiples roles ({editingUser.allRoles.map(r => roleLabels[r]).join(', ')}). 
                    Al guardar, se reemplazarán por el rol seleccionado.
                  </p>
                )}
              </div>
            )}

            {/* Branch Permissions */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Acceso a Sucursales</Label>
              
              {availableBranchesForEdit.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay sucursales disponibles</p>
              ) : (
                <div className="space-y-4">
                  {availableBranchesForEdit.map((branch) => (
                    <Card key={branch.id} className="p-4">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`branch-${branch.id}`}
                            checked={selectedBranches[branch.id]?.selected || false}
                            onCheckedChange={(checked) => {
                              setSelectedBranches(prev => ({
                                ...prev,
                                [branch.id]: {
                                  ...prev[branch.id],
                                  selected: !!checked,
                                },
                              }));
                            }}
                          />
                          <Label htmlFor={`branch-${branch.id}`} className="font-medium">
                            <Store className="w-4 h-4 inline mr-2" />
                            {branch.name}
                          </Label>
                          <Badge variant="outline" className="ml-auto">{branch.city}</Badge>
                        </div>

                        {selectedBranches[branch.id]?.selected && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pl-7">
                            {[
                              { key: 'can_manage_orders', label: 'Gestionar Pedidos' },
                              { key: 'can_manage_products', label: 'Gestionar Productos' },
                              { key: 'can_manage_inventory', label: 'Gestionar Inventario' },
                              { key: 'can_manage_staff', label: 'Gestionar Personal' },
                              { key: 'can_view_reports', label: 'Ver Reportes' },
                            ].map(({ key, label }) => (
                              <div key={key} className="flex items-center gap-2">
                                <Checkbox
                                  id={`${branch.id}-${key}`}
                                  checked={selectedBranches[branch.id]?.[key as keyof typeof selectedBranches[string]] || false}
                                  onCheckedChange={(checked) => {
                                    setSelectedBranches(prev => ({
                                      ...prev,
                                      [branch.id]: {
                                        ...prev[branch.id],
                                        [key]: !!checked,
                                      },
                                    }));
                                  }}
                                />
                                <Label htmlFor={`${branch.id}-${key}`} className="text-sm">
                                  {label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancelar
            </Button>
            <Button onClick={saveUserPermissions} disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
