/**
 * LocalSidebar - Navegación específica para Mi Local usando WorkSidebar
 * 
 * Estructura reorganizada:
 * - Dashboard (link directo)
 * - Personal: Equipo, Coaching
 * - Tiempo: Horarios, Fichajes
 * - Administración: Adelantos, Advertencias, Firmas
 * - Comunicados (link directo)
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
  UserCheck,
  CalendarClock,
  Briefcase,
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
  
  // Check if sections have active items
  const personalPaths = ['equipo', 'equipo/coaching'];
  const isPersonalActive = personalPaths.some(path => {
    const fullPath = `${basePath}/${path}`;
    return location.pathname === fullPath || location.pathname.startsWith(`${fullPath}/`);
  });

  const tiempoPaths = ['equipo/horarios', 'equipo/fichajes'];
  const isTiempoActive = tiempoPaths.some(path => {
    const fullPath = `${basePath}/${path}`;
    return location.pathname === fullPath || location.pathname.startsWith(`${fullPath}/`);
  });

  const adminPaths = ['equipo/adelantos', 'equipo/apercibimientos', 'equipo/reglamentos'];
  const isAdminActive = adminPaths.some(path => {
    const fullPath = `${basePath}/${path}`;
    return location.pathname === fullPath || location.pathname.startsWith(`${fullPath}/`);
  });

  const isConfigActive = location.pathname.startsWith(`${basePath}/config`);

  const { canViewDashboard, canViewTeam, canEditSchedules, canViewAllClockIns, canDoCoaching, canConfigPrinters, canViewWarnings } = permissions;

  // Determine if user can see Personal section
  const canSeePersonal = canViewTeam || canDoCoaching;
  // Determine if user can see Tiempo section
  const canSeeTiempo = canEditSchedules || canViewAllClockIns;
  // Determine if user can see Admin section
  const canSeeAdmin = canViewTeam || canViewWarnings || canEditSchedules;

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

      {/* Personal Section */}
      {canSeePersonal && (
        <NavSectionGroup
          id="personal"
          label="Personal"
          icon={UserCheck}
          defaultOpen
          forceOpen={isPersonalActive}
        >
          {canViewTeam && (
            <NavItemButton to={`${basePath}/equipo`} icon={Users} label="Equipo" exact />
          )}
          {canDoCoaching && (
            <NavItemButton to={`${basePath}/equipo/coaching`} icon={ClipboardList} label="Coaching" />
          )}
        </NavSectionGroup>
      )}

      {/* Tiempo Section */}
      {canSeeTiempo && (
        <NavSectionGroup
          id="tiempo"
          label="Tiempo"
          icon={CalendarClock}
          defaultOpen
          forceOpen={isTiempoActive}
        >
          {canEditSchedules && (
            <NavItemButton to={`${basePath}/equipo/horarios`} icon={Clock} label="Horarios" />
          )}
          {canViewAllClockIns && (
            <NavItemButton to={`${basePath}/equipo/fichajes`} icon={Clock} label="Fichajes" />
          )}
        </NavSectionGroup>
      )}

      {/* Administración Section */}
      {canSeeAdmin && (
        <NavSectionGroup
          id="admin"
          label="Administración"
          icon={Briefcase}
          forceOpen={isAdminActive}
        >
          {canViewTeam && (
            <NavItemButton to={`${basePath}/equipo/adelantos`} icon={DollarSign} label="Adelantos" />
          )}
          {canViewWarnings && (
            <NavItemButton to={`${basePath}/equipo/apercibimientos`} icon={AlertTriangle} label="Advertencias" />
          )}
          {canEditSchedules && (
            <NavItemButton to={`${basePath}/equipo/reglamentos`} icon={FileText} label="Firmas" />
          )}
        </NavSectionGroup>
      )}

      {/* Comunicados - Link directo */}
      {canViewTeam && (
        <NavDashboardLink
          to={`${basePath}/equipo/comunicados`}
          icon={MessageSquare}
          label="Comunicados"
        />
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
