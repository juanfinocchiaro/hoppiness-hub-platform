import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, UserPlus, Trash2, Users, Home, Briefcase, UsersRound, Star, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { LOCAL_ROLE_LABELS, type LocalRole } from '@/hooks/usePermissionsV2';
import { useWorkPositions } from '@/hooks/useWorkPositions';
import { usePermissionsWithImpersonation } from '@/hooks/usePermissionsWithImpersonation';
import { BranchTeamMemberRow, type TeamMemberData, type CoachingInfo } from './BranchTeamMemberRow';
import type { WorkPositionType } from '@/types/workPosition';

interface BranchTeamTabProps {
  branchId: string;
  branchName: string;
}

const AVAILABLE_ROLES: { value: LocalRole; label: string }[] = [
  { value: 'franquiciado', label: 'Franquiciado' },
  { value: 'encargado', label: 'Encargado' },
  { value: 'contador_local', label: 'Contador Local' },
  { value: 'cajero', label: 'Cajero' },
  { value: 'empleado', label: 'Empleado' },
];

const getRoleLabel = (role: string): string => {
  return AVAILABLE_ROLES.find(r => r.value === role)?.label || role;
};

export default function BranchTeamTab({ branchId, branchName }: BranchTeamTabProps) {
  const queryClient = useQueryClient();
  const { isSuperadmin, isCoordinador } = usePermissionsWithImpersonation();
  const [searchEmail, setSearchEmail] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ user_id: string; full_name: string; email: string } | null>(null);
  const [selectedRole, setSelectedRole] = useState<LocalRole>('empleado');
  const [selectedPosition, setSelectedPosition] = useState<string>('none');

  const canEvaluateManagers = isSuperadmin || isCoordinador;

  // Fetch work positions dynamically
  const { data: workPositions = [] } = useWorkPositions();

  // Fetch team members with coaching data
  const { data: teamData, isLoading } = useQuery({
    queryKey: ['branch-team-with-coaching', branchId],
    queryFn: async () => {
      // 1. Get team members
      const { data: teamRoles, error: teamError } = await supabase
        .from('user_branch_roles')
        .select('user_id, local_role, default_position')
        .eq('branch_id', branchId)
        .eq('is_active', true);

      if (teamError) throw teamError;
      if (!teamRoles?.length) return { team: [], coachings: [], profiles: {} };

      // 2. Get current month coachings
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const { data: coachings } = await supabase
        .from('coachings')
        .select('id, user_id, overall_score, coaching_date, evaluated_by, acknowledged_at')
        .eq('branch_id', branchId)
        .eq('coaching_month', currentMonth)
        .eq('coaching_year', currentYear);

      // 3. Gather all user IDs (team + evaluators)
      const evaluatorIds = coachings?.map(c => c.evaluated_by).filter(Boolean) || [];
      const allUserIds = [...new Set([...teamRoles.map(t => t.user_id), ...evaluatorIds])];

      // 4. Get profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', allUserIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // 5. Map coachings to team members
      const coachingMap = new Map<string, CoachingInfo>();
      coachings?.forEach(c => {
        const evaluatorProfile = profileMap.get(c.evaluated_by);
        coachingMap.set(c.user_id, {
          id: c.id,
          overall_score: c.overall_score,
          coaching_date: c.coaching_date,
          evaluated_by: c.evaluated_by,
          acknowledged_at: c.acknowledged_at,
          evaluator_name: evaluatorProfile?.full_name || 'Desconocido',
        });
      });

      // 6. Build team members with coaching info
      const team: TeamMemberData[] = teamRoles.map(t => ({
        user_id: t.user_id,
        local_role: t.local_role,
        default_position: t.default_position as WorkPositionType | null,
        profile: profileMap.get(t.user_id) ? {
          id: profileMap.get(t.user_id)!.id,
          full_name: profileMap.get(t.user_id)!.full_name,
          email: profileMap.get(t.user_id)!.email,
          avatar_url: profileMap.get(t.user_id)!.avatar_url,
        } : null,
        coaching: coachingMap.get(t.user_id) || null,
      }));

      return { team, profileMap };
    },
    enabled: !!branchId,
  });

  const team = teamData?.team || [];

  // Group team by role
  const grouped = {
    propietarios: team.filter(m => m.local_role === 'franquiciado'),
    encargados: team.filter(m => m.local_role === 'encargado'),
    staff: team.filter(m => ['cajero', 'empleado', 'contador_local'].includes(m.local_role)),
  };

  // Calculate stats
  const encargadosWithCoaching = grouped.encargados.filter(m => m.coaching).length;
  const staffWithCoaching = grouped.staff.filter(m => m.coaching).length;
  const totalEvaluable = grouped.encargados.length + grouped.staff.length;
  const totalEvaluated = encargadosWithCoaching + staffWithCoaching;

  // Search for users to add
  const { data: searchResults = [], isFetching: searching } = useQuery({
    queryKey: ['search-users-for-branch', searchEmail, branchId],
    queryFn: async () => {
      if (searchEmail.length < 3) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .ilike('email', `%${searchEmail}%`)
        .limit(5);

      if (error) throw error;

      const existingUserIds = new Set(team.map(t => t.user_id));
      return (data || []).filter(u => !existingUserIds.has(u.id));
    },
    enabled: searchEmail.length >= 3,
  });

  // Mutations
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: LocalRole }) => {
      const { error } = await supabase
        .from('user_branch_roles')
        .update({ local_role: newRole, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('branch_id', branchId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-team-with-coaching', branchId] });
      toast.success('Rol actualizado');
    },
    onError: () => toast.error('Error al actualizar rol'),
  });

  const updatePositionMutation = useMutation({
    mutationFn: async ({ userId, position }: { userId: string; position: string | null }) => {
      const { error } = await supabase
        .from('user_branch_roles')
        .update({ default_position: position as any, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('branch_id', branchId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-team-with-coaching', branchId] });
      toast.success('Posición actualizada');
    },
    onError: () => toast.error('Error al actualizar posición'),
  });

  const addMemberMutation = useMutation({
    mutationFn: async ({ userId, role, position }: { userId: string; role: LocalRole; position: string | null }) => {
      const { error } = await supabase
        .from('user_branch_roles')
        .insert({
          user_id: userId,
          branch_id: branchId,
          local_role: role,
          default_position: position as any,
          is_active: true,
        } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-team-with-coaching', branchId] });
      toast.success('Miembro agregado al equipo');
      setShowAddModal(false);
      setSelectedUser(null);
      setSearchEmail('');
      setSelectedPosition('none');
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate')) {
        toast.error('Este usuario ya está en el equipo');
      } else {
        toast.error('Error al agregar miembro');
      }
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_branch_roles')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('branch_id', branchId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-team-with-coaching', branchId] });
      toast.success('Miembro removido del equipo');
    },
    onError: () => toast.error('Error al remover miembro'),
  });

  const handleSelectUser = (user: typeof searchResults[0]) => {
    setSelectedUser({ user_id: user.id, full_name: user.full_name, email: user.email });
    setShowAddModal(true);
  };

  const handleConfirmAdd = () => {
    if (selectedUser) {
      addMemberMutation.mutate({
        userId: selectedUser.user_id,
        role: selectedRole,
        position: selectedPosition === 'none' ? null : selectedPosition,
      });
    }
  };

  const handleCoachingSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['branch-team-with-coaching', branchId] });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Equipo de {branchName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const currentMonth = new Date().toLocaleString('es-AR', { month: 'long', year: 'numeric' });

  return (
    <>
      <div className="space-y-6">
        {/* Header with stats */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Equipo de {branchName}
              </CardTitle>
              <span className="text-sm text-muted-foreground capitalize">{currentMonth}</span>
            </div>
          </CardHeader>
          <CardContent>
            {/* Coaching Stats */}
            <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg mb-4">
              <Star className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">
                Coachings del mes: {totalEvaluated}/{totalEvaluable} completados
              </span>
              {totalEvaluated === totalEvaluable && totalEvaluable > 0 && (
                <Badge variant="default">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Completo
                </Badge>
              )}
            </div>

            {/* Search to add */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email para agregar..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="pl-10"
              />

              {searchEmail.length >= 3 && (
                <div className="absolute z-10 mt-1 w-full bg-background border rounded-md shadow-lg max-h-48 overflow-auto">
                  {searching ? (
                    <div className="p-3 text-center text-muted-foreground">Buscando...</div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleSelectUser(user)}
                        className="w-full p-3 text-left hover:bg-muted flex items-center gap-3"
                      >
                        <UserPlus className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-muted-foreground">
                      No se encontraron usuarios
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Propietarios Section */}
        {grouped.propietarios.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Home className="h-4 w-4" />
                Propietarios
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {grouped.propietarios.map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.profile?.avatar_url || ''} />
                    <AvatarFallback>
                      {member.profile?.full_name?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{member.profile?.full_name || 'Usuario'}</p>
                    <p className="text-sm text-muted-foreground truncate">{member.profile?.email}</p>
                  </div>

                  <Badge variant="secondary">Franquiciado/a</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Encargados Section */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Encargados
              </CardTitle>
              <Badge variant={encargadosWithCoaching === grouped.encargados.length ? 'default' : 'outline'}>
                {encargadosWithCoaching}/{grouped.encargados.length}
                {encargadosWithCoaching === grouped.encargados.length && grouped.encargados.length > 0 && ' ✓'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {grouped.encargados.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay encargados asignados
              </p>
            ) : (
              grouped.encargados.map((member) => (
                <BranchTeamMemberRow
                  key={member.user_id}
                  member={member}
                  branchId={branchId}
                  canEvaluate={canEvaluateManagers}
                  canViewCoaching={true}
                  roleLabel="Encargado/a"
                  onCoachingSuccess={handleCoachingSuccess}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Staff Section */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <UsersRound className="h-4 w-4" />
                Equipo
              </CardTitle>
              <Badge variant={staffWithCoaching === grouped.staff.length ? 'default' : 'outline'}>
                {staffWithCoaching}/{grouped.staff.length}
                {staffWithCoaching === grouped.staff.length && grouped.staff.length > 0 && ' ✓'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {grouped.staff.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay empleados asignados
              </p>
            ) : (
              grouped.staff.map((member) => (
                <BranchTeamMemberRow
                  key={member.user_id}
                  member={member}
                  branchId={branchId}
                  canEvaluate={false} // Coordinador NO evalúa staff, solo ve
                  canViewCoaching={true}
                  roleLabel={getRoleLabel(member.local_role)}
                  onCoachingSuccess={handleCoachingSuccess}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add member modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar al equipo</DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-muted">
                <p className="font-medium">{selectedUser.full_name}</p>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
              </div>

              <div className="space-y-2">
                <Label>Rol en {branchName}</Label>
                <Select
                  value={selectedRole || 'empleado'}
                  onValueChange={(v) => setSelectedRole(v as LocalRole)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value!}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Posición habitual</Label>
                <Select
                  value={selectedPosition}
                  onValueChange={(v) => setSelectedPosition(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin definir</SelectItem>
                    {workPositions.map((pos) => (
                      <SelectItem key={pos.key} value={pos.key}>
                        {pos.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Esta es la posición que se asignará automáticamente al crear horarios.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmAdd}
              disabled={addMemberMutation.isPending}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
