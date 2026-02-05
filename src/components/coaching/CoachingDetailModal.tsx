import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCoachingDetails } from '@/hooks/useCoachings';
import { useWorkStations, useCompetencyConfig } from '@/hooks/useStationCompetencies';
import { Star, CheckCircle, Clock, User, Calendar, Target, TrendingUp, MessageSquare } from 'lucide-react';

interface CoachingDetailModalProps {
  coachingId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CoachingDetailModal({ coachingId, open, onOpenChange }: CoachingDetailModalProps) {
  const { data: coaching, isLoading } = useCoachingDetails(coachingId);
  const { data: stations } = useWorkStations();
  const { generalCompetencies } = useCompetencyConfig();

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 3.5) return 'text-green-600';
    if (score >= 2.5) return 'text-amber-600';
    return 'text-red-600';
  };

  const getStationName = (stationId: string) => {
    return stations?.find(s => s.id === stationId)?.name || 'Estación';
  };

  const getCompetencyName = (competencyId: string, type: string) => {
    if (type === 'general') {
      return generalCompetencies?.find(c => c.id === competencyId)?.name || 'Competencia';
    }
    return 'Competencia';
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Detalle del Coaching
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : coaching ? (
          <div className="space-y-6">
            {/* Header con empleado y score */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={coaching.employee?.avatar_url || undefined} />
                      <AvatarFallback>
                        {coaching.employee?.full_name ? getInitials(coaching.employee.full_name) : '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{coaching.employee?.full_name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(coaching.coaching_date)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-3xl font-bold ${getScoreColor(coaching.overall_score)}`}>
                      {coaching.overall_score?.toFixed(1) || '-'}
                    </div>
                    <span className="text-xs text-muted-foreground">/ 4</span>
                  </div>
                </div>

                <Separator className="my-3" />

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-3 w-3" />
                    Evaluado por: <span className="font-medium text-foreground">{coaching.evaluator?.full_name}</span>
                  </div>
                  {coaching.acknowledged_at ? (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Confirmado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      Pendiente de lectura
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Scores por estación */}
            {coaching.station_scores && coaching.station_scores.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Desempeño por Estación
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {coaching.station_scores.map(ss => (
                    <div key={ss.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                      <span className="font-medium">{getStationName(ss.station_id)}</span>
                      <div className={`font-bold ${getScoreColor(ss.score)}`}>
                        {ss.score.toFixed(1)} / 4
                      </div>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex items-center justify-between font-semibold">
                    <span>Promedio Estaciones</span>
                    <span className={getScoreColor(coaching.station_score)}>
                      {coaching.station_score?.toFixed(1) || '-'} / 4
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Competencias generales */}
            {coaching.competency_scores && coaching.competency_scores.filter(c => c.competency_type === 'general').length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Competencias Generales
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {coaching.competency_scores
                    .filter(cs => cs.competency_type === 'general')
                    .map(cs => (
                      <div key={cs.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                        <span>{getCompetencyName(cs.competency_id, cs.competency_type)}</span>
                        <div className={`font-bold ${getScoreColor(cs.score)}`}>
                          {cs.score} / 4
                        </div>
                      </div>
                    ))}
                  <Separator />
                  <div className="flex items-center justify-between font-semibold">
                    <span>Promedio General</span>
                    <span className={getScoreColor(coaching.general_score)}>
                      {coaching.general_score?.toFixed(1) || '-'} / 4
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Seguimiento del plan anterior */}
            {coaching.previous_action_review && (
              <Card className="bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Seguimiento del Plan Anterior
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{coaching.previous_action_review}</p>
                </CardContent>
              </Card>
            )}

            {/* Feedback cualitativo */}
            {(coaching.strengths || coaching.areas_to_improve || coaching.action_plan) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {coaching.strengths && (
                    <div>
                      <p className="text-sm font-medium text-primary mb-1">Fortalezas</p>
                      <p className="text-sm text-muted-foreground">{coaching.strengths}</p>
                    </div>
                  )}
                  {coaching.areas_to_improve && (
                    <div>
                      <p className="text-sm font-medium text-destructive mb-1">Áreas de Mejora</p>
                      <p className="text-sm text-muted-foreground">{coaching.areas_to_improve}</p>
                    </div>
                  )}
                  {coaching.action_plan && (
                    <div>
                      <p className="text-sm font-medium text-primary mb-1">Plan de Acción</p>
                      <p className="text-sm text-muted-foreground">{coaching.action_plan}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Confirmación del empleado */}
            {coaching.acknowledged_at && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">
                        Confirmado el {formatDate(coaching.acknowledged_at)}
                      </p>
                      {coaching.acknowledged_notes && (
                        <p className="text-sm text-muted-foreground mt-1">
                          "{coaching.acknowledged_notes}"
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No se encontró el coaching
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
