import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Tables, Enums } from '@/integrations/supabase/types';

type AppRole = Enums<'app_role'>;
type Branch = Tables<'branches'>;

interface BranchPermission {
  branch_id: string;
  can_manage_inventory: boolean;
  can_manage_orders: boolean;
  can_manage_products: boolean;
  can_manage_staff: boolean;
  can_view_reports: boolean;
  branch?: Branch;
}

interface UserRoleData {
  roles: AppRole[];
  isAdmin: boolean;
  isCoordinador: boolean;
  isSocio: boolean;
  isFranquiciado: boolean;
  isEncargado: boolean;
  isCajero: boolean;
  isKds: boolean;
  // Legacy aliases
  isGerente: boolean;
  branchPermissions: BranchPermission[];
  accessibleBranches: Branch[];
  loading: boolean;
}

export function useUserRole(): UserRoleData {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [branchPermissions, setBranchPermissions] = useState<BranchPermission[]>([]);
  const [accessibleBranches, setAccessibleBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserRoleData() {
      if (!user) {
        setRoles([]);
        setBranchPermissions([]);
        setAccessibleBranches([]);
        setLoading(false);
        return;
      }

      try {
        // Fetch user roles
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        const userRoles = (rolesData || []).map(r => r.role);
        setRoles(userRoles);

        const isUserAdmin = userRoles.includes('admin');

        if (isUserAdmin) {
          // Admin sees all branches
          const { data: allBranches } = await supabase
            .from('branches')
            .select('*')
            .order('name');
          
          setAccessibleBranches(allBranches || []);
          setBranchPermissions([]);
        } else {
          // Non-admin: fetch branch permissions
          const { data: permsData } = await supabase
            .from('branch_permissions')
            .select(`
              branch_id,
              can_manage_inventory,
              can_manage_orders,
              can_manage_products,
              can_manage_staff,
              can_view_reports
            `)
            .eq('user_id', user.id);

          const permissions = (permsData || []).map(p => ({
            ...p,
            can_manage_inventory: p.can_manage_inventory ?? false,
            can_manage_orders: p.can_manage_orders ?? false,
            can_manage_products: p.can_manage_products ?? false,
            can_manage_staff: p.can_manage_staff ?? false,
            can_view_reports: p.can_view_reports ?? false,
          }));

          setBranchPermissions(permissions);

          // Fetch branches the user has access to
          if (permissions.length > 0) {
            const branchIds = permissions.map(p => p.branch_id);
            const { data: branchesData } = await supabase
              .from('branches')
              .select('*')
              .in('id', branchIds)
              .order('name');
            
            setAccessibleBranches(branchesData || []);
          } else {
            setAccessibleBranches([]);
          }
        }
      } catch (error) {
        console.error('Error fetching user role data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUserRoleData();
  }, [user]);

  const isAdmin = roles.includes('admin');
  const isCoordinador = roles.includes('coordinador');
  const isSocio = roles.includes('socio');
  const isFranquiciado = roles.includes('franquiciado');
  const isEncargado = roles.includes('encargado') || roles.includes('gerente');
  const isCajero = roles.includes('cajero') || roles.includes('empleado');
  const isKds = roles.includes('kds');

  return {
    roles,
    isAdmin,
    isCoordinador,
    isSocio,
    isFranquiciado,
    isEncargado,
    isCajero,
    isKds,
    // Legacy alias
    isGerente: isEncargado,
    branchPermissions,
    accessibleBranches,
    loading,
  };
}
