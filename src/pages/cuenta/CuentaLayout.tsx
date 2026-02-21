/**
 * CuentaLayout - Panel "Mi Trabajo" (staff) usando WorkShell unificado
 * 
 * Clients without roles are redirected to the store.
 * Staff sees "Mi Trabajo" as the panel title.
 */
import { Outlet, useNavigate, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useRoleLandingV2 } from '@/hooks/useRoleLandingV2';
import { usePermissionsWithImpersonation } from '@/hooks/usePermissionsWithImpersonation';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import { WorkShell } from '@/components/layout/WorkShell';
import { CuentaSidebar } from '@/components/layout/CuentaSidebar';
import { PanelSwitcher } from '@/components/layout/PanelSwitcher';
import { Button } from '@/components/ui/button';
import { LogOut, Home, Eye, ShoppingBag } from 'lucide-react';
import { ExternalLink } from '@/components/ui/ExternalLink';
import ImpersonationSelector from '@/components/admin/ImpersonationSelector';

export default function CuentaLayout() {
  const { user, signOut, loading: authLoading } = useAuth();
  const effectiveUser = useEffectiveUser();
  const { loading: permLoading, accessibleBranches } = useRoleLandingV2();
  const { branchRoles, brandRole } = usePermissionsWithImpersonation();
  const { canImpersonate, isImpersonating } = useImpersonation();
  const navigate = useNavigate();
  const [showImpersonationSelector, setShowImpersonationSelector] = useState(false);
  
  const isStaff = branchRoles.length > 0 || !!brandRole;
  const isOperationalStaff = branchRoles.length > 0 && 
    !branchRoles.every(r => r.local_role === 'franquiciado');
  const panelTitle = isOperationalStaff ? 'Mi Trabajo' : 'Mi Cuenta';
  
  // Get display name for mobile header
  const displayName = effectiveUser.full_name?.split(' ')[0] || panelTitle;
  
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

  // Clients without any role don't belong in WorkShell — redirect to store
  if (!isStaff) {
    return <Navigate to="/pedir" replace />;
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
        <ExternalLink to="/pedir">
          <Button variant="ghost" className="w-full justify-start text-muted-foreground">
            <ShoppingBag className="w-4 h-4 mr-3" />
            Ir a la Tienda
          </Button>
        </ExternalLink>
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
        title={panelTitle}
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
