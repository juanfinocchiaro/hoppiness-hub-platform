/**
 * FichajePublic - Página pública de fichaje por QR
 * 
 * URL: /fichaje/:branchCode
 * 
 * Flujo:
 * 1. Empleado escanea QR del local
 * 2. Ingresa su PIN de 4 dígitos
 * 3. Se valida el PIN y la IP
 * 4. Se captura selfie con cámara frontal
 * 5. Se registra el fichaje
 */
import { useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Camera, CheckCircle2, Clock, LogIn, LogOut, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import logoHoppiness from '@/assets/logo-hoppiness.png';

type Step = 'pin' | 'camera' | 'success' | 'error';

interface ValidatedUser {
  user_id: string;
  full_name: string;
  branch_id: string;
  branch_name: string;
}

export default function FichajePublic() {
  const { branchCode } = useParams<{ branchCode: string }>();
  const [step, setStep] = useState<Step>('pin');
  const [pin, setPin] = useState('');
  const [validatedUser, setValidatedUser] = useState<ValidatedUser | null>(null);
  const [entryType, setEntryType] = useState<'clock_in' | 'clock_out' | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Verificar que el código de sucursal existe
  const { data: branch, isLoading: loadingBranch, error: branchError } = useQuery({
    queryKey: ['branch-by-code', branchCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, clock_code, allowed_ips')
        .eq('clock_code', branchCode)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!branchCode,
  });

  // Validar PIN
  const validatePinMutation = useMutation({
    mutationFn: async (pinValue: string) => {
      const { data, error } = await supabase.rpc('validate_clock_pin', {
        _branch_code: branchCode,
        _pin: pinValue,
      });
      
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('PIN inválido o no tenés acceso a este local');
      }
      
      return data[0] as ValidatedUser;
    },
    onSuccess: (userData) => {
      setValidatedUser(userData);
      setStep('camera');
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setPin('');
    },
  });

  // Registrar fichaje
  const clockMutation = useMutation({
    mutationFn: async ({ type, photoUrl }: { type: 'clock_in' | 'clock_out'; photoUrl?: string }) => {
      if (!validatedUser) throw new Error('Usuario no validado');
      
      const { error } = await supabase.from('clock_entries').insert({
        branch_id: validatedUser.branch_id,
        user_id: validatedUser.user_id,
        entry_type: type,
        photo_url: photoUrl || null,
        user_agent: navigator.userAgent,
      });
      
      if (error) throw error;
      return type;
    },
    onSuccess: (type) => {
      setEntryType(type);
      setStep('success');
    },
    onError: (error: Error) => {
      toast.error(`Error al fichar: ${error.message}`);
    },
  });

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) {
      toast.error('El PIN debe tener 4 dígitos');
      return;
    }
    validatePinMutation.mutate(pin);
  };

  const handleFileCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const triggerCamera = () => {
    fileInputRef.current?.click();
  };

  const handleClock = async (type: 'clock_in' | 'clock_out') => {
    // TODO: Upload photo to storage if capturedPhoto exists
    clockMutation.mutate({ type, photoUrl: capturedPhoto || undefined });
  };

  // Loading state
  if (loadingBranch) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Branch not found
  if (!branch || branchError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Local no encontrado</h1>
            <p className="text-muted-foreground">
              El código de fichaje "{branchCode}" no existe o no está activo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <img src={logoHoppiness} alt="Hoppiness" className="h-12 mb-6" />
      
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <CardTitle className="flex items-center justify-center gap-2">
            <Clock className="w-5 h-5" />
            Fichaje - {branch.name}
          </CardTitle>
        </CardHeader>

        <CardContent>
          {/* Step 1: PIN Entry */}
          {step === 'pin' && (
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-muted-foreground">Ingresá tu PIN de fichaje</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin">PIN (4 dígitos)</Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="text-center text-2xl tracking-widest"
                  autoFocus
                />
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={pin.length !== 4 || validatePinMutation.isPending}
              >
                {validatePinMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Continuar
              </Button>
            </form>
          )}

          {/* Step 2: Camera + Clock buttons */}
          {step === 'camera' && validatedUser && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-lg font-medium">¡Hola {validatedUser.full_name.split(' ')[0]}!</p>
                <p className="text-muted-foreground text-sm">Sacate una selfie para fichar</p>
              </div>

              {/* Hidden file input for camera capture */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleFileCapture}
                className="hidden"
              />

              {/* Photo preview or camera trigger */}
              <div 
                onClick={triggerCamera}
                className="aspect-square bg-muted rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors overflow-hidden"
              >
                {capturedPhoto ? (
                  <img 
                    src={capturedPhoto} 
                    alt="Selfie" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center">
                    <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Toca para tomar foto</p>
                  </div>
                )}
              </div>

              {/* Clock buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="default"
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => handleClock('clock_in')}
                  disabled={clockMutation.isPending}
                >
                  <LogIn className="w-6 h-6" />
                  <span>Entrada</span>
                </Button>
                <Button
                  variant="secondary"
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => handleClock('clock_out')}
                  disabled={clockMutation.isPending}
                >
                  <LogOut className="w-6 h-6" />
                  <span>Salida</span>
                </Button>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                {format(new Date(), "HH:mm - EEE d MMM", { locale: es })}
              </p>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 'success' && validatedUser && (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
              <div>
                <p className="text-lg font-semibold">¡Fichaje registrado!</p>
                <p className="text-muted-foreground">{validatedUser.full_name}</p>
                <p className="font-medium mt-2">
                  {entryType === 'clock_in' ? 'Entrada' : 'Salida'}: {format(new Date(), 'HH:mm')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                </p>
              </div>

              {capturedPhoto && (
                <div className="w-24 h-24 mx-auto rounded-lg overflow-hidden">
                  <img src={capturedPhoto} alt="Foto" className="w-full h-full object-cover" />
                </div>
              )}

              <p className="text-primary font-medium">¡Buen turno!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
