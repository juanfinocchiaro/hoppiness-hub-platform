/**
 * AdminDashboard - Panel "Mi Marca" con sistema de permisos V2
 */
import { useEffect } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRoleLandingV2 } from '@/hooks/useRoleLandingV2';
import { useEmbedMode } from '@/hooks/useEmbedMode';
import { ExternalLink } from '@/components/ui/ExternalLink';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
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
              <div className="mb-6 flex items-center gap-3">
                <img 
                  src={logoHoppinessBlue} 
                  alt="Hoppiness" 
                  className="w-14 h-14 rounded-xl object-contain bg-white p-1"
                />
                <div>
                  <h2 className="text-lg font-bold">Mi Marca</h2>
                  <Badge variant="outline" className="text-xs">
                    {avatarInfo.label}
                  </Badge>
                </div>
              </div>
              <AdminSidebar avatarInfo={avatarInfo} />
              {hasLocalPanelAccess && !isEmbedded && (
                <div className="mt-4 pt-4 border-t">
                  <ExternalLink to={`/milocal/${accessibleBranches[0].id}`}>
                    <Button variant="ghost" className="w-full justify-start">
                      <Building2 className="w-4 h-4 mr-3" />
                      Cambiar a Mi Local
                    </Button>
                  </ExternalLink>
                </div>
              )}
              <div className="absolute bottom-4 left-4 right-4 space-y-1">
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
            <div className="flex items-center gap-3">
              <img 
                src={logoHoppinessBlue} 
                alt="Hoppiness" 
                className="w-14 h-14 rounded-xl object-contain bg-white p-1"
              />
              <div>
                <span className="text-lg font-bold block">Mi Marca</span>
                <Badge variant="outline" className="text-xs">
                  {avatarInfo.label}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto">
            <AdminSidebar avatarInfo={avatarInfo} />
          </div>

          <div className="p-4 border-t space-y-1">
            {hasLocalPanelAccess && !isEmbedded && (
              <ExternalLink to={`/milocal/${accessibleBranches[0].id}`}>
                <Button variant="ghost" className="w-full justify-start">
                  <Building2 className="w-4 h-4 mr-3" />
                  Cambiar a Mi Local
                </Button>
              </ExternalLink>
            )}
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
