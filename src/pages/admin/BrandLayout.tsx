/**
 * AdminDashboard - Panel "Mi Marca" con sistema de permisos V2
 */
import { useEffect } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRoleLandingV2 } from '@/hooks/useRoleLandingV2';
import { useEmbedMode } from '@/hooks/useEmbedMode';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { ExternalLink } from '@/components/ui/ExternalLink';
import { Button } from '@/components/ui/button';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import ImpersonationBanner from '@/components/admin/ImpersonationBanner';
import logoHoppinessBlue from '@/assets/logo-hoppiness-blue.png';
import {
  LogOut,
  Menu,
  Building2,
  AlertCircle,
  Home,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default function AdminDashboard() {
  const { user, signOut, loading } = useAuth();
  const { avatarInfo, canAccessAdmin, canAccessLocal, accessibleBranches, loading: permLoading } = useRoleLandingV2();
  const { isEmbedded } = useEmbedMode();
  const { isImpersonating } = useImpersonation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !permLoading && !user) {
      navigate('/ingresar');
      return;
    }
    
    // Redirect if user doesn't have brand panel access
    if (!loading && !permLoading && user && !canAccessAdmin) {
      if (canAccessLocal && accessibleBranches.length > 0) {
        navigate(`/milocal/${accessibleBranches[0].id}`);
      } else {
        navigate('/cuenta');
      }
    }
  }, [user, loading, permLoading, canAccessAdmin, canAccessLocal, accessibleBranches, navigate]);

  const hasLocalPanelAccess = canAccessLocal && accessibleBranches.length > 0;

  if (loading || permLoading) {
    return <HoppinessLoader fullScreen size="lg" />;
  }

  if (!canAccessAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-bold">Sin acceso al Panel Marca</h1>
          <p className="text-muted-foreground">No tenés permisos para acceder a esta sección.</p>
          {hasLocalPanelAccess && (
            <Link to={`/milocal/${accessibleBranches[0].id}`}>
              <Button>
                <Building2 className="w-4 h-4 mr-2" />
                Ir a Mi Local
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Impersonation Banner */}
      <ImpersonationBanner />
      
      {/* Mobile Header */}
      <header className={`lg:hidden sticky z-50 bg-primary text-primary-foreground ${isImpersonating ? 'top-[52px]' : 'top-0'}`}>
        <div className="flex items-center justify-between p-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary-foreground">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-4">
              <div className="mb-6 flex items-center gap-3">
                <img 
                  src={logoHoppinessBlue} 
                  alt="Hoppiness" 
                  className="w-14 h-14 rounded-xl object-contain bg-white p-1"
                />
                <span className="text-lg font-bold">Mi Marca</span>
              </div>
              <AdminSidebar avatarInfo={avatarInfo} />
              {/* Footer - Layout fijo de 2 zonas (sin selector de sucursal) */}
              <div className="absolute bottom-4 left-4 right-4 space-y-3">
                {/* ZONA 1: Cambio de Panel - altura reservada */}
                <div className="min-h-[40px] border-t pt-3">
                  {hasLocalPanelAccess && !isEmbedded && (
                    <ExternalLink to={`/milocal/${accessibleBranches[0].id}`}>
                      <Button variant="ghost" className="w-full justify-start">
                        <Building2 className="w-4 h-4 mr-3" />
                        Cambiar a Mi Local
                      </Button>
                    </ExternalLink>
                  )}
                </div>
                {/* ZONA 2: Acciones Fijas */}
                <div className="space-y-1">
                  <ExternalLink to="/">
                    <Button variant="ghost" className="w-full justify-start">
                      <Home className="w-4 h-4 mr-3" />
                      Volver al Inicio
                    </Button>
                  </ExternalLink>
                  <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={signOut}>
                    <LogOut className="w-4 h-4 mr-3" />
                    Salir
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <h1 className="font-bold">Mi Marca</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className={`hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 bg-card border-r ${isImpersonating ? 'lg:top-[52px]' : ''}`}>
          {/* Header - Logo and title only - altura fija para evitar saltos */}
          <div className="p-6 border-b h-[88px] flex items-center">
            <div className="flex items-center gap-3">
              <img 
                src={logoHoppinessBlue} 
                alt="Hoppiness" 
                className="w-14 h-14 rounded-xl object-contain bg-white p-1 flex-shrink-0"
              />
              <span className="text-lg font-bold">Mi Marca</span>
            </div>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto">
            <AdminSidebar avatarInfo={avatarInfo} />
          </div>

          {/* Footer - Layout fijo de 2 zonas */}
          <div className="p-4 border-t space-y-3">
            {/* ZONA 1: Cambio de Panel - altura reservada */}
            <div className="min-h-[40px]">
              {hasLocalPanelAccess && !isEmbedded && (
                <ExternalLink to={`/milocal/${accessibleBranches[0].id}`}>
                  <Button variant="ghost" className="w-full justify-start">
                    <Building2 className="w-4 h-4 mr-3" />
                    Cambiar a Mi Local
                  </Button>
                </ExternalLink>
              )}
            </div>
            {/* ZONA 2: Acciones Fijas */}
            <div className="space-y-1">
              <ExternalLink to="/">
                <Button variant="ghost" className="w-full justify-start">
                  <Home className="w-4 h-4 mr-3" />
                  Volver al Inicio
                </Button>
              </ExternalLink>
              <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={signOut}>
                <LogOut className="w-4 h-4 mr-3" />
                Salir
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-72">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
