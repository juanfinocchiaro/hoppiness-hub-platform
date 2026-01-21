/**
 * UsersV2 - Gestión de Usuarios Simplificada
 * 
 * Nueva arquitectura sin plantillas ni overrides.
 * Roles fijos para marca y local.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePermissionsV2, BRAND_ROLE_LABELS, LOCAL_ROLE_LABELS, type BrandRole, type LocalRole } from '@/hooks/usePermissionsV2';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import { toast } from 'sonner';
import { 
  Search, 
  UserPlus, 
  Building2, 
  Store,
  Shield,
  Eye,
  Calculator,
  ChefHat,
  User,
  Lock,
  RefreshCw
} from 'lucide-react';

interface UserWithRole {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  brand_role: BrandRole;
  local_role: LocalRole;
  branch_ids: string[];
  is_active: boolean;
}

interface Branch {
  id: string;
  name: string;
}

// Iconos por rol
const BRAND_ROLE_ICONS: Record<string, React.ElementType> = {
  superadmin: Shield,
  coordinador: Building2,
  informes: Eye,
  contador_marca: Calculator,
};

const LOCAL_ROLE_ICONS: Record<string, React.ElementType> = {
  franquiciado: Store,
  encargado: ChefHat,
  contador_local: Calculator,
  cajero: User,
  empleado: User,
};

export default function UsersV2() {
  const { isSuperadmin, loading: permLoading } = usePermissionsV2();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState('');
  const [filterBrandRole, setFilterBrandRole] = useState<string>('all');
  const [filterLocalRole, setFilterLocalRole] = useState<string>('all');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [editBrandRole, setEditBrandRole] = useState<BrandRole>(null);
  const [editLocalRole, setEditLocalRole] = useState<LocalRole>(null);
  const [editBranchIds, setEditBranchIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  
  // Fetch all users with roles
  const { data: users = [], isLoading: loadingUsers, refetch: refetchUsers } = useQuery({
    queryKey: ['users-v2'],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, full_name, avatar_url')
        .order('full_name');
      
      if (profilesError) throw profilesError;
      
      // Get all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles_v2')
        .select('*');
      
      if (rolesError) throw rolesError;
      
      // Merge
      const rolesMap = new Map(roles?.map(r => [r.user_id, r]) || []);
      
      return (profiles || []).map(p => {
        const role = rolesMap.get(p.user_id);
        return {
          id: role?.id || '',
          user_id: p.user_id,
          email: p.email || '',
          full_name: p.full_name || '',
          avatar_url: p.avatar_url,
          brand_role: (role?.brand_role as BrandRole) || null,
          local_role: (role?.local_role as LocalRole) || null,
          branch_ids: role?.branch_ids || [],
          is_active: role?.is_active ?? true,
        };
      });
    },
    enabled: isSuperadmin,
  });
  
  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('branches')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
  });
  
  // Filter users
  const filteredUsers = users.filter(user => {
    // Search
    if (search) {
      const searchLower = search.toLowerCase();
      if (!user.full_name.toLowerCase().includes(searchLower) && 
          !user.email.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    
    // Brand role filter
    if (filterBrandRole !== 'all') {
      if (filterBrandRole === 'none' && user.brand_role !== null) return false;
      if (filterBrandRole !== 'none' && user.brand_role !== filterBrandRole) return false;
    }
    
    // Local role filter
    if (filterLocalRole !== 'all') {
      if (filterLocalRole === 'none' && user.local_role !== null) return false;
      if (filterLocalRole !== 'none' && user.local_role !== filterLocalRole) return false;
    }
    
    // Branch filter
    if (filterBranch !== 'all' && !user.branch_ids.includes(filterBranch)) {
      return false;
    }
    
    return true;
  });
  
  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { 
      user_id: string; 
      brand_role: BrandRole; 
      local_role: LocalRole; 
      branch_ids: string[];
    }) => {
      // Upsert user_roles_v2
      const { error } = await supabase
        .from('user_roles_v2')
        .upsert({
          user_id: data.user_id,
          brand_role: data.brand_role,
          local_role: data.local_role,
          branch_ids: data.branch_ids,
          is_active: true,
        }, {
          onConflict: 'user_id'
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-v2'] });
      toast.success('Usuario actualizado correctamente');
      setSelectedUser(null);
    },
    onError: (error) => {
      toast.error('Error al guardar: ' + (error as Error).message);
    }
  });
  
  const handleEditUser = (user: UserWithRole) => {
    setSelectedUser(user);
    setEditBrandRole(user.brand_role);
    setEditLocalRole(user.local_role);
    setEditBranchIds(user.branch_ids);
  };
  
  const handleSave = async () => {
    if (!selectedUser) return;
    setSaving(true);
    await saveMutation.mutateAsync({
      user_id: selectedUser.user_id,
      brand_role: editBrandRole,
      local_role: editLocalRole,
      branch_ids: editBranchIds,
    });
    setSaving(false);
  };
  
  const toggleBranch = (branchId: string) => {
    setEditBranchIds(prev => 
      prev.includes(branchId) 
        ? prev.filter(id => id !== branchId)
        : [...prev, branchId]
    );
  };
  
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  
  const getBranchNames = (branchIds: string[]) => {
    if (!branchIds.length) return '-';
    const names = branchIds
      .map(id => branches.find(b => b.id === id)?.name)
      .filter(Boolean);
    return names.length > 2 
      ? `${names.slice(0, 2).join(', ')} +${names.length - 2}`
      : names.join(', ');
  };
  
  if (permLoading) {
    return <HoppinessLoader fullScreen size="lg" />;
  }
  
  if (!isSuperadmin) {
    return (
      <div className="p-8 text-center">
        <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Acceso Restringido</h2>
        <p className="text-muted-foreground">Solo el Superadmin puede gestionar usuarios.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-muted-foreground">Gestión de accesos y roles</p>
        </div>
        <Button onClick={() => refetchUsers()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterBrandRole} onValueChange={setFilterBrandRole}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Rol Marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles marca</SelectItem>
                <SelectItem value="none">Sin rol marca</SelectItem>
                {Object.entries(BRAND_ROLE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterLocalRole} onValueChange={setFilterLocalRole}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Rol Local" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles local</SelectItem>
                <SelectItem value="none">Sin rol local</SelectItem>
                {Object.entries(LOCAL_ROLE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterBranch} onValueChange={setFilterBranch}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Sucursal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las sucursales</SelectItem>
                {branches.map(branch => (
                  <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingUsers ? (
            <HoppinessLoader size="md" text="Cargando usuarios..." />
          ) : filteredUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No se encontraron usuarios con los filtros seleccionados
            </p>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map(user => (
                <div 
                  key={user.user_id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleEditUser(user)}
                >
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>{getInitials(user.full_name || user.email)}</AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <p className="font-medium">{user.full_name || 'Sin nombre'}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden md:block">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {user.brand_role ? BRAND_ROLE_LABELS[user.brand_role] : '-'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {user.local_role ? `${LOCAL_ROLE_LABELS[user.local_role]} en ${getBranchNames(user.branch_ids)}` : '-'}
                        </span>
                      </div>
                    </div>
                    
                    <Button variant="outline" size="sm">Editar</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Edit Sheet */}
      <Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Editar Usuario</SheetTitle>
            <SheetDescription>
              {selectedUser?.full_name} · {selectedUser?.email}
            </SheetDescription>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(100vh-200px)] pr-4">
            <div className="space-y-6 py-6">
              {/* Brand Role Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Acceso a Mi Marca</h3>
                </div>
                
                <Select 
                  value={editBrandRole || 'none'} 
                  onValueChange={(v) => setEditBrandRole(v === 'none' ? null : v as BrandRole)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin acceso</SelectItem>
                    <SelectItem value="superadmin">Superadmin (todo)</SelectItem>
                    <SelectItem value="coordinador">Coordinador (productos, marketing)</SelectItem>
                    <SelectItem value="informes">Informes (solo ver reportes)</SelectItem>
                    <SelectItem value="contador_marca">Contador Marca (finanzas marca)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Separator />
              
              {/* Local Role Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Acceso a Mi Local</h3>
                </div>
                
                <Select 
                  value={editLocalRole || 'none'} 
                  onValueChange={(v) => setEditLocalRole(v === 'none' ? null : v as LocalRole)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin acceso</SelectItem>
                    <SelectItem value="franquiciado">Franquiciado (dueño, todo)</SelectItem>
                    <SelectItem value="encargado">Encargado (gestión día a día)</SelectItem>
                    <SelectItem value="contador_local">Contador Local (finanzas local)</SelectItem>
                    <SelectItem value="cajero">Cajero (operación)</SelectItem>
                    <SelectItem value="empleado">Empleado (solo Mi Cuenta)</SelectItem>
                  </SelectContent>
                </Select>
                
                {editLocalRole && editLocalRole !== 'empleado' && (
                  <div className="space-y-2">
                    <Label>Sucursales</Label>
                    <div className="grid grid-cols-1 gap-2 p-3 border rounded-lg max-h-48 overflow-y-auto">
                      {branches.map(branch => (
                        <div 
                          key={branch.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={branch.id}
                            checked={editBranchIds.includes(branch.id)}
                            onCheckedChange={() => toggleBranch(branch.id)}
                          />
                          <Label htmlFor={branch.id} className="cursor-pointer">
                            {branch.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <Separator />
              
              {/* PIN Section (only for encargado/franquiciado) */}
              {(editLocalRole === 'encargado' || editLocalRole === 'franquiciado') && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">PIN de Autorización</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    El PIN se usa para autorizar acciones de cajeros (anular pedidos, aplicar descuentos).
                    Se configura desde el perfil del usuario.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <SheetFooter className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
