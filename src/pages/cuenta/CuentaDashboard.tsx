import { useAuth } from '@/hooks/useAuth';
import { usePermissionsV2 } from '@/hooks/usePermissionsV2';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Store, ArrowRight, Briefcase } from 'lucide-react';
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
import { ROLE_LABELS } from '@/components/admin/users/types';

export default function CuentaDashboard() {
  const { user, signOut } = useAuth();
  const { localRole, branchIds } = usePermissionsV2();

  // Check if user is an employee (has local role)
  const isEmployee = !!localRole;

  // Fetch profile data including clock_pin
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const result = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!user,
  });

  // Check if employee needs to set up PIN
  const needsPinSetup = isEmployee && profile && !profile.clock_pin;

  // Fetch branch names for employee section
  const { data: employeeBranches } = useQuery({
    queryKey: ['employee-branches', branchIds],
    queryFn: async () => {
      if (!branchIds || branchIds.length === 0) return [];
      const result = await supabase
        .from('branches')
        .select('id, name')
        .in('id', branchIds);
      if (result.error) throw result.error;
      return result.data as { id: string; name: string }[];
    },
    enabled: !!branchIds && branchIds.length > 0,
  });

  const getRoleLabel = (role: string | null) => {
    if (!role) return '';
    return ROLE_LABELS[role] || role;
  };

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

          {/* Employee Section */}
          {isEmployee ? (
            <>
              <div className="border-t pt-4 md:pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase className="w-5 h-5 text-primary" />
                  <h2 className="text-base md:text-lg font-semibold">Mi Trabajo</h2>
                  {localRole && (
                    <span className="text-xs md:text-sm bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {getRoleLabel(localRole)}
                    </span>
                  )}
                </div>
                
                {/* Missing PIN Banner */}
                {needsPinSetup && (
                  <div className="mb-3">
                    <MissingPinBanner employeeName={profile?.full_name} />
                  </div>
                )}
              </div>

              {/* Branch Cards - optimized for mobile */}
              {employeeBranches && employeeBranches.length > 0 && (
                <div className="grid gap-3">
                  {employeeBranches.map((branch) => (
                    <Card key={branch.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Store className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium truncate">{branch.name}</span>
                          </div>
                          <Link to="/milocal">
                            <Button variant="outline" size="sm" className="min-h-[36px]">
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

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
          ) : (
            /* Non-employee: Show basic message */
            <Card>
              <CardHeader>
                <CardTitle>Bienvenido</CardTitle>
                <CardDescription>
                  Tu cuenta está activa. Si eres parte del equipo, contacta a tu encargado para que te asigne un rol.
                </CardDescription>
              </CardHeader>
            </Card>
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
