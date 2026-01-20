import { useState } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Users, Plus, UserMinus, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface CentralTeamMember {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
}

const BRAND_ROLES = [
  { value: 'admin', label: 'Admin', description: 'Gestión completa' },
  { value: 'coordinador', label: 'Coordinador', description: 'Catálogo, proveedores' },
  { value: 'socio', label: 'Socio', description: 'Solo lectura de reportes' },
] as const;

export default function CentralTeam() {
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('admin');

  const { data: teamMembers, isLoading } = useQuery({
    queryKey: ['central-team'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          created_at,
          profiles!inner(full_name, email)
        `)
        .is('branch_id', null)
        .in('role', ['admin', 'coordinador', 'socio'])
        .eq('is_active', true)
        .order('created_at');

      if (error) throw error;

      return (data || []).map((item: any) => ({
        user_id: item.user_id,
        email: item.profiles?.email || '',
        full_name: item.profiles?.full_name || '',
        role: item.role,
        created_at: item.created_at,
      })) as CentralTeamMember[];
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .is('branch_id', null)
        .in('role', ['admin', 'coordinador', 'socio']);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['central-team'] });
      toast.success('Usuario removido del equipo central');
    },
    onError: () => {
      toast.error('Error al remover usuario');
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      // First find user by email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', email)
        .single();

      if (profileError || !profile) {
        throw new Error('Usuario no encontrado. Debe registrarse primero.');
      }

      // Assign role - insert new record
      const { error } = await supabase.from('user_roles').insert({
        user_id: profile.user_id,
        role: role as 'admin' | 'coordinador' | 'socio',
        branch_id: null,
        is_active: true,
      });

      if (error) {
        if (error.code === '23505') {
          throw new Error('Este usuario ya tiene este rol asignado');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['central-team'] });
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

  const getRoleLabel = (role: string) => {
    return BRAND_ROLES.find((r) => r.value === role)?.label || role;
  };

  const getRoleVariant = (role: string): 'default' | 'secondary' | 'outline' => {
    switch (role) {
      case 'admin':
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
      <div>
        <h1 className="text-3xl font-bold">Equipo Central</h1>
        <p className="text-muted-foreground">
          Usuarios con acceso a la administración de la marca
        </p>
      </div>

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
                  <AvatarFallback>
                    {getInitials(member.full_name, member.email)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {member.full_name || member.email}
                  </p>
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
                <Badge variant={getRoleVariant(member.role)}>
                  {getRoleLabel(member.role)}
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
          <CardDescription>
            El usuario debe haberse registrado previamente
          </CardDescription>
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
              <Select value={inviteRole} onValueChange={setInviteRole}>
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
              <Button
                onClick={handleInvite}
                disabled={inviteMutation.isPending}
              >
                {inviteMutation.isPending ? 'Agregando...' : 'Invitar'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
