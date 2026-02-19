/**
 * BranchLayout - Panel "Mi Local" usando WorkShell unificado
 */
import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissionsWithImpersonation } from '@/hooks/usePermissionsWithImpersonation';
import { useRoleLandingV2 } from '@/hooks/useRoleLandingV2';
import { useEmbedMode } from '@/hooks/useEmbedMode';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LogOut,
  Store,
  Home,
  AlertCircle,
  Eye,
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import ManagerDashboard from '@/components/local/ManagerDashboard';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import { WorkShell } from '@/components/layout/WorkShell';
import { LocalSidebar } from '@/components/layout/LocalSidebar';
import { PanelSwitcher } from '@/components/layout/PanelSwitcher';
import ImpersonationSelector from '@/components/admin/ImpersonationSelector';
import { ExternalLink } from '@/components/ui/ExternalLink';

type Branch = Tables<'branches'>;

export default function BranchLayout() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { branchId } = useParams();
  
  const permissions = usePermissionsWithImpersonation(branchId);
  const { canAccessLocal, canAccessAdmin } = useRoleLandingV2();
  const { isEmbedded } = useEmbedMode();
  const { canImpersonate, isImpersonating } = useImpersonation();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [showImpersonationSelector, setShowImpersonationSelector] = useState(false);

  const { accessibleBranches, loading: permLoading, local: lp } = permissions;

  const { data: posConfig } = useQuery({
    queryKey: ['pos-config', branchId],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from('pos_config')
          .select('pos_enabled')
          .eq('branch_id', branchId!)
          .maybeSingle();
        return data;
      } catch {
        return null;
      }
    },
    enabled: !!branchId,
  });
  const posEnabled = posConfig?.pos_enabled ?? false;

  // Redirect if not authenticated or no access
  useEffect(() => {
    if (!authLoading && !permLoading) {
      if (!user) {
        navigate('/ingresar');
        return;
      }
      if (!canAccessLocal) {
        navigate('/cuenta');
        return;
      }
      if (accessibleBranches.length === 0 && !permissions.isSuperadmin) {
        navigate('/cuenta');
        return;
      }
    }
  }, [user, authLoading, permLoading, canAccessLocal, accessibleBranches, permissions.isSuperadmin, navigate]);

  // Set selected branch from URL or default
  useEffect(() => {
    if (branchId && accessibleBranches.length > 0) {
      const branch = accessibleBranches.find(b => b.id === branchId);
      if (branch) {
        setSelectedBranch(branch);
      } else if (!permissions.isSuperadmin) {
        navigate('/milocal');
      }
    } else if (!branchId && accessibleBranches.length > 0) {
      navigate(`/milocal/${accessibleBranches[0].id}`);
    }
  }, [branchId, accessibleBranches, permissions.isSuperadmin, navigate]);

  // Realtime subscription for branch status updates
  useEffect(() => {
    if (!branchId) return;

    const channel = supabase
      .channel(`branch-status-${branchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'branches',
          filter: `id=eq.${branchId}`,
        },
        (payload) => {
          const updated = payload.new as Branch;
          setSelectedBranch(prev => prev ? { ...prev, ...updated } : updated);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [branchId]);

  // Redirect empleados a Mi Cuenta
  useEffect(() => {
    if (!selectedBranch || !branchId) return;
    
    if (permissions.isEmpleado) {
      navigate('/cuenta');
    }
  }, [selectedBranch, branchId, permissions.isEmpleado, navigate]);

  const handleBranchChange = (newBranchId: string) => {
    const pathParts = location.pathname.split('/');
    const subPath = pathParts.slice(3).join('/');
    
    if (subPath) {
      navigate(`/milocal/${newBranchId}/${subPath}`);
    } else {
      navigate(`/milocal/${newBranchId}`);
    }
  };

  if (authLoading || permLoading) {
    return <HoppinessLoader fullScreen size="lg" />;
  }

  if (!canAccessLocal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-bold">Sin acceso al Panel Local</h1>
          <p className="text-muted-foreground">No tenés permisos para acceder a esta sección.</p>
          {canAccessAdmin && (
            <Link to="/mimarca">
              <Button>
                <Home className="w-4 h-4 mr-2" />
                Ir a Mi Marca
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Branch selection screen
  if (!branchId) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Panel Mi Local</h1>
            <p className="text-muted-foreground">Seleccioná tu sucursal para comenzar</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accessibleBranches.map(branch => (
              <div
                key={branch.id}
                className="bg-card border rounded-lg p-6 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate(`/milocal/${branch.id}`)}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Store className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-lg">{branch.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{branch.address}, {branch.city}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (!selectedBranch) return null;

    const isDashboard = location.pathname === `/milocal/${branchId}`;
    if (isDashboard) {
      return <ManagerDashboard branch={selectedBranch} posEnabled={posEnabled} />;
    }

    return <Outlet context={{ branch: selectedBranch, permissions: lp }} />;
  };

  // Footer: bloques Contexto (sucursal + Ver como), Cambiar a, Acciones
  const footer = (
    <>
      {/* Bloque Contexto: Sucursal + Ver como */}
      <div className="space-y-2">
        <Select 
          value={branchId} 
          onValueChange={handleBranchChange}
          disabled={accessibleBranches.length <= 1}
        >
          <SelectTrigger className="w-full">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-primary" />
              <SelectValue placeholder="Seleccionar local" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {accessibleBranches.map(branch => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      {/* Bloque Cambiar a */}
      <PanelSwitcher currentPanel="local" localBranchId={branchId} />

      {/* Bloque Acciones: Volver al Inicio, Salir */}
      <div className="pt-4 border-t space-y-1">
        <ExternalLink to="/">
          <Button variant="ghost" className="w-full justify-start text-muted-foreground">
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
    <WorkShell
      mode="local"
      title="Mi Local"
      mobileTitle={selectedBranch?.name || 'Mi Local'}
      sidebar={
        branchId ? (
            <LocalSidebar
              branchId={branchId}
              posEnabled={posEnabled}
              permissions={{
                canViewDashboard: lp.canViewDashboard,
                canViewTeam: lp.canViewTeam,
                canEditSchedules: lp.canEditSchedules,
                canViewAllClockIns: lp.canViewAllClockIns,
                canDoCoaching: lp.canDoCoaching,
                canViewCoaching: lp.canViewCoaching,
                canConfigPrinters: lp.canConfigPrinters,
                canViewWarnings: lp.canViewWarnings,
                canViewPurchaseHistory: lp.canViewPurchaseHistory,
                canViewSuppliers: lp.canViewSuppliers,
                canUploadInvoice: lp.canUploadInvoice,
                canViewLocalPnL: lp.canViewLocalPnL,
                canViewSalaryAdvances: lp.canViewSalaryAdvances,
                canViewPayroll: lp.canViewPayroll,
                canViewGastos: lp.canViewGastos,
                canViewConsumos: lp.canViewConsumos,
                canViewPeriodos: lp.canViewPeriodos,
                canViewVentasMensualesLocal: lp.canViewVentasMensualesLocal,
                canViewSocios: lp.canViewSocios,
                canViewLocalCommunications: lp.canViewLocalCommunications,
                canViewClosures: lp.canViewClosures,
                canCloseShifts: lp.canCloseShifts,
                canViewStock: lp.canViewStock,
                isFranquiciado: permissions.isFranquiciado,
                isContadorLocal: permissions.isContadorLocal,
            }}
          />
        ) : null
      }
      footer={footer}
    >
      {renderContent()}

      {/* Impersonation Selector Modal */}
      <ImpersonationSelector
        open={showImpersonationSelector}
        onOpenChange={setShowImpersonationSelector}
        mode="local"
        branchId={branchId}
        branchName={selectedBranch?.name}
      />
    </WorkShell>
  );
}
