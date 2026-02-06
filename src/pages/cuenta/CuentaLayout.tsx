/**
 * CuentaLayout - Panel "Mi Cuenta" usando WorkShell unificado
 * 
 * Mismo layout que Mi Local y Mi Marca para navegación consistente.
 */
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useRoleLandingV2 } from '@/hooks/useRoleLandingV2';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import { WorkShell } from '@/components/layout/WorkShell';
import { CuentaSidebar } from '@/components/layout/CuentaSidebar';
import { PanelSwitcher } from '@/components/layout/PanelSwitcher';
import { Button } from '@/components/ui/button';
import { LogOut, User, Home } from 'lucide-react';
import { ExternalLink } from '@/components/ui/ExternalLink';
import { useEffect } from 'react';

export default function CuentaLayout() {
  const { user, signOut, loading: authLoading } = useAuth();
  const effectiveUser = useEffectiveUser();
  const { loading: permLoading, accessibleBranches } = useRoleLandingV2();
  const navigate = useNavigate();
  
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

  // Footer content
  const footer = (
    <>
      {/* Panel Switcher */}
      <PanelSwitcher currentPanel="cuenta" localBranchId={firstBranchId} />
      
      {/* Fixed Actions */}
      <div className="space-y-1 pt-2 border-t">
        <Link to="/cuenta/perfil">
          <Button variant="ghost" className="w-full justify-start">
            <User className="w-4 h-4 mr-3" />
            Mi Perfil
          </Button>
        </Link>
        <ExternalLink to="/">
          <Button variant="ghost" className="w-full justify-start">
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
    <WorkShell
      mode="cuenta"
      title="Mi Cuenta"
      mobileTitle={displayName}
      sidebar={<CuentaSidebar />}
      footer={footer}
    >
      <Outlet />
    </WorkShell>
  );
}
