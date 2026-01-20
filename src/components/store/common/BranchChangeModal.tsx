import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

interface BranchChangeModalProps {
  open: boolean;
  currentBranch: Tables<'branches'> | null;
  newBranch: Tables<'branches'> | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function BranchChangeModal({
  open,
  currentBranch,
  newBranch,
  onConfirm,
  onCancel,
}: BranchChangeModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Cambiar de sucursal
          </AlertDialogTitle>
          <AlertDialogDescription>
            Tu carrito es de <strong>Hoppiness {currentBranch?.name}</strong>. 
            Si cambiás a <strong>Hoppiness {newBranch?.name}</strong>, se vaciará tu pedido actual.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm} 
            className="bg-destructive hover:bg-destructive/90"
          >
            Vaciar carrito y cambiar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
