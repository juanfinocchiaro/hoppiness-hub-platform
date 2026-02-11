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
  const isCatalogosActive = location.pathname.includes('/mimarca/finanzas/insumos') || location.pathname.includes('/mimarca/finanzas/proveedores') || location.pathname.includes('/mimarca/finanzas/conceptos-servicio');
  const isFinanzasActive = (location.pathname.includes('/mimarca/finanzas') && !isCatalogosActive);
  const isPersonasActive = location.pathname.includes('/mimarca/usuarios') || location.pathname.includes('/mimarca/equipo-central') || location.pathname.includes('/mimarca/coaching');
  const isComunicacionActive = location.pathname.includes('/mimarca/mensajes') || location.pathname.includes('/mimarca/comunicados') || location.pathname.includes('/mimarca/reuniones');
  const isConfigActive = location.pathname.includes('/mimarca/reglamentos') || location.pathname.includes('/mimarca/configuracion');
  const isMenuActive = location.pathname.includes('/mimarca/menu');
  const isCentroCostosActive = location.pathname.includes('/mimarca/centro-costos');

  // Section visibility
  const canSeeRed = bp.canViewLocales;
  const canSeeCatalogos = bp.canViewInsumos || bp.canViewConceptosServicio || bp.canViewProveedoresMarca;
  const canSeeFinanzas = bp.canViewVentasMensuales || bp.canViewCanon;
  const canSeePersonas = bp.canViewCentralTeam || bp.canCoachManagers || bp.canViewCoaching || bp.canSearchUsers;
  const canSeeComunicacion = bp.canViewContactMessages || bp.canManageMessages || bp.canViewMeetings;
  const canSeeConfig = bp.canEditBrandConfig || isSuperadmin;
  const canSeeMenu = bp.canViewInsumos;
  const canSeeCentroCostos = bp.canViewInsumos && isSuperadmin;

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

        {/* ═══ CATÁLOGOS MARCA ═══ */}
        {canSeeCatalogos && (
          <NavSectionGroup
            id="catalogos"
            label="Catálogos Marca"
            icon={Package}
            forceOpen={isCatalogosActive}
          >
            {bp.canViewInsumos && (
              <NavItemButton to="/mimarca/finanzas/insumos" icon={Package} label="Ingredientes e Insumos" />
            )}
            {bp.canViewConceptosServicio && (
              <NavItemButton to="/mimarca/finanzas/conceptos-servicio" icon={FileText} label="Servicios Recurrentes" />
            )}
            {bp.canViewProveedoresMarca && (
              <NavItemButton to="/mimarca/finanzas/proveedores" icon={Truck} label="Proveedores" />
            )}
          </NavSectionGroup>
        )}

        {/* ═══ MENÚ ═══ */}
        {canSeeMenu && (
          <NavSectionGroup id="menu" label="Menú" icon={UtensilsCrossed} forceOpen={isMenuActive}>
            <NavItemButton to="/mimarca/menu/carta" icon={BookOpen} label="Carta" />
            <NavItemButton to="/mimarca/menu/canales" icon={CreditCard} label="Canales y Precios" />
          </NavSectionGroup>
        )}

        {/* ═══ CENTRO DE COSTOS ═══ */}
        {canSeeCentroCostos && (
          <NavSectionGroup id="centro-costos" label="Centro de Costos" icon={Calculator} forceOpen={isCentroCostosActive}>
            <NavItemButton to="/mimarca/centro-costos" icon={Calculator} label="Panel de Control" />
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
