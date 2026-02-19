import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UserRole {
  id: string;
  role: string;
  branch_id: string | null;
  branch_name?: string;
  requires_attendance: boolean;
  attendance_pin?: string;
  is_active: boolean;
}

interface BranchRole {
  branch_id: string;
  branch_name: string;
  roles: string[];
}

interface UseUserRolesReturn {
  roles: UserRole[];
  branchRoles: BranchRole[];
  loading: boolean;
  error: Error | null;
  
  // Panel access flags
  canUseLocalPanel: boolean;
  canUseBrandPanel: boolean;
  canUseMiCuenta: boolean; // Always true if logged in
  
  // Role checks
  hasRole: (role: string, branchId?: string) => boolean;
  hasAnyRole: (roles: string[], branchId?: string) => boolean;
  getBranchRoles: (branchId: string) => string[];
  
  // Specific role flags
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isFranquiciado: boolean;
  isEncargado: boolean;
  isCajero: boolean;
  isKds: boolean;
  isMarketing: boolean;
  
  // Refetch
  refetch: () => Promise<void>;
}

// Roles that can access Mi Local
const LOCAL_PANEL_ROLES = ['kds', 'cajero', 'encargado', 'franquiciado', 'admin', 'superadmin', 'gerente', 'empleado'];

// Roles that can access Mi Marca
const BRAND_PANEL_ROLES = ['marketing', 'admin', 'superadmin', 'coordinador', 'socio'];

export function useUserRoles(): UseUserRolesReturn {
  const { user } = useAuth();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [branchRoles, setBranchRoles] = useState<BranchRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRoles = async () => {
    if (!user) {
      setRoles([]);
      setBranchRoles([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch all user roles with branch info
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          id,
          role,
          branch_id,
          requires_attendance,
          attendance_pin,
          is_active,
          branches:branch_id (name)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (rolesError) throw rolesError;

      const formattedRoles: UserRole[] = (rolesData || []).map(r => ({
        id: r.id,
        role: r.role as string,
        branch_id: r.branch_id,
        branch_name: (r.branches as any)?.name || undefined,
        requires_attendance: r.requires_attendance || false,
        attendance_pin: r.attendance_pin || undefined,
        is_active: r.is_active ?? true,
      }));

      setRoles(formattedRoles);

      // Group roles by branch
      const branchMap = new Map<string, { name: string; roles: string[] }>();
      formattedRoles.forEach(r => {
        if (r.branch_id) {
          const existing = branchMap.get(r.branch_id);
          if (existing) {
            existing.roles.push(r.role);
          } else {
            branchMap.set(r.branch_id, {
              name: r.branch_name || 'Unknown',
              roles: [r.role],
            });
          }
        }
      });

      const formattedBranchRoles: BranchRole[] = Array.from(branchMap.entries()).map(
        ([branch_id, { name, roles }]) => ({
          branch_id,
          branch_name: name,
          roles,
        })
      );

      setBranchRoles(formattedBranchRoles);
      setError(null);
    } catch (err) {
      console.error('Error fetching user roles:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [user]);

  // Helper functions
  const hasRole = (role: string, branchId?: string): boolean => {
    return roles.some(r => 
      r.role === role && 
      r.is_active && 
      (!branchId || r.branch_id === branchId || r.branch_id === null)
    );
  };

  const hasAnyRole = (roleList: string[], branchId?: string): boolean => {
    return roleList.some(role => hasRole(role, branchId));
  };

  const getBranchRoles = (branchId: string): string[] => {
    return roles
      .filter(r => r.branch_id === branchId && r.is_active)
      .map(r => r.role);
  };

  // Computed flags
  const roleStrings = roles.filter(r => r.is_active).map(r => r.role);
  
  const isAdmin = roleStrings.includes('admin');
  const isSuperAdmin = roleStrings.includes('superadmin');
  const isFranquiciado = roleStrings.includes('franquiciado');
  const isEncargado = roleStrings.includes('encargado') || roleStrings.includes('gerente');
  const isCajero = roleStrings.includes('cajero') || roleStrings.includes('empleado');
  const isKds = roleStrings.includes('kds');
  const isMarketing = roleStrings.includes('marketing');

  const canUseLocalPanel = roleStrings.some(r => LOCAL_PANEL_ROLES.includes(r));
  const canUseBrandPanel = roleStrings.some(r => BRAND_PANEL_ROLES.includes(r));
  const canUseMiCuenta = !!user; // Everyone logged in can use Mi Cuenta

  return {
    roles,
    branchRoles,
    loading,
    error,
    canUseLocalPanel,
    canUseBrandPanel,
    canUseMiCuenta,
    hasRole,
    hasAnyRole,
    getBranchRoles,
    isAdmin,
    isSuperAdmin,
    isFranquiciado,
    isEncargado,
    isCajero,
    isKds,
    isMarketing,
    refetch: fetchRoles,
  };
}
