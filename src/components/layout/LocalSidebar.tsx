/**
 * LocalSidebar - Navegación de Mi Local reorganizada por función
 * 
 * Usa directamente useDynamicPermissions para determinar visibilidad.
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
  ClipboardCheck,
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
  FileInput,
  Building2,
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
    // Dashboard
    canViewDashboard: boolean;
    // Equipo
    canViewTeam: boolean;
    canEditSchedules: boolean;
    canViewAllClockIns: boolean;
    canViewPayroll: boolean;
    canViewSalaryAdvances: boolean;
    canViewWarnings: boolean;
    // Coaching
    canDoCoaching: boolean;
    canViewCoaching: boolean;
    // Operaciones
    canViewPurchaseHistory: boolean;
    canViewSuppliers: boolean;
    canUploadInvoice: boolean;
    // Finanzas
    canViewLocalPnL: boolean;
    canViewGastos: boolean;
    canViewConsumos: boolean;
    canViewPeriodos: boolean;
    canViewVentasMensualesLocal: boolean;
    // Socios
    canViewSocios: boolean;
    // Cierres de turno
    canViewClosures: boolean;
    canCloseShifts: boolean;
    // Comunicados
    canViewLocalCommunications: boolean;
    // Config
    canConfigPrinters: boolean;
    // Flags
    isFranquiciado: boolean;
    isContadorLocal: boolean;
  };
}

export function LocalSidebar({ branchId, permissions }: LocalSidebarProps) {
  const location = useLocation();
  const basePath = `/milocal/${branchId}`;
  
  const {
    canViewDashboard, canViewTeam, canEditSchedules, canViewAllClockIns,
    canDoCoaching, canViewCoaching, canConfigPrinters, canViewWarnings,
    canViewPurchaseHistory, canViewSuppliers, canUploadInvoice,
    canViewLocalPnL, canViewSalaryAdvances, canViewPayroll,
    canViewGastos, canViewConsumos, canViewPeriodos, canViewVentasMensualesLocal,
    canViewSocios, canViewLocalCommunications,
    canViewClosures, canCloseShifts,
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
    'finanzas/pl', 'finanzas/periodos', 'finanzas/ventas-mensuales',
    'finanzas/rdo-carga', 'finanzas/inversiones',
  ]);

  const isSociosActive = isActive(['finanzas/socios']);
  const isConfigActive = location.pathname.startsWith(`${basePath}/config`);

  // Section visibility
  const canSeePersonas = canViewTeam || canDoCoaching || canEditSchedules || canViewAllClockIns || canViewPayroll || canViewSalaryAdvances;
  const canSeeOperaciones = canViewPurchaseHistory || canViewSuppliers || canUploadInvoice;
  const canSeeFinanzas = canViewLocalPnL || canViewGastos || canViewConsumos || canViewPeriodos || canViewVentasMensualesLocal || isContadorLocal || isFranquiciado;
  const canSeeSocios = canViewSocios;

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
          {canViewPayroll && (
            <NavItemButton to={`${basePath}/tiempo/liquidacion`} icon={Calculator} label="Liquidación" />
          )}
          {canViewCoaching && (
            <NavItemButton to={`${basePath}/equipo/coaching`} icon={ClipboardList} label="Coaching" />
          )}
          {canViewTeam && (
            <NavItemButton to={`${basePath}/equipo/reuniones`} icon={Calendar} label="Reuniones" />
          )}
          {canViewSalaryAdvances && (
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
          <NavItemButton to={`${basePath}/finanzas/compras`} icon={Receipt} label="Facturas" />
          <NavItemButton to={`${basePath}/finanzas/proveedores`} icon={Truck} label="Proveedores" />
        </NavSectionGroup>
      )}

      {/* ═══ FINANZAS ═══ */}
      {canSeeFinanzas && (
        <NavSectionGroup
          id="finanzas"
          label="Finanzas"
          icon={Wallet}
          forceOpen={isFinanzasActive}
        >
          {canViewGastos && (
            <NavItemButton to={`${basePath}/finanzas/gastos`} icon={Receipt} label="Caja Chica" />
          )}
          {canViewConsumos && (
            <NavItemButton to={`${basePath}/finanzas/consumos`} icon={Package} label="Consumos" />
          )}
          {canViewVentasMensualesLocal && (
            <NavItemButton to={`${basePath}/finanzas/ventas-mensuales`} icon={TrendingUp} label="Ventas Mensuales" />
          )}
          {canViewLocalPnL && (
            <NavItemButton to={`${basePath}/finanzas/rdo-carga`} icon={FileInput} label="Cargador RDO" />
          )}
          {canViewLocalPnL && (
            <NavItemButton to={`${basePath}/finanzas/pl`} icon={BarChart3} label="Resultado Económico" />
          )}
          {(isFranquiciado || isContadorLocal) && (
            <NavItemButton to={`${basePath}/finanzas/inversiones`} icon={Building2} label="Inversiones (CAPEX)" />
          )}
          {canViewPeriodos && (
            <NavItemButton to={`${basePath}/finanzas/periodos`} icon={CalendarDays} label="Períodos" />
          )}
        </NavSectionGroup>
      )}

      {/* ═══ MI CUENTA SOCIO ═══ */}
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
      {canViewLocalCommunications && (
        <NavDashboardLink
          to={`${basePath}/equipo/comunicados`}
          icon={MessageSquare}
          label="Comunicados"
        />
      )}

      {/* Ventas / Cierres - Visible para cajeros, encargados y franquiciados */}
      {(canViewClosures || canCloseShifts) && (
        <NavDashboardLink
          to={`${basePath}/ventas/historial`}
          icon={TrendingUp}
          label="Ventas y Cierres"
        />
      )}

      {/* Supervisiones - Link directo para encargados/franquiciados */}
      {(permissions.isFranquiciado || permissions.canViewTeam) && (
        <NavDashboardLink
          to={`${basePath}/supervisiones`}
          icon={ClipboardCheck}
          label="Supervisiones"
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
