/**
 * BrandMeetingsPage - Vista consolidada de reuniones de toda la red
 * 
 * Permite a Superadmins y Coordinadores:
 * - Ver todas las reuniones de todas las sucursales
 * - Filtrar por sucursal, área y fecha
 * - Ver métricas: total mes, % lectura, alertas pendientes
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Users, CheckCircle, AlertTriangle, MapPin, ChevronRight, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBrandMeetings, useBrandMeetingsStats, useMeetingDetail } from '@/hooks/useMeetings';
import { MeetingDetail } from '@/components/meetings';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';

const AREA_OPTIONS = [
  { value: 'all', label: 'Todas las áreas' },
  { value: 'general', label: 'General' },
  { value: 'cocina', label: 'Cocina' },
  { value: 'salon', label: 'Salón' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'limpieza', label: 'Limpieza' },
];

export default function BrandMeetingsPage() {
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  
  // Fetch branches for filter
  const { data: branches } = useQuery({
    queryKey: ['branches-for-filter'],
    queryFn: async () => {
      const { data } = await supabase
        .from('branches')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
  });
  
  const { data: meetings, isLoading: loadingMeetings } = useBrandMeetings();
  const { data: stats, isLoading: loadingStats } = useBrandMeetingsStats();
  const { data: meetingDetail } = useMeetingDetail(selectedMeetingId || undefined);
  
  // Filter meetings
  const filteredMeetings = useMemo(() => {
    if (!meetings) return [];
    
    return meetings.filter(meeting => {
      if (selectedBranch !== 'all' && meeting.branch_id !== selectedBranch) {
        return false;
      }
      if (selectedArea !== 'all' && meeting.area !== selectedArea) {
        return false;
      }
      return true;
    });
  }, [meetings, selectedBranch, selectedArea]);
  
  // Group meetings by date for display
  const groupedMeetings = useMemo(() => {
    const groups: Record<string, typeof filteredMeetings> = {};
    
    filteredMeetings.forEach(meeting => {
      const dateKey = format(parseISO(meeting.date), 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(meeting);
    });
    
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({
        date,
        dateLabel: format(parseISO(date), "EEEE d 'de' MMMM", { locale: es }),
        meetings: items,
      }));
  }, [filteredMeetings]);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Reuniones de la Red"
        subtitle="Vista consolidada de todas las reuniones de las sucursales"
      />
      
      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {loadingStats ? <Skeleton className="h-8 w-12" /> : stats?.totalMeetings || 0}
                </p>
                <p className="text-sm text-muted-foreground">reuniones este mes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {loadingStats ? <Skeleton className="h-8 w-12" /> : `${stats?.readPercentage || 0}%`}
                </p>
                <p className="text-sm text-muted-foreground">lectura confirmada</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stats?.alertCount ? 'bg-warning/10' : 'bg-muted'}`}>
                <AlertTriangle className={`w-5 h-5 ${stats?.alertCount ? 'text-warning' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {loadingStats ? <Skeleton className="h-8 w-12" /> : stats?.alertCount || 0}
                </p>
                <p className="text-sm text-muted-foreground">
                  {stats?.alertCount === 1 ? 'sucursal con pendientes' : 'sucursales con pendientes'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todas las sucursales" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las sucursales</SelectItem>
                {branches?.map(branch => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedArea} onValueChange={setSelectedArea}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todas las áreas" />
              </SelectTrigger>
              <SelectContent>
                {AREA_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {(selectedBranch !== 'all' || selectedArea !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedBranch('all');
                  setSelectedArea('all');
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Meetings List */}
      <div className="space-y-6">
        {loadingMeetings ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : groupedMeetings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay reuniones registradas</p>
            </CardContent>
          </Card>
        ) : (
          groupedMeetings.map(group => (
            <div key={group.date} className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground capitalize">
                {group.dateLabel}
              </h3>
              
              {group.meetings.map(meeting => {
                const participants = meeting.participants || [];
                const attendedCount = participants.filter((p: any) => p.attended).length;
                const readCount = participants.filter((p: any) => p.read_at).length;
                const pendingCount = participants.length - readCount;
                const branch = meeting.branches as { id: string; name: string; slug: string } | null;
                
                return (
                  <Card
                    key={meeting.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedMeetingId(meeting.id)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{branch?.name || 'Sin sucursal'}</span>
                            <span>•</span>
                            <span className="capitalize">{meeting.area}</span>
                            <span>•</span>
                            <span>{format(parseISO(meeting.date), 'HH:mm')}</span>
                          </div>
                          
                          <h4 className="font-medium truncate">{meeting.title}</h4>
                          
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="text-muted-foreground">
                              {attendedCount}/{participants.length} presentes
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">
                              {readCount}/{participants.length} confirmaron lectura
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {pendingCount > 0 ? (
                            <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {pendingCount} pendientes
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-success border-success/30 bg-success/10">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Todos leyeron
                            </Badge>
                          )}
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ))
        )}
      </div>
      
      {/* Meeting Detail Sheet */}
      <Sheet open={!!selectedMeetingId} onOpenChange={(open) => !open && setSelectedMeetingId(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalle de Reunión</SheetTitle>
          </SheetHeader>
          {meetingDetail && (
            <div className="mt-6">
              <MeetingDetail 
                meeting={meetingDetail} 
                onBack={() => setSelectedMeetingId(null)} 
                canTrackReads={true}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
