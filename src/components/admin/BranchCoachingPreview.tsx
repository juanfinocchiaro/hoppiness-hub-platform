import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Calendar, User, CheckCircle } from 'lucide-react';
import type { CoachingInfo } from './BranchTeamMemberRow';

interface BranchCoachingPreviewProps {
  coaching: CoachingInfo;
  employeeName: string;
}

export function BranchCoachingPreview({ coaching, employeeName }: BranchCoachingPreviewProps) {
  const isAcknowledged = coaching.acknowledged_at != null;
  const formattedDate = format(new Date(coaching.coaching_date), "d 'de' MMMM yyyy", { locale: es });

  return (
    <Card className="bg-background">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">Coaching de {employeeName}</h4>
          {isAcknowledged ? (
              <Badge variant="default">
                <CheckCircle className="h-3 w-3 mr-1" />
                Confirmado
              </Badge>
            ) : (
              <Badge variant="secondary">
                Pendiente confirmación
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1 text-2xl font-bold">
            <Star className="h-5 w-5 text-primary" />
            {coaching.overall_score?.toFixed(1) || '-'}
            <span className="text-sm text-muted-foreground font-normal">/ 4</span>
          </div>
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {formattedDate}
          </div>
          {coaching.evaluator_name && (
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              Evaluado por: {coaching.evaluator_name}
            </div>
          )}
        </div>

        {/* Score visualization */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Score:</span>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${((coaching.overall_score || 0) / 4) * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium">
            {coaching.overall_score?.toFixed(1) || '0'}/4
          </span>
        </div>

        {isAcknowledged && coaching.acknowledged_at && (
          <p className="text-xs text-muted-foreground">
            Confirmado el {format(new Date(coaching.acknowledged_at), "d 'de' MMMM yyyy", { locale: es })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
