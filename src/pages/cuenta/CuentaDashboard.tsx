import { useAuth } from '@/hooks/useAuth';
import { usePermissionsV2, LOCAL_ROLE_LABELS } from '@/hooks/usePermissionsV2';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { User, Store, ArrowRight, Briefcase, Building2, AlertTriangle } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import MyScheduleCard from '@/components/cuenta/MyScheduleCard';
import MyClockInsCard from '@/components/cuenta/MyClockInsCard';
import MySalaryAdvancesCard from '@/components/cuenta/MySalaryAdvancesCard';
import MyWarningsCard from '@/components/cuenta/MyWarningsCard';
import MyCommunicationsCard from '@/components/cuenta/MyCommunicationsCard';
import MissingPinBanner from '@/components/cuenta/MissingPinBanner';
import MyRequestsCard from '@/components/cuenta/MyRequestsCard';
import MyRegulationsCard from '@/components/cuenta/MyRegulationsCard';

export default function CuentaDashboard() {
  const { user, signOut } = useAuth();
  const { branchRoles, brandRole, canAccessBrandPanel, canAccessLocalPanel } = usePermissionsV2();

  // Check access levels
  const hasBrandAccess = canAccessBrandPanel;
  const hasLocalAccess = canAccessLocalPanel;
  const hasNoRole = !brandRole && branchRoles.length === 0;

  // Get branch IDs from roles
  const branchIds = branchRoles.map(r => r.branch_id);

  // Fetch profile data
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const result = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!user,
  });

  // Fetch branch roles with clock_pin status to detect missing PINs
  const { data: branchPinData } = useQuery({
    queryKey: ['user-branch-roles-pins', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_branch_roles')
        .select('id, branch_id, clock_pin, branches!inner(name)')
        .eq('user_id', user.id)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && canAccessLocalPanel,
  });

  // Check if ANY branch is missing PIN
  const branchesMissingPin = branchPinData?.filter(r => !r.clock_pin) || [];
  const needsPinSetup = branchesMissingPin.length > 0;

  // Fetch urgent unread communications
  const { data: urgentUnread = [] } = useQuery({
    queryKey: ['urgent-unread', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Get urgent communications
      const { data: urgentComms, error: commsError } = await supabase
        .from('communications')
        .select('id, title')
        .eq('type', 'urgent')
        .eq('is_published', true);
      
      if (commsError) throw commsError;
      if (!urgentComms?.length) return [];
      
      // Get user's reads
      const { data: reads } = await supabase
        .from('communication_reads')
        .select('communication_id')
        .eq('user_id', user.id);
      
      const readIds = new Set(reads?.map(r => r.communication_id) || []);
      
      return urgentComms.filter(c => !readIds.has(c.id));
    },
    enabled: !!user,
    staleTime: 60000,
  });

  // needsPinSetup is now calculated above from branchPinData

  // Fetch branch names for employee section
  const { data: employeeBranches } = useQuery({
    queryKey: ['employee-branches', branchIds.join(',')],
    queryFn: async () => {
      if (branchIds.length === 0) return [];
      const result = await supabase
        .from('branches')
        .select('id, name')
        .in('id', branchIds);
      if (result.error) throw result.error;
      return result.data as { id: string; name: string }[];
    },
    enabled: branchIds.length > 0,
  });

  // Create a map of branch names
  const branchNameMap = new Map(employeeBranches?.map(b => [b.id, b.name]) || []);

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <PublicHeader />
      
      <main className="flex-1 container mx-auto px-4 py-6 md:py-8">
        <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
          {/* Welcome - responsive */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-bold">
                Hola, {profile?.full_name?.split(' ')[0] || 'Usuario'}! 👋
              </h1>
              <p className="text-sm text-muted-foreground">
                Bienvenido a tu cuenta
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={signOut}
              className="w-full sm:w-auto min-h-[44px]"
            >
              Cerrar sesión
            </Button>
          </div>

          {/* Urgent Banner */}
          {urgentUnread.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Mensaje urgente</AlertTitle>
              <AlertDescription className="flex items-center gap-2">
                Tenés {urgentUnread.length} comunicado{urgentUnread.length > 1 ? 's' : ''} urgente{urgentUnread.length > 1 ? 's' : ''} sin leer.
                <Link to="#comunicados" className="underline font-medium hover:no-underline">
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

          {/* Local Access Section */}
          {hasLocalAccess && (
            <>
              <div className="border-t pt-4 md:pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase className="w-5 h-5 text-primary" />
                  <h2 className="text-base md:text-lg font-semibold">Mi Trabajo</h2>
                </div>
                
                {/* Missing PIN Banner */}
                {needsPinSetup && (
                  <div className="mb-3">
                    <MissingPinBanner 
                      missingCount={branchesMissingPin.length}
                      totalCount={branchPinData?.length || 0}
                    />
                  </div>
                )}
              </div>

              {/* Branch Cards with specific role per branch */}
              <div className="grid gap-3">
                {branchRoles.map((ubr) => (
                  <Card key={ubr.branch_id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Store className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium truncate">
                            {branchNameMap.get(ubr.branch_id) || 'Sucursal'}
                          </span>
                          <Badge variant="outline" className="flex-shrink-0">
                            {LOCAL_ROLE_LABELS[ubr.local_role || ''] || ubr.local_role}
                          </Badge>
                        </div>
                        <Link to={`/milocal/${ubr.branch_id}`}>
                          <Button variant="outline" size="sm" className="min-h-[36px]">
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Employee Cards - responsive grid */}
              <div className="grid gap-3 md:gap-4">
                <MyCommunicationsCard />
                <MyRegulationsCard />
                <MyScheduleCard />
                <MyRequestsCard />
                <MyClockInsCard />
                <MySalaryAdvancesCard />
                <MyWarningsCard />
              </div>
            </>
          )}

          {/* Profile & Settings - Always visible */}
          <div className="border-t pt-4 md:pt-6">
            <Link to="/cuenta/perfil">
              <Card className="hover:shadow-md transition-shadow cursor-pointer active:bg-muted/50">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <User className="w-10 h-10 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{profile?.full_name || 'Mi Perfil'}</h3>
                      <p className="text-sm text-muted-foreground truncate">{profile?.email}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </main>
      
      <PublicFooter />
    </div>
  );
}
