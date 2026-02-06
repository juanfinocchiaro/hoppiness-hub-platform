/**
 * MeetingCard - Card de reunión en la lista
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, Users, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MEETING_AREAS, type Meeting } from '@/types/meeting';

interface MeetingCardProps {
  meeting: Meeting & { 
    participants?: { user_id: string; attended: boolean; read_at: string | null }[];
  };
  onClick?: () => void;
  showReadStatus?: boolean;
  isUnread?: boolean;
}

export function MeetingCard({ meeting, onClick, showReadStatus = false, isUnread = false }: MeetingCardProps) {
  const areaLabel = MEETING_AREAS.find(a => a.value === meeting.area)?.label || meeting.area;
  const attendedCount = meeting.participants?.filter(p => p.attended).length || 0;
  const totalParticipants = meeting.participants?.length || 0;
  const readCount = meeting.participants?.filter(p => p.read_at).length || 0;

  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-shadow ${isUnread ? 'border-primary/50 bg-primary/5' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isUnread && (
                <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
              )}
              <h3 className="font-semibold truncate">{meeting.title}</h3>
            </div>
            
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{format(new Date(meeting.date), "d MMM HH:mm", { locale: es })}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {areaLabel}
              </Badge>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              <span>{attendedCount}/{totalParticipants}</span>
            </div>
            
            {showReadStatus && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {readCount === totalParticipants ? (
                  <>
                    <CheckCircle className="w-3 h-3 text-success" />
                    <span>Todos leyeron</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3 text-warning" />
                    <span>{readCount}/{totalParticipants}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
