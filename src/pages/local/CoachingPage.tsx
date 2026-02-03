import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { 
  CertificationMatrix, 
  CoachingForm, 
  CertificationBadgeRow,
  CoachingPendingCard 
} from '@/components/coaching';
import { useCoachingStats, useHasCoachingThisMonth } from '@/hooks/useCoachingStats';
import { useTeamCertifications } from '@/hooks/useCertifications';
import { useWorkStations } from '@/hooks/useStationCompetencies';
import { PageHelp } from '@/components/ui/PageHelp';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ClipboardList, Users, Award, CheckCircle, Clock, Plus } from 'lucide-react';
import type { CertificationLevel } from '@/types/coaching';

interface TeamMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
  local_role: string;
}

export default function CoachingPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const [selectedEmployee, setSelectedEmployee] = useState<TeamMember | null>(null);
  const [activeTab, setActiveTab] = useState('team');

  // Fetch team members
  const { data: teamMembers, isLoading: loadingTeam } = useQuery({
    queryKey: ['team-members-coaching', branchId],
    queryFn: async (): Promise<TeamMember[]> => {
      if (!branchId) return [];

      const { data: roles, error: rolesError } = await supabase
        .from('user_branch_roles')
        .select('user_id, local_role')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .in('local_role', ['empleado', 'cajero']);

      if (rolesError) throw rolesError;

      const userIds = roles?.map(r => r.user_id) ?? [];
      if (userIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      return profiles?.map(p => ({
        ...p,
        local_role: roles.find(r => r.user_id === p.id)?.local_role || 'empleado',
      })) ?? [];
    },
    enabled: !!branchId,
  });

  const { data: stats } = useCoachingStats(branchId || null);
  const { data: certData } = useTeamCertifications(branchId || null);
  const { data: stations } = useWorkStations();

  const currentMonth = new Date().toLocaleString('es-AR', { month: 'long' });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getEmployeeCertifications = (userId: string) => {
    const userCerts = certData?.byUser[userId] || {};
    return stations?.map(station => ({
      stationKey: station.key,
      stationName: station.name,
      level: (userCerts[station.id]?.level ?? 0) as CertificationLevel,
    })).filter(c => c.level > 0) ?? [];
  };

  const hasCoachingThisMonth = (userId: string) => {
    return !stats?.employeesWithoutCoaching.includes(userId);
  };

  if (loadingTeam) {
  return (
    <div className="p-6 space-y-6">
      <PageHelp pageId="local-coaching" />
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            Coaching del Equipo
          </h1>
          <p className="text-muted-foreground capitalize">
            Evaluaciones de {currentMonth}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && stats.totalEmployees > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalEmployees}</p>
                  <p className="text-xs text-muted-foreground">Empleados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.coachingsThisMonth}</p>
                  <p className="text-xs text-muted-foreground">Completados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-amber-100">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pendingCoachings}</p>
                  <p className="text-xs text-muted-foreground">Pendientes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-100">
                  <Award className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {stats.averageScore?.toFixed(1) || '-'}
                  </p>
                  <p className="text-xs text-muted-foreground">Promedio /4</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            Equipo
          </TabsTrigger>
          <TabsTrigger value="matrix" className="gap-2">
            <Award className="h-4 w-4" />
            Certificaciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Empleados del Local</CardTitle>
              <CardDescription>
                Selecciona un empleado para realizar su coaching mensual
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!teamMembers?.length ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay empleados activos en este local
                </p>
              ) : (
                <div className="divide-y">
                  {teamMembers.map(member => {
                    const hasCoaching = hasCoachingThisMonth(member.id);
                    const certs = getEmployeeCertifications(member.id);
                    
                    return (
                      <div 
                        key={member.id}
                        className="flex items-center justify-between py-3"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={member.avatar_url || undefined} />
                            <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.full_name}</p>
                            <div className="flex items-center gap-2">
                              <CertificationBadgeRow certifications={certs} size="sm" />
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {hasCoaching ? (
                            <Badge variant="secondary" className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Completado
                            </Badge>
                          ) : (
                            <Button 
                              size="sm"
                              onClick={() => setSelectedEmployee(member)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Coaching
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matrix" className="mt-4">
          {branchId && teamMembers && (
            <CertificationMatrix 
              branchId={branchId} 
              employees={teamMembers}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Sheet para hacer coaching */}
      <Sheet open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Nuevo Coaching</SheetTitle>
            <SheetDescription>
              Evalúa el desempeño del empleado este mes
            </SheetDescription>
          </SheetHeader>
          
          {selectedEmployee && branchId && (
            <div className="mt-6">
              <CoachingForm
                employee={selectedEmployee}
                branchId={branchId}
                onSuccess={() => setSelectedEmployee(null)}
                onCancel={() => setSelectedEmployee(null)}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
