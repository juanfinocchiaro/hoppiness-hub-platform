/**
 * CuentaLayout - Panel "Mi Cuenta" usando WorkShell unificado
 * 
 * Mismo layout que Mi Local y Mi Marca para navegación consistente.
 */
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useRoleLandingV2 } from '@/hooks/useRoleLandingV2';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import { WorkShell } from '@/components/layout/WorkShell';
import { CuentaSidebar } from '@/components/layout/CuentaSidebar';
import { PanelSwitcher } from '@/components/layout/PanelSwitcher';
import { Button } from '@/components/ui/button';
import { LogOut, Home, Eye } from 'lucide-react';
import { ExternalLink } from '@/components/ui/ExternalLink';
import ImpersonationSelector from '@/components/admin/ImpersonationSelector';

export default function CuentaLayout() {
  const { user, signOut, loading: authLoading } = useAuth();
  const effectiveUser = useEffectiveUser();
  const { loading: permLoading, accessibleBranches } = useRoleLandingV2();
  const { canImpersonate, isImpersonating } = useImpersonation();
  const navigate = useNavigate();
  const [showImpersonationSelector, setShowImpersonationSelector] = useState(false);
  
  // Get display name for mobile header
  const displayName = effectiveUser.full_name?.split(' ')[0] || 'Mi Cuenta';
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/ingresar');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || permLoading) {
    return <HoppinessLoader fullScreen size="lg" />;
  }

  if (!user) {
    return null;
  }

  // Get first accessible branch ID for PanelSwitcher
  const firstBranchId = accessibleBranches[0]?.id;

  // Footer: bloques Contexto (Ver como), Cambiar a, Acciones
  const footer = (
    <>
      {canImpersonate && (
        <div className="space-y-2">
          <Button
            variant={isImpersonating ? 'secondary' : 'ghost'}
            className={`w-full justify-start ${isImpersonating ? 'bg-amber-100 text-amber-900 hover:bg-amber-200' : ''}`}
            onClick={() => setShowImpersonationSelector(true)}
          >
            <Eye className="w-4 h-4 mr-3" />
            Ver como...
          </Button>
        </div>
      )}

      <PanelSwitcher currentPanel="cuenta" localBranchId={firstBranchId} />

      <div className="pt-4 border-t space-y-1">
        <ExternalLink to="/">
          <Button variant="ghost" className="w-full justify-start text-muted-foreground">
            <Home className="w-4 h-4 mr-3" />
            Volver al Inicio
          </Button>
        </ExternalLink>
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4 mr-3" />
          Salir
        </Button>
      </div>
    </>
  );

  return (
    <>
      <WorkShell
        mode="cuenta"
        title="Mi Cuenta"
        mobileTitle={displayName}
        sidebar={<CuentaSidebar />}
        footer={footer}
      >
        <Outlet />
      </WorkShell>
      
      <ImpersonationSelector
        open={showImpersonationSelector}
        onOpenChange={setShowImpersonationSelector}
      />
    </>
  );
}
