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
  CoachingHistoryTab,
  TeamAnalysisTab,
  CoachingExpressModal,
  CoachingExportButton,
  MyManagerCoachingTab,
  MyOwnCoachingTab,
} from '@/components/coaching';
import { useCoachingStats } from '@/hooks/useCoachingStats';
import { useTeamCertifications } from '@/hooks/useCertifications';
import { useWorkStations } from '@/hooks/useStationCompetencies';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { usePermissionsV2 } from '@/hooks/usePermissionsV2';
import { PageHelp } from '@/components/ui/PageHelp';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ClipboardList, Users, Award, CheckCircle, Clock, ChevronDown, ChevronRight, X, History, BarChart3, Zap, User, Star, Eye } from 'lucide-react';
import type { CertificationLevel } from '@/types/coaching';
import { useQuery as useReactQuery } from '@tanstack/react-query';

interface TeamMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
  local_role: string;
}

export default function CoachingPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { id: currentUserId } = useEffectiveUser();
  const { local, isFranquiciado, isEncargado, isSuperadmin } = usePermissionsV2(branchId);
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);
  
  // Tab inicial según rol
  const getDefaultTab = () => {
    if (isFranquiciado) return 'manager';
    if (isEncargado) return 'own';
    return 'team';
  };
  const [activeTab, setActiveTab] = useState(getDefaultTab());
  const [expressModalOpen, setExpressModalOpen] = useState(false);
  const [expressEmployee, setExpressEmployee] = useState<TeamMember | null>(null);

  // Fetch branch name for export
  const { data: branchData } = useReactQuery({
    queryKey: ['branch-name', branchId],
    queryFn: async () => {
      if (!branchId) return null;
      const { data } = await supabase
        .from('branches')
        .select('name')
        .eq('id', branchId)
        .single();
      return data;
    },
    enabled: !!branchId,
  });

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
                    <CollapsibleTrigger asChild disabled={hasCoaching || !local.canDoCoaching}>
                      <div className={`flex items-center justify-between p-4 ${!hasCoaching && local.canDoCoaching ? 'cursor-pointer hover:bg-muted/30' : ''}`}>
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
                        ) : local.canDoCoaching ? (
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
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <Clock className="h-3 w-3" />
                            Pendiente
                          </Badge>
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
        {branchId && branchData?.name && (
          <CoachingExportButton branchId={branchId} branchName={branchData.name} />
        )}
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          {/* Tab Mi Encargado - Solo Franquiciado */}
          {isFranquiciado && (
            <TabsTrigger value="manager" className="gap-2">
              <User className="h-4 w-4" />
              Mi Encargado
            </TabsTrigger>
          )}
          
          {/* Tab Mi Evaluación - Solo Encargado */}
          {isEncargado && (
            <TabsTrigger value="own" className="gap-2">
              <Star className="h-4 w-4" />
              Mi Evaluación
            </TabsTrigger>
          )}
          
          
          {/* Tab Equipo - Todos los que pueden ver coaching */}
          {local.canViewCoaching && (
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" />
              Equipo
            </TabsTrigger>
          )}
          
          <TabsTrigger value="analysis" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Análisis
          </TabsTrigger>
          <TabsTrigger value="matrix" className="gap-2">
            <Award className="h-4 w-4" />
            Certificaciones
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        {/* Tab Mi Encargado - Solo Franquiciado */}
        {isFranquiciado && branchId && (
          <TabsContent value="manager" className="mt-4">
            <MyManagerCoachingTab branchId={branchId} />
          </TabsContent>
        )}

        {/* Tab Mi Evaluación - Solo Encargado */}
        {isEncargado && branchId && (
          <TabsContent value="own" className="mt-4">
            <MyOwnCoachingTab branchId={branchId} />
          </TabsContent>
        )}

        {/* Tab Equipo - Empleados y Cajeros */}
        <TabsContent value="team" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Empleados del Local</CardTitle>
              <CardDescription>
                {local.canDoCoaching 
                  ? 'Seleccioná un empleado para realizar su coaching mensual'
                  : 'Coachings realizados a los empleados del local'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Banner de solo lectura para Franquiciado */}
              {isFranquiciado && (
                <Alert className="mb-4">
                  <Eye className="h-4 w-4" />
                  <AlertTitle>Modo lectura</AlertTitle>
                  <AlertDescription>
                    Los coachings son realizados por el Encargado. 
                    Aquí podés ver el estado de las evaluaciones.
                  </AlertDescription>
                </Alert>
              )}
              
              {renderMemberList(
                teamMembers, 
                hasCoachingThisMonth,
                'No hay empleados activos en este local'
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Análisis - Vista comparativa */}
        <TabsContent value="analysis" className="mt-4">
          {branchId && <TeamAnalysisTab branchId={branchId} />}
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

        {/* Tab Historial */}
        <TabsContent value="history" className="mt-4">
          {branchId && <CoachingHistoryTab branchId={branchId} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
