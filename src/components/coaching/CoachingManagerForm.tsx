/**
 * CoachingManagerForm - Formulario específico para evaluar encargados
 * 
 * NO usa estaciones de trabajo.
 * SOLO evalúa competencias de gestión (manager_competencies).
 * Para evaluaciones desde Mi Marca hacia encargados.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Save, Star, FileText, ShieldCheck } from 'lucide-react';
import { CoachingManagerSection } from './CoachingManagerSection';
import { useManagerCompetencies } from '@/hooks/useStationCompetencies';
import { useCreateCoaching, useEmployeeCoachings } from '@/hooks/useCoachings';

interface Employee {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

interface CoachingManagerFormProps {
  employee: Employee;
  branchId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface ManagerScore {
  competencyId: string;
  score: number;
}

export function CoachingManagerForm({ employee, branchId, onSuccess, onCancel }: CoachingManagerFormProps) {
  const { data: managerCompetencies, isLoading: loadingConfig } = useManagerCompetencies();
  const createCoaching = useCreateCoaching();
  
  // Obtener coachings anteriores para mostrar el plan de acción previo
  const { data: previousCoachings } = useEmployeeCoachings(employee.id, branchId);
  const previousCoaching = previousCoachings?.[0]; // El más reciente

  // State - Solo competencias de gestión
  const [managerScores, setManagerScores] = useState<ManagerScore[]>([]);
  const [strengths, setStrengths] = useState('');
  const [areasToImprove, setAreasToImprove] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [managerNotes, setManagerNotes] = useState('');
  const [previousActionReview, setPreviousActionReview] = useState('');

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Handler para competencias de gestión
  const handleManagerScoreChange = (competencyId: string, score: number) => {
    setManagerScores(prev => {
      const existing = prev.find(s => s.competencyId === competencyId);
      if (existing) {
        return prev.map(s => s.competencyId === competencyId ? { ...s, score } : s);
      }
      return [...prev, { competencyId, score }];
    });
  };

  // Calculate average for preview
  const filledScores = managerScores.filter(s => s.score > 0);
  const overallAvg = filledScores.length > 0
    ? filledScores.reduce((sum, s) => sum + s.score, 0) / filledScores.length
    : 0;

  // Submit - Solo guarda scores de tipo 'manager'
  const handleSubmit = async () => {
    // Mapear scores de manager como "general" scores con tipo 'manager' en el coaching
    const formData = {
      userId: employee.id,
      branchId,
      coachingDate: new Date(),
      stationScores: [], // NO hay estaciones para encargados
      generalScores: managerScores.filter(s => s.score > 0), // Se guardan como competencias
      strengths,
      areasToImprove,
      actionPlan,
      managerNotes,
      certificationChanges: [],
      previousActionReview,
      coachingType: 'manager' as const, // Marca el coaching como de tipo manager
    };

    await createCoaching.mutateAsync(formData);
    onSuccess?.();
  };

  const canSubmit = filledScores.length > 0;

  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con empleado y score */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                  <AvatarImage src={employee.avatar_url || undefined} />
                  <AvatarFallback>{getInitials(employee.full_name)}</AvatarFallback>
                </Avatar>
                <ShieldCheck className="absolute -bottom-1 -right-1 h-5 w-5 text-primary bg-background rounded-full" />
              </div>
              <div>
                <h3 className="font-semibold">{employee.full_name}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  Evaluación de Encargado
                </p>
              </div>
            </div>
            
            {overallAvg > 0 && (
              <div className="text-center">
                <div className="flex items-center gap-1 text-2xl font-bold">
                  <Star className="h-5 w-5 text-primary" />
                  {overallAvg.toFixed(1)}
                </div>
                <span className="text-xs text-muted-foreground">/ 5</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ScrollArea className="h-[calc(100vh-320px)]">
        <div className="space-y-6 px-1 py-1">
          {/* Sección de Competencias de Gestión (sin estaciones) */}
          <CoachingManagerSection
            scores={managerScores}
            onScoreChange={handleManagerScoreChange}
          />

          <Separator />

          {/* Seguimiento del plan anterior */}
          {previousCoaching?.action_plan && (
            <>
              <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                <FileText className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800 dark:text-blue-200">
                  Plan de Acción del mes anterior
                </AlertTitle>
                <AlertDescription className="text-blue-700 dark:text-blue-300">
                  {previousCoaching.action_plan}
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label htmlFor="previousReview">¿Cómo fue el seguimiento del plan anterior?</Label>
                <Textarea
                  id="previousReview"
                  placeholder="¿Se cumplió? ¿Qué avances hubo? ¿Qué quedó pendiente?"
                  value={previousActionReview}
                  onChange={(e) => setPreviousActionReview(e.target.value)}
                  rows={2}
                />
              </div>
              
              <Separator />
            </>
          )}

          {/* Notas cualitativas */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Feedback Cualitativo</Label>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="strengths">Fortalezas</Label>
                <Textarea
                  id="strengths"
                  placeholder="¿Qué hace bien este encargado?"
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="areas">Áreas de Mejora</Label>
                <Textarea
                  id="areas"
                  placeholder="¿Qué puede mejorar en su gestión?"
                  value={areasToImprove}
                  onChange={(e) => setAreasToImprove(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="actionPlan">Plan de Acción para el próximo mes</Label>
              <Textarea
                id="actionPlan"
                placeholder="Acciones concretas de gestión para el próximo mes..."
                value={actionPlan}
                onChange={(e) => setActionPlan(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas Adicionales (privadas)</Label>
              <Textarea
                id="notes"
                placeholder="Notas que solo verá la marca..."
                value={managerNotes}
                onChange={(e) => setManagerNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button 
          onClick={handleSubmit} 
          disabled={!canSubmit || createCoaching.isPending}
        >
          {createCoaching.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar Evaluación
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
