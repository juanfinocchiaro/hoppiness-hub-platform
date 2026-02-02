import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertTriangle, 
  CalendarOff, 
  RefreshCw, 
  HelpCircle, 
  CheckCircle2, 
  XCircle,
  Clock,
  Loader2,
  User,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface PendingRequest {
  id: string;
  user_id: string;
  request_type: 'day_off' | 'shift_change' | 'other';
  request_date: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  profile?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface PendingScheduleRequestsProps {
  branchId: string;
}

export default function PendingScheduleRequests({ branchId }: PendingScheduleRequestsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [responseNote, setResponseNote] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

  const { data: requests, isLoading } = useQuery({
    queryKey: ['pending-schedule-requests', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_requests')
        .select(`
          id,
          user_id,
          request_type,
          request_date,
          reason,
          status,
          created_at
        `)
        .eq('branch_id', branchId)
        .eq('status', 'pending')
        .order('request_date', { ascending: true });
      
      if (error) throw error;

      // Fetch profiles for each user (profiles.id = user_id after migration)
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(r => r.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]));
        
        return data.map(r => ({
          ...r,
          profile: profileMap.get(r.user_id),
        })) as PendingRequest[];
      }

      return data as PendingRequest[];
    },
    enabled: !!branchId,
  });

  const respondToRequest = useMutation({
    mutationFn: async ({ requestId, status, note }: { requestId: string; status: 'approved' | 'rejected'; note?: string }) => {
      const { error } = await supabase
        .from('schedule_requests')
        .update({
          status,
          response_note: note || null,
          responded_by: user?.id,
          responded_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      // TODO: Create automatic communication to notify the employee
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending-schedule-requests', branchId] });
      toast.success(variables.status === 'approved' ? 'Solicitud aprobada' : 'Solicitud rechazada');
      setSelectedRequest(null);
      setResponseNote('');
      setActionType(null);
    },
    onError: (error) => {
      console.error('Error responding to request:', error);
      toast.error('Error al procesar la solicitud');
    },
  });

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

  const handleAction = (request: PendingRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setResponseNote('');
  };

  const confirmAction = () => {
    if (!selectedRequest || !actionType) return;
    
    respondToRequest.mutate({
      requestId: selectedRequest.id,
      status: actionType === 'approve' ? 'approved' : 'rejected',
      note: responseNote,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!requests || requests.length === 0) {
    return null; // Don't show card if no pending requests
  }

  return (
    <>
      <Card className="border-warning/50 bg-warning/5">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <CardTitle className="text-lg">
              Solicitudes Pendientes ({requests.length})
            </CardTitle>
          </div>
          <CardDescription>
            Solicitudes de días libres y cambios de turno por revisar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {requests.map((request) => {
            const TypeIcon = getTypeIcon(request.request_type);
            
            return (
              <div 
                key={request.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-background"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-muted">
                    <TypeIcon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {request.profile?.full_name || 'Usuario'}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {getTypeLabel(request.request_type)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(request.request_date), "EEEE d 'de' MMMM", { locale: es })}
                    </p>
                    {request.reason && (
                      <p className="text-sm text-muted-foreground italic mt-1">
                        "{request.reason}"
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Solicitado {format(new Date(request.created_at), "d MMM", { locale: es })}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => handleAction(request, 'reject')}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Rechazar
                  </Button>
                  <Button
                    size="sm"
                    className="bg-success hover:bg-success/90"
                    onClick={() => handleAction(request, 'approve')}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Aprobar
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedRequest && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {actionType === 'approve' ? 'Aprobar solicitud' : 'Rechazar solicitud'}
                </DialogTitle>
                <DialogDescription>
                  {selectedRequest.profile?.full_name} - {getTypeLabel(selectedRequest.request_type)} para el{' '}
                  {format(new Date(selectedRequest.request_date), "EEEE d 'de' MMMM", { locale: es })}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-4">
                {selectedRequest.reason && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Motivo del empleado:</p>
                    <p className="text-sm font-medium">"{selectedRequest.reason}"</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="responseNote">
                    {actionType === 'reject' ? 'Motivo del rechazo (recomendado)' : 'Nota (opcional)'}
                  </Label>
                  <Textarea
                    id="responseNote"
                    value={responseNote}
                    onChange={(e) => setResponseNote(e.target.value)}
                    placeholder={actionType === 'reject' ? 'Ej: No hay cobertura para ese día' : 'Nota adicional...'}
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelectedRequest(null)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className={`flex-1 ${actionType === 'approve' ? 'bg-success hover:bg-success/90' : ''}`}
                    variant={actionType === 'reject' ? 'destructive' : 'default'}
                    onClick={confirmAction}
                    disabled={respondToRequest.isPending}
                  >
                    {respondToRequest.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : actionType === 'approve' ? (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    ) : (
                      <XCircle className="w-4 h-4 mr-2" />
                    )}
                    {actionType === 'approve' ? 'Confirmar aprobación' : 'Confirmar rechazo'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
