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
import OlvidePassword from "./pages/OlvidePassword";
import ResetPassword from "./pages/ResetPassword";
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
import FichajePublic from "./pages/FichajePublic";
import ClockIn from "./pages/ClockIn";

// Local Panel
import LocalLayout from "./pages/local/LocalLayout";
import LocalDashboard from "./pages/local/LocalDashboard";
import LocalTeam from "./pages/local/LocalTeam";
import LocalRRHHFichajes from "./pages/local/LocalRRHHFichajes";
import LocalRRHHHorarios from "./pages/local/LocalRRHHHorarios";
import LocalImpresoras from "./pages/local/LocalImpresoras";
import LocalAdelantos from "./pages/local/LocalAdelantos";
import LocalApercibimientos from "./pages/local/LocalApercibimientos";
import AttendanceKiosk from "./pages/local/AttendanceKiosk";

// Admin Panel
import AdminDashboard from "./pages/admin/Dashboard";
import AdminHome from "./pages/admin/AdminHome";
import BranchDetail from "./pages/admin/BranchDetail";
import UsersPage from "./pages/admin/UsersPage";
import CentralTeam from "./pages/admin/CentralTeam";

// Public Menu
import MenuPublic from "./pages/MenuPublic";

// Mi Cuenta (authenticated user panel)
import CuentaDashboard from "./pages/cuenta/CuentaDashboard";
import CuentaPedidos from "./pages/cuenta/CuentaPedidos";
import CuentaPerfil from "./pages/cuenta/CuentaPerfil";
import CuentaDirecciones from "./pages/cuenta/CuentaDirecciones";

import NotFound from "./pages/NotFound";
import { RequireAuth } from "./components/guards/RequireAuth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      gcTime: 300000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

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
            <Route path="/olvide-password" element={<OlvidePassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/pedir" element={<Pedir />} />
            <Route path="/pedir/:branchSlug" element={<PedirBranch />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/pedido/:trackingToken" element={<PedidoTracking />} />
            <Route path="/menu" element={<Navigate to="/pedir" replace />} />
            <Route path="/menu/:branchSlug" element={<MenuPublic />} />
            <Route path="/franquicias" element={<Franquicias />} />
            <Route path="/nosotros" element={<Nosotros />} />
            <Route path="/contacto" element={<Contacto />} />
            <Route path="/clock-in" element={<ClockIn />} />
            <Route path="/registro-staff" element={<RegistroStaff />} />
            <Route path="/invitacion/:token" element={<AceptarInvitacion />} />
            
            {/* Fichaje público (QR-based) */}
            <Route path="/fichaje/:branchCode" element={<FichajePublic />} />
            
            {/* Mi Cuenta Routes (authenticated) */}
            <Route path="/cuenta" element={<RequireAuth><CuentaDashboard /></RequireAuth>} />
            <Route path="/cuenta/pedidos" element={<RequireAuth><CuentaPedidos /></RequireAuth>} />
            <Route path="/cuenta/pedidos/:orderId" element={<RequireAuth><CuentaPedidos /></RequireAuth>} />
            <Route path="/cuenta/perfil" element={<RequireAuth><CuentaPerfil /></RequireAuth>} />
            <Route path="/cuenta/direcciones" element={<RequireAuth><CuentaDirecciones /></RequireAuth>} />
            
            {/* Attendance Kiosk (requires auth) */}
            <Route path="/attendance-kiosk/:branchId" element={<LocalRoute><AttendanceKiosk /></LocalRoute>} />
            
            {/* Local Routes - SIMPLIFICADO */}
            <Route path="/local" element={<LocalRoute><LocalLayout /></LocalRoute>}>
              <Route index element={<div />} />
            </Route>
            <Route path="/local/:branchId" element={<LocalRoute><LocalLayout /></LocalRoute>}>
              <Route index element={null} />
              
              {/* EQUIPO */}
              <Route path="equipo/mi-equipo" element={<LocalTeam />} />
              <Route path="equipo/fichar" element={<LocalRRHHFichajes />} />
              <Route path="equipo/horarios" element={<LocalRRHHHorarios />} />
              <Route path="equipo/adelantos" element={<LocalAdelantos />} />
              <Route path="equipo/apercibimientos" element={<LocalApercibimientos />} />
              
              {/* CONFIGURACIÓN */}
              <Route path="config/impresoras" element={<LocalImpresoras />} />
            </Route>
            
            {/* Admin Routes - SIMPLIFICADO */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>}>
              <Route index element={<AdminHome />} />
              
              {/* MIS LOCALES */}
              <Route path="locales/:slug" element={<BranchDetail />} />
              
              {/* PERSONAS */}
              <Route path="personas/equipo-central" element={<CentralTeam />} />
              <Route path="personas/usuarios" element={<UsersPage />} />
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
