/**
 * UserMenuDropdown — Unified avatar/user menu used across the entire app.
 * Structure: identity → personal (pedidos, direcciones, perfil) → La Tienda →
 * work panels (Mi Trabajo, Mi Local, Mi Marca) when user has roles → Cerrar sesión last.
 */
import { User, Package, MapPin, LogOut, Store, Building2, Briefcase, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { useAccountSheets } from '@/contexts/AccountSheetsContext';
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

export function UserMenuDropdown() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { openAuthModal } = useAuthModal();
  const { openMisPedidos, openDirecciones, openPerfil } = useAccountSheets();

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
  const showMiTrabajo = canAccessLocal || canAccessBrand;

  const isInStore = location.pathname.startsWith('/pedir');

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

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={openMisPedidos}>
          <Package className="w-4 h-4 mr-2" />
          Mis pedidos
        </DropdownMenuItem>
        <DropdownMenuItem onClick={openDirecciones}>
          <MapPin className="w-4 h-4 mr-2" />
          Mis direcciones
        </DropdownMenuItem>
        <DropdownMenuItem onClick={openPerfil}>
          <User className="w-4 h-4 mr-2" />
          Mi perfil
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        {!isInStore && (
          <DropdownMenuItem onClick={() => navigate('/pedir')}>
            <ShoppingBag className="w-4 h-4 mr-2" />
            La Tienda
          </DropdownMenuItem>
        )}

        {(showMiTrabajo || canAccessLocal || canAccessBrand) && <DropdownMenuSeparator />}
        {showMiTrabajo && (
          <DropdownMenuItem onClick={() => navigate('/cuenta')}>
            <Briefcase className="w-4 h-4 mr-2" />
            Mi Trabajo
          </DropdownMenuItem>
        )}
        {canAccessLocal && (
          <DropdownMenuItem onClick={() => navigate(firstBranchId ? `/milocal/${firstBranchId}` : '/milocal')}>
            <Store className="w-4 h-4 mr-2" />
            Mi Local
          </DropdownMenuItem>
        )}
        {canAccessBrand && (
          <DropdownMenuItem onClick={() => navigate('/mimarca')}>
            <Building2 className="w-4 h-4 mr-2" />
            Mi Marca
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
