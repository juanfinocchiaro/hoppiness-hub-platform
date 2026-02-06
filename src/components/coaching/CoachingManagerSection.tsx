/**
 * CoachingManagerSection - Sección de competencias para evaluar encargados
 * 
 * Usa manager_competencies en lugar de estaciones de trabajo.
 * Para evaluaciones brand_to_manager.
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useManagerCompetencies } from '@/hooks/useStationCompetencies';
import { Loader2, Star, Info } from 'lucide-react';
import type { ManagerCompetency } from '@/types/coaching';

interface ManagerScore {
  competencyId: string;
  score: number;
}

interface CoachingManagerSectionProps {
  scores: ManagerScore[];
  onScoreChange: (competencyId: string, score: number) => void;
}

const SCORE_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Necesita mejorar', color: 'bg-red-500' },
  2: { label: 'Regular', color: 'bg-amber-500' },
  3: { label: 'Bueno', color: 'bg-blue-500' },
  4: { label: 'Excelente', color: 'bg-green-500' },
};

function ScoreButton({ 
  value, 
  selected, 
  onClick 
}: { 
  value: number; 
  selected: boolean; 
  onClick: () => void;
}) {
  const config = SCORE_LABELS[value];
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            'h-8 w-8 p-0 transition-all',
            selected && `${config.color} text-white border-transparent hover:${config.color}/90`
          )}
          onClick={onClick}
        >
          {value}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">
        {config.label}
      </TooltipContent>
    </Tooltip>
  );
}

function CompetencyRow({ 
  competency, 
  score, 
  onScoreChange 
}: { 
  competency: ManagerCompetency; 
  score: number;
  onScoreChange: (score: number) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border bg-muted/30">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{competency.name}</span>
          {competency.description && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[200px]">
                {competency.description}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4].map(value => (
          <ScoreButton
            key={value}
            value={value}
            selected={score === value}
            onClick={() => onScoreChange(value)}
          />
        ))}
      </div>
    </div>
  );
}

export function CoachingManagerSection({ scores, onScoreChange }: CoachingManagerSectionProps) {
  const { data: competencies, isLoading } = useManagerCompetencies();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!competencies?.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No hay competencias de encargado configuradas
        </CardContent>
      </Card>
    );
  }

  const getScore = (competencyId: string) => {
    return scores.find(s => s.competencyId === competencyId)?.score || 0;
  };

  const averageScore = scores.length > 0 
    ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length 
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" />
            Competencias de Gestión
          </h3>
          <p className="text-sm text-muted-foreground">
            Evalúa el desempeño como encargado del local
          </p>
        </div>
        
        {averageScore > 0 && (
          <Badge variant="secondary" className="text-lg font-bold gap-1">
            {averageScore.toFixed(1)}
            <span className="text-xs font-normal text-muted-foreground">/4</span>
          </Badge>
        )}
      </div>

      <div className="grid gap-2">
        {competencies.map(competency => (
          <CompetencyRow
            key={competency.id}
            competency={competency}
            score={getScore(competency.id)}
            onScoreChange={(value) => onScoreChange(competency.id, value)}
          />
        ))}
      </div>

      {/* Leyenda de puntuación */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-2 border-t">
        {Object.entries(SCORE_LABELS).map(([value, config]) => (
          <span key={value} className="flex items-center gap-1">
            <div className={cn('w-3 h-3 rounded', config.color)} />
            {value} = {config.label}
          </span>
        ))}
      </div>
    </div>
  );
}
