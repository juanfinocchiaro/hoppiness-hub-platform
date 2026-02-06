/**
 * CuentaHome - Dashboard simplificado de Mi Cuenta
 * 
 * Muestra resumen del día con acceso rápido a lo importante.
 */
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { usePermissionsWithImpersonation } from '@/hooks/usePermissionsWithImpersonation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { User, ArrowRight, Building2, AlertTriangle } from 'lucide-react';
import { BranchWorkCard } from '@/components/cuenta/BranchWorkCard';
import { PageHelp } from '@/components/ui/PageHelp';

export default function CuentaHome() {
  const effectiveUser = useEffectiveUser();
  const effectiveUserId = effectiveUser.id;
  const { branchRoles, brandRole, canAccessBrandPanel } = usePermissionsWithImpersonation();

  // Check access levels
  const hasBrandAccess = canAccessBrandPanel;
  const hasNoRole = !brandRole && branchRoles.length === 0;

  // Fetch profile data
  const { data: profile } = useQuery({
    queryKey: ['profile', effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return null;
      const result = await supabase
        .from('profiles')
        .select('*')
        .eq('id', effectiveUserId)
        .single();
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!effectiveUserId,
  });

  // Fetch branch roles with PIN status
  const { data: branchPinData } = useQuery({
    queryKey: ['user-branch-roles-pins', effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const { data, error } = await supabase
        .from('user_branch_roles')
        .select('id, branch_id, local_role, clock_pin, branches!inner(id, name)')
        .eq('user_id', effectiveUserId)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveUserId,
  });

  // Detect if user only has franquiciado role
  const isOnlyFranquiciado = branchRoles.length > 0 && 
    branchRoles.every(r => r.local_role === 'franquiciado');

  const helpPageId = isOnlyFranquiciado ? 'cuenta-dashboard-franquiciado' : 'cuenta-dashboard';

  // Fetch urgent unread communications
  const { data: urgentUnread = [] } = useQuery({
    queryKey: ['urgent-unread', effectiveUserId, branchRoles],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      
      const userLocalRoles = new Set<string>(
        branchRoles.map(r => r.local_role).filter(Boolean)
      );
      
      const { data: urgentComms, error: commsError } = await supabase
        .from('communications')
        .select('id, title, target_roles')
        .eq('type', 'urgent')
        .eq('is_published', true);
      
      if (commsError) throw commsError;
      if (!urgentComms?.length) return [];
      
      const filteredComms = urgentComms.filter(c => {
        if (!c.target_roles || c.target_roles.length === 0) return true;
        return c.target_roles.some((role: string) => userLocalRoles.has(role));
      });
      
      const { data: reads } = await supabase
        .from('communication_reads')
        .select('communication_id')
        .eq('user_id', effectiveUserId);
      
      const readIds = new Set(reads?.map(r => r.communication_id) || []);
      
      return filteredComms.filter(c => !readIds.has(c.id));
    },
    enabled: !!effectiveUserId,
    staleTime: 60000,
  });

  const displayName = effectiveUser.full_name || profile?.full_name?.split(' ')[0] || 'Usuario';
  const hasLocalRoles = branchPinData && branchPinData.filter((r: any) => r.local_role).length > 0;

  return (
    <div className="space-y-4 md:space-y-6 max-w-4xl">
      <PageHelp pageId={helpPageId} />
      
      {/* Welcome */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold">
          Hola, {displayName.split(' ')[0]}! 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          Bienvenido a tu cuenta
        </p>
      </div>

      {/* Urgent Banner */}
      {urgentUnread.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Mensaje urgente</AlertTitle>
          <AlertDescription className="flex items-center gap-2">
            Tenés {urgentUnread.length} comunicado{urgentUnread.length > 1 ? 's' : ''} urgente{urgentUnread.length > 1 ? 's' : ''} sin leer.
            <Link to="/cuenta/comunicados" className="underline font-medium hover:no-underline">
              Ver ahora
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Mi Marca Access Card */}
      {hasBrandAccess && (
        <Link to="/mimarca">
          <Card className="border-primary/50 bg-primary/5 hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="font-semibold">Mi Marca</h3>
                  <p className="text-sm text-muted-foreground">
                    Panel de administración
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-primary" />
            </CardContent>
          </Card>
        </Link>
      )}

      {/* No Role Message */}
      {hasNoRole && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-medium">Tu cuenta está activa</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Si trabajás en Hoppiness, pedile a tu encargado que te asigne un rol.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Branch Work Cards */}
      {hasLocalRoles && (
        <div className="grid gap-3">
          {branchPinData?.filter((r: any) => r.local_role).map((ubr: any) => (
            <BranchWorkCard
              key={ubr.branch_id}
              branchId={ubr.branch_id}
              branchName={ubr.branches?.name || 'Sucursal'}
              localRole={ubr.local_role || 'empleado'}
              clockPin={ubr.clock_pin}
              roleId={ubr.id}
              userId={effectiveUserId || ''}
            />
          ))}
        </div>
      )}
    </div>
  );
}
