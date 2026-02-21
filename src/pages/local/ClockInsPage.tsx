/**
 * ClockInsPage - Fichajes del personal agrupados por persona
 *
 * Vista:
 * - Link/QR para fichar
 * - "En el local ahora" (entrada sin salida posterior)
 * - "Jornadas completadas" (pares entrada→salida con duración)
 * - Cruce contra horario programado (employee_schedules)
 * - Detección de anomalías (salida sin entrada, etc.)
 */
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDynamicPermissions } from '@/hooks/useDynamicPermissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Copy, ExternalLink, QrCode, Clock, LogIn, LogOut,
  User, Calendar, Printer, AlertTriangle, ArrowRight, Timer,
} from 'lucide-react';
import { format, startOfDay, endOfDay, addDays, subDays, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { QRCodeSVG } from 'qrcode.react';
import { getClockInUrl } from '@/lib/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClockEntry {
  id: string;
  entry_type: string;
  photo_url: string | null;
  created_at: string;
  user_id: string;
  user_name: string;
  isFromNextDay?: boolean;
}

interface SessionPair {
  clockIn: ClockEntry | null;
  clockOut: ClockEntry | null;
  durationMin: number | null;
}

interface ScheduleInfo {
  start_time: string | null;
  end_time: string | null;
  is_day_off: boolean;
}

interface PersonSummary {
  userId: string;
  userName: string;
  sessions: SessionPair[];
  isCurrentlyIn: boolean;
  totalMinutes: number;
  schedule: ScheduleInfo | null;
  anomalies: string[];
}

// ─── Processing helpers ───────────────────────────────────────────────────────

