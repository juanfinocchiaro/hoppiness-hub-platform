import { useState, useMemo } from 'react';
import { usePermissionsV2 } from '@/hooks/usePermissionsV2';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import { UsersFilters, UsersTable, useUsersData, getHighestRole } from '@/components/admin/users';

export default function UsersPage() {
  const { isSuperadmin, loading: permLoading } = usePermissionsV2();
  const { users, branches, loading, refetch } = useUsersData();

  // Filter state
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [accessFilter, setAccessFilter] = useState('all');
  const [activityFilter, setActivityFilter] = useState('all');
  const [hideInactiveClients, setHideInactiveClients] = useState(false);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Search
      if (search) {
        const q = search.toLowerCase();
        if (!user.full_name?.toLowerCase().includes(q) && !user.email?.toLowerCase().includes(q)) {
          return false;
        }
      }

      // Role filter
      if (roleFilter !== 'all') {
        const highestRole = getHighestRole(user.brand_role, user.local_role);
        if (roleFilter === 'cliente') {
          if (user.brand_role || user.local_role) return false;
        } else if (highestRole !== roleFilter) {
          return false;
        }
      }

      // Access filter
      if (accessFilter === 'brand' && !user.brand_role) return false;
      if (accessFilter === 'local' && !user.local_role) return false;
      if (accessFilter === 'none' && (user.brand_role || user.local_role)) return false;

      // Activity filter
      if (activityFilter === 'with_orders' && user.total_orders === 0) return false;
      if (activityFilter === 'no_orders' && user.total_orders > 0) return false;

      // Hide inactive clients
      if (hideInactiveClients && !user.brand_role && !user.local_role && user.total_orders === 0) {
        return false;
      }

      return true;
    });
  }, [users, search, roleFilter, accessFilter, activityFilter, hideInactiveClients]);

  if (permLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <HoppinessLoader />
      </div>
    );
  }

  if (!isSuperadmin) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Acceso restringido</h2>
          <p className="text-muted-foreground mt-2">Solo superadmin puede ver esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <p className="text-muted-foreground">Gestión de accesos y roles</p>
      </div>

      <UsersFilters
        search={search}
        onSearchChange={setSearch}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        accessFilter={accessFilter}
        onAccessFilterChange={setAccessFilter}
        activityFilter={activityFilter}
        onActivityFilterChange={setActivityFilter}
        hideInactiveClients={hideInactiveClients}
        onHideInactiveClientsChange={setHideInactiveClients}
      />

      <div className="text-sm text-muted-foreground">
        Mostrando {filteredUsers.length} de {users.length} usuarios
      </div>

      <UsersTable 
        users={filteredUsers} 
        branches={branches}
        onUserUpdated={refetch}
      />
    </div>
  );
}
