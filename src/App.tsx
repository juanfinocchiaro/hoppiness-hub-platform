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
import RequestsPage from "./pages/local/RequestsPage";

import AdvancesPage from "./pages/local/AdvancesPage";
import WarningsPage from "./pages/local/WarningsPage";
import RegulationsPage from "./pages/local/RegulationsPage";
import FichajeQRDisplay from "./pages/local/FichajeQRDisplay";
import ShiftConfigPage from "./pages/local/ShiftConfigPage";
import CoachingPage from "./pages/local/CoachingPage";
import LiquidacionPage from "./pages/local/LiquidacionPage";
import MeetingsPage from "./pages/local/MeetingsPage";
import SalesHistoryPage from "./pages/local/SalesHistoryPage";
import ProveedoresLocalPage from "./pages/local/ProveedoresLocalPage";
import InsumosLocalPage from "./pages/local/InsumosLocalPage";
import ComprasPage from "./pages/local/ComprasPage";
import GastosPage from "./pages/local/GastosPage";
import VentasMensualesPage from "./pages/local/VentasMensualesPage";
import ConsumosPage from "./pages/local/ConsumosPage";
import SociosPage from "./pages/local/SociosPage";
import PeriodosPage from "./pages/local/PeriodosPage";
import PLDashboardPage from "./pages/local/PLDashboardPage";

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
import LaborCalendarPage from "./pages/admin/LaborCalendarPage";
import BrandMeetingsPage from "./pages/admin/BrandMeetingsPage";
import InspectionsPage from "./pages/admin/InspectionsPage";
import NewInspectionPage from "./pages/admin/NewInspectionPage";
import InspectionDetailPage from "./pages/admin/InspectionDetailPage";
import ProveedoresPage from "./pages/admin/ProveedoresPage";
import InsumosPage from "./pages/admin/InsumosPage";
import CanonPage from "./pages/admin/CanonPage";

// Mi Local - Comunicaciones
import LocalCommunicationsPage from "./pages/local/LocalCommunicationsPage";

// Mi Cuenta
import CuentaLayout from "./pages/cuenta/CuentaLayout";
import CuentaHome from "./pages/cuenta/CuentaHome";
import CuentaPerfil from "./pages/cuenta/CuentaPerfil";
import MiHorarioPage from "./pages/cuenta/MiHorarioPage";
import MisFichajesPage from "./pages/cuenta/MisFichajesPage";
import MisCoachingsPage from "./pages/cuenta/MisCoachingsPage";
import MisReunionesPage from "./pages/cuenta/MisReunionesPage";
import MisSolicitudesPage from "./pages/cuenta/MisSolicitudesPage";
import MisAdelantosPage from "./pages/cuenta/MisAdelantosPage";
import MisComunicadosPage from "./pages/cuenta/MisComunicadosPage";
import MiReglamentoPage from "./pages/cuenta/MiReglamentoPage";

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
            
            {/* Mi Cuenta - con CuentaLayout usando WorkShell */}
            <Route path="/cuenta" element={<RequireAuth><CuentaLayout /></RequireAuth>}>
              <Route index element={<CuentaHome />} />
              <Route path="perfil" element={<CuentaPerfil />} />
              <Route path="horario" element={<MiHorarioPage />} />
              <Route path="fichajes" element={<MisFichajesPage />} />
              <Route path="coachings" element={<MisCoachingsPage />} />
              <Route path="reuniones" element={<MisReunionesPage />} />
              <Route path="solicitudes" element={<MisSolicitudesPage />} />
              <Route path="adelantos" element={<MisAdelantosPage />} />
              <Route path="comunicados" element={<MisComunicadosPage />} />
              <Route path="reglamento" element={<MiReglamentoPage />} />
            </Route>
            
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
              <Route path="equipo/reuniones" element={<MeetingsPage />} />
              
              {/* Tiempo */}
              <Route path="tiempo/liquidacion" element={<LiquidacionPage />} />
              <Route path="tiempo/solicitudes" element={<RequestsPage />} />
              
              {/* Ventas */}
              <Route path="ventas/historial" element={<SalesHistoryPage />} />
              
              {/* Finanzas */}
              <Route path="finanzas/proveedores" element={<ProveedoresLocalPage />} />
              <Route path="finanzas/insumos" element={<InsumosLocalPage />} />
              <Route path="finanzas/compras" element={<ComprasPage />} />
              <Route path="finanzas/gastos" element={<GastosPage />} />
              <Route path="finanzas/ventas" element={<VentasMensualesPage />} />
              <Route path="finanzas/consumos" element={<ConsumosPage />} />
              <Route path="finanzas/socios" element={<SociosPage />} />
              <Route path="finanzas/periodos" element={<PeriodosPage />} />
              <Route path="finanzas/pl" element={<PLDashboardPage />} />
              
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
              
              {/* Reuniones de la Red */}
              <Route path="reuniones" element={<BrandMeetingsPage />} />
              
              {/* Coaching */}
              <Route path="coaching/encargados" element={<CoachingManagersPage />} />
              <Route path="coaching/red" element={<CoachingNetworkPage />} />
              
              {/* Supervisión */}
              <Route path="supervisiones" element={<InspectionsPage />} />
              <Route path="supervisiones/nueva" element={<NewInspectionPage />} />
              <Route path="supervisiones/:id" element={<InspectionDetailPage />} />
              
              {/* Finanzas */}
              <Route path="finanzas/proveedores" element={<ProveedoresPage />} />
              <Route path="finanzas/insumos" element={<InsumosPage />} />
              <Route path="finanzas/canon" element={<CanonPage />} />
              
              {/* Configuración */}
              <Route path="reglamentos" element={<BrandRegulationsPage />} />
              <Route path="configuracion/calendario" element={<LaborCalendarPage />} />
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
