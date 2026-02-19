/**
 * LocalSidebar - Navegación de Mi Local organizada por flujo de trabajo
 *
 * Orden: Dashboard → Cierre de Turno → Operación del Día → Equipo y Tiempo → Finanzas → Socios → Comunicados → Supervisiones → Config
 * Usa useDynamicPermissions para determinar visibilidad.
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
  ChefHat,
} from 'lucide-react';
import {
  WorkSidebarNav,
  NavSectionGroup,
  NavItemButton,
  NavDashboardLink,
} from './WorkSidebar';

interface LocalSidebarProps {
  branchId: string;
  posEnabled?: boolean;
  permissions: {
    canViewDashboard: boolean;
    canViewTeam: boolean;
    canEditSchedules: boolean;
    canViewAllClockIns: boolean;
    canViewPayroll: boolean;
    canViewSalaryAdvances: boolean;
    canViewWarnings: boolean;
    canDoCoaching: boolean;
    canViewCoaching: boolean;
    canViewPurchaseHistory: boolean;
    canViewSuppliers: boolean;
    canUploadInvoice: boolean;
    canViewLocalPnL: boolean;
    canViewGastos: boolean;
    canViewConsumos: boolean;
    canViewPeriodos: boolean;
    canViewVentasMensualesLocal: boolean;
    canViewSocios: boolean;
    canViewClosures: boolean;
    canCloseShifts: boolean;
    canViewStock: boolean;
    canViewLocalCommunications: boolean;
    canConfigPrinters: boolean;
    isFranquiciado: boolean;
    isContadorLocal: boolean;
  };
}

export function LocalSidebar({ branchId, posEnabled = false, permissions }: LocalSidebarProps) {
  const location = useLocation();
  const basePath = `/milocal/${branchId}`;

  const {
    canViewDashboard,
    canViewTeam,
    canEditSchedules,
    canViewAllClockIns,
    canDoCoaching,
    canViewCoaching,
    canConfigPrinters,
    canViewWarnings,
    canViewPurchaseHistory,
    canViewSuppliers,
    canUploadInvoice,
    canViewLocalPnL,
    canViewSalaryAdvances,
    canViewPayroll,
    canViewGastos,
    canViewConsumos,
    canViewPeriodos,
    canViewVentasMensualesLocal,
    canViewSocios,
    canViewLocalCommunications,
    canViewClosures,
    canCloseShifts,
    canViewStock,
    isFranquiciado,
    isContadorLocal,
  } = permissions;

  const isActive = (paths: string[]) =>
    paths.some((p) => {
      const full = `${basePath}/${p}`;
      return location.pathname === full || location.pathname.startsWith(`${full}/`);
    });

  const isOperacionDiaActive = isActive([
    'equipo/fichajes',
    'finanzas/compras',
    'finanzas/proveedores',
    'ventas/stock',
  ]);

  const isEquipoTiempoActive = isActive([
    'equipo',
    'equipo/coaching',
    'equipo/reuniones',
    'equipo/horarios',
    'tiempo/solicitudes',
    'tiempo/liquidacion',
    'equipo/adelantos',
    'equipo/apercibimientos',
    'equipo/reglamentos',
  ]);

  const isFinanzasActive = isActive([
    'finanzas/gastos',
    'finanzas/consumos',
    'finanzas/pl',
    'finanzas/periodos',
    'finanzas/ventas-mensuales',
    'finanzas/rdo-carga',
    'finanzas/inversiones',
  ]);

  const isSociosActive = isActive(['finanzas/socios']);
  const isConfigActive = location.pathname.startsWith(`${basePath}/config`);
  const isVentasCajaActive = isActive([
    'ventas/pos', 'ventas/cocina', 'ventas/entrega', 'ventas/caja', 'ventas/historial', 'ventas/cierre-turno',
  ]);

  const canSeeOperacionDia =
    canViewAllClockIns ||
    canViewPurchaseHistory ||
    canViewSuppliers ||
    canUploadInvoice ||
    canViewStock;
  const canSeeEquipoTiempo =
    canViewTeam ||
    canDoCoaching ||
    canEditSchedules ||
    canViewPayroll ||
    canViewSalaryAdvances;
  const canSeeFinanzas =
    canViewLocalPnL ||
    canViewGastos ||
    canViewConsumos ||
    canViewPeriodos ||
    canViewVentasMensualesLocal ||
    isContadorLocal ||
    isFranquiciado;
  const canSeeSocios = canViewSocios;

  return (
    <WorkSidebarNav>
      {/* Dashboard */}
      {canViewDashboard && (
        <NavDashboardLink to={basePath} icon={LayoutDashboard} label="Dashboard" />
      )}

      {/* Ventas y Caja: con POS muestra sección completa, sin POS solo Cierre de Turno */}
      {(canViewClosures || canCloseShifts) && (
        posEnabled ? (
          <NavSectionGroup
            id="ventas-caja"
            label="Ventas y Caja"
            icon={ShoppingCart}
            forceOpen={isVentasCajaActive}
          >
            <NavItemButton to={`${basePath}/ventas/pos`} icon={ShoppingCart} label="Punto de Venta" />
            <NavItemButton to={`${basePath}/ventas/cocina`} icon={ChefHat} label="Cocina" />
            <NavItemButton to={`${basePath}/ventas/entrega`} icon={Truck} label="Entrega" />
            <NavItemButton to={`${basePath}/ventas/caja`} icon={Wallet} label="Caja" />
            <NavItemButton to={`${basePath}/ventas/cierre-turno`} icon={FileText} label="Reporte Cierre" />
            <NavItemButton to={`${basePath}/ventas/historial`} icon={TrendingUp} label="Historial ventas" />
          </NavSectionGroup>
        ) : (
          <NavDashboardLink
            to={`${basePath}/ventas/historial`}
            icon={TrendingUp}
            label="Cierre de Turno"
          />
        )
      )}

      {/* Operación del Día: Fichajes, Facturas, Proveedores */}
      {canSeeOperacionDia && (
        <NavSectionGroup
          id="operacion-dia"
          label="Operación del Día"
          icon={ShoppingCart}
          forceOpen={isOperacionDiaActive}
        >
          {canViewAllClockIns && (
            <NavItemButton to={`${basePath}/equipo/fichajes`} icon={Clock} label="Fichajes" />
          )}
          {canViewPurchaseHistory && (
            <NavItemButton to={`${basePath}/finanzas/compras`} icon={Receipt} label="Facturas" />
          )}
          {canViewSuppliers && (
            <NavItemButton to={`${basePath}/finanzas/proveedores`} icon={Truck} label="Proveedores" />
          )}
          {canViewStock && (
            <NavItemButton to={`${basePath}/ventas/stock`} icon={Package} label="Stock" />
          )}
        </NavSectionGroup>
      )}

      {/* Equipo y Tiempo */}
      {canSeeEquipoTiempo && (
        <NavSectionGroup
          id="equipo-tiempo"
          label="Equipo y Tiempo"
          icon={UserCheck}
          forceOpen={isEquipoTiempoActive}
        >
          {canViewTeam && (
            <NavItemButton to={`${basePath}/equipo`} icon={Users} label="Equipo" exact />
          )}
          {canEditSchedules && (
            <NavItemButton to={`${basePath}/equipo/horarios`} icon={Clock} label="Horarios" />
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

      {/* Finanzas */}
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
          {!posEnabled && canViewVentasMensualesLocal && (
            <NavItemButton
              to={`${basePath}/finanzas/ventas-mensuales`}
              icon={TrendingUp}
              label="Ventas Mensuales"
            />
          )}
          {!posEnabled && canViewLocalPnL && (
            <NavItemButton to={`${basePath}/finanzas/rdo-carga`} icon={FileInput} label="Cargador RDO" />
          )}
          {canViewLocalPnL && (
            <NavItemButton to={`${basePath}/finanzas/pl`} icon={BarChart3} label="Resultado Económico" />
          )}
          {canViewPeriodos && (
            <NavItemButton to={`${basePath}/finanzas/periodos`} icon={CalendarDays} label="Períodos" />
          )}
          {(isFranquiciado || isContadorLocal) && (
            <NavItemButton
              to={`${basePath}/finanzas/inversiones`}
              icon={Building2}
              label="Inversiones (CAPEX)"
            />
          )}
        </NavSectionGroup>
      )}

      {canSeeSocios && <hr className="my-2 border-border" aria-hidden />}
      {/* Mi Cuenta Socio */}
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

      {(canViewLocalCommunications || (isFranquiciado || canViewTeam)) && (
        <hr className="my-2 border-border" aria-hidden />
      )}
      {/* Comunicados */}
      {canViewLocalCommunications && (
        <NavDashboardLink
          to={`${basePath}/equipo/comunicados`}
          icon={MessageSquare}
          label="Comunicados"
        />
      )}

      {/* Supervisiones */}
      {(isFranquiciado || canViewTeam) && (
        <NavDashboardLink
          to={`${basePath}/supervisiones`}
          icon={ClipboardCheck}
          label="Supervisiones"
        />
      )}

      {/* Configuración */}
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
