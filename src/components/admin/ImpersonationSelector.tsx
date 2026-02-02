/**
 * ImpersonationSelector - Selector de usuario para "Ver como..."
 * 
 * Modal con búsqueda de usuarios para que el superadmin seleccione quién impersonar.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, User, Loader2, Eye, Building2 } from 'lucide-react';
import { LOCAL_ROLE_LABELS, BRAND_ROLE_LABELS } from '@/hooks/usePermissionsV2';
import { toast } from 'sonner';

interface ImpersonationSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UserWithRoles {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  brand_role: string | null;
  local_roles: { role: string; branch_name: string }[];
}

export default function ImpersonationSelector({ open, onOpenChange }: ImpersonationSelectorProps) {
  const { startImpersonating, loading: impersonating } = useImpersonation();
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Fetch users with their roles
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['impersonation-users', search],
    queryFn: async () => {
      // Fetch profiles
      let query = supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('is_active', true)
        .order('full_name')
        .limit(50);

      if (search.trim()) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data: profiles, error } = await query;
      if (error) throw error;
      if (!profiles || profiles.length === 0) return [];

      const userIds = profiles.map(p => p.id);

      // Fetch brand roles
      const { data: brandRoles } = await supabase
        .from('user_roles_v2')
        .select('user_id, brand_role')
        .in('user_id', userIds)
        .eq('is_active', true);

      // Fetch branch roles with branch names
      const { data: branchRoles } = await supabase
        .from('user_branch_roles')
        .select('user_id, local_role, branches!inner(name)')
        .in('user_id', userIds)
        .eq('is_active', true);

      // Combine data
      const usersWithRoles: UserWithRoles[] = profiles.map(profile => {
        const brandRole = brandRoles?.find(r => r.user_id === profile.id);
        const localRoles = branchRoles
          ?.filter(r => r.user_id === profile.id)
          .map(r => ({
            role: r.local_role,
            branch_name: (r.branches as { name: string })?.name || 'Desconocido',
          })) || [];

        return {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          avatar_url: profile.avatar_url,
          brand_role: brandRole?.brand_role || null,
          local_roles: localRoles,
        };
      });

      return usersWithRoles;
    },
    enabled: open,
    staleTime: 30000,
  });

  const handleSelect = async (userId: string) => {
    setSelectedUserId(userId);
    try {
      await startImpersonating(userId);
      toast.success('Modo vista previa activado');
      onOpenChange(false);
      setSearch('');
      setSelectedUserId(null);
    } catch (error) {
      toast.error('Error al activar modo vista previa');
      setSelectedUserId(null);
    }
  };

  const getRoleBadges = (user: UserWithRoles) => {
    const badges: React.ReactNode[] = [];

    if (user.brand_role) {
      badges.push(
        <Badge key="brand" variant="default" className="bg-primary/80">
          {BRAND_ROLE_LABELS[user.brand_role] || user.brand_role}
        </Badge>
      );
    }

    user.local_roles.slice(0, 2).forEach((lr, idx) => {
      badges.push(
        <Badge key={`local-${idx}`} variant="secondary" className="text-xs">
          {LOCAL_ROLE_LABELS[lr.role] || lr.role} - {lr.branch_name}
        </Badge>
      );
    });

    if (user.local_roles.length > 2) {
      badges.push(
        <Badge key="more" variant="outline" className="text-xs">
          +{user.local_roles.length - 2} más
        </Badge>
      );
    }

    if (badges.length === 0) {
      badges.push(
        <Badge key="none" variant="outline" className="text-muted-foreground">
          Sin rol
        </Badge>
      );
    }

    return badges;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Ver como otro usuario
          </DialogTitle>
          <DialogDescription>
            Seleccioná un usuario para ver la aplicación desde su perspectiva. 
            Las operaciones de base de datos seguirán siendo tuyas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          {/* Users List */}
          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {search ? 'No se encontraron usuarios' : 'Escribí para buscar usuarios'}
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelect(user.id)}
                    disabled={impersonating && selectedUserId === user.id}
                    className="w-full p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>
                          <User className="w-5 h-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{user.full_name}</span>
                          {impersonating && selectedUserId === user.id && (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {getRoleBadges(user)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
