import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Users, Plus, UserMinus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { BRAND_ROLE_LABELS, type BrandRole } from '@/hooks/usePermissions';

interface CentralTeamMember {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  brand_role: BrandRole;
  created_at: string;
}

const BRAND_ROLES = [
  { value: 'superadmin', label: 'Superadmin', description: 'Gestión completa' },
  { value: 'coordinador', label: 'Coordinador', description: 'Catálogo, marketing' },
  { value: 'informes', label: 'Informes', description: 'Solo lectura de reportes' },
  { value: 'contador_marca', label: 'Contador Marca', description: 'Finanzas de marca' },
] as const;

export default function CentralTeam() {
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<BrandRole>('coordinador');

  // Query optimizada: user_roles_v2 + profiles en paralelo
  const { data: teamMembers, isLoading } = useQuery({
    queryKey: ['central-team-v2'],
    queryFn: async () => {
      // 1. Get users with brand roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles_v2')
        .select('id, user_id, brand_role, created_at')
        .not('brand_role', 'is', null)
        .eq('is_active', true)
        .order('created_at');

      if (rolesError) throw rolesError;
      if (!roles || roles.length === 0) return [];

      // 2. Get profiles for those users (profiles.id = user_id after migration)
      const userIds = roles.map((r) => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // 3. Merge data (profiles.id = user_id)
      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      return roles.map((role) => {
        const profile = profileMap.get(role.user_id);
        return {
          id: role.id,
          user_id: role.user_id,
          email: profile?.email || '',
          full_name: profile?.full_name || null,
          brand_role: role.brand_role as BrandRole,
          created_at: role.created_at,
        };
      }) as CentralTeamMember[];
    },
    staleTime: 30 * 1000, // Cache 30s
  });

  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Clear brand_role (keep local_role if any)
      const { error } = await supabase
        .from('user_roles_v2')
        .update({ brand_role: null })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['central-team-v2'] });
      queryClient.invalidateQueries({ queryKey: ['user-role-v2'] });
      toast.success('Usuario removido del equipo central');
    },
    onError: () => {
      toast.error('Error al remover usuario');
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: BrandRole }) => {
      // First find user by email (profiles.id = user_id after migration)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (profileError || !profile) {
        throw new Error('Usuario no encontrado. Debe registrarse primero.');
      }

      const userId = profile.id; // profiles.id IS the user_id

      // Check if user already has a role record
      const { data: existing } = await supabase
        .from('user_roles_v2')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('user_roles_v2')
          .update({ brand_role: role })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase.from('user_roles_v2').insert({
          user_id: userId,
          brand_role: role,
          local_role: null,
          branch_ids: [],
          is_active: true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['central-team-v2'] });
      setInviteEmail('');
      toast.success('Usuario agregado al equipo central');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast.error('Ingresá un email');
      return;
    }
    inviteMutation.mutate({ email: inviteEmail.trim(), role: inviteRole });
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  const getRoleLabel = (role: BrandRole) => {
    if (!role) return 'Sin rol';
    return BRAND_ROLE_LABELS[role] || role;
  };

  const getRoleVariant = (role: BrandRole): 'default' | 'secondary' | 'outline' => {
    switch (role) {
      case 'superadmin':
        return 'default';
      case 'coordinador':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-96 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipo Central"
        subtitle="Usuarios con acceso a la administración de la marca"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {teamMembers?.length || 0} usuario{teamMembers?.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {teamMembers?.map((member) => (
            <div
              key={member.user_id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{getInitials(member.full_name, member.email)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{member.full_name || member.email}</p>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Desde{' '}
                    {formatDistanceToNow(new Date(member.created_at), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getRoleVariant(member.brand_role)}>
                  {getRoleLabel(member.brand_role)}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => removeMutation.mutate(member.user_id)}
                  disabled={removeMutation.isPending}
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {(!teamMembers || teamMembers.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              No hay usuarios en el equipo central
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Agregar al equipo central
          </CardTitle>
          <CardDescription>El usuario debe haberse registrado previamente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="usuario@email.com"
              />
            </div>
            <div className="w-full sm:w-48 space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Select value={inviteRole || ''} onValueChange={(v) => setInviteRole(v as BrandRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRAND_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div>
                        <span className="font-medium">{role.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({role.description})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleInvite} disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? 'Agregando...' : 'Invitar'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
