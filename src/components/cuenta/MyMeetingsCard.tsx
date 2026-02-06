/**
 * MyMeetingsCard - Card de reuniones pendientes para Mi Cuenta
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle2, ChevronRight, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMyMeetings, useMarkMeetingAsRead } from '@/hooks/useMeetings';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MEETING_AREAS } from '@/types/meeting';

export function MyMeetingsCard() {
  const { data: meetings = [], isLoading } = useMyMeetings();
  const markAsRead = useMarkMeetingAsRead();
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);

  const unreadMeetings = meetings.filter(m => !m.myParticipation?.read_at);
  const hasUnread = unreadMeetings.length > 0;

  const handleMarkAsRead = async (meetingId: string) => {
    try {
      await markAsRead.mutateAsync(meetingId);
      toast.success('Marcado como leído');
      setSelectedMeeting(null);
    } catch (error) {
      toast.error('Error al marcar como leído');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-4 h-4" />
            Reuniones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16" />
        </CardContent>
      </Card>
    );
  }

  if (meetings.length === 0) {
    return null; // Don't show if no meetings
  }

  return (
    <>
      <Card className={hasUnread ? 'border-primary/50' : ''}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Reuniones
            </div>
            {hasUnread && (
              <Badge variant="destructive" className="text-xs">
                {unreadMeetings.length} sin leer
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {unreadMeetings.slice(0, 3).map(meeting => (
            <div
              key={meeting.id}
              className="flex items-center justify-between p-2 rounded-lg bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={() => setSelectedMeeting(meeting)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{meeting.title}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(meeting.date), "d MMM HH:mm", { locale: es })}
                </p>
              </div>
              <Eye className="w-4 h-4 text-primary flex-shrink-0" />
            </div>
          ))}

          {meetings.length > 3 && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              y {meetings.length - 3} más...
            </p>
          )}
        </CardContent>
      </Card>

      {/* Meeting Detail Dialog */}
      <Dialog open={!!selectedMeeting} onOpenChange={() => setSelectedMeeting(null)}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedMeeting?.title}</DialogTitle>
          </DialogHeader>
          
          {selectedMeeting && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {format(new Date(selectedMeeting.date), "EEEE d 'de' MMMM, HH:mm", { locale: es })}
                  </span>
                  <Badge variant="secondary">
                    {MEETING_AREAS.find(a => a.value === selectedMeeting.area)?.label || selectedMeeting.area}
                  </Badge>
                </div>

                <div className="prose prose-sm max-w-none">
                  <h4 className="text-sm font-medium mb-2">Notas de la reunión:</h4>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                    {selectedMeeting.notes}
                  </div>
                </div>

                {!selectedMeeting.myParticipation?.read_at && (
                  <Button
                    className="w-full"
                    onClick={() => handleMarkAsRead(selectedMeeting.id)}
                    disabled={markAsRead.isPending}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Confirmar lectura
                  </Button>
                )}

                {selectedMeeting.myParticipation?.read_at && (
                  <div className="flex items-center justify-center gap-2 text-sm text-success">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      Leído el {format(new Date(selectedMeeting.myParticipation.read_at), "d MMM HH:mm", { locale: es })}
                    </span>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
