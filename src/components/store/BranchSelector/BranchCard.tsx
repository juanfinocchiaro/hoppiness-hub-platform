import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, MapPin, ChevronRight } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

interface BranchCardProps {
  branch: Tables<'branches'>;
  isRecommended?: boolean;
  onSelect: () => void;
}

export function BranchCard({ branch, isRecommended, onSelect }: BranchCardProps) {
  const isOpen = branch.is_open;
  
  return (
    <Card 
      className={`group transition-all cursor-pointer ${
        isOpen 
          ? 'hover:shadow-lg hover:border-primary/50' 
          : 'opacity-60 cursor-not-allowed'
      }`}
      onClick={isOpen ? onSelect : undefined}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Header with badge */}
            <div className="flex items-center gap-2 mb-1">
              {isRecommended && (
                <Badge className="bg-amber-500 text-white text-[10px] py-0 px-1.5">
                  ⭐ Recomendada
                </Badge>
              )}
              {isOpen ? (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] py-0">
                  Abierto
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground text-[10px] py-0">
                  Cerrado
                </Badge>
              )}
            </div>
            
            {/* Branch name */}
            <h3 className="font-bold text-base">
              <MapPin className="w-4 h-4 inline mr-1 text-primary" />
              {branch.name}
            </h3>
            
            {/* Address */}
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
              {branch.address}
            </p>
            
            {/* Meta */}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {branch.estimated_prep_time_min || 25}-{(branch.estimated_prep_time_min || 25) + 15} min
              </span>
            </div>
          </div>
          
          {/* Action button */}
          {isOpen && (
            <Button 
              variant="default" 
              size="sm"
              className="shrink-0 group-hover:bg-primary/90"
            >
              Pedir
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
        
        {/* Closed message */}
        {!isOpen && (
          <p className="text-xs text-muted-foreground mt-2">
            Abre a las {branch.opening_time || '11:00'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
