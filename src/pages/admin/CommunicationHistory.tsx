import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  Trash2, 
  Info, 
  AlertTriangle, 
  AlertCircle, 
  PartyPopper,
  Users,
  MapPin,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useCommunications, useDeleteCommunication, getTypeLabel, getTypeColor } from '@/hooks/useCommunications';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const TYPE_ICONS = {
  info: Info,
  warning: AlertTriangle,
  urgent: AlertCircle,
  celebration: PartyPopper,
};

export default function CommunicationHistory() {
  const { data: communications, isLoading } = useCommunications();
  const deleteMutation = useDeleteCommunication();

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Comunicado eliminado');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Historial de Comunicados</h1>
          <p className="text-muted-foreground">
            Todos los comunicados enviados al equipo
          </p>
        </div>
        <Link to="/admin/comunicacion/enviar">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Comunicado
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : communications && communications.length > 0 ? (
        <div className="space-y-4">
          {communications.map(comm => {
            const TypeIcon = TYPE_ICONS[comm.type] || Info;
            const isExpired = comm.expires_at && new Date(comm.expires_at) < new Date();
            
            return (
              <Card key={comm.id} className={isExpired ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                      <div className={`p-2 rounded-lg ${getTypeColor(comm.type)}`}>
                        <TypeIcon className="w-5 h-5" />
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{comm.title}</h3>
                          <Badge variant="outline" className="text-xs">
                            {getTypeLabel(comm.type)}
                          </Badge>
                          {isExpired && (
                            <Badge variant="secondary" className="text-xs">
                              Expirado
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {comm.body}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                          <span>
                            {format(new Date(comm.published_at), "d MMM yyyy 'a las' HH:mm", { locale: es })}
                          </span>
                          
                          {comm.target_branch_ids && comm.target_branch_ids.length > 0 && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {comm.target_branch_ids.length} sucursales
                            </span>
                          )}
                          
                          {comm.target_roles && comm.target_roles.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {comm.target_roles.length} roles
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar comunicado?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. El comunicado será eliminado permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(comm.id)}>
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No hay comunicados enviados aún
            </p>
            <Link to="/admin/comunicacion/enviar">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Enviar primer comunicado
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
