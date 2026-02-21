/**
 * UserMenuDropdown — Avatar/user menu in the store header.
 * Shows profile, orders, addresses for everyone.
 * Shows Mi Trabajo / Mi Local / Mi Marca links for staff/admins.
 */
import { User, Package, MapPin, LogOut, Store, Building2, Briefcase } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useAuthModal } from '@/contexts/AuthModalContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UserMenuDropdownProps {
  onMisPedidos?: () => void;
  onMisDirecciones?: () => void;
  onMiPerfil?: () => void;
}

export function UserMenuDropdown({ onMisPedidos, onMisDirecciones, onMiPerfil }: UserMenuDropdownProps = {}) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { openAuthModal } = useAuthModal();

  // Check roles for staff links
  const { data: roles } = useQuery({
    queryKey: ['user-menu-roles', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_roles_v2')
        .select('brand_role, local_role, branch_ids')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 60000,
  });

  const hasLocalRole = !!roles?.local_role;
  const canAccessLocal = hasLocalRole || !!roles?.brand_role;
  const canAccessBrand = !!roles?.brand_role;
  const firstBranchId = roles?.branch_ids?.[0];
  // Staff without Mi Local/Mi Marca access still has "Mi Trabajo" (/cuenta)
  const showMiTrabajo = hasLocalRole && !canAccessBrand && !firstBranchId;

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  if (!user) {
    return (
      <button
        onClick={() => openAuthModal()}
        className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
        title="Iniciar sesión"
      >
        <User className="w-5 h-5" />
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full hover:ring-2 hover:ring-primary/30 transition-all">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-3 py-2">
          <p className="text-sm font-semibold text-foreground truncate">
            {user.user_metadata?.full_name || 'Mi cuenta'}
          </p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        {(onMisPedidos || onMisDirecciones || onMiPerfil) && <DropdownMenuSeparator />}
        {onMisPedidos && (
          <DropdownMenuItem onClick={onMisPedidos}>
            <Package className="w-4 h-4 mr-2" />
            Mis pedidos
          </DropdownMenuItem>
        )}
        {onMisDirecciones && (
          <DropdownMenuItem onClick={onMisDirecciones}>
            <MapPin className="w-4 h-4 mr-2" />
            Mis direcciones
          </DropdownMenuItem>
        )}
        {onMiPerfil && (
          <DropdownMenuItem onClick={onMiPerfil}>
            <User className="w-4 h-4 mr-2" />
            Mi perfil
          </DropdownMenuItem>
        )}

        {(canAccessLocal || canAccessBrand || showMiTrabajo) && <DropdownMenuSeparator />}
        {showMiTrabajo && (
          <DropdownMenuItem onClick={() => navigate('/cuenta')}>
            <Briefcase className="w-4 h-4 mr-2" />
            Ir a Mi Trabajo
          </DropdownMenuItem>
        )}
        {canAccessLocal && (
          <DropdownMenuItem onClick={() => navigate(firstBranchId ? `/milocal/${firstBranchId}` : '/milocal')}>
            <Store className="w-4 h-4 mr-2" />
            Ir a Mi Local
          </DropdownMenuItem>
        )}
        {canAccessBrand && (
          <DropdownMenuItem onClick={() => navigate('/mimarca')}>
            <Building2 className="w-4 h-4 mr-2" />
            Ir a Mi Marca
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOut className="w-4 h-4 mr-2" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
