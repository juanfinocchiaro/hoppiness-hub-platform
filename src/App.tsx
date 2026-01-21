import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/contexts/CartContext";
import { AdminRoute, LocalRoute } from "@/components/guards";

// Public pages
import Index from "./pages/Index";
import Ingresar from "./pages/Ingresar";
import RegistroStaff from "./pages/RegistroStaff";
import Pedir from "./pages/Pedir";
import PedirBranch from "./pages/PedirBranch";
import Checkout from "./pages/Checkout";
import PedidoTracking from "./pages/PedidoTracking";
import NuestroMenu from "./pages/NuestroMenu";
import Franquicias from "./pages/Franquicias";
import Nosotros from "./pages/Nosotros";
import Contacto from "./pages/Contacto";
import AceptarInvitacion from "./pages/AceptarInvitacion";

// POS / Local
import POS from "./pages/pos/POS";
import KDS from "./pages/pos/KDS";
import OrdersDashboard from "./pages/pos/OrdersDashboard";
import LocalLayout from "./pages/local/LocalLayout";
import LocalDashboard from "./pages/local/LocalDashboard";
import LocalPedidos from "./pages/local/LocalPedidos";
import LocalHistorial from "./pages/local/LocalHistorial";
import LocalExtras from "./pages/local/LocalExtras";
import LocalProductos from "./pages/local/LocalProductos";
import LocalTransactions from "./pages/local/LocalTransactions";
import LocalCaja from "./pages/local/LocalCaja";
import LocalSuppliers from "./pages/local/LocalSuppliers";
import LocalRRHHFichajes from "./pages/local/LocalRRHHFichajes";
import LocalRRHHHorarios from "./pages/local/LocalRRHHHorarios";
import LocalRRHHHoras from "./pages/local/LocalRRHHHoras";
import LocalRRHHSueldos from "./pages/local/LocalRRHHSueldos";
import LocalRRHHLiquidacion from "./pages/local/LocalRRHHLiquidacion";
import LocalUsuarios from "./pages/local/LocalUsuarios";
import LocalFacturas from "./pages/local/LocalFacturas";
import LocalObligaciones from "./pages/local/LocalObligaciones";
import LocalFinanceReports from "./pages/local/LocalFinanceReports";
import LocalConfig from "./pages/local/LocalConfig";
import LocalDeliveryZones from "./pages/local/LocalDeliveryZones";
import LocalIntegraciones from "./pages/local/LocalIntegraciones";
import LocalImpresoras from "./pages/local/LocalImpresoras";
import AttendanceKiosk from "./pages/local/AttendanceKiosk";
import LocalPOS from "./pages/local/LocalPOS";
import LocalKDS from "./pages/local/LocalKDS";
import LocalCierreTurno from "./pages/local/LocalCierreTurno";
import LocalShiftConfig from "./pages/local/LocalShiftConfig";
import LocalStockFactura from "./pages/local/LocalStockFactura";
import LocalStockPedir from "./pages/local/LocalStockPedir";
import LocalStockHistorial from "./pages/local/LocalStockHistorial";
import LocalIntegrador from "./pages/local/LocalIntegrador";
import LocalComprasProveedores from "./pages/local/LocalComprasProveedores";
import LocalComprasCuentas from "./pages/local/LocalComprasCuentas";
import LocalComprasHistorial from "./pages/local/LocalComprasHistorial";
import LocalMenuCombos from "./pages/local/LocalMenuCombos";
import LocalReportesVentas from "./pages/local/LocalReportesVentas";
import LocalReportesMovimientosStock from "./pages/local/LocalReportesMovimientosStock";
// Attendance
import ClockIn from "./pages/ClockIn";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminHome from "./pages/admin/AdminHome";
import BranchStatus from "./pages/admin/BranchStatus";
import Products from "./pages/admin/Products";
import ProductForm from "./pages/admin/ProductForm";
import Branches from "./pages/admin/Branches";
import BranchProducts from "./pages/admin/BranchProducts";
import Suppliers from "./pages/admin/Suppliers";
import Modifiers from "./pages/admin/Modifiers";
import ProfitLossReport from "./pages/admin/ProfitLossReport";
import BranchPerformance from "./pages/admin/BranchPerformance";
import BrandFinances from "./pages/admin/BrandFinances";
import Users from "./pages/admin/Users";
import RoleTemplates from "./pages/admin/RoleTemplates";
import UserBranchOverrides from "./pages/admin/UserBranchOverrides";
import SalesReports from "./pages/admin/SalesReports";
import Customers from "./pages/admin/Customers";
import Ingredients from "./pages/admin/Ingredients";
import Discounts from "./pages/admin/Discounts";
import InvoiceScanner from "./pages/admin/InvoiceScanner";
import IngredientSuppliers from "./pages/admin/IngredientSuppliers";
import Channels from "./pages/admin/Channels";
import Messages from "./pages/admin/Messages";
import Conciliacion from "./pages/admin/Conciliacion";
import BrandSettings from "./pages/admin/BrandSettings";
import CentralTeam from "./pages/admin/CentralTeam";
import BranchDetail from "./pages/admin/BranchDetail";
import Integrations from "./pages/admin/Integrations";
import Notifications from "./pages/admin/Notifications";

