import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Star, Clock, Eye, ClipboardCheck } from 'lucide-react';
import { CoachingForm } from '@/components/coaching/CoachingForm';
import { BranchCoachingPreview } from './BranchCoachingPreview';

export interface CoachingInfo {
  id: string;
  overall_score: number | null;
  coaching_date: string;
  evaluated_by: string;
  acknowledged_at: string | null;
  evaluator_name?: string;
}

export interface TeamMemberData {
  user_id: string;
  local_role: string;
  default_position: string | null;
  profile: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null;
  coaching?: CoachingInfo | null;
}

interface BranchTeamMemberRowProps {
  member: TeamMemberData;
  branchId: string;
  canEvaluate: boolean;
  canViewCoaching: boolean;
  roleLabel: string;
  onCoachingSuccess?: () => void;
}

export function BranchTeamMemberRow({
  member,
  branchId,
  canEvaluate,
  canViewCoaching,
  roleLabel,
  onCoachingSuccess,
}: BranchTeamMemberRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCoachingForm, setShowCoachingForm] = useState(false);

  const hasCoaching = !!member.coaching;
  const isAcknowledged = member.coaching?.acknowledged_at != null;

  const handleCoachingSuccess = () => {
    setShowCoachingForm(false);
    setIsExpanded(false);
    onCoachingSuccess?.();
  };

  const getCoachingStatus = () => {
    if (!hasCoaching) {
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Pendiente
        </Badge>
      );
    }

    if (!isAcknowledged) {
      return (
        <Badge variant="outline">
          <Star className="h-3 w-3 mr-1" />
          {member.coaching?.overall_score?.toFixed(1) || '-'}
          <span className="ml-1 text-xs opacity-70">(sin confirmar)</span>
        </Badge>
      );
    }

    return (
      <Badge variant="default">
        <Star className="h-3 w-3 mr-1" />
        {member.coaching?.overall_score?.toFixed(1) || '-'}/4
      </Badge>
    );
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center gap-3 p-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={member.profile?.avatar_url || ''} />
            <AvatarFallback>
              {member.profile?.full_name?.charAt(0).toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{member.profile?.full_name || 'Usuario'}</p>
            <p className="text-sm text-muted-foreground truncate">{member.profile?.email}</p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden sm:flex">
              {roleLabel}
            </Badge>

            {getCoachingStatus()}

            {hasCoaching && member.coaching?.evaluator_name && (
              <span className="text-xs text-muted-foreground hidden md:block">
                por {member.coaching.evaluator_name}
              </span>
            )}

            {/* Action buttons */}
            {canEvaluate && !hasCoaching && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCoachingForm(true);
                  setIsExpanded(true);
                }}
              >
                <ClipboardCheck className="h-4 w-4 mr-1" />
                Evaluar
              </Button>
            )}

            {canViewCoaching && hasCoaching && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4 mr-1" />
                  Ver
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 ml-1" />
                  ) : (
                    <ChevronDown className="h-4 w-4 ml-1" />
                  )}
                </Button>
              </CollapsibleTrigger>
            )}

            {canEvaluate && !hasCoaching && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            )}
          </div>
        </div>

        <CollapsibleContent>
          <div className="border-t p-4 bg-muted/30">
            {showCoachingForm && canEvaluate ? (
              <CoachingForm
                employee={{
                  id: member.user_id,
                  full_name: member.profile?.full_name || 'Usuario',
                  avatar_url: member.profile?.avatar_url,
                }}
                branchId={branchId}
                onSuccess={handleCoachingSuccess}
                onCancel={() => {
                  setShowCoachingForm(false);
                  setIsExpanded(false);
                }}
              />
            ) : hasCoaching && member.coaching ? (
              <BranchCoachingPreview
                coaching={member.coaching}
                employeeName={member.profile?.full_name || 'Usuario'}
              />
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No hay información de coaching para mostrar.
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
