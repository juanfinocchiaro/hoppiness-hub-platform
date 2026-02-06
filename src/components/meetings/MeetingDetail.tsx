/**
 * MeetingDetail - Vista detalle de reunión
 */
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  Users,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  User,
  Target,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MEETING_AREAS, type MeetingWithDetails } from '@/types/meeting';
import { useMarkMeetingAsRead } from '@/hooks/useMeetings';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { toast } from 'sonner';

interface MeetingDetailProps {
  meeting: MeetingWithDetails;
  onBack: () => void;
  canTrackReads?: boolean;
}

export function MeetingDetail({ meeting, onBack, canTrackReads = false }: MeetingDetailProps) {
  const effectiveUser = useEffectiveUser();
  const markAsRead = useMarkMeetingAsRead();
  
  const areaLabel = MEETING_AREAS.find(a => a.value === meeting.area)?.label || meeting.area;
  
  // Find current user's participation
  const myParticipation = meeting.participants.find(p => p.user_id === effectiveUser.id);
  const isUnread = myParticipation && !myParticipation.read_at;
  
  const handleMarkAsRead = async () => {
    try {
      await markAsRead.mutateAsync(meeting.id);
      toast.success('Marcado como leído');
    } catch (error) {
      toast.error('Error al marcar como leído');
    }
  };

  const attendedParticipants = meeting.participants.filter(p => p.attended);
  const absentParticipants = meeting.participants.filter(p => !p.attended);
  const readCount = meeting.participants.filter(p => p.read_at).length;

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="w-4 h-4 mr-1" />
        Volver
      </Button>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{meeting.title}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(meeting.date), "EEEE d 'de' MMMM, HH:mm", { locale: es })}</span>
              </div>
              <Badge variant="secondary">{areaLabel}</Badge>
            </div>
          </div>
          
          {isUnread && (
            <Button size="sm" onClick={handleMarkAsRead} disabled={markAsRead.isPending}>
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Marcar leído
            </Button>
          )}
        </div>

        {meeting.creator && (
          <p className="text-sm text-muted-foreground">
            Creada por {meeting.creator.full_name}
          </p>
        )}
      </div>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4" />
            Notas de la Reunión
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
            {meeting.notes}
          </div>
        </CardContent>
      </Card>

      {/* Attendance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Asistencia
            </div>
            <span className="text-sm font-normal text-muted-foreground">
              {attendedParticipants.length}/{meeting.participants.length} presentes
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Present */}
          {attendedParticipants.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Presentes</p>
              <div className="flex flex-wrap gap-2">
                {attendedParticipants.map(p => (
                  <div key={p.id} className="flex items-center gap-2 bg-success/10 px-2 py-1 rounded-md">
                    <CheckCircle2 className="w-3 h-3 text-success" />
                    <span className="text-sm">{p.profile?.full_name || 'Usuario'}</span>
                    {canTrackReads && (
                      p.read_at ? (
                        <Badge variant="outline" className="text-[10px] px-1">Leyó</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] px-1">Pendiente</Badge>
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Absent */}
          {absentParticipants.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Ausentes</p>
              <div className="flex flex-wrap gap-2">
                {absentParticipants.map(p => (
                  <div key={p.id} className="flex items-center gap-2 bg-muted px-2 py-1 rounded-md">
                    <XCircle className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{p.profile?.full_name || 'Usuario'}</span>
                    {canTrackReads && (
                      p.read_at ? (
                        <Badge variant="outline" className="text-[10px] px-1">Leyó</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] px-1">Pendiente</Badge>
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Read tracker summary */}
          {canTrackReads && (
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Confirmaciones de lectura</span>
                <Badge variant={readCount === meeting.participants.length ? 'default' : 'secondary'}>
                  {readCount}/{meeting.participants.length}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agreements */}
      {meeting.agreements.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-4 h-4" />
              Acuerdos ({meeting.agreements.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {meeting.agreements.map((agreement, index) => (
              <div key={agreement.id} className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{agreement.description}</p>
                    {agreement.assignees.length > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <div className="flex flex-wrap gap-1">
                          {agreement.assignees.map(a => (
                            <Badge key={a.id} variant="outline" className="text-xs">
                              {a.profile?.full_name || 'Usuario'}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
