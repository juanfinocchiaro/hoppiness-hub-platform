import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AdminRoute, LocalRoute } from "@/components/guards";

// Páginas públicas
import Index from "./pages/Index";
import Ingresar from "./pages/Ingresar";
import OlvidePassword from "./pages/OlvidePassword";
import ResetPassword from "./pages/ResetPassword";
import RegistroStaff from "./pages/RegistroStaff";
import Pedir from "./pages/Pedir";
import Franquicias from "./pages/Franquicias";
import Nosotros from "./pages/Nosotros";
import Contacto from "./pages/Contacto";
import AceptarInvitacion from "./pages/AceptarInvitacion";
import FichajePublic from "./pages/FichajePublic";
import ClockIn from "./pages/ClockIn";

// Mi Local
import LocalLayout from "./pages/local/LocalLayout";
import LocalTeam from "./pages/local/LocalTeam";
import LocalRRHHFichajes from "./pages/local/LocalRRHHFichajes";
import LocalRRHHHorarios from "./pages/local/LocalRRHHHorarios";
import LocalImpresoras from "./pages/local/LocalImpresoras";
import LocalAdelantos from "./pages/local/LocalAdelantos";
import LocalApercibimientos from "./pages/local/LocalApercibimientos";
import AttendanceKiosk from "./pages/local/AttendanceKiosk";

// Mi Marca
import AdminDashboard from "./pages/admin/Dashboard";
import AdminHome from "./pages/admin/AdminHome";
import BranchDetail from "./pages/admin/BranchDetail";
import UsersPage from "./pages/admin/UsersPage";
import CentralTeam from "./pages/admin/CentralTeam";

// Mi Cuenta
import CuentaDashboard from "./pages/cuenta/CuentaDashboard";
import CuentaPerfil from "./pages/cuenta/CuentaPerfil";

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
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Rutas Públicas */}
            <Route path="/" element={<Index />} />
            <Route path="/ingresar" element={<Ingresar />} />
            <Route path="/olvide-password" element={<OlvidePassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/pedir" element={<Pedir />} />
            <Route path="/franquicias" element={<Franquicias />} />
            <Route path="/nosotros" element={<Nosotros />} />
            <Route path="/contacto" element={<Contacto />} />
            <Route path="/clock-in" element={<ClockIn />} />
            <Route path="/registro-staff" element={<RegistroStaff />} />
            <Route path="/invitacion/:token" element={<AceptarInvitacion />} />
            <Route path="/fichaje/:branchCode" element={<FichajePublic />} />
            
            {/* Mi Cuenta */}
            <Route path="/cuenta" element={<RequireAuth><CuentaDashboard /></RequireAuth>} />
            <Route path="/cuenta/perfil" element={<RequireAuth><CuentaPerfil /></RequireAuth>} />
            
            {/* Kiosk de Fichaje */}
            <Route path="/kiosk/:branchId" element={<LocalRoute><AttendanceKiosk /></LocalRoute>} />
            
            {/* Mi Local - /milocal */}
            <Route path="/milocal" element={<LocalRoute><LocalLayout /></LocalRoute>}>
              <Route index element={<div />} />
            </Route>
            <Route path="/milocal/:branchId" element={<LocalRoute><LocalLayout /></LocalRoute>}>
              <Route index element={null} />
              
              {/* Equipo */}
              <Route path="equipo" element={<LocalTeam />} />
              <Route path="equipo/fichajes" element={<LocalRRHHFichajes />} />
              <Route path="equipo/horarios" element={<LocalRRHHHorarios />} />
              <Route path="equipo/adelantos" element={<LocalAdelantos />} />
              <Route path="equipo/apercibimientos" element={<LocalApercibimientos />} />
              
              {/* Configuración */}
              <Route path="config/impresoras" element={<LocalImpresoras />} />
            </Route>
            
            {/* Mi Marca - /mimarca */}
            <Route path="/mimarca" element={<AdminRoute><AdminDashboard /></AdminRoute>}>
              <Route index element={<AdminHome />} />
              
              {/* Locales */}
              <Route path="locales/:slug" element={<BranchDetail />} />
              
              {/* Usuarios */}
              <Route path="usuarios" element={<UsersPage />} />
              <Route path="equipo-central" element={<CentralTeam />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
