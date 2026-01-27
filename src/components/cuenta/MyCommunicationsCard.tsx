import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Bell, 
  Check, 
  Info, 
  AlertTriangle, 
  AlertCircle, 
  PartyPopper,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  useUserCommunications, 
  useMarkAsRead, 
  getTypeLabel, 
  getTypeColor,
  type CommunicationWithRead,
} from '@/hooks/useCommunications';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useState } from 'react';

const TYPE_ICONS = {
  info: Info,
  warning: AlertTriangle,
  urgent: AlertCircle,
  celebration: PartyPopper,
};

export default function MyCommunicationsCard() {
  const { data: communications, isLoading } = useUserCommunications();
  const markAsRead = useMarkAsRead();
  const [selectedComm, setSelectedComm] = useState<CommunicationWithRead | null>(null);

  const unreadCount = communications?.filter(c => !c.is_read).length || 0;

  const handleOpen = async (comm: CommunicationWithRead) => {
    setSelectedComm(comm);
    if (!comm.is_read) {
      await markAsRead.mutateAsync(comm.id);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Comunicados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Comunicados
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-auto">
                {unreadCount} sin leer
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {communications && communications.length > 0 ? (
            <div className="space-y-2">
              {communications.slice(0, 5).map(comm => {
                const TypeIcon = TYPE_ICONS[comm.type] || Info;
                
                return (
                  <button
                    key={comm.id}
                    onClick={() => handleOpen(comm)}
                    className={`w-full p-3 rounded-lg border text-left transition-colors hover:bg-muted/50 ${
                      !comm.is_read ? 'bg-primary/5 border-primary/20' : 'border-border'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-1.5 rounded ${getTypeColor(comm.type)}`}>
                        <TypeIcon className="w-4 h-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium truncate ${!comm.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {comm.title}
                          </span>
                          {!comm.is_read && (
                            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(comm.published_at), "d MMM", { locale: es })}
                        </p>
                      </div>
                      
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              No hay comunicados
            </p>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedComm} onOpenChange={() => setSelectedComm(null)}>
        <DialogContent className="sm:max-w-lg">
          {selectedComm && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getTypeColor(selectedComm.type)}`}>
                    {(() => {
                      const Icon = TYPE_ICONS[selectedComm.type] || Info;
                      return <Icon className="w-5 h-5" />;
                    })()}
                  </div>
                  <div>
                    <DialogTitle>{selectedComm.title}</DialogTitle>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedComm.published_at), "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })}
                    </p>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="py-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {selectedComm.body}
                </p>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t">
                <Badge variant="secondary">
                  {getTypeLabel(selectedComm.type)}
                </Badge>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-success" />
                  Leído
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
