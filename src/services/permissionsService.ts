import { supabase } from './supabaseClient';

// ── Legacy-compatible functions (used by usePermissions) ──────────────

export async function fetchUserBrandRole(userId: string) {
  const { data, error } = await supabase
    .from('user_role_assignments')
    .select('id, user_id, is_active, roles!inner(key, scope)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('roles.scope', 'brand')
    .is('branch_id', null)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { id: data.id, user_id: data.user_id, brand_role: (data.roles as any).key, is_active: data.is_active };
}

export async function fetchUserBranchRoles(userId: string) {
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_branches', {
    _user_id: userId,
  });

  if (!rpcError && rpcData && rpcData.length > 0) {
    return (rpcData as { branch_id: string; local_role: string }[]).map((r) => ({
      branch_id: r.branch_id,
      local_role: r.local_role,
    }));
  }

  // Fallback: direct query
  const { data: uraData, error: uraError } = await supabase
    .from('user_role_assignments')
    .select('branch_id, roles!inner(key, scope)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('roles.scope', 'branch')
    .not('branch_id', 'is', null);

  if (uraError || !uraData?.length) return [];

  return uraData.map((r: any) => ({
    branch_id: r.branch_id,
    local_role: r.roles.key,
  }));
}

// ── Normalized model (new tables) ────────────────────────────────────

export interface RoleRow {
  id: string;
  key: string;
  display_name: string;
  scope: 'brand' | 'branch';
  hierarchy_level: number;
  is_system: boolean;
}

export interface PermissionRow {
  id: string;
  key: string;
  label: string;
  scope: 'brand' | 'local';
  category: string;
  is_editable: boolean;
}

export interface RolePermissionRow {
  role_id: string;
  permission_id: string;
}

export async function fetchRoles(): Promise<RoleRow[]> {
  const { data, error } = await supabase
    .from('roles')
    .select('id, key, display_name, scope, hierarchy_level, is_system')
    .order('scope')
    .order('hierarchy_level', { ascending: false });
  if (error) throw error;
  return (data || []) as RoleRow[];
}

export async function fetchPermissions(): Promise<PermissionRow[]> {
  const { data, error } = await supabase
    .from('permissions')
    .select('id, key, label, scope, category, is_editable')
    .order('scope')
    .order('category')
    .order('label');
  if (error) throw error;
  return (data || []) as PermissionRow[];
}

export async function fetchRolePermissions(): Promise<RolePermissionRow[]> {
  const { data, error } = await supabase
    .from('role_permissions')
    .select('role_id, permission_id');
  if (error) throw error;
  return (data || []) as RolePermissionRow[];
}

export async function addRolePermission(roleId: string, permissionId: string) {
  const { error } = await supabase
    .from('role_permissions')
    .insert({ role_id: roleId, permission_id: permissionId });
  if (error) throw error;
}

export async function removeRolePermission(roleId: string, permissionId: string) {
  const { error } = await supabase
    .from('role_permissions')
    .delete()
    .eq('role_id', roleId)
    .eq('permission_id', permissionId);
  if (error) throw error;
}

// ── Profile & Impersonation ──────────────────────────────────────────

export async function fetchUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchImpersonationData(userId: string) {
  const { data: brandRoleData } = await supabase
    .from('user_role_assignments')
    .select('roles!inner(key, scope)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('roles.scope', 'brand')
    .is('branch_id', null)
    .maybeSingle();

  const { data: branchRolesData } = await supabase
    .from('user_role_assignments')
    .select('branch_id, roles!inner(key, scope)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('roles.scope', 'branch')
    .not('branch_id', 'is', null);

  const brandRole = brandRoleData ? (brandRoleData.roles as any).key : null;
  const branchRoles = (branchRolesData || []).map((r: any) => ({
    branch_id: r.branch_id,
    local_role: r.roles.key,
  }));

  let branches: any[] = [];

  if (brandRole === 'superadmin') {
    const { data } = await supabase
      .from('branches')
      .select('*')
      .eq('is_active', true)
      .order('name');
    branches = data || [];
  } else if (branchRoles.length > 0) {
    const branchIds = branchRoles.map((r: any) => r.branch_id);
    const { data } = await supabase
      .from('branches')
      .select('*')
      .in('id', branchIds)
      .eq('is_active', true)
      .order('name');
    branches = data || [];
  }

  return {
    brandRole,
    branchRoles,
    branches,
  };
}

export async function checkIsSuperadmin(userId: string) {
  const { data } = await supabase
    .from('user_role_assignments')
    .select('id, roles!inner(key)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('roles.key', 'superadmin')
    .maybeSingle();
  return !!data;
}

export async function fetchAccessibleBranches(
  brandRole: string | null,
  branchIds: string[],
) {
  if (brandRole === 'superadmin') {
    const { data } = await supabase
      .from('branches')
      .select('*')
      .eq('is_active', true)
      .order('name');
    return data || [];
  }

  if (branchIds.length > 0) {
    const { data } = await supabase
      .from('branches')
      .select('*')
      .in('id', branchIds)
      .eq('is_active', true)
      .order('name');
    return data || [];
  }

  return [];
}
