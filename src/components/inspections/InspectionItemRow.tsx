/**
 * InspectionItemRow - Fila individual del checklist de inspección
 * 
 * UX simplificado (Feb 2026):
 * - Solo ✓ (cumple) y ✗ (no cumple), botones más grandes y separados
 * - Click en activo lo desactiva (vuelve a pendiente)
 * - Estado "pendiente" visual cuando no se tocó (gris neutro)
 * - Sin botón de reset (—), el reset es hacer click de nuevo
 */

import { useState } from 'react';
import { Camera, Check, X, MessageSquare, Loader2 } from 'lucide-react';
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

  // Toggle logic: if already selected, deselect (null). Otherwise, set value.
  const handleComplianceToggle = (value: boolean) => {
    if (readOnly) return;
    const newValue = item.complies === value ? null : value;
    updateItem.mutate({
      itemId: item.id,
      inspectionId,
      data: { complies: newValue, observations },
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
  const isPending = item.complies === null;

  return (
    <div className="border-b border-border/50 py-3 last:border-b-0">
      <div className="flex items-start gap-4">
        {/* Item label */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm",
            item.complies === true && "text-green-700 dark:text-green-400",
            item.complies === false && "text-destructive font-medium",
            isPending && "text-muted-foreground"
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

        {/* Controls - larger buttons with more spacing */}
        <div className="flex items-center gap-2 shrink-0">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : (
            <>
              {/* Cumple - toggle on/off */}
              <Button
                type="button"
                variant={item.complies === true ? 'default' : 'outline'}
                size="icon"
                className={cn(
                  "h-10 w-10 transition-all",
                  item.complies === true 
                    ? "bg-green-600 hover:bg-green-700 text-white shadow-md" 
                    : "hover:bg-green-50 hover:border-green-300 dark:hover:bg-green-950/30"
                )}
                onClick={() => handleComplianceToggle(true)}
                disabled={readOnly}
                title="Cumple (click de nuevo para quitar)"
              >
                <Check className="w-5 h-5" />
              </Button>

              {/* No cumple - toggle on/off */}
              <Button
                type="button"
                variant={item.complies === false ? 'destructive' : 'outline'}
                size="icon"
                className={cn(
                  "h-10 w-10 transition-all",
                  item.complies === false 
                    ? "shadow-md" 
                    : "hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-950/30"
                )}
                onClick={() => handleComplianceToggle(false)}
                disabled={readOnly}
                title="No cumple (click de nuevo para quitar)"
              >
                <X className="w-5 h-5" />
              </Button>

              {/* Separator */}
              <div className="w-px h-6 bg-border mx-1" />

              {/* Observations toggle */}
              <Button
                type="button"
                variant={showObservations || observations ? 'secondary' : 'ghost'}
                size="icon"
                className="h-9 w-9"
                onClick={() => setShowObservations(!showObservations)}
                title="Agregar observación"
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
                    className="h-9 w-9"
                    asChild
                    title="Subir foto"
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
        <div className="mt-3 ml-0">
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
