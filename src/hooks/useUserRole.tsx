/**
 * useUserRole Hook
 * 
 * Provides user roles and granular branch permissions.
 * 
 * IMPORTANT: This hook uses `user_branch_permissions` (new granular system).
 * 
 * @deprecated branch_permissions table is DEPRECATED.
 * The fallback to `branch_permissions` is kept for backwards compatibility
 * but should be removed once all data is migrated.
 * 
 * Migration completed:
 * - RegistroStaff.tsx (2026-01-21) - now writes to user_branch_permissions
 * 
 * Pending migration:
 * - Historical data in branch_permissions table
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { devLog } from '@/lib/errorHandler';
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
          // Non-admin: derive branch access from granular permissions (user_branch_permissions)
          // and fallback to legacy branch_permissions for backwards compatibility.

          // 1) Granular permissions
          const { data: granularData, error: granularError } = await supabase
            .from('user_branch_permissions')
            .select('branch_id, permission_key')
            .eq('user_id', user.id);

          if (granularError) throw granularError;

          const permsByBranch = new Map<string, Set<string>>();
          (granularData || []).forEach((row) => {
            if (!permsByBranch.has(row.branch_id)) permsByBranch.set(row.branch_id, new Set());
            permsByBranch.get(row.branch_id)!.add(row.permission_key);
          });

          // 2) Legacy permissions (optional fallback)
          const { data: legacyData, error: legacyError } = await supabase
            .from('branch_permissions')
            .select(
              `
              branch_id,
              can_manage_inventory,
              can_manage_orders,
              can_manage_products,
              can_manage_staff,
              can_view_reports
            `
            )
            .eq('user_id', user.id);

          if (legacyError) throw legacyError;

          const legacyByBranch = new Map<string, {
            can_manage_inventory: boolean;
            can_manage_orders: boolean;
            can_manage_products: boolean;
            can_manage_staff: boolean;
            can_view_reports: boolean;
          }>();

          (legacyData || []).forEach((p) => {
            legacyByBranch.set(p.branch_id, {
              can_manage_inventory: p.can_manage_inventory ?? false,
              can_manage_orders: p.can_manage_orders ?? false,
              can_manage_products: p.can_manage_products ?? false,
              can_manage_staff: p.can_manage_staff ?? false,
              can_view_reports: p.can_view_reports ?? false,
            });
          });

          // Helper: map granular keys -> legacy-like booleans used in UI
          const hasAny = (keys: Set<string> | undefined, prefixesOrKeys: string[]) => {
            if (!keys) return false;
            return prefixesOrKeys.some((k) =>
              k.endsWith('.') ? Array.from(keys).some((x) => x.startsWith(k)) : keys.has(k)
            );
          };

          const branchIds = Array.from(
            new Set<string>([...permsByBranch.keys(), ...legacyByBranch.keys()])
          );

          const computed = branchIds.map((branch_id) => {
            const keys = permsByBranch.get(branch_id);
            const legacy = legacyByBranch.get(branch_id);

            // Minimal mapping that matches current UI needs.
            const can_manage_orders =
              (legacy?.can_manage_orders ?? false) ||
              hasAny(keys, ['orders.', 'pos.', 'cash.']);

            const can_manage_products =
              (legacy?.can_manage_products ?? false) ||
              hasAny(keys, ['products.', 'inventory.']);

            const can_manage_inventory =
              (legacy?.can_manage_inventory ?? false) ||
              hasAny(keys, ['inventory.']);

            const can_manage_staff =
              (legacy?.can_manage_staff ?? false) ||
              hasAny(keys, ['hr.']);

            const can_view_reports =
              (legacy?.can_view_reports ?? false) ||
              hasAny(keys, ['reports.', 'finance.']);

            return {
              branch_id,
              can_manage_inventory,
              can_manage_orders,
              can_manage_products,
              can_manage_staff,
              can_view_reports,
            };
          });

          setBranchPermissions(computed);

          // Fetch branches the user has access to
          if (branchIds.length > 0) {
            const { data: branchesData, error: branchesError } = await supabase
              .from('branches')
              .select('*')
              .in('id', branchIds)
              .order('name');

            if (branchesError) throw branchesError;

            setAccessibleBranches(branchesData || []);
          } else {
            setAccessibleBranches([]);
          }
        }
      } catch (error) {
        devLog('Error fetching user role data', error);
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
