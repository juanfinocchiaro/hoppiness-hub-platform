/**
 * ManagerDashboard - Vista mobile-first para Encargados
 * 
 * Muestra:
 * - Ventas de hoy por turno (nuevo sistema de cierre)
 * - Equipo fichado ahora
 * - Pendientes (solicitudes, comunicados, firmas reglamento)
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DollarSign, 
  Plus,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  FileText,
  CalendarX,
  ChevronRight,
  ClipboardList,
} from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { useTodayClosures, useEnabledShifts } from '@/hooks/useShiftClosures';
import { getOperationalDateString, formatOperationalDate, isEarlyMorning } from '@/lib/operationalDate';
import { ShiftClosureModal } from '@/components/local/closure/ShiftClosureModal';
import { usePermissionsWithImpersonation } from '@/hooks/usePermissionsWithImpersonation';
import { CoachingPendingCard } from '@/components/coaching';
import { MeetingPendingCard } from '@/components/meetings/MeetingPendingCard';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface ManagerDashboardProps {
  branch: Branch;
  posEnabled?: boolean;
}

// Hook to get currently clocked-in team members using clock_entries
function useCurrentlyWorking(branchId: string) {
  return useQuery({
    queryKey: ['currently-working', branchId],
    queryFn: async () => {
      // Usar fecha operativa para que el personal de cierre siga visible
      const today = getOperationalDateString();
      
      // Obtener todas las entradas/salidas de la jornada operativa
      const { data: entries, error } = await supabase
        .from('clock_entries')
        .select('user_id, entry_type, created_at')
        .eq('branch_id', branchId)
        .gte('created_at', today)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!entries?.length) return [];

      // Calcular quién está fichado (última acción = entrada)
      const userStatus = new Map<string, { type: string; time: string }>();
      entries.forEach(e => {
        userStatus.set(e.user_id, {
          type: e.entry_type,
          time: e.created_at
        });
      });

      const workingUserIds = [...userStatus.entries()]
        .filter(([_, v]) => v.type === 'entrada')
        .map(([k, v]) => ({ user_id: k, clock_in: v.time }));

      if (!workingUserIds.length) return [];

      // Obtener perfiles (profiles.id = user_id after migration)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', workingUserIds.map(u => u.user_id));

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return workingUserIds.map(w => ({
        id: w.user_id,
        user_id: w.user_id,
        check_in: w.clock_in,
        profile: profileMap.get(w.user_id),
        minutesWorking: differenceInMinutes(new Date(), new Date(w.clock_in)),
      }));
    },
    refetchInterval: 60000,
  });
}

// Hook to get pending items count
function usePendingItems(branchId: string) {
  return useQuery({
    queryKey: ['pending-items', branchId],
    queryFn: async () => {
      const { count: pendingRequests } = await supabase
        .from('schedule_requests')
        .select('id', { count: 'exact', head: true })
        .eq('branch_id', branchId)
        .eq('status', 'pending');

      const { data: roles } = await supabase
        .from('user_roles_v2')
        .select('user_id, branch_ids')
        .not('local_role', 'is', null);

      const userIds = (roles || [])
        .filter(r => Array.isArray(r.branch_ids) && r.branch_ids.includes(branchId))
        .map(r => r.user_id);

      const { data: latestReg } = await supabase
        .from('regulations')
        .select('id, version')
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      let pendingSignatures = 0;
      if (latestReg && userIds.length > 0) {
        const { data: signatures } = await supabase
          .from('regulation_signatures')
          .select('user_id')
          .eq('regulation_id', latestReg.id)
          .in('user_id', userIds);

        const signedUserIds = new Set(signatures?.map(s => s.user_id) || []);
        pendingSignatures = userIds.filter(id => !signedUserIds.has(id)).length;
      }

      return {
        pendingRequests: pendingRequests || 0,
        unreadComms: 0,
        pendingSignatures,
        total: (pendingRequests || 0) + (pendingSignatures > 0 ? 1 : 0),
      };
    },
  });
}

export function ManagerDashboard({ branch, posEnabled = false }: ManagerDashboardProps) {
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState<string>('mediodía');

  // Permisos - verificar rol para vista limitada (con soporte de impersonación)
  const { isCajero, isEncargado, isSuperadmin, local } = usePermissionsWithImpersonation(branch.id);

  // Enabled shifts for this branch
  const { data: enabledShifts, isLoading: loadingShifts } = useEnabledShifts(branch.id);

  // Today's closures
  const { data: todayClosures, isLoading: loadingClosures } = useTodayClosures(branch.id);

  // Currently working team (solo para no-cajeros)
  const { data: workingTeam, isLoading: loadingTeam } = useCurrentlyWorking(branch.id);

  // Pending items (solo para no-cajeros)
  const { data: pending, isLoading: loadingPending } = usePendingItems(branch.id);

  const loadedShifts = todayClosures?.map(c => c.turno) || [];
  const todayTotal = todayClosures?.reduce((sum, c) => sum + Number(c.total_vendido || 0), 0) || 0;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(value);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  const navigate = useNavigate();

  const handleOpenEntry = (shift?: string) => {
    if (posEnabled) {
      navigate(`/milocal/${branch.id}/ventas/historial`);
      return;
    }
    if (shift) setSelectedShift(shift);
    setShowEntryModal(true);
  };

  const isLoading = loadingShifts || loadingClosures;

  // Default shifts if none configured
  const shifts = enabledShifts?.length ? enabledShifts : [
    { value: 'mediodía', label: 'Mediodía' },
    { value: 'noche', label: 'Noche' },
  ];

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">{branch.name}</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {formatOperationalDate()}
            {isEarlyMorning() && (
              <span className="ml-1 text-xs text-warning">(turno de cierre activo)</span>
            )}
          </p>
        </div>
        {/* Solo mostrar botón Cargar si puede cargar ventas y no está usando POS */}
        {local.canEnterSales && !posEnabled && (
          <Button size="sm" onClick={() => handleOpenEntry()}>
            <Plus className="w-4 h-4 mr-1" />
            Cargar
          </Button>
        )}
      </div>

      {/* VENTAS DE HOY - Card principal con acento de marca */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="w-4 h-4" />
            Ventas Hoy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {shifts.map(shiftDef => {
                  const closure = todayClosures?.find(c => c.turno === shiftDef.value);
                  const isLoaded = !!closure;

                  return (
                    <div
                      key={shiftDef.value}
                      className={`p-3 rounded-lg border transition-colors ${
                        isLoaded
                          ? 'border-success/40 bg-success/5'
                          : 'border-dashed border-muted-foreground/30 cursor-pointer hover:border-primary/50'
                      }`}
                      onClick={() => handleOpenEntry(shiftDef.value)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          {shiftDef.label}
                        </span>
                        {isLoaded ? (
                          <CheckCircle className="w-3 h-3 text-success" />
                        ) : (
                          <Plus className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                      <div className={`text-lg font-bold ${isLoaded ? 'text-success' : 'text-muted-foreground'}`}>
                        {isLoaded ? formatCurrency(Number(closure.total_vendido || 0)) : '-'}
                      </div>
                      {isLoaded && closure.total_hamburguesas > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {closure.total_hamburguesas} hamburguesas
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <span className="font-medium">Total del día</span>
                <span className="text-xl font-bold text-primary">
                  {formatCurrency(todayTotal)}
                </span>
              </div>

              {/* Link al historial de ventas */}
              <Link to={`/milocal/${branch.id}/ventas/historial`}>
                <Button variant="ghost" size="sm" className="w-full text-xs">
                  Ver historial de ventas
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>

              {loadedShifts.length === 0 && (
                <div className="flex items-center gap-2 p-2 rounded bg-warning/10 text-xs">
                  <AlertCircle className="w-3 h-3 text-warning flex-shrink-0" />
                  <span>Ningún turno cargado</span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* EQUIPO AHORA - Visible para todos (cajeros incluidos) */}
      <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Equipo Ahora
              </div>
              <Badge variant="secondary" className="text-xs">
                {workingTeam?.length || 0} fichados
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTeam ? (
              <div className="space-y-2">
                {[1, 2].map(i => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : workingTeam && workingTeam.length > 0 ? (
              <div className="space-y-2">
                {workingTeam.map(member => (
                  <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {member.profile?.full_name || 'Sin nombre'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Desde {format(new Date(member.check_in), 'HH:mm')}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {formatDuration(member.minutesWorking)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-3">
                Nadie fichado en este momento
              </p>
            )}

            <Link to={`/milocal/${branch.id}/equipo/fichajes`}>
              <Button variant="ghost" size="sm" className="w-full mt-2 text-xs">
                Ver todos los fichajes
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardContent>
      </Card>

      {/* PENDIENTES - Solo para encargados y superadmins (no franquiciados) */}
      {(isEncargado || isSuperadmin) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pendientes
              </div>
              {(pending?.total ?? 0) > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {pending?.total}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPending ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : (
              <div className="space-y-3">
                <Link to={`/milocal/${branch.id}/equipo/horarios`}>
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <CalendarX className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Solicitudes de día libre</span>
                    </div>
                    <Badge variant={pending?.pendingRequests ? 'destructive' : 'secondary'}>
                      {pending?.pendingRequests || 0}
                    </Badge>
                  </div>
                </Link>

                <Link to={`/milocal/${branch.id}/equipo/comunicados`}>
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Comunicados sin leer</span>
                    </div>
                    <Badge variant={pending?.unreadComms ? 'outline' : 'secondary'}>
                      {pending?.unreadComms || 0}
                    </Badge>
                  </div>
                </Link>

                <Link to={`/milocal/${branch.id}/equipo/reglamentos`}>
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Firmas de reglamento</span>
                    </div>
                    <Badge variant={pending?.pendingSignatures ? 'outline' : 'secondary'}>
                      {pending?.pendingSignatures || 0}
                    </Badge>
                  </div>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
   )}

   {/* REUNIONES - Solo para encargados y superiores */}
   {(isEncargado || isSuperadmin) && (
     <MeetingPendingCard branchId={branch.id} />
   )}

   {/* COACHING DEL MES - Solo para quienes pueden hacer coaching */}
   {local.canDoCoaching && (
     <CoachingPendingCard 
       branchId={branch.id}
       onStartCoaching={() => window.location.href = `/milocal/${branch.id}/equipo/coaching`}
     />
   )}


  {/* Shift Closure Modal */}
  <ShiftClosureModal
    open={showEntryModal}
    onOpenChange={setShowEntryModal}
    branchId={branch.id}
    branchName={branch.name}
    defaultShift={selectedShift}
  />
</div>
  );
}

export default ManagerDashboard;
