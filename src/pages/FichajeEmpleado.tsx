/**
 * FichajeEmpleado - Página de fichaje con validación GPS y reglamento
 * 
 * URL: /fichaje/:branchCode
 * 
 * Flujo:
 * 1. Empleado escanea QR estático del local
 * 2. Ingresa su PIN de 4 dígitos
 * 3. Sistema valida PIN y verifica reglamento pendiente
 * 4. Si hay reglamento pendiente > 5 días → bloquea
 * 5. Captura selfie (solo validación, no se almacena)
 * 6. Valida GPS (200m radio, permite con advertencia si falla)
 * 7. Elige ENTRADA o SALIDA manualmente
 * 8. Se registra el fichaje
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  Camera, 
  CheckCircle2, 
  Clock, 
  LogIn, 
  LogOut, 
  AlertCircle, 
  Loader2,
  MapPin,
  AlertTriangle,
  FileWarning
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import logoHoppiness from '@/assets/logo-hoppiness-blue.png';

type Step = 'pin' | 'regulation-warning' | 'regulation-blocked' | 'camera' | 'success' | 'error';

interface ValidatedUser {
  user_id: string;
  full_name: string;
  branch_id: string;
  branch_name: string;
}

interface BranchData {
  id: string;
  name: string;
  clock_code: string;
  latitude: number | null;
  longitude: number | null;
}

interface RegulationStatus {
  hasPending: boolean;
  daysSinceUpload: number;
  isBlocked: boolean;
}

// Calculate distance between two coordinates in meters
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function FichajeEmpleado() {
  const { branchCode } = useParams<{ branchCode: string }>();
  const [step, setStep] = useState<Step>('pin');
  const [pin, setPin] = useState('');
  const [validatedUser, setValidatedUser] = useState<ValidatedUser | null>(null);
  const [entryType, setEntryType] = useState<'clock_in' | 'clock_out' | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'checking' | 'valid' | 'warning' | 'error'>('checking');
  const [gpsMessage, setGpsMessage] = useState('');
  const [regulationStatus, setRegulationStatus] = useState<RegulationStatus | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Fetch branch data
  const { data: branch, isLoading: loadingBranch, error: branchError } = useQuery({
    queryKey: ['branch-by-code', branchCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, clock_code, latitude, longitude')
        .eq('clock_code', branchCode)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data as BranchData | null;
    },
    enabled: !!branchCode,
  });

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      toast.error('No se pudo acceder a la cámara');
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Capture photo from video stream (not from gallery)
  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.7);
        setCapturedPhoto(dataUrl);
        stopCamera();
      }
    }
  }, [stopCamera]);

  // Validate GPS
  const validateGPS = useCallback(async () => {
    if (!branch?.latitude || !branch?.longitude) {
      setGpsStatus('warning');
      setGpsMessage('El local no tiene ubicación configurada');
      return true; // Allow clock-in with warning
    }

    setGpsStatus('checking');
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const distance = calculateDistance(
        position.coords.latitude,
        position.coords.longitude,
        branch.latitude,
        branch.longitude
      );

      if (distance <= 200) {
        setGpsStatus('valid');
        setGpsMessage(`Ubicación validada (${Math.round(distance)}m)`);
        return true;
      } else {
        setGpsStatus('warning');
        setGpsMessage(`Estás a ${Math.round(distance)}m del local (máx. 200m)`);
        return true; // Allow with warning as per requirement
      }
    } catch (err) {
      console.error('GPS error:', err);
      setGpsStatus('warning');
      setGpsMessage('No se pudo obtener ubicación');
      return true; // Allow with warning as per requirement
    }
  }, [branch]);

  // Check regulation status using Supabase client
  const checkRegulationStatus = useCallback(async (userId: string): Promise<RegulationStatus> => {
    try {
      // Get latest regulation
      const { data: regulations, error: regError } = await supabase
        .from('regulations')
        .select('id, version, created_at')
        .order('version', { ascending: false })
        .limit(1);

      if (regError || !regulations || regulations.length === 0) {
        return { hasPending: false, daysSinceUpload: 0, isBlocked: false };
      }

      const regulation = regulations[0];

      // Check if user has signed the latest version
      const { data: signatures, error: sigError } = await supabase
        .from('regulation_signatures')
        .select('id')
        .eq('user_id', userId)
        .eq('regulation_version', regulation.version);

      if (!sigError && signatures && signatures.length > 0) {
        return { hasPending: false, daysSinceUpload: 0, isBlocked: false };
      }

      // Calculate days since regulation was uploaded
      const daysSinceUpload = differenceInDays(new Date(), new Date(regulation.created_at));
      const isBlocked = daysSinceUpload > 5;

      return { hasPending: true, daysSinceUpload, isBlocked };
    } catch (error) {
      console.warn('Error checking regulation status:', error);
      return { hasPending: false, daysSinceUpload: 0, isBlocked: false };
    }
  }, []);

  // Validate PIN mutation
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
    onSuccess: async (userData) => {
      setValidatedUser(userData);
      
      // Check regulation status
      const regStatus = await checkRegulationStatus(userData.user_id);
      setRegulationStatus(regStatus);
      
      if (regStatus.isBlocked) {
        setStep('regulation-blocked');
      } else if (regStatus.hasPending) {
        setStep('regulation-warning');
      } else {
        setStep('camera');
        startCamera();
        validateGPS();
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setPin('');
    },
  });

  // Register clock entry mutation
  const clockMutation = useMutation({
    mutationFn: async ({ type }: { type: 'clock_in' | 'clock_out' }) => {
      if (!validatedUser) throw new Error('Usuario no validado');
      
      // Note: We don't store the photo, it's just for validation
      const insertData = {
        branch_id: validatedUser.branch_id,
        user_id: validatedUser.user_id,
        entry_type: type,
        photo_url: null, // Selfie not stored as per requirement
        user_agent: navigator.userAgent,
      };

      const { error } = await supabase.from('clock_entries').insert(insertData);
      
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

  const handleContinueFromWarning = () => {
    setStep('camera');
    startCamera();
    validateGPS();
  };

  const handleClock = async (type: 'clock_in' | 'clock_out') => {
    if (!capturedPhoto) {
      toast.error('Primero tomá una selfie');
      return;
    }
    clockMutation.mutate({ type });
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

          {/* Regulation Warning (days 1-5) */}
          {step === 'regulation-warning' && regulationStatus && (
            <div className="space-y-4">
              <div className="text-center">
                <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Reglamento Pendiente</h2>
                <p className="text-muted-foreground">
                  Tenés <strong>{5 - regulationStatus.daysSinceUpload} días</strong> para firmar el nuevo reglamento.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Contactá a tu encargado para firmarlo.
                </p>
              </div>

              <Alert className="border-amber-500/50 bg-amber-500/10">
                <FileWarning className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-amber-700">
                  Si no firmás el reglamento en {5 - regulationStatus.daysSinceUpload} días, no podrás fichar.
                </AlertDescription>
              </Alert>

              <Button onClick={handleContinueFromWarning} className="w-full">
                Continuar de todos modos
              </Button>
            </div>
          )}

          {/* Regulation Blocked (day 6+) */}
          {step === 'regulation-blocked' && (
            <div className="space-y-4 text-center">
              <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
              <h2 className="text-xl font-bold">Fichaje Bloqueado</h2>
              <p className="text-muted-foreground">
                No podés fichar hasta firmar el nuevo reglamento.
              </p>
              <Alert variant="destructive">
                <AlertDescription>
                  Contactá a tu encargado para poder fichar.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Step 2: Camera + GPS + Clock buttons */}
          {step === 'camera' && validatedUser && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-lg font-medium">¡Hola {validatedUser.full_name.split(' ')[0]}!</p>
                <p className="text-muted-foreground text-sm">Sacate una selfie para fichar</p>
              </div>

              {/* GPS Status */}
              <div className={`flex items-center justify-center gap-2 text-sm p-2 rounded-lg ${
                gpsStatus === 'valid' ? 'bg-green-500/10 text-green-700' :
                gpsStatus === 'warning' ? 'bg-amber-500/10 text-amber-700' :
                gpsStatus === 'error' ? 'bg-red-500/10 text-red-700' :
                'bg-muted'
              }`}>
                <MapPin className="w-4 h-4" />
                <span>
                  {gpsStatus === 'checking' ? 'Verificando ubicación...' : gpsMessage}
                </span>
                {gpsStatus === 'checking' && <Loader2 className="w-4 h-4 animate-spin" />}
              </div>

              {/* Camera View */}
              <div className="aspect-square bg-muted rounded-lg overflow-hidden relative">
                {!capturedPhoto ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <Button
                      onClick={capturePhoto}
                      size="lg"
                      className="absolute bottom-4 left-1/2 -translate-x-1/2"
                    >
                      <Camera className="w-5 h-5 mr-2" />
                      Capturar
                    </Button>
                  </>
                ) : (
                  <>
                    <img 
                      src={capturedPhoto} 
                      alt="Selfie" 
                      className="w-full h-full object-cover"
                    />
                    <Button
                      onClick={() => {
                        setCapturedPhoto(null);
                        startCamera();
                      }}
                      variant="secondary"
                      size="sm"
                      className="absolute bottom-4 left-1/2 -translate-x-1/2"
                    >
                      Repetir
                    </Button>
                  </>
                )}
              </div>

              <canvas ref={canvasRef} className="hidden" />

              {/* Clock buttons - only show after photo captured */}
              {capturedPhoto && (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="default"
                    className="h-auto py-4 flex-col gap-2"
                    onClick={() => handleClock('clock_in')}
                    disabled={clockMutation.isPending}
                  >
                    {clockMutation.isPending ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <LogIn className="w-6 h-6" />
                    )}
                    <span>Entrada</span>
                  </Button>
                  <Button
                    variant="secondary"
                    className="h-auto py-4 flex-col gap-2"
                    onClick={() => handleClock('clock_out')}
                    disabled={clockMutation.isPending}
                  >
                    {clockMutation.isPending ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <LogOut className="w-6 h-6" />
                    )}
                    <span>Salida</span>
                  </Button>
                </div>
              )}

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

              {/* GPS Warning in success */}
              {gpsStatus === 'warning' && (
                <Alert className="border-amber-500/50 bg-amber-500/10 text-left">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <AlertDescription className="text-amber-700">
                    {gpsMessage}
                  </AlertDescription>
                </Alert>
              )}

              {entryType === 'clock_in' ? (
                <div className="space-y-2">
                  <p className="text-primary font-medium">¡Buen turno!</p>
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                    📵 Recordá que está prohibido el uso de teléfono a partir de este momento.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-primary font-medium">¡Gracias por tu trabajo hoy!</p>
                  <p className="text-sm text-muted-foreground">
                    🌟 Descansá bien, nos vemos pronto.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
