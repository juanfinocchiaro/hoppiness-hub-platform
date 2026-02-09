/**
 * LocalSidebar - Navegación de Mi Local reorganizada por función
 * 
 * Estructura por rol:
 * - Dashboard
 * - Gestión de Personas (equipo, horarios, fichajes, solicitudes, coaching, reuniones, admin)
 * - Operaciones (compras, proveedores)
 * - Finanzas (gastos, consumos, ventas, P&L, períodos) — solo franquiciado/contador
 * - Mi Cuenta Socio (socios) — solo franquiciado
 * - Comunicados
 * - Configuración
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
  ShoppingCart,
  Receipt,
  Settings,
  AlertTriangle,
  UserCheck,
  Calendar,
  Wallet,
  Truck,
  Package,
  TrendingUp,
  BarChart3,
  CalendarDays,
  Handshake,
  Calculator,
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
    canViewCoaching: boolean;
    canConfigPrinters: boolean;
    canViewWarnings?: boolean;
    // Finanzas
    canViewPurchaseHistory?: boolean;
    canViewSuppliers?: boolean;
    canUploadInvoice?: boolean;
    canViewLocalPnL?: boolean;
    canViewSalaryAdvances?: boolean;
    // Rol flags
    isFranquiciado?: boolean;
    isContadorLocal?: boolean;
  };
}

export function LocalSidebar({ branchId, permissions }: LocalSidebarProps) {
  const location = useLocation();
  const basePath = `/milocal/${branchId}`;
  
  const {
    canViewDashboard, canViewTeam, canEditSchedules, canViewAllClockIns,
    canDoCoaching, canViewCoaching, canConfigPrinters, canViewWarnings,
    canViewPurchaseHistory, canViewSuppliers, canUploadInvoice,
    canViewLocalPnL, canViewSalaryAdvances,
    isFranquiciado, isContadorLocal,
  } = permissions;

  // Active section detection helpers
  const isActive = (paths: string[]) => paths.some(p => {
    const full = `${basePath}/${p}`;
    return location.pathname === full || location.pathname.startsWith(`${full}/`);
  });

  const isPersonasActive = isActive([
    'equipo', 'equipo/coaching', 'equipo/reuniones',
    'equipo/horarios', 'equipo/fichajes', 'tiempo/solicitudes', 'tiempo/liquidacion',
    'equipo/adelantos', 'equipo/apercibimientos', 'equipo/reglamentos',
  ]);

  const isOperacionesActive = isActive(['finanzas/compras', 'finanzas/proveedores']);
  
  const isFinanzasActive = isActive([
    'finanzas/gastos', 'finanzas/consumos',
    'finanzas/pl', 'finanzas/periodos',
  ]);

  const isSociosActive = isActive(['finanzas/socios']);
  const isConfigActive = location.pathname.startsWith(`${basePath}/config`);

  // Section visibility
  const canSeePersonas = canViewTeam || canDoCoaching || canEditSchedules || canViewAllClockIns;
  const canSeeOperaciones = canViewPurchaseHistory || canViewSuppliers || canUploadInvoice;
  const canSeeFinanzas = canViewLocalPnL || isContadorLocal || isFranquiciado;
  const canSeeSocios = isFranquiciado;

  return (
    <WorkSidebarNav>
      {/* Dashboard */}
      {canViewDashboard && (
        <NavDashboardLink to={basePath} icon={LayoutDashboard} label="Dashboard" />
      )}

      {/* ═══ GESTIÓN DE PERSONAS ═══ */}
      {canSeePersonas && (
        <NavSectionGroup
          id="personas"
          label="Gestión de Personas"
          icon={UserCheck}
          defaultOpen
          forceOpen={isPersonasActive}
        >
          {canViewTeam && (
            <NavItemButton to={`${basePath}/equipo`} icon={Users} label="Equipo" exact />
          )}
          {canEditSchedules && (
            <NavItemButton to={`${basePath}/equipo/horarios`} icon={Clock} label="Horarios" />
          )}
          {canViewAllClockIns && (
            <NavItemButton to={`${basePath}/equipo/fichajes`} icon={Clock} label="Fichajes" />
          )}
          {canEditSchedules && (
            <NavItemButton to={`${basePath}/tiempo/solicitudes`} icon={ClipboardList} label="Solicitudes" />
          )}
          {canViewAllClockIns && (
            <NavItemButton to={`${basePath}/tiempo/liquidacion`} icon={Calculator} label="Liquidación" />
          )}
          {canViewCoaching && (
            <NavItemButton to={`${basePath}/equipo/coaching`} icon={ClipboardList} label="Coaching" />
          )}
          {canViewTeam && (
            <NavItemButton to={`${basePath}/equipo/reuniones`} icon={Calendar} label="Reuniones" />
          )}
          {(canViewSalaryAdvances || canViewTeam) && (
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

      {/* ═══ OPERACIONES ═══ */}
      {canSeeOperaciones && (
        <NavSectionGroup
          id="operaciones"
          label="Operaciones"
          icon={ShoppingCart}
          forceOpen={isOperacionesActive}
        >
          <NavItemButton to={`${basePath}/finanzas/compras`} icon={Receipt} label="Compras y Servicios" />
          <NavItemButton to={`${basePath}/finanzas/proveedores`} icon={Truck} label="Proveedores" />
        </NavSectionGroup>
      )}

      {/* ═══ FINANZAS ═══ (franquiciado / contador_local) */}
      {canSeeFinanzas && (
        <NavSectionGroup
          id="finanzas"
          label="Finanzas"
          icon={Wallet}
          forceOpen={isFinanzasActive}
        >
          <NavItemButton to={`${basePath}/finanzas/gastos`} icon={Receipt} label="Gastos Menores" />
          <NavItemButton to={`${basePath}/finanzas/consumos`} icon={Package} label="Consumos" />
          <NavItemButton to={`${basePath}/finanzas/pl`} icon={BarChart3} label="Resultado Económico" />
          <NavItemButton to={`${basePath}/finanzas/periodos`} icon={CalendarDays} label="Períodos" />
        </NavSectionGroup>
      )}

      {/* ═══ MI CUENTA SOCIO ═══ (solo franquiciado) */}
      {canSeeSocios && (
        <NavSectionGroup
          id="socios"
          label="Mi Cuenta Socio"
          icon={Handshake}
          forceOpen={isSociosActive}
        >
          <NavItemButton to={`${basePath}/finanzas/socios`} icon={Handshake} label="Socios y Movimientos" />
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

      {/* ═══ CONFIGURACIÓN ═══ */}
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