function buildPersonSummaries(
  entries: ClockEntry[],
  scheduleMap: Map<string, ScheduleInfo>,
): PersonSummary[] {
  const byUser = new Map<string, ClockEntry[]>();
  for (const e of entries) {
    const list = byUser.get(e.user_id) ?? [];
    list.push(e);
    byUser.set(e.user_id, list);
  }

  const summaries: PersonSummary[] = [];

  for (const [userId, userEntries] of byUser) {
    const sorted = [...userEntries].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    const sessions: SessionPair[] = [];
    const anomalies: string[] = [];
    let i = 0;

    while (i < sorted.length) {
      const cur = sorted[i];

      if (cur.entry_type === 'clock_in') {
        const next = sorted[i + 1];
        if (next && next.entry_type === 'clock_out') {
          const mins = differenceInMinutes(new Date(next.created_at), new Date(cur.created_at));
          sessions.push({ clockIn: cur, clockOut: next, durationMin: mins });
          i += 2;
        } else {
          sessions.push({ clockIn: cur, clockOut: null, durationMin: null });
          i += 1;
        }
      } else {
        anomalies.push(`Salida a las ${format(new Date(cur.created_at), 'HH:mm')} sin entrada previa`);
        sessions.push({ clockIn: null, clockOut: cur, durationMin: null });
        i += 1;
      }
    }

    const lastSession = sessions[sessions.length - 1];
    const isCurrentlyIn = !!lastSession?.clockIn && !lastSession?.clockOut;

    const totalMinutes = sessions.reduce((sum, s) => {
      if (s.durationMin != null) return sum + s.durationMin;
      if (s.clockIn && !s.clockOut) {
        return sum + differenceInMinutes(new Date(), new Date(s.clockIn.created_at));
      }
      return sum;
    }, 0);

    const schedule = scheduleMap.get(userId) ?? null;

    if (schedule && !schedule.is_day_off && schedule.start_time && sessions.length > 0) {
      const firstIn = sessions.find(s => s.clockIn)?.clockIn;
      if (firstIn) {
        const scheduledH = parseInt(schedule.start_time.split(':')[0], 10);
        const scheduledM = parseInt(schedule.start_time.split(':')[1], 10);
        const actualTime = new Date(firstIn.created_at);
        const scheduledTotalMin = scheduledH * 60 + scheduledM;
        const actualTotalMin = actualTime.getHours() * 60 + actualTime.getMinutes();
        const diff = actualTotalMin - scheduledTotalMin;
        if (diff > 5) {
          anomalies.push(`Llegó ${diff} min tarde (programado ${schedule.start_time.slice(0, 5)})`);
        }
      }
    }

    summaries.push({
      userId,
      userName: sorted[0].user_name,
      sessions,
      isCurrentlyIn,
      totalMinutes,
      schedule,
      anomalies,
    });
  }

  summaries.sort((a, b) => {
    if (a.isCurrentlyIn !== b.isCurrentlyIn) return a.isCurrentlyIn ? -1 : 1;
    return a.userName.localeCompare(b.userName, 'es');
  });

  return summaries;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return `${h}h ${m}min`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PersonCard({ person, isToday }: { person: PersonSummary; isToday: boolean }) {
  const statusColor = person.isCurrentlyIn ? 'bg-emerald-500' : 'bg-gray-300';
  const statusRing = person.isCurrentlyIn ? 'ring-emerald-500/20' : '';

  return (
    <div className={`rounded-lg border p-4 ${person.isCurrentlyIn ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900' : 'bg-muted/30'}`}>
      <div className="flex items-start gap-3">
        {/* Avatar + status dot */}
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-900 ${statusColor} ${statusRing} ring-4`} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Name + schedule badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm truncate">{person.userName}</span>
            {person.isCurrentlyIn && isToday && (
              <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-emerald-600 hover:bg-emerald-600">
                En el local
              </Badge>
            )}
          </div>

          {/* Schedule info */}
          {person.schedule && !person.schedule.is_day_off && person.schedule.start_time && person.schedule.end_time && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Horario programado: {person.schedule.start_time.slice(0, 5)} - {person.schedule.end_time.slice(0, 5)}
            </p>
          )}
          {person.schedule?.is_day_off && (
            <p className="text-xs text-amber-600 mt-0.5 font-medium">Franco programado</p>
          )}

          {/* Sessions */}
          <div className="mt-2 space-y-1.5">
            {person.sessions.map((s, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-sm flex-wrap">
                {s.clockIn && (
                  <span className="inline-flex items-center gap-1">
                    <LogIn className="w-3 h-3 text-emerald-600" />
                    <span className="font-medium">{format(new Date(s.clockIn.created_at), 'HH:mm')}</span>
                  </span>
                )}
                {s.clockIn && s.clockOut && (
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                )}
                {s.clockOut && (
                  <span className="inline-flex items-center gap-1">
                    <LogOut className="w-3 h-3 text-gray-500" />
                    <span className="font-medium">{format(new Date(s.clockOut.created_at), 'HH:mm')}</span>
                    {s.clockOut.isFromNextDay && (
                      <span className="text-[10px] text-muted-foreground">(día sig.)</span>
                    )}
                  </span>
                )}
                {s.durationMin != null && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground ml-1">
                    <Timer className="w-3 h-3" />
                    {formatDuration(s.durationMin)}
                  </span>
                )}
                {!s.clockIn && s.clockOut && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-400 text-amber-600">
                    Sin entrada
                  </Badge>
                )}
                {s.clockIn && !s.clockOut && isToday && (
                  <span className="text-xs text-emerald-600 ml-1">
                    (hace {formatDuration(differenceInMinutes(new Date(), new Date(s.clockIn.created_at)))})
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Anomalies */}
          {person.anomalies.length > 0 && (
            <div className="mt-2 space-y-1">
              {person.anomalies.map((a, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-xs text-amber-600">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  <span>{a}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Total hours */}
        <div className="text-right flex-shrink-0">
          <span className="text-sm font-semibold">{formatDuration(person.totalMinutes)}</span>
          <p className="text-[10px] text-muted-foreground">total</p>
        </div>
      </div>
    </div>
  );
}

function GroupedEntriesView({
  entries,
  scheduleMap,
  isToday,
}: {
  entries: ClockEntry[];
  scheduleMap: Map<string, ScheduleInfo>;
  isToday: boolean;
}) {
  const people = useMemo(() => buildPersonSummaries(entries, scheduleMap), [entries, scheduleMap]);
  const inNow = people.filter(p => p.isCurrentlyIn);
  const done = people.filter(p => !p.isCurrentlyIn);

  if (people.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        No hay fichajes registrados
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Currently in */}
      {isToday && inNow.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <h3 className="text-sm font-semibold">En el local ahora ({inNow.length})</h3>
          </div>
          {inNow.map(p => <PersonCard key={p.userId} person={p} isToday={isToday} />)}
        </div>
      )}

      {/* Completed sessions */}
      {done.length > 0 && (
        <div className="space-y-3">
          {isToday && inNow.length > 0 && (
            <h3 className="text-sm font-semibold text-muted-foreground">Jornadas completadas ({done.length})</h3>
          )}
          {done.map(p => <PersonCard key={p.userId} person={p} isToday={isToday} />)}
        </div>
      )}
    </div>
  );
}

// ─── Data-fetching helpers ────────────────────────────────────────────────────

function useClockEntries(branchId: string | undefined, date: Date, queryTag: string, refetchInterval?: number) {
  return useQuery({
    queryKey: ['clock-entries-grouped', queryTag, branchId, format(date, 'yyyy-MM-dd')],
    queryFn: async (): Promise<ClockEntry[]> => {
      const { data, error } = await supabase
        .from('clock_entries')
        .select('id, entry_type, photo_url, created_at, user_id')
        .eq('branch_id', branchId!)
        .gte('created_at', startOfDay(date).toISOString())
        .lte('created_at', endOfDay(date).toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Group by user to filter and detect overnight patterns
      const byUser = new Map<string, typeof data>();
      for (const e of data) {
        const list = byUser.get(e.user_id) ?? [];
        list.push(e);
        byUser.set(e.user_id, list);
      }

      const filtered: typeof data = [];
      const usersNeedingNextDayOut: string[] = [];

      for (const [userId, userEntries] of byUser) {
        userEntries.sort(
          (a, b) => new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime(),
        );

        // Leading clock_outs belong to the PREVIOUS day's shift → skip them
        let startIdx = 0;
        while (startIdx < userEntries.length && userEntries[startIdx].entry_type === 'clock_out') {
          startIdx++;
        }

        const remaining = userEntries.slice(startIdx);
        filtered.push(...remaining);

        // If the last remaining entry is a clock_in with no same-day
        // clock_out, look ahead to the next day
        if (remaining.length > 0 && remaining[remaining.length - 1].entry_type === 'clock_in') {
          usersNeedingNextDayOut.push(userId);
        }
      }

      // For overnight shifts starting today, find the next-day clock_out
      const nextDayOuts: typeof data = [];
      if (usersNeedingNextDayOut.length > 0) {
        const nextDay = addDays(date, 1);
        const { data: nextData } = await supabase
          .from('clock_entries')
          .select('id, entry_type, photo_url, created_at, user_id')
          .eq('branch_id', branchId!)
          .in('user_id', usersNeedingNextDayOut)
          .eq('entry_type', 'clock_out')
          .gt('created_at', endOfDay(date).toISOString())
          .lte('created_at', endOfDay(nextDay).toISOString())
          .order('created_at', { ascending: true });

        const seen = new Set<string>();
        for (const e of nextData ?? []) {
          if (!seen.has(e.user_id)) {
            seen.add(e.user_id);
            nextDayOuts.push(e);
          }
        }
      }

      const allEntries = [...filtered, ...nextDayOuts];

      const userIds = [...new Set(allEntries.map(e => e.user_id))];
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]));
      const dayEnd = endOfDay(date).getTime();

      return allEntries.map(entry => ({
        ...entry,
        created_at: entry.created_at!,
        user_name: profileMap.get(entry.user_id) || 'Usuario',
        isFromNextDay: new Date(entry.created_at!).getTime() > dayEnd,
      }));
    },
    enabled: !!branchId,
    refetchInterval,
  });
}

function useDaySchedules(branchId: string | undefined, date: Date) {
  return useQuery({
    queryKey: ['day-schedules-for-clock', branchId, format(date, 'yyyy-MM-dd')],
    queryFn: async (): Promise<Map<string, ScheduleInfo>> => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('employee_schedules')
        .select('user_id, start_time, end_time, is_day_off')
        .eq('branch_id', branchId!)
        .eq('schedule_date', dateStr);

      if (error) throw error;

      const map = new Map<string, ScheduleInfo>();
      for (const row of data ?? []) {
        map.set(row.user_id, {
          start_time: row.start_time,
          end_time: row.end_time,
          is_day_off: row.is_day_off ?? false,
        });
      }
      return map;
    },
    enabled: !!branchId,
  });
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ClockInsPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { isSuperadmin, local } = useDynamicPermissions(branchId);
  const [showQRModal, setShowQRModal] = useState(false);
  const [dateFilter, setDateFilter] = useState<Date>(new Date());

  const canManageStaff = isSuperadmin || local.canViewTeam;

  const { data: branch } = useQuery({
    queryKey: ['branch-clock-info', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, clock_code')
        .eq('id', branchId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!branchId,
  });

  const today = new Date();
  const { data: todayEntries = [] } = useClockEntries(branchId, today, 'today', 30000);
  const { data: todaySchedules = new Map() } = useDaySchedules(branchId, today);
  const { data: historyEntries = [] } = useClockEntries(branchId, dateFilter, 'history');
  const { data: historySchedules = new Map() } = useDaySchedules(branchId, dateFilter);

  if (!branchId) return null;

  const clockUrl = branch?.clock_code ? getClockInUrl(branch.clock_code) : '';

  const copyLink = () => {
    navigator.clipboard.writeText(clockUrl);
    toast.success('Link copiado al portapapeles');
  };

  const printQR = () => {
    try {
      const qrSvg = document.querySelector('#print-qr-svg') as SVGElement | null;
      if (!qrSvg) {
        toast.error('No se pudo generar el QR para imprimir');
        return;
      }

      const svgClone = qrSvg.cloneNode(true) as SVGElement;
      svgClone.setAttribute('width', '280');
      svgClone.setAttribute('height', '280');
      svgClone.removeAttribute('id');

      const svgData = new XMLSerializer().serializeToString(svgClone);

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('El navegador bloqueó la ventana de impresión');
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>QR Fichaje - ${branch?.name}</title>
            <style>
              @page { margin: 1.5cm; }
              * { box-sizing: border-box; }
              body {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                margin: 0;
                padding: 40px 20px;
                background: #fff;
                color: #1a1a1a;
              }
              .card {
                background: #fff;
                border: 2px solid #e5e7eb;
                border-radius: 24px;
                padding: 48px 40px;
                max-width: 420px;
                width: 100%;
                text-align: center;
              }
              .logo {
                font-size: 32px;
                font-weight: 800;
                letter-spacing: -1px;
                color: #1a1a1a;
                margin-bottom: 8px;
              }
              .logo span { color: #f59e0b; }
              .subtitle {
                font-size: 14px;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 2px;
                margin-bottom: 24px;
              }
              .branch-name {
                display: inline-block;
                background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                padding: 10px 28px;
                border-radius: 24px;
                font-size: 18px;
                font-weight: 700;
                color: #92400e;
                margin-bottom: 32px;
              }
              .qr-container {
                background: #fff;
                padding: 20px;
                border: 3px solid #1a1a1a;
                border-radius: 16px;
                display: inline-block;
                margin-bottom: 28px;
              }
              .qr-container svg { display: block; }
              .instructions { margin-bottom: 8px; }
              .instructions h2 { font-size: 22px; font-weight: 700; margin: 0 0 4px; color: #1a1a1a; }
              .instructions p { font-size: 16px; color: #6b7280; margin: 0; }
              .divider { width: 60px; height: 3px; background: #f59e0b; margin: 24px auto; border-radius: 2px; }
              .url { font-size: 11px; color: #9ca3af; word-break: break-all; font-family: monospace; }
              @media print { body { padding: 0; } .card { border: none; box-shadow: none; } }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="logo">HOPPI<span>NESS</span></div>
              <div class="subtitle">Control de Asistencia</div>
              <div class="branch-name">${branch?.name || 'Local'}</div>
              <div class="qr-container">${svgData}</div>
              <div class="instructions">
                <h2>Escaneá para fichar</h2>
                <p>Ingreso / Egreso</p>
              </div>
              <div class="divider"></div>
              <div class="url">${clockUrl}</div>
            </div>
            <script>setTimeout(() => { window.print(); }, 250);</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (e) {
      if (import.meta.env.DEV) console.error(e);
      toast.error('Error al generar la impresión del QR');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Fichajes" subtitle="Control de asistencia del personal" />

      {canManageStaff && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Link de Fichaje para este Local</CardTitle>
            <CardDescription>
              Compartí este link o imprimí el QR para que tu equipo pueda fichar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {branch?.clock_code ? (
              <>
                <div className="flex gap-2">
                  <Input value={clockUrl} readOnly className="font-mono text-sm" />
                  <Button variant="outline" size="icon" onClick={copyLink}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" asChild>
                    <a href={clockUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <QrCode className="w-4 h-4 mr-2" />
                        Ver QR
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>QR de Fichaje - {branch?.name}</DialogTitle>
                      </DialogHeader>
                      <div className="flex flex-col items-center gap-4 py-4">
                        <div className="bg-white p-4 rounded-lg">
                          <QRCodeSVG id="print-qr-svg" value={clockUrl} size={200} />
                        </div>
                        <p className="text-muted-foreground text-sm">Escaneá para fichar</p>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={printQR}>
                            <Printer className="w-4 h-4 mr-2" />
                            Imprimir
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">Este local no tiene código de fichaje configurado</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">
            <Clock className="w-4 h-4 mr-2" />
            Hoy
          </TabsTrigger>
          <TabsTrigger value="history">
            <Calendar className="w-4 h-4 mr-2" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fichajes de Hoy</CardTitle>
              <CardDescription>
                {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GroupedEntriesView
                entries={todayEntries}
                scheduleMap={todaySchedules}
                isToday
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-4">
          <div className="flex gap-2">
            <Input
              type="date"
              value={format(dateFilter, 'yyyy-MM-dd')}
              onChange={(e) => {
                const [y, m, d] = e.target.value.split('-').map(Number);
                setDateFilter(new Date(y, m - 1, d));
              }}
              className="w-auto"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDateFilter(subDays(dateFilter, 1))}
            >
              Día anterior
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Fichajes del {format(dateFilter, "d 'de' MMMM", { locale: es })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GroupedEntriesView
                entries={historyEntries}
                scheduleMap={historySchedules}
                isToday={false}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}