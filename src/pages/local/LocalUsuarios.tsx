import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  UserPlus, 
  Users, 
  UserCircle, 
  Briefcase,
  Clock,
  Star,
  RefreshCw,
  ShoppingBag
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { InviteStaffDialog } from '@/components/hr/InviteStaffDialog';
import UserDetailSheet from '@/components/local/UserDetailSheet';

interface UserProfile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  total_orders: number;
  total_spent: number;
  last_order_at: string | null;
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  branch_id: string | null;
  is_active: boolean;
  attendance_pin?: string;
}

interface CombinedUser {
  profile: UserProfile;
  roles: UserRole[];
  isStaff: boolean;
  isCustomer: boolean;
  highestRole: string | null;
  requiresAttendance: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Superadmin',
  admin: 'Admin',
  franquiciado: 'Franquiciado',
  encargado: 'Encargado',
  cajero: 'Cajero',
  kds: 'KDS',
  marketing: 'Marketing',
};

const ROLE_PRIORITY: Record<string, number> = {
  superadmin: 0,
  admin: 1,
  franquiciado: 2,
  encargado: 3,
  cajero: 4,
  kds: 5,
  marketing: 6,
};

export default function LocalUsuarios() {
  const { branchId } = useParams<{ branchId: string }>();
  const { isAdmin, isFranquiciado, isGerente } = useUserRole();
  
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<CombinedUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('todos');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CombinedUser | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const canInvite = isAdmin || isFranquiciado || isGerente;

  useEffect(() => {
    if (branchId) {
      fetchUsers();
    }
  }, [branchId]);

  const fetchUsers = async () => {
    if (!branchId) return;
    
    setLoading(true);
    try {
      // Fetch all profiles with orders in this branch
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('user_id')
        .eq('branch_id', branchId)
        .not('user_id', 'is', null);
      
      if (ordersError) throw ordersError;

      // Get unique user IDs from orders
      const customerUserIds = [...new Set(ordersData?.map(o => o.user_id).filter(Boolean) || [])];

      // Fetch roles for this branch
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('branch_id', branchId)
        .eq('is_active', true);
      
      if (rolesError) throw rolesError;

      const staffUserIds = [...new Set(rolesData?.map(r => r.user_id) || [])];

      // Combine all unique user IDs
      const allUserIds = [...new Set([...customerUserIds, ...staffUserIds])];

      if (allUserIds.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      // Fetch profiles for all users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', allUserIds);
      
      if (profilesError) throw profilesError;

      // Build combined users
      const combinedUsers: CombinedUser[] = (profilesData || []).map(profile => {
        const userRoles = (rolesData || []).filter(r => r.user_id === profile.id);
        const isStaff = userRoles.length > 0;
        const isCustomer = customerUserIds.includes(profile.id);
        
        // Get highest role
        let highestRole: string | null = null;
        if (userRoles.length > 0) {
          userRoles.sort((a, b) => 
            (ROLE_PRIORITY[a.role] ?? 99) - (ROLE_PRIORITY[b.role] ?? 99)
          );
          highestRole = userRoles[0].role;
        }

        // Check if requires attendance (from employees table or role config)
        const requiresAttendance = userRoles.some(r => 
          ['kds', 'cajero', 'encargado'].includes(r.role)
        );

        return {
          profile: {
            id: profile.id,
            full_name: profile.full_name || 'Sin nombre',
            email: profile.email,
            phone: profile.phone,
            avatar_url: profile.avatar_url,
            total_orders: profile.total_orders || 0,
            total_spent: profile.total_spent || 0,
            last_order_at: profile.last_order_at,
          },
          roles: userRoles,
          isStaff,
          isCustomer,
          highestRole,
          requiresAttendance,
        };
      });

      setUsers(combinedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    let result = users;

    // Filter by tab
    if (activeTab === 'clientes') {
      result = result.filter(u => u.isCustomer);
    } else if (activeTab === 'equipo') {
      result = result.filter(u => u.isStaff);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(u => 
        u.profile.full_name.toLowerCase().includes(query) ||
        u.profile.email?.toLowerCase().includes(query) ||
        u.profile.phone?.includes(query)
      );
    }

    return result;
  }, [users, activeTab, searchQuery]);

  const counts = useMemo(() => ({
    todos: users.length,
    clientes: users.filter(u => u.isCustomer).length,
    equipo: users.filter(u => u.isStaff).length,
  }), [users]);

  const handleUserClick = (user: CombinedUser) => {
    setSelectedUser(user);
    setDetailOpen(true);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getRoleBadgeVariant = (role: string): 'default' | 'secondary' | 'outline' => {
    switch (role) {
      case 'superadmin':
      case 'admin':
        return 'default';
      case 'franquiciado':
      case 'encargado':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getCustomerSegment = (user: CombinedUser): { label: string; icon: React.ReactNode; color: string } | null => {
    if (!user.isCustomer) return null;
    
    const orders = user.profile.total_orders;
    const spent = user.profile.total_spent;
    
    if (orders >= 10 && spent >= 200000) {
      return { label: 'VIP', icon: <Star className="w-3 h-3" />, color: 'text-yellow-600' };
    }
    
    if (orders >= 5) {
      return { label: 'Frecuente', icon: <RefreshCw className="w-3 h-3" />, color: 'text-blue-600' };
    }
    
    if (orders <= 2) {
      return { label: 'Nuevo', icon: <ShoppingBag className="w-3 h-3" />, color: 'text-green-600' };
    }
    
    return null;
  };

  if (!branchId) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-muted-foreground">Clientes y equipo de esta sucursal</p>
        </div>
        {canInvite && (
          <Button onClick={() => setInviteDialogOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Invitar usuario
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="todos" className="gap-2">
              <Users className="w-4 h-4" />
              Todos ({counts.todos})
            </TabsTrigger>
            <TabsTrigger value="clientes" className="gap-2">
              <UserCircle className="w-4 h-4" />
              Clientes ({counts.clientes})
            </TabsTrigger>
            <TabsTrigger value="equipo" className="gap-2">
              <Briefcase className="w-4 h-4" />
              Equipo ({counts.equipo})
            </TabsTrigger>
          </TabsList>
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 mt-6">
            {[1, 2, 3, 4, 5].map(i => (
              <Card key={i}>
                <CardContent className="p-4 flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-60" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <TabsContent value="todos" className="mt-6 space-y-2">
              {filteredUsers.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No se encontraron usuarios
                  </CardContent>
                </Card>
              ) : (
                filteredUsers.map(user => (
                  <UserRow 
                    key={user.profile.id} 
                    user={user} 
                    onClick={() => handleUserClick(user)}
                    getInitials={getInitials}
                    formatCurrency={formatCurrency}
                    getRoleBadgeVariant={getRoleBadgeVariant}
                    getCustomerSegment={getCustomerSegment}
                    showRole
                    showCustomerInfo
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="clientes" className="mt-6 space-y-2">
              {filteredUsers.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No se encontraron clientes
                  </CardContent>
                </Card>
              ) : (
                filteredUsers.map(user => (
                  <UserRow 
                    key={user.profile.id} 
                    user={user} 
                    onClick={() => handleUserClick(user)}
                    getInitials={getInitials}
                    formatCurrency={formatCurrency}
                    getRoleBadgeVariant={getRoleBadgeVariant}
                    getCustomerSegment={getCustomerSegment}
                    showRole={user.isStaff}
                    showCustomerInfo
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="equipo" className="mt-6 space-y-2">
              {filteredUsers.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No hay miembros en el equipo
                  </CardContent>
                </Card>
              ) : (
                filteredUsers.map(user => (
                  <UserRow 
                    key={user.profile.id} 
                    user={user} 
                    onClick={() => handleUserClick(user)}
                    getInitials={getInitials}
                    formatCurrency={formatCurrency}
                    getRoleBadgeVariant={getRoleBadgeVariant}
                    getCustomerSegment={getCustomerSegment}
                    showRole
                    showCustomerInfo={user.isCustomer}
                    showAttendance
                  />
                ))
              )}
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Invite Dialog */}
      <InviteStaffDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        branchId={branchId}
        branchName="esta sucursal"
        onSuccess={fetchUsers}
      />

      {/* User Detail Sheet */}
      {selectedUser && (
        <UserDetailSheet
          open={detailOpen}
          onOpenChange={setDetailOpen}
          user={selectedUser}
          branchId={branchId}
          onUpdate={fetchUsers}
        />
      )}
    </div>
  );
}

// Extracted row component for reusability
interface UserRowProps {
  user: CombinedUser;
  onClick: () => void;
  getInitials: (name: string) => string;
  formatCurrency: (amount: number) => string;
  getRoleBadgeVariant: (role: string) => 'default' | 'secondary' | 'outline';
  getCustomerSegment: (user: CombinedUser) => { label: string; icon: React.ReactNode; color: string } | null;
  showRole?: boolean;
  showCustomerInfo?: boolean;
  showAttendance?: boolean;
}

function UserRow({ 
  user, 
  onClick, 
  getInitials, 
  formatCurrency, 
  getRoleBadgeVariant,
  getCustomerSegment,
  showRole,
  showCustomerInfo,
  showAttendance,
}: UserRowProps) {
  const segment = getCustomerSegment(user);

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50"
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-center gap-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user.profile.avatar_url || undefined} />
          <AvatarFallback>{getInitials(user.profile.full_name)}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium truncate">{user.profile.full_name}</span>
            {showRole && user.isStaff && user.highestRole && (
              <Badge variant={getRoleBadgeVariant(user.highestRole)} className="text-xs">
                {ROLE_LABELS[user.highestRole] || user.highestRole}
                {showAttendance && user.requiresAttendance && (
                  <Clock className="w-3 h-3 ml-1" />
                )}
              </Badge>
            )}
            {segment && (
              <Badge variant="outline" className={`text-xs ${segment.color}`}>
                {segment.icon}
                <span className="ml-1">{segment.label}</span>
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground truncate">
            {user.profile.email || user.profile.phone || 'Sin contacto'}
            {showCustomerInfo && user.isCustomer && user.profile.total_orders > 0 && (
              <span className="ml-2">
                · {user.profile.total_orders} pedidos · {formatCurrency(user.profile.total_spent)}
              </span>
            )}
          </div>
        </div>
        
        {user.profile.last_order_at && showCustomerInfo && (
          <div className="text-xs text-muted-foreground hidden sm:block">
            Última: {formatDistanceToNow(new Date(user.profile.last_order_at), { addSuffix: true, locale: es })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
