import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Circle, CheckCircle2 } from 'lucide-react';
import type { ModifierGroup } from '@/hooks/useProductModifiers';

interface ProductModifierSelectorProps {
  groups: ModifierGroup[];
  selections: Record<string, string[]>;
  onSelectionsChange: (selections: Record<string, string[]>) => void;
  formatPrice: (price: number) => string;
}

export function ProductModifierSelector({
  groups,
  selections,
  onSelectionsChange,
  formatPrice,
}: ProductModifierSelectorProps) {
  const handleOptionToggle = (groupId: string, optionId: string, selectionType: 'single' | 'multiple', maxSelections: number) => {
    const currentSelections = selections[groupId] || [];
    
    if (selectionType === 'single') {
      // Radio behavior - replace selection
      onSelectionsChange({
        ...selections,
        [groupId]: currentSelections.includes(optionId) ? [] : [optionId],
      });
    } else {
      // Checkbox behavior - toggle
      if (currentSelections.includes(optionId)) {
        onSelectionsChange({
          ...selections,
          [groupId]: currentSelections.filter(id => id !== optionId),
        });
      } else if (currentSelections.length < maxSelections) {
        onSelectionsChange({
          ...selections,
          [groupId]: [...currentSelections, optionId],
        });
      }
    }
  };

  const getGroupIcon = (type: string) => {
    switch (type) {
      case 'adicional': return '➕';
      case 'personalizacion': return '✏️';
      case 'combo': return '🎁';
      default: return '📦';
    }
  };

  const getGroupLabel = (group: ModifierGroup) => {
    if (group.modifier_type === 'combo' && group.min_selections > 0) {
      return `Elegí ${group.min_selections} (obligatorio)`;
    }
    if (group.modifier_type === 'personalizacion') {
      return 'Opcional';
    }
    return group.max_selections > 1 ? `Hasta ${group.max_selections}` : 'Opcional';
  };

  if (groups.length === 0) return null;

  return (
    <div className="space-y-5">
      {groups.map(group => {
        const selectedCount = (selections[group.id] || []).length;
        const isRequired = group.min_selections > 0;
        const isFulfilled = selectedCount >= group.min_selections;

        return (
          <div key={group.id} className="space-y-2">
            {/* Group Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">{getGroupIcon(group.modifier_type)}</span>
                <h4 className="font-semibold text-sm">{group.name}</h4>
              </div>
              <Badge 
                variant={isRequired && !isFulfilled ? "destructive" : "secondary"}
                className="text-xs font-normal"
              >
                {getGroupLabel(group)}
              </Badge>
            </div>

            {/* Options */}
            <div className="space-y-1">
              {group.options.map(option => {
                const isSelected = (selections[group.id] || []).includes(option.id);
                const isDisabled = !option.is_available;

                return (
                  <div
                    key={option.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                      isSelected && "border-primary bg-primary/5 shadow-sm",
                      !isSelected && !isDisabled && "border-border hover:border-primary/50 hover:bg-muted/50",
                      isDisabled && "opacity-50 cursor-not-allowed bg-muted/30"
                    )}
                    onClick={() => {
                      if (!isDisabled) {
                        handleOptionToggle(group.id, option.id, group.selection_type, group.max_selections);
                      }
                    }}
                  >
                    {/* Radio Circle Visual */}
                    {group.selection_type === 'single' ? (
                      <div className={cn(
                        "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0",
                        isSelected ? "border-primary bg-primary" : "border-muted-foreground",
                        isDisabled && "opacity-50"
                      )}>
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                        )}
                      </div>
                    ) : (
                      <Checkbox
                        checked={isSelected}
                        disabled={isDisabled}
                        className="h-5 w-5"
                      />
                    )}

                    {/* Image */}
                    {option.image_url && (
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                        <img
                          src={option.image_url}
                          alt={option.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Name */}
                    <span className={cn(
                      "flex-1 text-sm font-medium",
                      isDisabled && "line-through"
                    )}>
                      {option.name}
                    </span>

                    {/* Price or Agotado */}
                    {isDisabled ? (
                      <Badge variant="outline" className="text-xs text-destructive border-destructive">
                        Agotado
                      </Badge>
                    ) : option.price_adjustment > 0 ? (
                      <span className="text-sm text-primary font-bold">
                        +{formatPrice(option.price_adjustment)}
                      </span>
                    ) : option.price_adjustment < 0 ? (
                      <span className="text-sm text-green-600 font-bold">
                        {formatPrice(option.price_adjustment)}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
