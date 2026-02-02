import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Search, UserPlus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { LOCAL_ROLE_LABELS, type LocalRole } from '@/hooks/usePermissionsV2';

interface BranchTeamTabProps {
  branchId: string;
  branchName: string;
}

interface TeamMember {
  user_id: string;
  local_role: LocalRole;
  profile: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null;
}

const AVAILABLE_ROLES: { value: LocalRole; label: string }[] = [
  { value: 'franquiciado', label: 'Franquiciado' },
  { value: 'encargado', label: 'Encargado' },
  { value: 'contador_local', label: 'Contador Local' },
  { value: 'cajero', label: 'Cajero' },
  { value: 'empleado', label: 'Empleado' },
];

export default function BranchTeamTab({ branchId, branchName }: BranchTeamTabProps) {
  const queryClient = useQueryClient();
  const [searchEmail, setSearchEmail] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ user_id: string; full_name: string; email: string } | null>(null);
  const [selectedRole, setSelectedRole] = useState<LocalRole>('empleado');

  // Fetch team members for this branch
  const { data: team = [], isLoading } = useQuery({
    queryKey: ['branch-team', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_branch_roles')
        .select(`
          user_id,
          local_role
        `)
        .eq('branch_id', branchId)
        .eq('is_active', true);

      if (error) throw error;

      // Get profiles for these users
      if (!data?.length) return [];

      const userIds = data.map(d => d.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return data.map(d => ({
        ...d,
        profile: profileMap.get(d.user_id) || null,
      })) as TeamMember[];
    },
    enabled: !!branchId,
  });

  // Search for users to add
  const { data: searchResults = [], isFetching: searching } = useQuery({
    queryKey: ['search-users-for-branch', searchEmail, branchId],
    queryFn: async () => {
      if (searchEmail.length < 3) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .ilike('email', `%${searchEmail}%`)
        .limit(5);

      if (error) throw error;

      // Filter out users already in this branch
      const existingUserIds = new Set(team.map(t => t.user_id));
      return (data || []).filter(u => !existingUserIds.has(u.user_id));
    },
    enabled: searchEmail.length >= 3,
  });

  // Update role mutation
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
      queryClient.invalidateQueries({ queryKey: ['branch-team', branchId] });
      toast.success('Rol actualizado');
    },
    onError: () => toast.error('Error al actualizar rol'),
  });

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: LocalRole }) => {
      const { error } = await supabase
        .from('user_branch_roles')
        .insert({
          user_id: userId,
          branch_id: branchId,
          local_role: role,
          is_active: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-team', branchId] });
      toast.success('Miembro agregado al equipo');
      setShowAddModal(false);
      setSelectedUser(null);
      setSearchEmail('');
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate')) {
        toast.error('Este usuario ya está en el equipo');
      } else {
        toast.error('Error al agregar miembro');
      }
    },
  });

  // Remove member mutation
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
      queryClient.invalidateQueries({ queryKey: ['branch-team', branchId] });
      toast.success('Miembro removido del equipo');
    },
    onError: () => toast.error('Error al remover miembro'),
  });

  const handleSelectUser = (user: typeof searchResults[0]) => {
    setSelectedUser(user);
    setShowAddModal(true);
  };

  const handleConfirmAdd = () => {
    if (selectedUser) {
      addMemberMutation.mutate({ userId: selectedUser.user_id, role: selectedRole });
    }
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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Equipo de {branchName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search to add */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por email para agregar..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="pl-10"
            />
            
            {/* Search results dropdown */}
            {searchEmail.length >= 3 && (
              <div className="absolute z-10 mt-1 w-full bg-background border rounded-md shadow-lg max-h-48 overflow-auto">
                {searching ? (
                  <div className="p-3 text-center text-muted-foreground">Buscando...</div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((user) => (
                    <button
                      key={user.user_id}
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

          {/* Team list */}
          {team.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay miembros asignados a esta sucursal</p>
            </div>
          ) : (
            <div className="space-y-2">
              {team.map((member) => (
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
                    <p className="font-medium truncate">
                      {member.profile?.full_name || 'Usuario'}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {member.profile?.email}
                    </p>
                  </div>

                  <Select
                    value={member.local_role || 'empleado'}
                    onValueChange={(value) => updateRoleMutation.mutate({
                      userId: member.user_id,
                      newRole: value as LocalRole,
                    })}
                  >
                    <SelectTrigger className="w-36">
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

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm('¿Remover a este miembro del equipo?')) {
                        removeMemberMutation.mutate(member.user_id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
