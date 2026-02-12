/**
 * BrandSidebar - Navegación de Mi Marca controlada por permisos dinámicos
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'react-router-dom';
import { useUnreadMessagesCount } from '@/hooks/useContactMessages';
import { useDynamicPermissions } from '@/hooks/useDynamicPermissions';
import {
  LayoutDashboard,
  Store,
  Users,
  Megaphone,
  Settings,
  MapPin,
  Plus,
  Building2,
  MessageSquare,
  FileText,
  Shield,
  ClipboardList,
  BarChart3,
  Wallet,
  Package,
  Truck,
  Landmark,
  TrendingUp,
  CalendarDays,
  Calendar,
  Eye,
  UtensilsCrossed,
  Calculator,
  BookOpen,
  CreditCard,
  ChefHat,
  FolderOpen,
  Beef,
} from 'lucide-react';
import {
  WorkSidebarNav,
  NavSectionGroup,
  NavItemButton,
  NavDashboardLink,
  NavActionButton,
} from './WorkSidebar';
import NewBranchModal from '@/components/admin/NewBranchModal';

export function BrandSidebar() {
  const location = useLocation();
  const { data: unreadCount } = useUnreadMessagesCount();
  const { brand: bp, isSuperadmin } = useDynamicPermissions();
  const [showNewBranchModal, setShowNewBranchModal] = useState(false);

  const { data: branches, refetch: refetchBranches } = useQuery({
    queryKey: ['brand-sidebar-branches'],
    queryFn: async () => {
      const { data } = await supabase
        .from('branches')
        .select('id, name, slug')
        .order('name');
      return data || [];
    },
  });

  // Active section detection
  const isRedActive = location.pathname.includes('/mimarca/locales') || location.pathname.includes('/mimarca/supervisiones');
  const isMenuEngActive = location.pathname.includes('/mimarca/finanzas/insumos') || location.pathname.includes('/mimarca/finanzas/proveedores') || location.pathname.includes('/mimarca/recetas') || location.pathname.includes('/mimarca/carta') || location.pathname === '/mimarca/centro-costos';
  const isFinanzasActive = location.pathname.includes('/mimarca/finanzas') && !location.pathname.includes('/mimarca/finanzas/insumos') && !location.pathname.includes('/mimarca/finanzas/proveedores');
  const isPersonasActive = location.pathname.includes('/mimarca/usuarios') || location.pathname.includes('/mimarca/equipo-central') || location.pathname.includes('/mimarca/coaching');
  const isComunicacionActive = location.pathname.includes('/mimarca/mensajes') || location.pathname.includes('/mimarca/comunicados') || location.pathname.includes('/mimarca/reuniones');
  const isConfigActive = location.pathname.includes('/mimarca/reglamentos') || location.pathname.includes('/mimarca/configuracion');

  // Section visibility
  const canSeeRed = bp.canViewLocales;
  const canSeeMenuEng = bp.canViewInsumos || bp.canViewProveedoresMarca;
  const canSeeFinanzas = bp.canViewVentasMensuales || bp.canViewCanon || bp.canViewConceptosServicio;
  const canSeePersonas = bp.canViewCentralTeam || bp.canCoachManagers || bp.canViewCoaching || bp.canSearchUsers;
  const canSeeComunicacion = bp.canViewContactMessages || bp.canManageMessages || bp.canViewMeetings;
  const canSeeConfig = bp.canEditBrandConfig || isSuperadmin;

  return (
    <>
      <WorkSidebarNav>
        {/* Dashboard */}
        {bp.canViewDashboard && (
          <NavDashboardLink to="/mimarca" icon={LayoutDashboard} label="Dashboard" />
        )}

        {/* ═══ RED DE LOCALES ═══ */}
        {canSeeRed && (
          <NavSectionGroup
            id="red"
            label="Red de Locales"
            icon={Store}
            defaultOpen
            forceOpen={isRedActive}
          >
            {bp.canCreateLocales && (
              <NavActionButton
                icon={Plus}
                label="Nueva Sucursal"
                onClick={() => setShowNewBranchModal(true)}
                variant="primary"
              />
            )}
            {branches?.map((branch) => (
              <NavItemButton
                key={branch.id}
                to={`/mimarca/locales/${branch.slug}`}
                icon={MapPin}
                label={branch.name}
              />
            ))}
            <NavItemButton to="/mimarca/supervisiones" icon={Eye} label="Supervisión" />
          </NavSectionGroup>
        )}

        {/* ═══ INGENIERÍA DE MENÚ ═══ */}
        {canSeeMenuEng && (
          <NavSectionGroup
            id="menu-eng"
            label="Ingeniería de Menú"
            icon={Beef}
            forceOpen={isMenuEngActive}
          >
            {bp.canViewInsumos && (
              <NavItemButton to="/mimarca/finanzas/insumos" icon={Package} label="Catálogo de Compras" />
            )}
            {bp.canViewProveedoresMarca && (
              <NavItemButton to="/mimarca/finanzas/proveedores" icon={Truck} label="Proveedores" />
            )}
            {bp.canViewInsumos && isSuperadmin && (
              <NavItemButton to="/mimarca/recetas" icon={ChefHat} label="Recetas" />
            )}
            {bp.canViewInsumos && (
              <NavItemButton to="/mimarca/carta" icon={BookOpen} label="Carta" />
            )}
            {bp.canViewInsumos && isSuperadmin && (
              <NavItemButton to="/mimarca/centro-costos" icon={Calculator} label="Control de Costos" />
            )}
          </NavSectionGroup>
        )}

        {/* ═══ FINANZAS MARCA ═══ */}
        {canSeeFinanzas && (
          <NavSectionGroup
            id="finanzas"
            label="Finanzas Marca"
            icon={Wallet}
            forceOpen={isFinanzasActive}
          >
            {bp.canViewVentasMensuales && (
              <NavItemButton to="/mimarca/finanzas/ventas-mensuales" icon={TrendingUp} label="Ventas Mensuales" />
            )}
            {bp.canViewCanon && (
              <NavItemButton to="/mimarca/finanzas/canon" icon={Landmark} label="Canon" />
            )}
            {bp.canViewConceptosServicio && (
              <NavItemButton to="/mimarca/finanzas/conceptos-servicio" icon={FileText} label="Servicios Recurrentes" />
            )}
          </NavSectionGroup>
        )}

        {/* ═══ GESTIÓN DE PERSONAS ═══ */}
        {canSeePersonas && (
          <NavSectionGroup
            id="personas"
            label="Gestión de Personas"
            icon={Users}
            defaultOpen
            forceOpen={isPersonasActive}
          >
            {bp.canViewCentralTeam && (
              <NavItemButton to="/mimarca/equipo-central" icon={Building2} label="Equipo Central" />
            )}
            {(bp.canCoachManagers || bp.canViewCoaching) && (
              <NavItemButton to="/mimarca/coaching/encargados" icon={ClipboardList} label="Coaching Encargados" />
            )}
            {bp.canViewCoaching && (
              <NavItemButton to="/mimarca/coaching/red" icon={BarChart3} label="Coaching Red" />
            )}
            {bp.canSearchUsers && (
              <NavItemButton to="/mimarca/usuarios" icon={Users} label="Usuarios y Permisos" />
            )}
          </NavSectionGroup>
        )}

        {/* ═══ COMUNICACIÓN ═══ */}
        {canSeeComunicacion && (
          <NavSectionGroup
            id="comunicacion"
            label="Comunicación"
            icon={Megaphone}
            forceOpen={isComunicacionActive}
          >
            {bp.canViewContactMessages && (
              <NavItemButton
                to="/mimarca/mensajes"
                icon={MessageSquare}
                label="Bandeja de Entrada"
                badge={unreadCount || undefined}
                badgeVariant="warning"
              />
            )}
            {bp.canManageMessages && (
              <NavItemButton to="/mimarca/comunicados" icon={Megaphone} label="Comunicados" />
            )}
            {bp.canViewMeetings && (
              <NavItemButton to="/mimarca/reuniones" icon={Calendar} label="Reuniones" />
            )}
          </NavSectionGroup>
        )}

        {/* ═══ CONFIGURACIÓN ═══ */}
        {canSeeConfig && (
          <NavSectionGroup
            id="config"
            label="Configuración"
            icon={Settings}
            forceOpen={isConfigActive}
          >
            <NavItemButton to="/mimarca/configuracion/calendario" icon={CalendarDays} label="Calendario Laboral" />
            <NavItemButton to="/mimarca/reglamentos" icon={FileText} label="Reglamentos" />
            <NavItemButton to="/mimarca/configuracion/cierres" icon={FileText} label="Cierre de Turno" />
            <NavItemButton to="/mimarca/configuracion/permisos" icon={Shield} label="Permisos" />
          </NavSectionGroup>
        )}
      </WorkSidebarNav>

      <NewBranchModal
        open={showNewBranchModal}
        onOpenChange={setShowNewBranchModal}
        onCreated={refetchBranches}
      />
    </>
  );
}

export default BrandSidebar;
