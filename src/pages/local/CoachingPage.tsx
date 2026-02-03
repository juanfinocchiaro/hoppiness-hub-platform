import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  CertificationMatrix, 
  CoachingForm, 
  CertificationBadgeRow,
  CertificationLegend,
} from '@/components/coaching';
import { useCoachingStats } from '@/hooks/useCoachingStats';
import { useTeamCertifications } from '@/hooks/useCertifications';
import { useWorkStations } from '@/hooks/useStationCompetencies';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { PageHelp } from '@/components/ui/PageHelp';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ClipboardList, Users, Award, CheckCircle, Clock, ChevronDown, ChevronRight, X } from 'lucide-react';
import type { CertificationLevel } from '@/types/coaching';

interface TeamMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
  local_role: string;
}

export default function CoachingPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { id: currentUserId } = useEffectiveUser();
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('team');

  // Fetch empleados y cajeros (solo staff, sin encargados)
  const { data: teamMembers, isLoading: loadingTeam, refetch: refetchTeam } = useQuery({
    queryKey: ['team-members-coaching', branchId, currentUserId],
    queryFn: async (): Promise<TeamMember[]> => {
      if (!branchId) return [];

      const { data: roles, error: rolesError } = await supabase
        .from('user_branch_roles')
        .select('user_id, local_role')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .in('local_role', ['empleado', 'cajero']);

      if (rolesError) throw rolesError;

      // Exclude current user from the list (can't evaluate yourself)
      const userIds = roles?.map(r => r.user_id).filter(id => id !== currentUserId) ?? [];
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

  const handleToggleEmployee = (employeeId: string) => {
    setExpandedEmployeeId(prev => prev === employeeId ? null : employeeId);
  };

  const handleCoachingSuccess = () => {
    setExpandedEmployeeId(null);
    refetchTeam();
  };

  const getRoleBadge = (role: string) => {
    if (role === 'cajero') {
      return <Badge variant="outline" className="text-xs">Cajero</Badge>;
    }
    return null;
  };

  // Componente reutilizable para renderizar lista de miembros
  const renderMemberList = (
    members: TeamMember[] | undefined, 
    checkHasCoaching: (id: string) => boolean,
    emptyMessage: string
  ) => {
    if (!members?.length) {
      return (
        <p className="text-center text-muted-foreground py-8">
          {emptyMessage}
        </p>
      );
    }

    return (
      <div className="space-y-2">
        {members.map(member => {
          const hasCoaching = checkHasCoaching(member.id);
          const certs = getEmployeeCertifications(member.id);
          const isExpanded = expandedEmployeeId === member.id;
          
          return (
            <Collapsible
              key={member.id}
              open={isExpanded}
              onOpenChange={() => !hasCoaching && handleToggleEmployee(member.id)}
            >
              <div className={`border rounded-lg transition-colors ${isExpanded ? 'border-primary bg-muted/50' : ''}`}>
                {/* Employee row */}
                <CollapsibleTrigger asChild disabled={hasCoaching}>
                  <div className={`flex items-center justify-between p-4 ${!hasCoaching ? 'cursor-pointer hover:bg-muted/30' : ''}`}>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{member.full_name}</p>
                          {getRoleBadge(member.local_role)}
                        </div>
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
                        <>
                          <span className="text-sm text-muted-foreground">
                            {isExpanded ? 'Cerrar' : 'Evaluar'}
                          </span>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>

                {/* Expanded coaching form */}
                <CollapsibleContent>
                  <div className="border-t p-4 bg-background">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Coaching de {member.full_name}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedEmployeeId(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {branchId && (
                      <CoachingForm
                        employee={member}
                        branchId={branchId}
                        onSuccess={handleCoachingSuccess}
                        onCancel={() => setExpandedEmployeeId(null)}
                      />
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>
    );
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

      {/* Stats Cards - Solo del staff */}
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
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-950">
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
                <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-950">
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
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-950">
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

      {/* Tabs - Solo Equipo y Certificaciones */}
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

        {/* Tab Equipo - Empleados y Cajeros */}
        <TabsContent value="team" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Empleados del Local</CardTitle>
              <CardDescription>
                Seleccioná un empleado para realizar su coaching mensual
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderMemberList(
                teamMembers, 
                hasCoachingThisMonth,
                'No hay empleados activos en este local'
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matrix" className="mt-4 space-y-4">
          {/* Certification legend */}
          <Card className="p-4">
            <CertificationLegend />
          </Card>
          
          {branchId && teamMembers && (
            <CertificationMatrix 
              branchId={branchId} 
              employees={teamMembers}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