// Local Stock & Inventory
import LocalStock from "./pages/local/LocalStock";
import LocalInventory from "./pages/local/LocalInventory";
import LocalCMVReport from "./pages/local/LocalCMVReport";
import LocalCustomers from "./pages/local/LocalCustomers";
import LocalKDSSettings from "./pages/local/LocalKDSSettings";

// Public Menu
import MenuPublic from "./pages/MenuPublic";

// Mi Cuenta (authenticated user panel)
import CuentaDashboard from "./pages/cuenta/CuentaDashboard";
import CuentaPedidos from "./pages/cuenta/CuentaPedidos";
import CuentaPerfil from "./pages/cuenta/CuentaPerfil";
import CuentaDirecciones from "./pages/cuenta/CuentaDirecciones";

import NotFound from "./pages/NotFound";
import { RequireAuth } from "./components/guards/RequireAuth";

// Helper component for local redirects
function LocalRedirect({ to }: { to: string }) {
  const { branchId } = useParams();
  return <Navigate to={`/local/${branchId}/${to}`} replace />;
}

// Helper component for admin redirects  
function AdminRedirect({ to }: { to: string }) {
  return <Navigate to={`/admin/${to}`} replace />;
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
          {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/ingresar" element={<Ingresar />} />
            <Route path="/pedir" element={<Pedir />} />
            <Route path="/pedir/:branchSlug" element={<PedirBranch />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/pedido/:trackingToken" element={<PedidoTracking />} />
            {/* Redirect /menu to /pedir */}
            <Route path="/menu" element={<Navigate to="/pedir" replace />} />
            <Route path="/menu/:branchSlug" element={<MenuPublic />} />
            <Route path="/franquicias" element={<Franquicias />} />
            <Route path="/nosotros" element={<Nosotros />} />
            <Route path="/contacto" element={<Contacto />} />
            <Route path="/clock-in" element={<ClockIn />} />
            <Route path="/registro-staff" element={<RegistroStaff />} />
            <Route path="/invitacion/:token" element={<AceptarInvitacion />} />
            
            {/* Mi Cuenta Routes (authenticated) */}
            <Route path="/cuenta" element={<RequireAuth><CuentaDashboard /></RequireAuth>} />
            <Route path="/cuenta/pedidos" element={<RequireAuth><CuentaPedidos /></RequireAuth>} />
            <Route path="/cuenta/pedidos/:orderId" element={<RequireAuth><CuentaPedidos /></RequireAuth>} />
            <Route path="/cuenta/perfil" element={<RequireAuth><CuentaPerfil /></RequireAuth>} />
            <Route path="/cuenta/direcciones" element={<RequireAuth><CuentaDirecciones /></RequireAuth>} />
            
            {/* Attendance Kiosk (requires auth) */}
            <Route path="/attendance-kiosk/:branchId" element={<LocalRoute><AttendanceKiosk /></LocalRoute>} />
            
            {/* POS Routes */}
            <Route path="/pos" element={<LocalRoute><POS /></LocalRoute>} />
            <Route path="/pos/:branchId/kds" element={<LocalRoute><KDS /></LocalRoute>} />
            <Route path="/pos/pedidos" element={<LocalRoute><OrdersDashboard /></LocalRoute>} />
            
            {/* Local Routes (Encargado/Operativo) */}
            <Route path="/local" element={<LocalRoute><LocalLayout /></LocalRoute>}>
              <Route index element={<div />} />
            </Route>
            <Route path="/local/:branchId" element={<LocalRoute><LocalLayout /></LocalRoute>}>
              <Route index element={null} />
              
              {/* OPERACIÓN DIARIA */}
              <Route path="integrador" element={<LocalIntegrador />} />
              <Route path="pos" element={<LocalPOS />} />
              <Route path="kds" element={<LocalKDS />} />
              <Route path="pedidos" element={<LocalPedidos />} />
              <Route path="historial" element={<LocalHistorial />} />
              
              {/* CAJA Y PAGOS */}
              <Route path="caja" element={<LocalCaja />} />
              <Route path="cuenta-corriente" element={<LocalCustomers />} />
              <Route path="cierre" element={<LocalCierreTurno />} />
              
              {/* STOCK Y COMPRAS */}
              <Route path="stock" element={<LocalStock />} />
              <Route path="stock/pedir" element={<LocalStockPedir />} />
              <Route path="stock/factura" element={<LocalStockFactura />} />
              <Route path="stock/historial" element={<LocalStockHistorial />} />
              <Route path="stock/conteo" element={<LocalInventory />} />
              <Route path="stock/cmv" element={<LocalCMVReport />} />
              
              {/* COMPRAS */}
              <Route path="compras/factura" element={<LocalStockFactura />} />
              <Route path="compras/proveedores" element={<LocalComprasProveedores />} />
              <Route path="compras/cuentas" element={<LocalComprasCuentas />} />
              <Route path="compras/historial" element={<LocalComprasHistorial />} />
              
              {/* MENÚ DEL LOCAL */}
              <Route path="menu/productos" element={<LocalProductos />} />
              <Route path="menu/combos" element={<LocalMenuCombos />} />
              <Route path="menu/extras" element={<LocalExtras />} />
              
              {/* REPORTES */}
              <Route path="reportes/ventas" element={<LocalReportesVentas />} />
              <Route path="reportes/resultados" element={<LocalFinanceReports />} />
              <Route path="reportes/cmv" element={<LocalCMVReport />} />
              <Route path="reportes/movimientos-stock" element={<LocalReportesMovimientosStock />} />
              
              {/* Redirect rutas duplicadas - REMOVED: menu/productos y menu/extras ya definidas arriba */}
              
              {/* EQUIPO */}
              <Route path="equipo" element={<LocalUsuarios />} />
              <Route path="equipo/fichar" element={<LocalRRHHFichajes />} />
              <Route path="equipo/horarios" element={<LocalRRHHHorarios />} />
              <Route path="equipo/horas" element={<LocalRRHHHoras />} />
              <Route path="equipo/liquidacion" element={<LocalRRHHLiquidacion />} />
              <Route path="equipo/sueldos" element={<LocalRRHHSueldos />} />
              
              {/* FINANZAS */}
              <Route path="finanzas/movimientos" element={<LocalTransactions />} />
              <Route path="finanzas/proveedores" element={<LocalSuppliers />} />
              <Route path="finanzas/facturas" element={<LocalFacturas />} />
              <Route path="finanzas/obligaciones" element={<LocalObligaciones />} />
              <Route path="finanzas/reportes" element={<LocalFinanceReports />} />
              
              {/* CONFIGURACIÓN */}
              <Route path="config/local" element={<LocalConfig />} />
              <Route path="config/zonas" element={<LocalDeliveryZones />} />
              <Route path="config/integraciones" element={<LocalIntegraciones />} />
              <Route path="config/impresoras" element={<LocalImpresoras />} />
              <Route path="config/kds" element={<LocalKDSSettings />} />
              <Route path="config/turnos" element={<LocalShiftConfig />} />
              
              {/* LEGACY REDIRECTS - Rutas viejas redirigen a nuevas */}
              <Route path="productos" element={<LocalRedirect to="menu/productos" />} />
              <Route path="extras" element={<LocalRedirect to="menu/extras" />} />
              <Route path="inventario" element={<LocalRedirect to="stock/conteo" />} />
              <Route path="cmv" element={<LocalRedirect to="reportes/cmv" />} />
              <Route path="clientes" element={<LocalRedirect to="cuenta-corriente" />} />
              <Route path="transacciones" element={<LocalRedirect to="finanzas/movimientos" />} />
              <Route path="proveedores" element={<LocalRedirect to="compras/proveedores" />} />
              <Route path="facturas" element={<LocalRedirect to="finanzas/facturas" />} />
              <Route path="obligaciones" element={<LocalRedirect to="finanzas/obligaciones" />} />
              <Route path="reportes" element={<LocalRedirect to="reportes/ventas" />} />
              <Route path="rrhh/fichajes" element={<LocalRedirect to="equipo/fichar" />} />
              <Route path="rrhh/horarios" element={<LocalRedirect to="equipo/horarios" />} />
              <Route path="rrhh/horas" element={<LocalRedirect to="equipo/horas" />} />
              <Route path="rrhh/liquidacion" element={<LocalRedirect to="equipo/liquidacion" />} />
              <Route path="rrhh/sueldos" element={<LocalRedirect to="equipo/sueldos" />} />
              <Route path="usuarios" element={<LocalRedirect to="equipo" />} />
              <Route path="config" element={<LocalRedirect to="config/local" />} />
              <Route path="zonas-delivery" element={<LocalRedirect to="config/zonas" />} />
              <Route path="integraciones" element={<LocalRedirect to="config/integraciones" />} />
              <Route path="impresoras" element={<LocalRedirect to="config/impresoras" />} />
              <Route path="kds-config" element={<LocalRedirect to="config/kds" />} />
              <Route path="config/datos" element={<LocalConfig />} />
              
              {/* Redirects consolidación - apuntan a ubicación canónica */}
              <Route path="stock/cmv" element={<LocalRedirect to="reportes/cmv" />} />
              <Route path="finanzas/reportes" element={<LocalRedirect to="reportes/resultados" />} />
              <Route path="stock/factura" element={<LocalRedirect to="compras/factura" />} />
            </Route>
            
            {/* Conciliacion Panel (Admin only) */}
            <Route path="/conciliacion" element={<AdminRoute><Conciliacion /></AdminRoute>} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>}>
              <Route index element={<AdminHome />} />
              
              {/* VISIÓN GENERAL */}
              <Route path="resultados" element={<ProfitLossReport />} />
              <Route path="comparativa" element={<BranchPerformance />} />
              
              {/* MIS LOCALES */}
              <Route path="locales/:slug" element={<BranchDetail />} />
              <Route path="sucursales" element={<Branches />} />
              <Route path="sucursales/:branchId/productos" element={<BranchProducts />} />
              
              {/* CATÁLOGO */}
              <Route path="catalogo/productos" element={<Products />} />
              <Route path="catalogo/productos/nuevo" element={<ProductForm />} />
              <Route path="catalogo/productos/:productId" element={<ProductForm />} />
              <Route path="catalogo/modificadores" element={<Modifiers />} />
              <Route path="catalogo/ingredientes" element={<Ingredients />} />
              <Route path="catalogo/descuentos" element={<Discounts />} />
              
              {/* ABASTECIMIENTO */}
              <Route path="abastecimiento/proveedores" element={<Suppliers />} />
              <Route path="abastecimiento/asignacion" element={<IngredientSuppliers />} />
              
              {/* PERSONAS */}
              <Route path="personas/equipo-central" element={<CentralTeam />} />
              <Route path="personas/buscar" element={<Users />} />
              <Route path="personas/roles" element={<RoleTemplates />} />
              
              {/* COMUNICACIÓN */}
              <Route path="mensajes" element={<Messages />} />
              
              {/* CONFIGURACIÓN */}
              <Route path="configuracion/marca" element={<BrandSettings />} />
              <Route path="configuracion/canales" element={<Channels />} />
              <Route path="configuracion/integraciones" element={<Integrations />} />
              <Route path="configuracion/notificaciones" element={<Notifications />} />
              
              {/* OTROS */}
              <Route path="clientes" element={<Customers />} />
              <Route path="estado-sucursales" element={<BranchStatus />} />
              <Route path="canales" element={<Channels />} />
              <Route path="escaner-comprobantes" element={<InvoiceScanner />} />
              <Route path="overrides" element={<UserBranchOverrides />} />
              
              {/* LEGACY REDIRECTS */}
              <Route path="productos" element={<AdminRedirect to="catalogo/productos" />} />
              <Route path="productos/nuevo" element={<AdminRedirect to="catalogo/productos/nuevo" />} />
              <Route path="productos/:productId" element={<AdminRedirect to="catalogo/productos" />} />
              <Route path="modificadores" element={<AdminRedirect to="catalogo/modificadores" />} />
              <Route path="ingredientes" element={<AdminRedirect to="catalogo/ingredientes" />} />
              <Route path="descuentos" element={<AdminRedirect to="catalogo/descuentos" />} />
              <Route path="proveedores" element={<AdminRedirect to="abastecimiento/proveedores" />} />
              <Route path="proveedores/ingredientes" element={<AdminRedirect to="abastecimiento/asignacion" />} />
              <Route path="control-proveedores" element={<AdminRedirect to="abastecimiento/asignacion" />} />
              <Route path="equipo/usuarios" element={<AdminRedirect to="personas/buscar" />} />
              <Route path="equipo/plantillas" element={<AdminRedirect to="personas/roles" />} />
              <Route path="equipo" element={<AdminRedirect to="personas/buscar" />} />
              <Route path="plantillas" element={<AdminRedirect to="personas/roles" />} />
              <Route path="usuarios" element={<AdminRedirect to="personas/buscar" />} />
              <Route path="reportes/performance" element={<AdminRedirect to="comparativa" />} />
              <Route path="reportes/ventas" element={<SalesReports />} />
              <Route path="reportes/pyl" element={<AdminRedirect to="resultados" />} />
              <Route path="reportes/finanzas" element={<BrandFinances />} />
              <Route path="performance" element={<AdminRedirect to="comparativa" />} />
              <Route path="reportes" element={<SalesReports />} />
              <Route path="estado-resultados" element={<AdminRedirect to="resultados" />} />
              <Route path="finanzas-marca" element={<BrandFinances />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
