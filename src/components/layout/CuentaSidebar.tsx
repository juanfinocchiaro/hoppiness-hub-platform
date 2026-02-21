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
  User,
  AlertTriangle,
  BarChart3,
  ShoppingBag,
  Receipt,
  MapPin,
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
  
  const isOnlyFranquiciado = branchRoles.length > 0 && 
    branchRoles.every(r => r.local_role === 'franquiciado');
  
  const hasMultipleBranches = branchRoles.length >= 2;
  
  // Staff that work operationally (not just owners)
  const isOperationalStaff = isStaff && !isOnlyFranquiciado;
  
  // Check active section for auto-expand
  const trabajoPaths = ['/cuenta/horario', '/cuenta/fichajes', '/cuenta/coachings', '/cuenta/reuniones', '/cuenta/apercibimientos'];
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
      
      {/* Mi Perfil - Always visible */}
      <NavItemButton to="/cuenta/perfil" icon={User} label="Mi Perfil" />
      
      {/* Mis Pedidos - visible for all users */}
      <NavSectionGroup
        id="pedidos"
        label="Mis Pedidos"
        icon={ShoppingBag}
        forceOpen={location.pathname.startsWith('/cuenta/pedidos') || location.pathname.startsWith('/cuenta/direcciones')}
      >
        <NavItemButton to="/cuenta/pedidos" icon={Receipt} label="Historial" />
        <NavItemButton to="/cuenta/direcciones" icon={MapPin} label="Mis Direcciones" />
      </NavSectionGroup>
      
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
          <NavItemButton to="/cuenta/apercibimientos" icon={AlertTriangle} label="Apercibimientos" />
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
      
      {/* Comparativo - For multi-branch users (franquiciados) */}
      {hasMultipleBranches && isOnlyFranquiciado && (
        <NavDashboardLink
          to="/cuenta/comparativo"
          icon={BarChart3}
          label="Comparativo"
        />
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
