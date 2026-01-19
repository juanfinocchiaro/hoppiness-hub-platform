import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AdminRoute, LocalRoute } from "@/components/guards";

// Public pages
import Index from "./pages/Index";
import Ingresar from "./pages/Ingresar";
import RegistroStaff from "./pages/RegistroStaff";
import Pedir from "./pages/Pedir";
import PedirBranch from "./pages/PedirBranch";
import PedidoTracking from "./pages/PedidoTracking";
import NuestroMenu from "./pages/NuestroMenu";
import Franquicias from "./pages/Franquicias";

// POS / Local
import POS from "./pages/pos/POS";
import KDS from "./pages/pos/KDS";
import OrdersDashboard from "./pages/pos/OrdersDashboard";
import LocalLayout from "./pages/local/LocalLayout";
import LocalDashboard from "./pages/local/LocalDashboard";
import LocalPedidos from "./pages/local/LocalPedidos";
import LocalHistorial from "./pages/local/LocalHistorial";
import LocalDisponibilidad from "./pages/local/LocalDisponibilidad";
import LocalExtras from "./pages/local/LocalExtras";
import LocalProductos from "./pages/local/LocalProductos";
import LocalTransactions from "./pages/local/LocalTransactions";
import LocalCaja from "./pages/local/LocalCaja";
import LocalSuppliers from "./pages/local/LocalSuppliers";
import LocalRRHHFichajes from "./pages/local/LocalRRHHFichajes";
import LocalRRHHHorarios from "./pages/local/LocalRRHHHorarios";
import LocalRRHHColaboradores from "./pages/local/LocalRRHHColaboradores";
import LocalRRHHHoras from "./pages/local/LocalRRHHHoras";
import LocalRRHHSueldos from "./pages/local/LocalRRHHSueldos";
import LocalPagos from "./pages/local/LocalPagos";
import LocalPL from "./pages/local/LocalPL";
import LocalFacturas from "./pages/local/LocalFacturas";
import LocalConfig from "./pages/local/LocalConfig";
import LocalDeliveryZones from "./pages/local/LocalDeliveryZones";
import LocalIntegraciones from "./pages/local/LocalIntegraciones";
import LocalImpresoras from "./pages/local/LocalImpresoras";
import AttendanceKiosk from "./pages/local/AttendanceKiosk";

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
import Users from "./pages/admin/Users";
import Permissions from "./pages/admin/Permissions";
import SalesReports from "./pages/admin/SalesReports";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
          {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/ingresar" element={<Ingresar />} />
            <Route path="/pedir" element={<Pedir />} />
            <Route path="/pedir/:branchSlug" element={<PedirBranch />} />
            <Route path="/pedido/:trackingToken" element={<PedidoTracking />} />
            <Route path="/menu" element={<NuestroMenu />} />
            <Route path="/franquicias" element={<Franquicias />} />
            <Route path="/clock-in" element={<ClockIn />} />
            <Route path="/registro-staff" element={<RegistroStaff />} />
            
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
              {/* Operación */}
              <Route path="pedidos" element={<LocalPedidos />} />
              <Route path="historial" element={<LocalHistorial />} />
              {/* Menú Local */}
              <Route path="productos" element={<LocalProductos />} />
              <Route path="extras" element={<LocalExtras />} />
              <Route path="disponibilidad" element={<LocalDisponibilidad />} /> {/* Legacy redirect */}
              {/* Finanzas */}
              <Route path="transacciones" element={<LocalTransactions />} />
              <Route path="caja" element={<LocalCaja />} />
              <Route path="pagos" element={<LocalPagos />} />
              <Route path="proveedores" element={<LocalSuppliers />} />
              <Route path="facturas" element={<LocalFacturas />} />
              <Route path="estado-resultados" element={<LocalPL />} />
              {/* RRHH */}
              <Route path="rrhh/fichajes" element={<LocalRRHHFichajes />} />
              <Route path="rrhh/horarios" element={<LocalRRHHHorarios />} />
              <Route path="rrhh/colaboradores" element={<LocalRRHHColaboradores />} />
              <Route path="rrhh/horas" element={<LocalRRHHHoras />} />
              <Route path="rrhh/sueldos" element={<LocalRRHHSueldos />} />
              {/* Configuración */}
              <Route path="config" element={<LocalConfig />} />
              <Route path="integraciones" element={<LocalIntegraciones />} />
              <Route path="zonas-delivery" element={<LocalDeliveryZones />} />
              <Route path="impresoras" element={<LocalImpresoras />} />
            </Route>
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>}>
              <Route index element={<AdminHome />} />
              <Route path="estado-sucursales" element={<BranchStatus />} />
              <Route path="productos" element={<Products />} />
              <Route path="productos/nuevo" element={<ProductForm />} />
              <Route path="productos/:productId" element={<ProductForm />} />
              <Route path="modificadores" element={<Modifiers />} />
              <Route path="sucursales" element={<Branches />} />
              <Route path="sucursales/:branchId/productos" element={<BranchProducts />} />
              <Route path="proveedores" element={<Suppliers />} />
              <Route path="estado-resultados" element={<ProfitLossReport />} />
              <Route path="usuarios" element={<Users />} />
              <Route path="permisos" element={<Permissions />} />
              <Route path="reportes" element={<SalesReports />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
