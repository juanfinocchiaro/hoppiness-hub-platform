/**
 * BrandSidebar - Navegación específica para Mi Marca usando WorkSidebar
 * 
 * Dominios:
 * - Dashboard
 * - Mis Locales (dinámico)
 * - Usuarios
 * - Comunicación
 * - Configuración
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'react-router-dom';
import { useImpersonation } from '@/contexts/ImpersonationContext';
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
  Search,
  MessageSquare,
  FileText,
  Shield,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  WorkSidebarNav,
  NavSectionGroup,
  NavItemButton,
  NavDashboardLink,
  NavActionButton,
} from './WorkSidebar';
import NewBranchModal from '@/components/admin/NewBranchModal';
import ImpersonationSelector from '@/components/admin/ImpersonationSelector';

export function BrandSidebar() {
  const location = useLocation();
  const { canImpersonate, isImpersonating } = useImpersonation();
  const { data: unreadCount } = useUnreadMessagesCount();
  
  const [showNewBranchModal, setShowNewBranchModal] = useState(false);
  const [showImpersonationSelector, setShowImpersonationSelector] = useState(false);

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
  const isLocalesActive = location.pathname.includes('/mimarca/locales');
  const isPersonasActive = location.pathname.includes('/mimarca/usuarios') || location.pathname.includes('/mimarca/equipo-central');
  const isComunicacionActive = location.pathname.includes('/mimarca/mensajes') || location.pathname.includes('/mimarca/comunicados');
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

        {/* Impersonation button - Only for superadmins */}
        {canImpersonate && (
          <Button
            variant={isImpersonating ? 'secondary' : 'ghost'}
            className={`w-full justify-start ${isImpersonating ? 'bg-amber-100 text-amber-900 hover:bg-amber-200' : ''}`}
            onClick={() => setShowImpersonationSelector(true)}
          >
            <Eye className="w-4 h-4 mr-3" />
            Ver como...
          </Button>
        )}

        {/* Mis Locales Section */}
        <NavSectionGroup
          id="locales"
          label="Mis Locales"
          icon={Store}
          defaultOpen
          forceOpen={isLocalesActive}
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

        {/* Usuarios Section */}
        <NavSectionGroup
          id="personas"
          label="Usuarios"
          icon={Users}
          defaultOpen
          forceOpen={isPersonasActive}
        >
          <NavItemButton to="/mimarca/equipo-central" icon={Building2} label="Equipo Central" />
          <NavItemButton to="/mimarca/usuarios" icon={Search} label="Todos los Usuarios" />
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
            label="Mensajes de Contacto"
            badge={unreadCount || undefined}
            badgeVariant="warning"
          />
          <NavItemButton to="/mimarca/comunicados" icon={Megaphone} label="Comunicados" />
        </NavSectionGroup>

        {/* Configuración Section */}
        <NavSectionGroup
          id="config"
          label="Configuración"
          icon={Settings}
          forceOpen={isConfigActive}
        >
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
      <ImpersonationSelector
        open={showImpersonationSelector}
        onOpenChange={setShowImpersonationSelector}
        mode="brand"
      />
    </>
  );
}

export default BrandSidebar;
