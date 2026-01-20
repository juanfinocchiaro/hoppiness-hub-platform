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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Search, User, Shield, Store, RefreshCw, Building2, Landmark, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import type { Tables, Enums } from '@/integrations/supabase/types';
import { UserCard } from '@/components/admin/UserCard';

type Profile = Tables<'profiles'>;
type AppRole = Enums<'app_role'>;
type Branch = Tables<'branches'>;

interface PanelAccess {
  can_use_local_panel: boolean;
  can_use_brand_panel: boolean;
  brand_access: boolean;
}

interface UserWithRole extends Profile {
  role: AppRole | null;
  allRoles: AppRole[];
  panelAccess?: PanelAccess;
  allowedBranches?: { id: string; name: string }[];
  overrideCount?: number;
  lastLogin?: string | null;
  isActive?: boolean;
}

const roleLabels: Record<AppRole, string> = {
  admin: 'Superadmin',
  coordinador: 'Coordinador',
  socio: 'Brandpartner',
  franquiciado: 'Franquiciado',
  encargado: 'Encargado',
  cajero: 'Cajero',
  kds: 'KDS',
  gerente: 'Encargado',
  empleado: 'Cajero',
};

const roleColors: Record<AppRole, string> = {
  admin: 'bg-destructive/20 text-destructive',
  coordinador: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
  socio: 'bg-muted text-muted-foreground',
  franquiciado: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
  encargado: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  cajero: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  kds: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200',
  gerente: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  empleado: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
};

const ROLES_HIERARCHY: AppRole[] = ['admin', 'coordinador', 'socio', 'franquiciado', 'encargado', 'cajero', 'kds'];

