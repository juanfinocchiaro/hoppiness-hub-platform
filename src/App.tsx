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
import LocalProductos from "./pages/local/LocalProductos";
import LocalTransactions from "./pages/local/LocalTransactions";
import LocalCaja from "./pages/local/LocalCaja";
import LocalSuppliers from "./pages/local/LocalSuppliers";
import LocalRRHH from "./pages/local/LocalRRHH";
import LocalPL from "./pages/local/LocalPL";
import LocalConfig from "./pages/local/LocalConfig";
import LocalDeliveryZones from "./pages/local/LocalDeliveryZones";
import LocalUsuarios from "./pages/local/LocalUsuarios";
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
import ProfitLossReport from "./pages/admin/ProfitLossReport";
import Users from "./pages/admin/Users";
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
            <Route path="/auth" element={<Ingresar />} />
            <Route path="/pedir" element={<Pedir />} />
            <Route path="/pedir/:branchSlug" element={<PedirBranch />} />
            <Route path="/pedido/:orderId" element={<PedidoTracking />} />
            <Route path="/menu" element={<NuestroMenu />} />
            <Route path="/franquicias" element={<Franquicias />} />
            <Route path="/clock-in" element={<ClockIn />} />
            
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
              {/* Menú & Stock */}
              <Route path="disponibilidad" element={<LocalDisponibilidad />} />
              <Route path="productos" element={<LocalProductos />} />
              {/* Finanzas */}
              <Route path="transacciones" element={<LocalTransactions />} />
              <Route path="caja" element={<LocalCaja />} />
              <Route path="proveedores" element={<LocalSuppliers />} />
              <Route path="rrhh" element={<LocalRRHH />} />
              <Route path="estado-resultados" element={<LocalPL />} />
              {/* Configuración */}
              <Route path="config" element={<LocalConfig />} />
              <Route path="zonas-delivery" element={<LocalDeliveryZones />} />
              <Route path="usuarios" element={<LocalUsuarios />} />
              <Route path="impresoras" element={<LocalImpresoras />} />
            </Route>
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>}>
              <Route index element={<AdminHome />} />
              <Route path="estado-sucursales" element={<BranchStatus />} />
              <Route path="productos" element={<Products />} />
              <Route path="productos/nuevo" element={<ProductForm />} />
              <Route path="productos/:productId" element={<ProductForm />} />
              <Route path="sucursales" element={<Branches />} />
              <Route path="sucursales/:branchId/productos" element={<BranchProducts />} />
              <Route path="proveedores" element={<Suppliers />} />
              <Route path="estado-resultados" element={<ProfitLossReport />} />
              <Route path="usuarios" element={<Users />} />
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
