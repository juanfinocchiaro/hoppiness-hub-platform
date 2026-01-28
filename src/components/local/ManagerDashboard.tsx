/**
 * ManagerDashboard - Vista mobile-first para Encargados
 * 
 * Muestra:
 * - Ventas de hoy por turno
 * - Equipo fichado ahora
 * - Pendientes (solicitudes, comunicados, firmas reglamento)
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
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
  Calendar,
  MessageSquare,
  FileText,
  CalendarX,
  ChevronRight,
} from 'lucide-react';
import { format, isToday, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTodaySales, getShiftLabel, getMissingShifts, getEnabledShifts } from '@/hooks/useDailySales';
import { useBranchShiftConfig } from '@/hooks/useShiftConfig';
import { SalesEntryModal } from '@/components/local/SalesEntryModal';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface ManagerDashboardProps {
  branch: Branch;
}

// Hook to get currently clocked-in team members
function useCurrentlyWorking(branchId: string) {
  return useQuery({
    queryKey: ['currently-working', branchId],
    queryFn: async () => {
      // Get attendance records with no check_out (currently working)
      const { data: attendance, error } = await supabase
        .from('attendance_records')
        .select('id, user_id, check_in, notes')
        .eq('branch_id', branchId)
        .is('check_out', null)
        .order('check_in', { ascending: true });

      if (error) throw error;
      if (!attendance?.length) return [];

      // Get profile info for these users
      const userIds = attendance.map(a => a.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return attendance.map(record => ({
        ...record,
        profile: profileMap.get(record.user_id),
        minutesWorking: differenceInMinutes(new Date(), new Date(record.check_in)),
      }));
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

// Hook to get pending items count
function usePendingItems(branchId: string) {
  return useQuery({
    queryKey: ['pending-items', branchId],
    queryFn: async () => {
      // 1. Pending day-off requests
      const { count: pendingRequests } = await supabase
        .from('schedule_requests')
        .select('id', { count: 'exact', head: true })
        .eq('branch_id', branchId)
        .eq('status', 'pending');

      // 2. Get team members for this branch
      const { data: roles } = await supabase
        .from('user_roles_v2')
        .select('user_id, branch_ids')
        .not('local_role', 'is', null);

      // Filter manually for those with this branch
      const userIds = (roles || [])
        .filter(r => Array.isArray(r.branch_ids) && r.branch_ids.includes(branchId))
        .map(r => r.user_id);

      // Get latest regulation
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
        unreadComms: 0, // TODO: implement when communications table is stable
        pendingSignatures,
        total: (pendingRequests || 0) + (pendingSignatures > 0 ? 1 : 0),
      };
    },
  });
}

export function ManagerDashboard({ branch }: ManagerDashboardProps) {
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState<string>('night');

  // Shift configuration
  const { data: shiftConfig, isLoading: loadingConfig } = useBranchShiftConfig(branch.id);
  const enabledShifts = getEnabledShifts(shiftConfig);

  // Today's sales
  const { data: todaySales, isLoading: loadingSales } = useTodaySales(branch.id);

  // Currently working team
  const { data: workingTeam, isLoading: loadingTeam } = useCurrentlyWorking(branch.id);

  // Pending items
  const { data: pending, isLoading: loadingPending } = usePendingItems(branch.id);

  const loadedShifts = todaySales?.map(s => s.shift) || [];
  const missingShifts = getMissingShifts(loadedShifts, enabledShifts);
  const todayTotal = todaySales?.reduce((sum, s) => sum + Number(s.sales_total || 0), 0) || 0;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(value);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  const handleOpenEntry = (shift?: string) => {
    if (shift) setSelectedShift(shift);
    setShowEntryModal(true);
  };

  const isLoading = loadingConfig || loadingSales;

  return (
    <div className="space-y-4">
      {/* Header - Compact for mobile */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">{branch.name}</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE d MMM", { locale: es })}
          </p>
        </div>
        <Button size="sm" onClick={() => handleOpenEntry()}>
          <Plus className="w-4 h-4 mr-1" />
          Cargar
        </Button>
      </div>

      {/* VENTAS DE HOY - Card principal */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="w-4 h-4" />
            Ventas Hoy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-2">
              {[1, 2].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : (
            <>
              {/* Shift cards - 2 column grid */}
              <div className="grid grid-cols-2 gap-2">
                {enabledShifts.map(shiftDef => {
                  const shiftSale = todaySales?.find(s => s.shift === shiftDef.value);
                  const isLoaded = !!shiftSale;

                  return (
                    <div
                      key={shiftDef.value}
                      className={`p-3 rounded-lg border transition-colors ${
                        isLoaded
                          ? 'border-success/40 bg-success/5'
                          : 'border-dashed border-muted-foreground/30 cursor-pointer hover:border-primary/50'
                      }`}
                      onClick={() => !isLoaded && handleOpenEntry(shiftDef.value)}
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
                        {isLoaded ? formatCurrency(Number(shiftSale.sales_total || 0)) : '-'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="font-medium">Total del día</span>
                <span className="text-xl font-bold text-primary">
                  {formatCurrency(todayTotal)}
                </span>
              </div>

              {/* Warning for missing shifts */}
              {missingShifts.length > 0 && (
                <div className="flex items-center gap-2 p-2 rounded bg-warning/10 text-xs">
                  <AlertCircle className="w-3 h-3 text-warning flex-shrink-0" />
                  <span>
                    {missingShifts.length === enabledShifts.length
                      ? 'Ningún turno cargado'
                      : `Faltan: ${missingShifts.map(s => s.label).join(', ')}`}
                  </span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* EQUIPO AHORA */}
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
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                >
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

          {/* Link to full attendance page */}
          <Link to={`/milocal/${branch.id}/equipo/fichajes`}>
            <Button variant="ghost" size="sm" className="w-full mt-2 text-xs">
              Ver todos los fichajes
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* PENDIENTES */}
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
            <div className="space-y-2">
              {/* Day-off requests */}
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

              {/* Unread communications */}
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

              {/* Pending regulation signatures */}
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

      {/* Sales Entry Modal */}
      <SalesEntryModal
        open={showEntryModal}
        onOpenChange={setShowEntryModal}
        branchId={branch.id}
        defaultShift={selectedShift}
      />
    </div>
  );
}

export default ManagerDashboard;
