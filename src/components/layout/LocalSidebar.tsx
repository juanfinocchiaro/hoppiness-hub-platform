/**
 * LocalSidebar - Navegación específica para Mi Local usando WorkSidebar
 * 
 * Dominios:
 * - Dashboard (link directo)
 * - RRHH: Equipo, Coaching, Horarios, Fichajes, Adelantos, Apercibimientos, Reglamentos
 * - Comunicación: Comunicados
 * - Configuración: Turnos
 */
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Clock,
  DollarSign,
  FileText,
  MessageSquare,
  ClipboardList,
  Settings,
  AlertTriangle,
} from 'lucide-react';
import {
  WorkSidebarNav,
  NavSectionGroup,
  NavItemButton,
  NavDashboardLink,
} from './WorkSidebar';

interface LocalSidebarProps {
  branchId: string;
  permissions: {
    canViewDashboard: boolean;
    canViewTeam: boolean;
    canEditSchedules: boolean;
    canViewAllClockIns: boolean;
    canDoCoaching: boolean;
    canConfigPrinters: boolean;
    canViewWarnings?: boolean;
  };
}

export function LocalSidebar({ branchId, permissions }: LocalSidebarProps) {
  const location = useLocation();
  const basePath = `/milocal/${branchId}`;
  
  // Check if team section has any active item
  const teamPaths = ['equipo', 'equipo/coaching', 'equipo/horarios', 'equipo/fichajes', 'equipo/adelantos', 'equipo/apercibimientos', 'equipo/reglamentos', 'equipo/comunicados'];
  const isTeamActive = teamPaths.some(path => {
    const fullPath = `${basePath}/${path}`;
    return location.pathname === fullPath || location.pathname.startsWith(`${fullPath}/`);
  });

  // Check if config section has any active item
  const isConfigActive = location.pathname.startsWith(`${basePath}/config`);

  const { canViewDashboard, canViewTeam, canEditSchedules, canViewAllClockIns, canDoCoaching, canConfigPrinters, canViewWarnings } = permissions;

  return (
    <WorkSidebarNav>
      {/* Dashboard - Link directo */}
      {canViewDashboard && (
        <NavDashboardLink
          to={basePath}
          icon={LayoutDashboard}
          label="Dashboard"
        />
      )}

      {/* Equipo Section */}
      {(canViewTeam || canViewAllClockIns) && (
        <NavSectionGroup
          id="equipo"
          label="Equipo"
          icon={Users}
          defaultOpen
          forceOpen={isTeamActive}
        >
          {canViewTeam && (
            <NavItemButton to={`${basePath}/equipo`} icon={Users} label="Mi Equipo" exact />
          )}
          {canDoCoaching && (
            <NavItemButton to={`${basePath}/equipo/coaching`} icon={ClipboardList} label="Coaching" />
          )}
          {canEditSchedules && (
            <NavItemButton to={`${basePath}/equipo/horarios`} icon={Clock} label="Horarios" />
          )}
          {canViewAllClockIns && (
            <NavItemButton to={`${basePath}/equipo/fichajes`} icon={Clock} label="Fichajes" />
          )}
          {canViewTeam && (
            <NavItemButton to={`${basePath}/equipo/adelantos`} icon={DollarSign} label="Adelantos" />
          )}
          {canViewWarnings && (
            <NavItemButton to={`${basePath}/equipo/apercibimientos`} icon={AlertTriangle} label="Apercibimientos" />
          )}
          {canEditSchedules && (
            <NavItemButton to={`${basePath}/equipo/reglamentos`} icon={FileText} label="Firmas Reglamento" />
          )}
          {canViewTeam && (
            <NavItemButton to={`${basePath}/equipo/comunicados`} icon={MessageSquare} label="Comunicados" />
          )}
        </NavSectionGroup>
      )}

      {/* Configuración Section */}
      {canConfigPrinters && (
        <NavSectionGroup
          id="config"
          label="Configuración"
          icon={Settings}
          forceOpen={isConfigActive}
        >
          <NavItemButton to={`${basePath}/config/turnos`} icon={Clock} label="Turnos" />
        </NavSectionGroup>
      )}
    </WorkSidebarNav>
  );
}

export default LocalSidebar;
