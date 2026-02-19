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
import FichajeEmpleado from "./pages/FichajeEmpleado";

// Mi Local
import BranchLayout from "./pages/local/BranchLayout";
import TeamPage from "./pages/local/TeamPage";
import ClockInsPage from "./pages/local/ClockInsPage";
import SchedulesPage from "./pages/local/SchedulesPage";
import PrintersPage from "./pages/local/PrintersPage";
import AdvancesPage from "./pages/local/AdvancesPage";
import WarningsPage from "./pages/local/WarningsPage";
import RegulationsPage from "./pages/local/RegulationsPage";
import FichajeQRDisplay from "./pages/local/FichajeQRDisplay";
import ShiftConfigPage from "./pages/local/ShiftConfigPage";

// Mi Marca
import BrandLayout from "./pages/admin/BrandLayout";
import BrandHome from "./pages/admin/BrandHome";
import BranchDetail from "./pages/admin/BranchDetail";
import UsersPage from "./pages/admin/UsersPage";
import CentralTeam from "./pages/admin/CentralTeam";
import CommunicationsPage from "./pages/admin/CommunicationsPage";
import BrandRegulationsPage from "./pages/admin/BrandRegulationsPage";
import ClosureConfigPage from "./pages/admin/ClosureConfigPage";

// Mi Local - Comunicaciones
import LocalCommunicationsPage from "./pages/local/LocalCommunicationsPage";

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
            <Route path="/registro-staff" element={<RegistroStaff />} />
            <Route path="/invitacion/:token" element={<AceptarInvitacion />} />
            <Route path="/fichaje/:branchCode" element={<FichajeEmpleado />} />
            
            {/* Mi Cuenta */}
            <Route path="/cuenta" element={<RequireAuth><CuentaDashboard /></RequireAuth>} />
            <Route path="/cuenta/perfil" element={<RequireAuth><CuentaPerfil /></RequireAuth>} />
            
            {/* QR de Fichaje Estático */}
            <Route path="/fichaje-qr/:branchId" element={<LocalRoute><FichajeQRDisplay /></LocalRoute>} />
            
            {/* Mi Local - /milocal */}
            <Route path="/milocal" element={<LocalRoute><BranchLayout /></LocalRoute>}>
              <Route index element={<div />} />
            </Route>
            <Route path="/milocal/:branchId" element={<LocalRoute><BranchLayout /></LocalRoute>}>
              <Route index element={null} />
              
              {/* Equipo */}
              <Route path="equipo" element={<TeamPage />} />
              <Route path="equipo/fichajes" element={<ClockInsPage />} />
              <Route path="equipo/horarios" element={<SchedulesPage />} />
              <Route path="equipo/adelantos" element={<AdvancesPage />} />
              <Route path="equipo/apercibimientos" element={<WarningsPage />} />
              <Route path="equipo/reglamentos" element={<RegulationsPage />} />
              <Route path="equipo/comunicados" element={<LocalCommunicationsPage />} />
              
              {/* Configuración */}
              <Route path="config/impresoras" element={<PrintersPage />} />
              <Route path="config/turnos" element={<ShiftConfigPage />} />
            </Route>
            
            {/* Mi Marca - /mimarca */}
            <Route path="/mimarca" element={<AdminRoute><BrandLayout /></AdminRoute>}>
              <Route index element={<BrandHome />} />
              
              {/* Locales */}
              <Route path="locales/:slug" element={<BranchDetail />} />
              
              {/* Usuarios */}
              <Route path="usuarios" element={<UsersPage />} />
              <Route path="equipo-central" element={<CentralTeam />} />
              
              {/* Comunicados */}
              <Route path="comunicados" element={<CommunicationsPage />} />
              
              {/* Configuración */}
              <Route path="reglamentos" element={<BrandRegulationsPage />} />
              <Route path="configuracion/cierres" element={<ClosureConfigPage />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
