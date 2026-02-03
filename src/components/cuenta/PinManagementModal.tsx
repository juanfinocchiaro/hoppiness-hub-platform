import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Check, X, Eye, EyeOff, Loader2, AlertCircle, Fingerprint, KeyRound } from 'lucide-react';

interface PinManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchName: string;
  branchId: string;
  roleId: string;
  currentPin: string | null;
  userId: string;
}

export function PinManagementModal({
  open,
  onOpenChange,
  branchName,
  branchId,
  roleId,
  currentPin,
  userId,
}: PinManagementModalProps) {
  const queryClient = useQueryClient();
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinAvailable, setPinAvailable] = useState<boolean | null>(null);
  const [checkingPin, setCheckingPin] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setPin('');
      setShowPin(false);
      setPinAvailable(null);
    }
  }, [open]);

  // Check if PIN is available in this branch
  const checkPinAvailability = async (pinValue: string) => {
    if (pinValue.length !== 4) {
      setPinAvailable(null);
      return;
    }

    if (!branchId || !roleId) {
      setPinAvailable(null);
      return;
    }

    setCheckingPin(true);
    try {
      const { data, error } = await supabase.rpc('is_clock_pin_available', {
        _branch_id: branchId,
        _pin: pinValue,
        _exclude_user_id: userId && userId.trim() !== '' ? userId : null,
      });

      if (error) throw error;
      setPinAvailable(data);
    } catch (error) {
      console.error('Error checking PIN availability:', error);
      setPinAvailable(null);
    } finally {
      setCheckingPin(false);
    }
  };

  // Save PIN mutation
  const savePinMutation = useMutation({
    mutationFn: async (newPin: string) => {
      if (!branchId || !roleId) {
        throw new Error('Datos de sucursal incompletos');
      }

      // First verify availability
      const { data: available, error: checkError } = await supabase.rpc('is_clock_pin_available', {
        _branch_id: branchId,
        _pin: newPin,
        _exclude_user_id: userId && userId.trim() !== '' ? userId : null,
      });

      if (checkError) throw checkError;
      if (!available) throw new Error('Este PIN ya está en uso en esta sucursal');

      // Save to user_branch_roles
      const { error } = await supabase
        .from('user_branch_roles')
        .update({ clock_pin: newPin })
        .eq('id', roleId);

      if (error) throw error;

      // Verify the PIN was saved
      const { data: verification, error: verifyError } = await supabase
        .from('user_branch_roles')
        .select('clock_pin')
        .eq('id', roleId)
        .single();

      if (verifyError) throw new Error('No se pudo verificar el guardado del PIN');
      if (verification?.clock_pin !== newPin) {
        throw new Error('El PIN no se guardó correctamente. Intentá de nuevo.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-branch-roles-pins'] });
      queryClient.invalidateQueries({ queryKey: ['user-branch-roles'] });
      toast.success(`PIN configurado para ${branchName}`);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) {
      toast.error('El PIN debe tener 4 dígitos');
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      toast.error('El PIN debe contener solo números');
      return;
    }
    if (pinAvailable === false) {
      toast.error('Este PIN ya está en uso');
      return;
    }
    savePinMutation.mutate(pin);
  };

  const handlePinChange = (value: string) => {
    const numericValue = value.replace(/\D/g, '').slice(0, 4);
    setPin(numericValue);
    setPinAvailable(null);

    if (numericValue.length === 4) {
      checkPinAvailability(numericValue);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-primary" />
            {currentPin ? 'Modificar PIN' : 'Crear PIN'}
          </DialogTitle>
          <DialogDescription>
            PIN de fichaje para <strong>{branchName}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="pin-input">Nuevo PIN de 4 dígitos</Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  id="pin-input"
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => handlePinChange(e.target.value)}
                  placeholder="••••"
                  maxLength={4}
                  className="text-center text-2xl tracking-[0.5em] font-mono pr-10 h-12"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPin(!showPin)}
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>

              {/* Availability indicator */}
              <div className="w-8 flex justify-center">
                {checkingPin && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
                {!checkingPin && pinAvailable === true && <Check className="w-5 h-5 text-green-500" />}
                {!checkingPin && pinAvailable === false && <X className="w-5 h-5 text-destructive" />}
              </div>
            </div>

            {pinAvailable === false && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Este PIN ya está en uso en esta sucursal
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              Este PIN es único por sucursal y lo usarás para fichar entrada/salida.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={pin.length !== 4 || pinAvailable === false || savePinMutation.isPending}
            >
              {savePinMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {currentPin ? 'Actualizar' : 'Crear PIN'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
