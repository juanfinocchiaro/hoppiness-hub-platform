/**
 * BrandLayout - Panel "Mi Marca" usando WorkShell unificado
 */
import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRoleLandingV2 } from '@/hooks/useRoleLandingV2';
import { useEmbedMode } from '@/hooks/useEmbedMode';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { ExternalLink } from '@/components/ui/ExternalLink';
import { Button } from '@/components/ui/button';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import { WorkShell } from '@/components/layout/WorkShell';
import { BrandSidebar } from '@/components/layout/BrandSidebar';
import ImpersonationSelector from '@/components/admin/ImpersonationSelector';
import {
  LogOut,
  Building2,
  AlertCircle,
  Home,
  Eye,
} from 'lucide-react';

export default function BrandLayout() {
  const { user, signOut, loading } = useAuth();
  const { canAccessAdmin, canAccessLocal, accessibleBranches, loading: permLoading } = useRoleLandingV2();
  const { isEmbedded } = useEmbedMode();
  const { canImpersonate, isImpersonating } = useImpersonation();
  const navigate = useNavigate();
  
  const [showImpersonationSelector, setShowImpersonationSelector] = useState(false);

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

  // Footer con acciones
  const footer = (
    <>
      {/* ZONA 1: Herramientas (Ver como...) */}
      <div className="min-h-[40px]">
        {canImpersonate && (
          <Button
            variant={isImpersonating ? 'secondary' : 'ghost'}
            className={`w-full justify-start ${isImpersonating ? 'bg-amber-100 text-amber-900 hover:bg-amber-200' : ''}`}
            onClick={() => setShowImpersonationSelector(true)}
          >
            <Eye className="w-4 h-4 mr-3" />
            Ver como...
          </Button>
        )}
      </div>
      
      {/* ZONA 2: Cambio de Panel */}
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
      
      {/* ZONA 3: Acciones Fijas */}
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
    </>
  );

  return (
    <>
      <WorkShell
        mode="brand"
        title="Mi Marca"
        sidebar={<BrandSidebar />}
        footer={footer}
      >
        <Outlet />
      </WorkShell>
      
      <ImpersonationSelector
        open={showImpersonationSelector}
        onOpenChange={setShowImpersonationSelector}
        mode="brand"
      />
    </>
  );
}