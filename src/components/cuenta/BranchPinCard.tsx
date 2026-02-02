import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Check, X, Eye, EyeOff, Loader2, MapPin, AlertCircle } from 'lucide-react';

interface BranchPinCardProps {
  branchName: string;
  branchId: string;
  roleId: string;
  currentPin: string | null;
  userId: string;
}

export function BranchPinCard({ branchName, branchId, roleId, currentPin, userId }: BranchPinCardProps) {
  const queryClient = useQueryClient();
  const [pin, setPin] = useState(currentPin || '');
  const [showPin, setShowPin] = useState(false);
  const [isEditing, setIsEditing] = useState(!currentPin);
  const [pinAvailable, setPinAvailable] = useState<boolean | null>(null);
  const [checkingPin, setCheckingPin] = useState(false);

  // Check if PIN is available in this branch
  const checkPinAvailability = async (pinValue: string) => {
    if (pinValue.length !== 4) {
      setPinAvailable(null);
      return;
    }

    setCheckingPin(true);
    try {
      const { data, error } = await supabase.rpc('is_clock_pin_available', {
        _branch_id: branchId,
        _pin: pinValue,
        _exclude_user_id: userId || null,
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
      // First verify availability
      const { data: available, error: checkError } = await supabase.rpc('is_clock_pin_available', {
        _branch_id: branchId,
        _pin: newPin,
        _exclude_user_id: userId || null,
      });

      if (checkError) throw checkError;
      if (!available) throw new Error('Este PIN ya está en uso en esta sucursal');

      // Save to user_branch_roles
      const { error } = await supabase
        .from('user_branch_roles')
        .update({ clock_pin: newPin })
        .eq('id', roleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-branch-roles'] });
      toast.success(`PIN configurado para ${branchName}`);
      setIsEditing(false);
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
    <Card className="border-l-4 border-l-primary/30">
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{branchName}</span>
        </div>

        {!isEditing && currentPin ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">PIN:</span>
              <span className="font-mono tracking-widest">
                {showPin ? currentPin : '••••'}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowPin(!showPin)}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Check className="w-4 h-4 text-green-500" />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              Cambiar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor={`pin-${roleId}`}>PIN de fichaje (4 dígitos)</Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    id={`pin-${roleId}`}
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    value={pin}
                    onChange={(e) => handlePinChange(e.target.value)}
                    placeholder="••••"
                    maxLength={4}
                    className="text-center text-xl tracking-[0.5em] font-mono pr-10"
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
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={pin.length !== 4 || pinAvailable === false || savePinMutation.isPending}
                className="flex-1"
              >
                {savePinMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {currentPin ? 'Actualizar PIN' : 'Crear PIN'}
              </Button>
              {currentPin && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPin(currentPin);
                    setIsEditing(false);
                    setPinAvailable(null);
                  }}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
