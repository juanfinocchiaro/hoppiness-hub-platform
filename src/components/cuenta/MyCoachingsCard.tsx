import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyPendingCoachings } from '@/hooks/useCoachingStats';
import { useAcknowledgeCoaching, useEmployeeCoachings } from '@/hooks/useCoachings';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { usePermissionsWithImpersonation } from '@/hooks/usePermissionsWithImpersonation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ClipboardCheck, Star, CheckCircle, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export function MyCoachingsCard() {
  const { id: effectiveUserId } = useEffectiveUser();
  const { branchRoles } = usePermissionsWithImpersonation();
  const { data: pendingCoachings, isLoading: loadingPending } = useMyPendingCoachings();
  const { data: recentCoachings, isLoading: loadingRecent } = useEmployeeCoachings(effectiveUserId, null);
  const acknowledgeCoaching = useAcknowledgeCoaching();
  
  const [selectedCoaching, setSelectedCoaching] = useState<{
    id: string;
    month: string;
    score: number | null;
    strengths: string | null;
    areas: string | null;
  } | null>(null);
  const [acknowledgeNotes, setAcknowledgeNotes] = useState('');
  
  // Los encargados son evaluados por coordinadores/superadmins, no ven sus coachings aquí
  const isManager = branchRoles.some(r => r.local_role === 'encargado');

  const isLoading = loadingPending || loadingRecent;

  // Si es encargado, no mostrar este card (son evaluados por coordinadores)
  if (isManager) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasPending = pendingCoachings && pendingCoachings.length > 0;
  const lastCoaching = recentCoachings?.[0];

  const handleViewPending = (coaching: typeof pendingCoachings[0]) => {
    const date = new Date(coaching.coaching_date);
    setSelectedCoaching({
      id: coaching.id,
      month: format(date, 'MMMM yyyy', { locale: es }),
      score: coaching.overall_score,
      strengths: coaching.strengths,
      areas: coaching.areas_to_improve,
    });
  };

  const handleAcknowledge = async () => {
    if (!selectedCoaching) return;
    
    await acknowledgeCoaching.mutateAsync({
      coachingId: selectedCoaching.id,
      notes: acknowledgeNotes || undefined,
    });
    
    setSelectedCoaching(null);
    setAcknowledgeNotes('');
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Mis Coachings
          </CardTitle>
          <CardDescription>
            Evaluaciones mensuales de desempeño
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Pendientes de confirmar */}
          {hasPending && (
            <div className="space-y-2">
              {pendingCoachings.map(coaching => {
                const date = new Date(coaching.coaching_date);
                const monthName = format(date, 'MMMM', { locale: es });
                
                return (
                  <div 
                    key={coaching.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50"
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <div>
                        <p className="text-sm font-medium capitalize">
                          Coaching de {monthName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Pendiente de confirmar
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleViewPending(coaching)}
                    >
                      Ver y Confirmar
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Último coaching confirmado */}
          {lastCoaching && lastCoaching.acknowledged_at && (
            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm capitalize">
                    {format(new Date(lastCoaching.coaching_date), 'MMMM yyyy', { locale: es })}
                  </span>
                </div>
                {lastCoaching.overall_score && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-primary" />
                    <span className="font-medium">{lastCoaching.overall_score.toFixed(1)}/4</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {!hasPending && !lastCoaching && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aún no tienes coachings registrados
            </p>
          )}
        </CardContent>
      </Card>

      {/* Modal de confirmación */}
      <Dialog open={!!selectedCoaching} onOpenChange={() => setSelectedCoaching(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">
              Coaching de {selectedCoaching?.month}
            </DialogTitle>
            <DialogDescription>
              Revisa tu evaluación y confirma que la leíste
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedCoaching?.score && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Star className="h-8 w-8 text-primary" />
                <span className="text-4xl font-bold">{selectedCoaching.score.toFixed(1)}</span>
                <span className="text-xl text-muted-foreground">/ 4</span>
              </div>
            )}

            {selectedCoaching?.strengths && (
              <div>
                <Label className="text-sm font-medium text-green-700">Fortalezas</Label>
                <p className="text-sm mt-1 p-2 rounded bg-green-50">
                  {selectedCoaching.strengths}
                </p>
              </div>
            )}

            {selectedCoaching?.areas && (
              <div>
                <Label className="text-sm font-medium text-amber-700">Áreas de Mejora</Label>
                <p className="text-sm mt-1 p-2 rounded bg-amber-50">
                  {selectedCoaching.areas}
                </p>
              </div>
            )}

            <div className="pt-2">
              <Label htmlFor="notes">Comentarios (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="¿Algún comentario sobre esta evaluación?"
                value={acknowledgeNotes}
                onChange={(e) => setAcknowledgeNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCoaching(null)}>
              Cerrar
            </Button>
            <Button 
              onClick={handleAcknowledge}
              disabled={acknowledgeCoaching.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar Lectura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
