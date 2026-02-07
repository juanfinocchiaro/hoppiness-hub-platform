/**
 * CoachingManagerSection - Sección de competencias para evaluar encargados
 * 
 * Agrupa las 12 competencias por categoría (operacion, estandar, negocio, personas).
 * Incluye tooltips con rúbricas 1/3/5 para cada competencia.
 * Escala 1-5.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useManagerCompetencies } from '@/hooks/useStationCompetencies';
import { Loader2 } from 'lucide-react';
import { ScoreLegend } from './ScoreLegend';
import { ManagerCompetencyRow } from './ManagerCompetencyRow';
import { MANAGER_CATEGORY_CONFIG, type ManagerCompetencyCategory, type ManagerCompetency } from '@/types/coaching';

interface ManagerScore {
  competencyId: string;
  score: number;
}

interface CoachingManagerSectionProps {
  scores: ManagerScore[];
  onScoreChange: (competencyId: string, score: number) => void;
}

// Agrupa competencias por categoría
function groupByCategory(competencies: ManagerCompetency[]): Record<string, ManagerCompetency[]> {
  return competencies.reduce((acc, comp) => {
    const cat = comp.category || 'otros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(comp);
    return acc;
  }, {} as Record<string, ManagerCompetency[]>);
}

// Calcula promedio de una categoría
function getCategoryAverage(competencies: ManagerCompetency[], scores: ManagerScore[]): number {
  const catScores = competencies
    .map(c => scores.find(s => s.competencyId === c.id)?.score || 0)
    .filter(s => s > 0);
  return catScores.length > 0 ? catScores.reduce((a, b) => a + b, 0) / catScores.length : 0;
}

const CATEGORY_ORDER: ManagerCompetencyCategory[] = ['operacion', 'estandar', 'negocio', 'personas'];

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

  const grouped = groupByCategory(competencies);
  
  const getScore = (competencyId: string) => {
    return scores.find(s => s.competencyId === competencyId)?.score || 0;
  };

  return (
    <div className="space-y-4">
      {/* Leyenda ARRIBA del formulario */}
      <ScoreLegend />

      {/* Categorías agrupadas */}
      {CATEGORY_ORDER.map(catKey => {
        const catCompetencies = grouped[catKey];
        if (!catCompetencies?.length) return null;
        
        const config = MANAGER_CATEGORY_CONFIG[catKey];
        const catAvg = getCategoryAverage(catCompetencies, scores);
        
        return (
          <Card key={catKey}>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <span className="text-lg">{config.icon}</span>
                  {config.label}
                </CardTitle>
                {catAvg > 0 && (
                  <Badge variant="secondary" className="text-sm font-bold">
                    {catAvg.toFixed(1)}<span className="text-xs font-normal text-muted-foreground">/5</span>
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="grid gap-2">
                {catCompetencies.map(competency => (
                  <ManagerCompetencyRow
                    key={competency.id}
                    competency={competency}
                    score={getScore(competency.id)}
                    onScoreChange={(value) => onScoreChange(competency.id, value)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
