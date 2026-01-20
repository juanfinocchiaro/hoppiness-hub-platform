import { useEffect } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRoleLanding } from '@/hooks/useRoleLanding';
import { usePanelAccess } from '@/hooks/usePanelAccess';
import { useEmbedMode } from '@/hooks/useEmbedMode';
import { ExternalLink } from '@/components/ui/ExternalLink';
import { Button } from '@/components/ui/button';
import {
  LogOut,
  Menu,
  Building2,
  AlertCircle,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default function AdminDashboard() {
  const { user, signOut, loading } = useAuth();
  const { avatarInfo } = useRoleLanding();
  const { canUseBrandPanel, canUseLocalPanel, branchAccess, loading: panelLoading } = usePanelAccess();
  const { isEmbedded } = useEmbedMode();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !panelLoading && !user) {
      navigate('/ingresar');
      return;
    }
    
    // Redirect if user doesn't have brand panel access
    if (!loading && !panelLoading && user && !canUseBrandPanel) {
      // If they have local panel access, redirect there
      if (canUseLocalPanel && branchAccess.length > 0) {
        navigate(`/local/${branchAccess[0].id}`);
      } else {
        navigate('/');
      }
    }
  }, [user, loading, panelLoading, canUseBrandPanel, canUseLocalPanel, branchAccess, navigate]);

  // Check if user can access local panel (from new panel access system)
  const hasLocalPanelAccess = canUseLocalPanel && branchAccess.length > 0;

  if (loading || panelLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl gradient-primary" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // Show access denied if no brand panel access
  if (!canUseBrandPanel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-bold">Sin acceso al Panel Marca</h1>
          <p className="text-muted-foreground">No tenés permisos para acceder a esta sección.</p>
          {canUseLocalPanel && branchAccess.length > 0 && (
            <Link to={`/local/${branchAccess[0].id}`}>
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
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-primary text-primary-foreground">
        <div className="flex items-center justify-between p-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary-foreground">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-4">
              <div className="mb-6">
                <h2 className="text-lg font-bold">Mi Marca</h2>
              </div>
              <AdminSidebar avatarInfo={avatarInfo} />
              {hasLocalPanelAccess && !isEmbedded && (
                <div className="mt-4 pt-4 border-t">
                  <ExternalLink to={`/local/${branchAccess[0].id}`}>
                    <Button variant="outline" className="w-full justify-start">
                      <Building2 className="w-4 h-4 mr-3" />
                      Panel Mi Local
                    </Button>
                  </ExternalLink>
                </div>
              )}
              <div className="absolute bottom-4 left-4 right-4">
                <Button variant="outline" className="w-full" onClick={signOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar Sesión
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <h1 className="font-bold">Mi Marca</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 bg-card border-r">
          <div className="p-6 border-b">
            <ExternalLink to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold">HC</span>
              </div>
              <span className="text-lg font-bold">Mi Marca</span>
            </ExternalLink>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto">
            <AdminSidebar avatarInfo={avatarInfo} />
          </div>

          {hasLocalPanelAccess && !isEmbedded && (
            <div className="px-4 pb-2">
              <ExternalLink to={`/local/${branchAccess[0].id}`}>
                <Button variant="outline" className="w-full justify-start">
                  <Building2 className="w-4 h-4 mr-3" />
                  Panel Mi Local
                </Button>
              </ExternalLink>
            </div>
          )}
          
          <div className="p-4 border-t">
            <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-3" />
              Cerrar Sesión
            </Button>
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
