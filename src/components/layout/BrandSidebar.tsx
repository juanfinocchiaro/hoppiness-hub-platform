/**
 * BrandSidebar - Navegación de Mi Marca (7 secciones funcionales)
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
  Calculator,
  BookOpen,
  ChefHat,
  Beef,
  Network,
  Boxes,
  Briefcase,
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

  const p = location.pathname;

  // Active section detection
  const isLocalesActive = p.includes('/mimarca/locales');
  const isMenuEngActive = p.includes('/mimarca/finanzas/insumos') || p.includes('/mimarca/finanzas/proveedores') || p.includes('/mimarca/recetas') || p.includes('/mimarca/carta') || p === '/mimarca/centro-costos';
  const isGestionRedActive = p.includes('/mimarca/supervisiones') || p.includes('/mimarca/coaching') || p.includes('/mimarca/comunicados') || p.includes('/mimarca/reuniones');
  const isModeloOpActive = p.includes('/mimarca/finanzas/conceptos-servicio') || p.includes('/mimarca/configuracion/calendario') || p.includes('/mimarca/reglamentos') || p.includes('/mimarca/configuracion/cierres');
  const isFinanzasActive = p.includes('/mimarca/finanzas/ventas-mensuales') || p.includes('/mimarca/finanzas/canon');
  const isAdminActive = p.includes('/mimarca/mensajes') || p.includes('/mimarca/equipo-central') || p.includes('/mimarca/usuarios') || p.includes('/mimarca/configuracion/permisos');

  // Section visibility
  const canSeeLocales = bp.canViewLocales;
  const canSeeMenuEng = bp.canViewInsumos || bp.canViewProveedoresMarca;
  const canSeeGestionRed = bp.canCoachManagers || bp.canViewCoaching || bp.canManageMessages || bp.canViewMeetings;
  const canSeeModeloOp = bp.canEditBrandConfig || bp.canViewConceptosServicio || isSuperadmin;
  const canSeeFinanzas = bp.canViewVentasMensuales || bp.canViewCanon;
  const canSeeAdmin = bp.canViewContactMessages || bp.canViewCentralTeam || bp.canSearchUsers || isSuperadmin;

  return (
    <>
      <WorkSidebarNav>
        {/* Dashboard */}
        {bp.canViewDashboard && (
          <NavDashboardLink to="/mimarca" icon={LayoutDashboard} label="Dashboard" />
        )}

        {/* ═══ LOCALES ═══ */}
        {canSeeLocales && (
          <NavSectionGroup
            id="locales"
            label="Locales"
            icon={Store}
            defaultOpen
            forceOpen={isLocalesActive}
          >
            {branches?.map((branch) => (
              <NavItemButton
                key={branch.id}
                to={`/mimarca/locales/${branch.slug}`}
                icon={MapPin}
                label={branch.name}
              />
            ))}
            {bp.canCreateLocales && (
              <NavActionButton
                icon={Plus}
                label="Nueva Sucursal"
                onClick={() => setShowNewBranchModal(true)}
                variant="primary"
              />
            )}
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

        {/* ═══ GESTIÓN DE RED ═══ */}
        {canSeeGestionRed && (
          <NavSectionGroup
            id="gestion-red"
            label="Gestión de Red"
            icon={Network}
            forceOpen={isGestionRedActive}
          >
            <NavItemButton to="/mimarca/supervisiones" icon={Eye} label="Supervisión" />
            {(bp.canCoachManagers || bp.canViewCoaching) && (
              <NavItemButton to="/mimarca/coaching/encargados" icon={ClipboardList} label="Coaching Encargados" />
            )}
            {bp.canViewCoaching && (
              <NavItemButton to="/mimarca/coaching/red" icon={BarChart3} label="Coaching Red" />
            )}
            {bp.canManageMessages && (
              <NavItemButton to="/mimarca/comunicados" icon={Megaphone} label="Comunicados" />
            )}
            {bp.canViewMeetings && (
              <NavItemButton to="/mimarca/reuniones" icon={Calendar} label="Reuniones" />
            )}
          </NavSectionGroup>
        )}

        {/* ═══ MODELO OPERATIVO ═══ */}
        {canSeeModeloOp && (
          <NavSectionGroup
            id="modelo-op"
            label="Modelo Operativo"
            icon={Boxes}
            forceOpen={isModeloOpActive}
          >
            {bp.canViewConceptosServicio && (
              <NavItemButton to="/mimarca/finanzas/conceptos-servicio" icon={FileText} label="Estructura de Costos" />
            )}
            <NavItemButton to="/mimarca/configuracion/calendario" icon={CalendarDays} label="Calendario Laboral" />
            <NavItemButton to="/mimarca/reglamentos" icon={FileText} label="Reglamentos" />
            <NavItemButton to="/mimarca/configuracion/cierres" icon={FileText} label="Cierre de Turno" />
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

        {/* ═══ ADMINISTRACIÓN ═══ */}
        {canSeeAdmin && (
          <NavSectionGroup
            id="admin"
            label="Administración"
            icon={Briefcase}
            forceOpen={isAdminActive}
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
            {bp.canViewCentralTeam && (
              <NavItemButton to="/mimarca/equipo-central" icon={Building2} label="Equipo Central" />
            )}
            {bp.canSearchUsers && (
              <NavItemButton to="/mimarca/usuarios" icon={Users} label="Usuarios y Permisos" />
            )}
            {isSuperadmin && (
              <NavItemButton to="/mimarca/configuracion/permisos" icon={Shield} label="Config. Permisos" />
            )}
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
