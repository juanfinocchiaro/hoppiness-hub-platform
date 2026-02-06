/**
 * ScheduleQuickActions - Acciones rápidas para el editor de horarios
 * 
 * Incluye:
 * - Copiar semana anterior
 * - Repetir patrón (próximamente)
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Copy, Repeat, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ScheduleQuickActionsProps {
  onCopyPreviousWeek: () => Promise<void>;
  disabled?: boolean;
  hasPendingChanges?: boolean;
}

export function ScheduleQuickActions({ 
  onCopyPreviousWeek, 
  disabled = false,
  hasPendingChanges = false,
}: ScheduleQuickActionsProps) {
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copying, setCopying] = useState(false);

  const handleCopyPreviousWeek = async () => {
    setCopying(true);
    try {
      await onCopyPreviousWeek();
      setCopyDialogOpen(false);
    } finally {
      setCopying(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setCopyDialogOpen(true)}
          disabled={disabled}
        >
          <Copy className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Copiar semana anterior</span>
          <span className="sm:hidden">Copiar</span>
        </Button>
        
        {/* TODO: Implementar repetir patrón */}
        {/* <Button variant="outline" size="sm" disabled>
          <Repeat className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Repetir patrón</span>
        </Button> */}
      </div>

      {/* Confirmation dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copiar semana anterior</DialogTitle>
            <DialogDescription>
              Se copiarán los horarios de la semana anterior a la semana actual.
              Los horarios existentes serán reemplazados.
            </DialogDescription>
          </DialogHeader>

          {hasPendingChanges && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Tenés cambios sin guardar. Se perderán al copiar la semana anterior.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCopyPreviousWeek} disabled={copying}>
              {copying ? 'Copiando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
