/**
 * CuentaSidebar - Navegación para Mi Cuenta
 * 
 * Estructura adaptativa:
 * - Staff: Mi Trabajo (Horario, Fichajes, Coachings, Reuniones)
 * - Clientes (futuro): Mis Pedidos
 * - Común: Comunicados, Reglamento
 */
import { useLocation } from 'react-router-dom';
import { usePermissionsWithImpersonation } from '@/hooks/usePermissionsWithImpersonation';
import {
  Home,
  Briefcase,
  Calendar,
  Clock,
  ClipboardList,
  Users,
  MessageSquare,
  FileCheck,
  CalendarDays,
  DollarSign,
} from 'lucide-react';
import {
  WorkSidebarNav,
  NavSectionGroup,
  NavItemButton,
  NavDashboardLink,
} from './WorkSidebar';

export function CuentaSidebar() {
  const location = useLocation();
  const { branchRoles, brandRole } = usePermissionsWithImpersonation();
  
  // Check if user is staff (has any local role)
  const isStaff = branchRoles.length > 0;
  
  // Check if user is only franquiciado (owner without operational work)
  const isOnlyFranquiciado = branchRoles.length > 0 && 
    branchRoles.every(r => r.local_role === 'franquiciado');
  
  // Staff that work operationally (not just owners)
  const isOperationalStaff = isStaff && !isOnlyFranquiciado;
  
  // Check active section for auto-expand
  const trabajoPaths = ['/cuenta/horario', '/cuenta/fichajes', '/cuenta/coachings', '/cuenta/reuniones'];
  const isTrabajoActive = trabajoPaths.some(p => location.pathname.startsWith(p));
  
  const solicitudesPaths = ['/cuenta/solicitudes', '/cuenta/adelantos'];
  const isSolicitudesActive = solicitudesPaths.some(p => location.pathname.startsWith(p));

  return (
    <WorkSidebarNav>
      {/* Dashboard - Always visible */}
      <NavDashboardLink
        to="/cuenta"
        icon={Home}
        label="Inicio"
      />
      
      {/* Mi Trabajo - Only for operational staff */}
      {isOperationalStaff && (
        <NavSectionGroup
          id="trabajo"
          label="Mi Trabajo"
          icon={Briefcase}
          defaultOpen
          forceOpen={isTrabajoActive}
        >
          <NavItemButton to="/cuenta/horario" icon={Calendar} label="Horario" />
          <NavItemButton to="/cuenta/fichajes" icon={Clock} label="Fichajes" />
          <NavItemButton to="/cuenta/coachings" icon={ClipboardList} label="Coachings" />
          <NavItemButton to="/cuenta/reuniones" icon={Users} label="Reuniones" />
        </NavSectionGroup>
      )}
      
      {/* Solicitudes - Only for operational staff */}
      {isOperationalStaff && (
        <NavSectionGroup
          id="solicitudes"
          label="Solicitudes"
          icon={CalendarDays}
          forceOpen={isSolicitudesActive}
        >
          <NavItemButton to="/cuenta/solicitudes" icon={Calendar} label="Días Libres" />
          <NavItemButton to="/cuenta/adelantos" icon={DollarSign} label="Adelantos" />
        </NavSectionGroup>
      )}
      
      {/* Comunicados - For all staff */}
      {isStaff && (
        <NavDashboardLink
          to="/cuenta/comunicados"
          icon={MessageSquare}
          label="Comunicados"
        />
      )}
      
      {/* Reglamento - Only for operational staff */}
      {isOperationalStaff && (
        <NavDashboardLink
          to="/cuenta/reglamento"
          icon={FileCheck}
          label="Reglamento"
        />
      )}
    </WorkSidebarNav>
  );
}

export default CuentaSidebar;