export default function Users() {
  const { user: currentUser } = useAuth();
  const { isAdmin, isGerente, isFranquiciado } = useUserRole();
  
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [filterPanel, setFilterPanel] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // User Card state
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);

  const canManageUsers = isAdmin || isGerente || isFranquiciado;

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
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (profilesError) throw profilesError;

      const { data: branchesData } = await supabase
        .from('branches')
        .select('*')
        .order('name');

      setBranches(branchesData || []);

      if (profiles) {
        const { data: allRoles } = await supabase
          .from('user_roles')
          .select('user_id, role');

        const { data: allGranularPerms } = await supabase
          .from('user_branch_permissions')
          .select('user_id, branch_id, permission_key, override_type');

        const { data: roleDefaults } = await supabase
          .from('role_default_permissions')
          .select('role, permission_key');

        const { data: allPanelAccess } = await supabase
          .from('user_panel_access')
          .select('user_id, can_use_local_panel, can_use_brand_panel, brand_access');

        const { data: allBranchAccess } = await supabase
          .from('user_branch_access')
          .select('user_id, branch_id');

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
          
          const userPerms = allGranularPerms?.filter(p => p.user_id === profile.user_id) || [];

          let overrideCount = 0;
          if (highestRole) {
            const roleDefaultPerms = roleDefaultsMap.get(highestRole) || new Set();
            userPerms.forEach(p => {
              if (p.override_type === 'grant' && !roleDefaultPerms.has(p.permission_key)) {
                overrideCount++;
              }
              if (p.override_type === 'revoke' && roleDefaultPerms.has(p.permission_key)) {
                overrideCount++;
              }
            });
          } else {
            overrideCount = userPerms.length;
          }

          const panelAccessData = allPanelAccess?.find(pa => pa.user_id === profile.user_id);
          const panelAccess: PanelAccess = {
            can_use_local_panel: panelAccessData?.can_use_local_panel ?? false,
            can_use_brand_panel: panelAccessData?.can_use_brand_panel ?? false,
            brand_access: panelAccessData?.brand_access ?? false,
          };

          const userBranchAccess = allBranchAccess?.filter(ba => ba.user_id === profile.user_id) || [];
          const allowedBranches = userBranchAccess.map(ba => {
            const branch = branchesData?.find(b => b.id === ba.branch_id);
            return { id: ba.branch_id, name: branch?.name || 'Desconocida' };
          });

          return {
            ...profile,
            role: highestRole,
            allRoles: userRoles,
            overrideCount,
            panelAccess,
            allowedBranches,
            lastLogin: profile.updated_at,
            isActive: true,
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

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Search filter
      const matchesSearch = 
        user.full_name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase());
      
      // Panel filter
      let matchesPanel = true;
      if (filterPanel === 'marca') {
        matchesPanel = user.panelAccess?.can_use_brand_panel === true;
      } else if (filterPanel === 'local') {
        matchesPanel = user.panelAccess?.can_use_local_panel === true && !user.panelAccess?.can_use_brand_panel;
      } else if (filterPanel === 'ambos') {
        matchesPanel = user.panelAccess?.can_use_brand_panel === true && user.panelAccess?.can_use_local_panel === true;
      } else if (filterPanel === 'ninguno') {
        matchesPanel = !user.panelAccess?.can_use_brand_panel && !user.panelAccess?.can_use_local_panel;
      }
      
      // Role filter
      const matchesRole = filterRole === 'all' || user.role === filterRole;
      
      // Branch filter
      const matchesBranch = filterBranch === 'all' || 
        user.allowedBranches?.some(ba => ba.id === filterBranch);
      
      // Status filter (placeholder - could be enhanced)
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'activo' && user.isActive) ||
        (filterStatus === 'inactivo' && !user.isActive);
      
      return matchesSearch && matchesPanel && matchesRole && matchesBranch && matchesStatus;
    });
  }, [users, search, filterPanel, filterRole, filterBranch, filterStatus]);

  // Helper: Get panel badge
  const getPanelBadge = (user: UserWithRole) => {
    const hasBrand = user.panelAccess?.can_use_brand_panel;
    const hasLocal = user.panelAccess?.can_use_local_panel;
    
    if (hasBrand && hasLocal) {
      return <Badge variant="default">Ambos</Badge>;
    } else if (hasBrand) {
      return <Badge variant="secondary"><Landmark className="w-3 h-3 mr-1" />Marca</Badge>;
    } else if (hasLocal) {
      return <Badge variant="secondary"><Building2 className="w-3 h-3 mr-1" />Local</Badge>;
    } else {
      return <Badge variant="outline">Sin panel</Badge>;
    }
  };

  // Helper: Get scope summary
  const getScopeSummary = (user: UserWithRole) => {
    if (user.panelAccess?.brand_access) {
      return <Badge variant="default"><Landmark className="w-3 h-3 mr-1" />Marca</Badge>;
    }
    
    const branchCount = user.allowedBranches?.length || 0;
    if (branchCount === 0) {
      return <span className="text-muted-foreground text-sm">Sin scope</span>;
    }
    
    if (branchCount === 1) {
      return (
        <Badge variant="secondary">
          <Store className="w-3 h-3 mr-1" />
          {user.allowedBranches![0].name}
        </Badge>
      );
    }
    
    const firstBranch = user.allowedBranches![0].name;
    const extraBranches = user.allowedBranches!.slice(1).map(b => b.name).join(', ');
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="cursor-help">
              <Store className="w-3 h-3 mr-1" />
              {branchCount} locales
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">{firstBranch}</p>
            <p className="text-xs text-muted-foreground">{extraBranches}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Equipo</h1>
          <p className="text-muted-foreground">Gestión de usuarios y accesos</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/plantillas">
            <Button variant="outline">
              <Shield className="h-4 w-4 mr-2" />
              Plantillas
            </Button>
          </Link>
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Quick Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Filter: Panel */}
            <Select value={filterPanel} onValueChange={setFilterPanel}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Panel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="marca">Solo Marca</SelectItem>
                <SelectItem value="local">Solo Local</SelectItem>
                <SelectItem value="ambos">Ambos</SelectItem>
                <SelectItem value="ninguno">Ninguno</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Filter: Plantilla */}
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Plantilla" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {ROLES_HIERARCHY.map(role => (
                  <SelectItem key={role} value={role}>{roleLabels[role]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Filter: Sucursal */}
            <Select value={filterBranch} onValueChange={setFilterBranch}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sucursal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {branches.filter(b => b.is_active).map(branch => (
                  <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Filter: Status */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="inactivo">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table - 6 Columns Max */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {filteredUsers.length} usuario{filteredUsers.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No se encontraron usuarios</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Plantilla</TableHead>
                    <TableHead>Panel</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedUser(user)}>
                      {/* Col 1: Usuario (nombre + email) */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                            {user.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt={user.full_name}
                                className="w-9 h-9 rounded-full object-cover"
                              />
                            ) : (
                              <User className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{user.full_name}</p>
                            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      
                      {/* Col 2: Plantilla/Rol */}
                      <TableCell>
                        {user.role ? (
                          <Badge className={roleColors[user.role]}>
                            {roleLabels[user.role]}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Sin plantilla</Badge>
                        )}
                      </TableCell>
                      
                      {/* Col 3: Panel habilitado */}
                      <TableCell>
                        {getPanelBadge(user)}
                      </TableCell>
                      
                      {/* Col 4: Scope resumido */}
                      <TableCell>
                        {getScopeSummary(user)}
                      </TableCell>
                      
                      {/* Col 5: Estado */}
                      <TableCell>
                        <Badge variant={user.isActive ? 'default' : 'secondary'}>
                          {user.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      
                      {/* Col 6: Acción */}
                      <TableCell className="text-right">
                        {canManageUsers && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUser(user);
                            }}
                          >
                            <Settings className="w-4 h-4 mr-1" />
                            Administrar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Card Sheet */}
      <UserCard
        user={selectedUser}
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        branches={branches}
        onSave={fetchData}
      />
    </div>
  );
}
