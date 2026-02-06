/**
 * BrandSidebar - Navegación específica para Mi Marca usando WorkSidebar
 * 
 * Estructura reorganizada:
 * - Dashboard
 * - Sucursales (antes "Mis Locales")
 * - Coaching: Encargados, Red
 * - Personas: Equipo de Marca, Usuarios
 * - Comunicación: Bandeja de Entrada, Comunicados
 * - Configuración: Reglamentos, Cierre de Turno, Permisos
 * - [Footer] Ver como... (solo superadmins)
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'react-router-dom';
import { useUnreadMessagesCount } from '@/hooks/useContactMessages';
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
  CalendarDays,
  Calendar,
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
  
  const [showNewBranchModal, setShowNewBranchModal] = useState(false);

  // Fetch branches for dynamic menu
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

  // Check active sections
  const isSucursalesActive = location.pathname.includes('/mimarca/locales');
  const isCoachingActive = location.pathname.includes('/mimarca/coaching');
  const isPersonasActive = location.pathname.includes('/mimarca/usuarios') || location.pathname.includes('/mimarca/equipo-central');
  const isComunicacionActive = location.pathname.includes('/mimarca/mensajes') || location.pathname.includes('/mimarca/comunicados') || location.pathname.includes('/mimarca/reuniones');
  const isConfigActive = location.pathname.includes('/mimarca/reglamentos') || location.pathname.includes('/mimarca/configuracion');

  return (
    <>
      <WorkSidebarNav>
        {/* Dashboard - Link directo */}
        <NavDashboardLink
          to="/mimarca"
          icon={LayoutDashboard}
          label="Dashboard"
        />

        {/* Sucursales Section (antes "Mis Locales") */}
        <NavSectionGroup
          id="sucursales"
          label="Sucursales"
          icon={Store}
          defaultOpen
          forceOpen={isSucursalesActive}
        >
          <NavActionButton
            icon={Plus}
            label="Nueva Sucursal"
            onClick={() => setShowNewBranchModal(true)}
            variant="primary"
          />
          {branches?.map((branch) => (
            <NavItemButton
              key={branch.id}
              to={`/mimarca/locales/${branch.slug}`}
              icon={MapPin}
              label={branch.name}
            />
          ))}
        </NavSectionGroup>

        {/* Coaching Section - NUEVO */}
        <NavSectionGroup
          id="coaching"
          label="Coaching"
          icon={ClipboardList}
          forceOpen={isCoachingActive}
        >
          <NavItemButton to="/mimarca/coaching/encargados" icon={Users} label="Encargados" />
          <NavItemButton to="/mimarca/coaching/red" icon={BarChart3} label="Red" />
        </NavSectionGroup>

        {/* Personas Section */}
        <NavSectionGroup
          id="personas"
          label="Personas"
          icon={Users}
          defaultOpen
          forceOpen={isPersonasActive}
        >
          <NavItemButton to="/mimarca/equipo-central" icon={Building2} label="Equipo de Marca" />
          <NavItemButton to="/mimarca/usuarios" icon={Users} label="Usuarios" />
        </NavSectionGroup>

        {/* Comunicación Section */}
        <NavSectionGroup
          id="comunicacion"
          label="Comunicación"
          icon={Megaphone}
          forceOpen={isComunicacionActive}
        >
          <NavItemButton
            to="/mimarca/mensajes"
            icon={MessageSquare}
            label="Bandeja de Entrada"
            badge={unreadCount || undefined}
            badgeVariant="warning"
          />
          <NavItemButton to="/mimarca/comunicados" icon={Megaphone} label="Comunicados" />
          <NavItemButton to="/mimarca/reuniones" icon={Calendar} label="Reuniones" />
        </NavSectionGroup>

        {/* Configuración Section */}
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
      </WorkSidebarNav>

      {/* Modals */}
      <NewBranchModal
        open={showNewBranchModal}
        onOpenChange={setShowNewBranchModal}
        onCreated={refetchBranches}
      />
    </>
  );
}

export default BrandSidebar;
