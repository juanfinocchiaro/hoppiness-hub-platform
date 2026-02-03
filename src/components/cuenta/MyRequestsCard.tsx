import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarClock, CheckCircle2, XCircle, Clock, CalendarOff, RefreshCw, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import RequestDayOffModal from './RequestDayOffModal';

interface ScheduleRequest {
  id: string;
  request_type: 'day_off' | 'shift_change' | 'other';
  request_date: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  response_note: string | null;
  created_at: string;
}

export default function MyRequestsCard() {
  const { id: userId } = useEffectiveUser();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['my-schedule-requests', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('schedule_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data as ScheduleRequest[];
    },
    enabled: !!userId,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="w-3 h-3" />
            Pendiente
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="gap-1 bg-success text-success-foreground">
            <CheckCircle2 className="w-3 h-3" />
            Aprobada
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" />
            Rechazada
          </Badge>
        );
      default:
        return null;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'day_off': return CalendarOff;
      case 'shift_change': return RefreshCw;
      default: return HelpCircle;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'day_off': return 'Día libre';
      case 'shift_change': return 'Cambio turno';
      case 'other': return 'Otro';
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const pendingCount = requests?.filter(r => r.status === 'pending').length || 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Mis Solicitudes</CardTitle>
            {pendingCount > 0 && (
              <Badge variant="secondary">{pendingCount} pendiente{pendingCount > 1 ? 's' : ''}</Badge>
            )}
          </div>
          <RequestDayOffModal />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests && requests.length > 0 ? (
          <>
            {requests.map((request) => {
              const TypeIcon = getTypeIcon(request.request_type);
              
              return (
                <div 
                  key={request.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-background">
                      <TypeIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {getTypeLabel(request.request_type)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(request.request_date), "EEE d MMM", { locale: es })}
                        </span>
                      </div>
                      {request.reason && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {request.reason}
                        </p>
                      )}
                      {request.response_note && request.status === 'rejected' && (
                        <p className="text-xs text-destructive mt-1">
                          Motivo: {request.response_note}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {getStatusBadge(request.status)}
                </div>
              );
            })}
          </>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <CalendarClock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No tenés solicitudes recientes</p>
            <p className="text-xs mt-1">Usá el botón para pedir día libre o cambio de turno</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
