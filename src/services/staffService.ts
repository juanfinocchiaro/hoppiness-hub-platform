import { supabase } from './supabaseClient';

type LocalRole = 'encargado' | 'cajero' | 'empleado';
type ExtendedLocalRole = LocalRole | 'contador_local' | 'franquiciado';

export async function findProfileByEmail(email: string) {
  return supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();
}

export async function findBranchRole(userId: string, branchId: string) {
  const { data, error } = await supabase
    .from('user_role_assignments')
    .select('id, is_active, roles!inner(key)')
    .eq('user_id', userId)
    .eq('branch_id', branchId)
    .maybeSingle();
  if (error) return { data: null, error };
  return {
    data: data ? { id: data.id, local_role: (data.roles as any).key, is_active: data.is_active } : null,
    error: null,
  };
}

export async function reactivateBranchMember(
  userId: string,
  branchId: string,
  localRole: LocalRole,
) {
  const { data: roleRow } = await supabase
    .from('roles')
    .select('id')
    .eq('key', localRole)
    .eq('scope', 'branch')
    .single();
  if (!roleRow) throw new Error(`Rol '${localRole}' no encontrado`);

  return supabase
    .from('user_role_assignments')
    .update({ is_active: true, role_id: roleRow.id })
    .eq('user_id', userId)
    .eq('branch_id', branchId);
}

export async function sendStaffInvitation(payload: {
  email: string;
  role: LocalRole;
  branch_id: string;
}) {
  return supabase.functions.invoke('send-staff-invitation', { body: payload });
}

export async function validateInvitationToken(token: string) {
  return supabase.rpc('validate_invitation_token', { _token: token });
}

export async function uploadStaffDocument(file: File, userId: string, type: 'front' | 'back') {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/dni-${type}.${fileExt}`;

  const { error } = await supabase.storage
    .from('staff-documents')
    .upload(fileName, file, { upsert: true });
  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('staff-documents')
    .getPublicUrl(fileName);
  return publicUrl;
}

export async function upsertBranchRole(
  userId: string,
  branchId: string,
  localRole: ExtendedLocalRole,
) {
  const { data: roleRow } = await supabase
    .from('roles')
    .select('id')
    .eq('key', localRole)
    .eq('scope', 'branch')
    .single();
  if (!roleRow) throw new Error(`Rol '${localRole}' no encontrado`);

  const { data: existing } = await supabase
    .from('user_role_assignments')
    .select('id')
    .eq('user_id', userId)
    .eq('branch_id', branchId)
    .maybeSingle();

  if (existing) {
    return supabase
      .from('user_role_assignments')
      .update({ role_id: roleRow.id, is_active: true })
      .eq('id', existing.id);
  }
  return supabase.from('user_role_assignments').insert({
    user_id: userId,
    branch_id: branchId,
    role_id: roleRow.id,
    is_active: true,
  });
}

export async function acceptInvitation(invitationId: string, userId: string) {
  return supabase
    .from('staff_invitations')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      accepted_by: userId,
    })
    .eq('id', invitationId);
}

export async function fetchBranchTeamData(branchId: string, excludeOwners: boolean = false) {
  let query = supabase
    .from('user_role_assignments')
    .select('id, user_id, default_position, is_active, created_at, roles!inner(key)')
    .eq('branch_id', branchId)
    .eq('is_active', true);

  if (excludeOwners) {
    query = query.neq('roles.key', 'franquiciado');
  }

  const { data: roles, error: rolesError } = await query;
  if (rolesError) throw rolesError;
  if (!roles?.length) return { roles: [], profiles: [], employeeData: [], clockEntries: [], warnings: [] };

  // Map to expected shape
  const mappedRoles = roles.map((r: any) => ({
    id: r.id,
    user_id: r.user_id,
    local_role: r.roles.key,
    default_position: r.default_position,
    is_active: r.is_active,
    created_at: r.created_at,
  }));

  const userIds = mappedRoles.map((r) => r.user_id);

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone')
    .in('id', userIds);

  const { data: employeeData } = await supabase
    .from('employee_data')
    .select('user_id, monthly_hours_target')
    .eq('branch_id', branchId)
    .in('user_id', userIds);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: clockEntries } = await supabase
    .from('clock_entries')
    .select('user_id, entry_type, created_at')
    .eq('branch_id', branchId)
    .in('user_id', userIds)
    .gte('created_at', startOfMonth.toISOString())
    .order('created_at', { ascending: true });

  const { data: warnings } = await supabase
    .from('warnings')
    .select('user_id')
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .in('user_id', userIds);

  return {
    roles: mappedRoles,
    profiles: profiles || [],
    employeeData: employeeData || [],
    clockEntries: clockEntries || [],
    warnings: warnings || [],
  };
}

export async function fetchEmployeeData(userId: string, branchId: string) {
  const { data } = await supabase
    .from('employee_data')
    .select('*')
    .eq('user_id', userId)
    .eq('branch_id', branchId)
    .maybeSingle();
  return data;
}

export async function fetchEmployeeWarnings(userId: string, branchId: string) {
  const { data } = await supabase
    .from('warnings')
    .select('*')
    .eq('user_id', userId)
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .order('warning_date', { ascending: false })
    .limit(5);
  return data || [];
}

export async function upsertEmployeeData(
  existingId: string | undefined,
  data: Record<string, unknown>,
) {
  if (existingId) {
    const { error } = await supabase.from('employee_data').update(data).eq('id', existingId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('employee_data').insert(data as any);
    if (error) throw error;
  }
}

export async function updateBranchRole(
  roleId: string,
  updates: Record<string, unknown>,
) {
  const { error } = await supabase.from('user_role_assignments').update(updates).eq('id', roleId);
  if (error) throw error;
}

export async function fetchProfileClockPin(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('clock_pin')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateEmployeeNotes(
  employeeDataId: string | undefined,
  userId: string,
  branchId: string,
  notes: unknown[],
) {
  if (employeeDataId) {
    const { error } = await supabase
      .from('employee_data')
      .update({ internal_notes: notes as any })
      .eq('id', employeeDataId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('employee_data').insert({
      user_id: userId,
      branch_id: branchId,
      internal_notes: notes as any,
    } as any);
    if (error) throw error;
  }
}

export async function deactivateBranchRole(roleId: string) {
  const { error } = await supabase
    .from('user_role_assignments')
    .update({ is_active: false })
    .eq('id', roleId);
  if (error) throw error;
}
