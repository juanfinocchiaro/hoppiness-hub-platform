import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import { AdminRoute, LocalRoute, RequireQRAccess, RequireAuth } from "@/components/guards";
import UserFingerprint from "@/components/ui/UserFingerprint";

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

import FichajeEmpleado from "./pages/FichajeEmpleado";

// Mi Local
import BranchLayout from "./pages/local/BranchLayout";
import TeamPage from "./pages/local/TeamPage";
import ClockInsPage from "./pages/local/ClockInsPage";
import SchedulesPage from "./pages/local/SchedulesPage";

import AdvancesPage from "./pages/local/AdvancesPage";
import WarningsPage from "./pages/local/WarningsPage";
import RegulationsPage from "./pages/local/RegulationsPage";
import FichajeQRDisplay from "./pages/local/FichajeQRDisplay";
import ShiftConfigPage from "./pages/local/ShiftConfigPage";
import CoachingPage from "./pages/local/CoachingPage";
import LiquidacionPage from "./pages/local/LiquidacionPage";

// Mi Marca
import BrandLayout from "./pages/admin/BrandLayout";
import BrandHome from "./pages/admin/BrandHome";
import BranchDetail from "./pages/admin/BranchDetail";
import UsersPage from "./pages/admin/UsersPage";
import CentralTeam from "./pages/admin/CentralTeam";
import CommunicationsPage from "./pages/admin/CommunicationsPage";
import BrandRegulationsPage from "./pages/admin/BrandRegulationsPage";
import ClosureConfigPage from "./pages/admin/ClosureConfigPage";
import ContactMessagesPage from "./pages/admin/ContactMessagesPage";
import PermissionsConfigPage from "./pages/admin/PermissionsConfigPage";
import CoachingManagersPage from "./pages/admin/CoachingManagersPage";
import CoachingNetworkPage from "./pages/admin/CoachingNetworkPage";

// Mi Local - Comunicaciones
import LocalCommunicationsPage from "./pages/local/LocalCommunicationsPage";

// Mi Cuenta
import CuentaDashboard from "./pages/cuenta/CuentaDashboard";
import CuentaPerfil from "./pages/cuenta/CuentaPerfil";
import MiHorarioPage from "./pages/cuenta/MiHorarioPage";

import NotFound from "./pages/NotFound";

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
        <ImpersonationProvider>
          <Toaster />
          <Sonner />
          <UserFingerprint />
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
            <Route path="/fichaje/:branchCode" element={<FichajeEmpleado />} />
            
            {/* Mi Cuenta */}
            <Route path="/cuenta" element={<RequireAuth><CuentaDashboard /></RequireAuth>} />
            <Route path="/cuenta/perfil" element={<RequireAuth><CuentaPerfil /></RequireAuth>} />
            <Route path="/cuenta/horario" element={<RequireAuth><MiHorarioPage /></RequireAuth>} />
            
            {/* QR de Fichaje Estático - Solo encargados/franquiciados/superadmin */}
            <Route path="/fichaje-qr/:branchId" element={
              <RequireAuth>
                <RequireQRAccess>
                  <FichajeQRDisplay />
                </RequireQRAccess>
              </RequireAuth>
            } />
            
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
              <Route path="equipo/coaching" element={<CoachingPage />} />
              
              {/* Tiempo */}
              <Route path="tiempo/liquidacion" element={<LiquidacionPage />} />
              
              {/* Configuración */}
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
              
              {/* Mensajes de Contacto */}
              <Route path="mensajes" element={<ContactMessagesPage />} />
              
              {/* Coaching */}
              <Route path="coaching/encargados" element={<CoachingManagersPage />} />
              <Route path="coaching/red" element={<CoachingNetworkPage />} />
              
              {/* Configuración */}
              <Route path="reglamentos" element={<BrandRegulationsPage />} />
              <Route path="configuracion/cierres" element={<ClosureConfigPage />} />
              <Route path="configuracion/permisos" element={<PermissionsConfigPage />} />
            </Route>
            
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ImpersonationProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
