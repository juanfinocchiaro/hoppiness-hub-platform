/**
 * InspectionItemRow - Fila individual del checklist de inspección
 */

import { useState } from 'react';
import { Camera, Check, X, Minus, MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { InspectionItem } from '@/types/inspection';
import { useUpdateInspectionItem, useUploadInspectionPhoto } from '@/hooks/useInspections';

interface InspectionItemRowProps {
  item: InspectionItem;
  inspectionId: string;
  readOnly?: boolean;
}

export function InspectionItemRow({ item, inspectionId, readOnly = false }: InspectionItemRowProps) {
  const [showObservations, setShowObservations] = useState(!!item.observations);
  const [observations, setObservations] = useState(item.observations || '');
  
  const updateItem = useUpdateInspectionItem();
  const uploadPhoto = useUploadInspectionPhoto();

  const handleComplianceChange = (complies: boolean | null) => {
    if (readOnly) return;
    updateItem.mutate({
      itemId: item.id,
      inspectionId,
      data: { complies, observations },
    });
  };

  const handleObservationsBlur = () => {
    if (readOnly || observations === item.observations) return;
    updateItem.mutate({
      itemId: item.id,
      inspectionId,
      data: { complies: item.complies, observations },
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || readOnly) return;

    const url = await uploadPhoto.mutateAsync({
      inspectionId,
      itemKey: item.item_key,
      file,
    });

    updateItem.mutate({
      itemId: item.id,
      inspectionId,
      data: { complies: item.complies, observations, photo_url: url },
    });
  };

  const isLoading = updateItem.isPending || uploadPhoto.isPending;

  return (
    <div className="border-b border-border/50 py-3 last:border-b-0">
      <div className="flex items-start gap-3">
        {/* Item label */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm",
            item.complies === false && "text-destructive font-medium"
          )}>
            {item.item_label}
          </p>
          
          {/* Photo indicator */}
          {item.photo_url && (
            <a
              href={item.photo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline mt-1 inline-block"
            >
              📷 Ver foto
            </a>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            <>
              {/* Cumple */}
              <Button
                type="button"
                variant={item.complies === true ? 'default' : 'outline'}
                size="icon"
                className={cn(
                  "h-8 w-8",
                  item.complies === true && "bg-green-600 hover:bg-green-700"
                )}
                onClick={() => handleComplianceChange(true)}
                disabled={readOnly}
              >
                <Check className="w-4 h-4" />
              </Button>

              {/* No cumple */}
              <Button
                type="button"
                variant={item.complies === false ? 'destructive' : 'outline'}
                size="icon"
                className="h-8 w-8"
                onClick={() => handleComplianceChange(false)}
                disabled={readOnly}
              >
                <X className="w-4 h-4" />
              </Button>

              {/* N/A */}
              <Button
                type="button"
                variant={item.complies === null ? 'secondary' : 'outline'}
                size="icon"
                className="h-8 w-8"
                onClick={() => handleComplianceChange(null)}
                disabled={readOnly}
              >
                <Minus className="w-4 h-4" />
              </Button>

              {/* Observations toggle */}
              <Button
                type="button"
                variant={showObservations ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowObservations(!showObservations)}
              >
                <MessageSquare className="w-4 h-4" />
              </Button>

              {/* Photo upload */}
              {!readOnly && (
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={readOnly}
                  />
                  <Button
                    type="button"
                    variant={item.photo_url ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8"
                    asChild
                  >
                    <span>
                      <Camera className="w-4 h-4" />
                    </span>
                  </Button>
                </label>
              )}
            </>
          )}
        </div>
      </div>

      {/* Observations textarea */}
      {showObservations && (
        <div className="mt-2 ml-0">
          <Textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            onBlur={handleObservationsBlur}
            placeholder="Observaciones..."
            className="text-sm min-h-[60px]"
            disabled={readOnly}
          />
        </div>
      )}
    </div>
  );
}
