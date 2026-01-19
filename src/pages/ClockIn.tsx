import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle2, 
  XCircle, 
  Camera, 
  RefreshCw, 
  Clock,
  LogIn,
  LogOut,
  Users
} from 'lucide-react';

type Step = 'validating' | 'expired' | 'pin' | 'selfie' | 'processing' | 'success' | 'error';

export default function ClockIn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [step, setStep] = useState<Step>('validating');
  const [pin, setPin] = useState('');
  const [branchId, setBranchId] = useState<string>('');
  const [branchName, setBranchName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState<{
    action: 'check_in' | 'check_out';
    userName: string;
    time: string;
  } | null>(null);
  
  // Selfie state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [selfieData, setSelfieData] = useState<string | null>(null);

  // Validate token on mount
  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setStep('error');
        setErrorMessage('No se proporcionó código de acceso');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('attendance-token', {
          body: { action: 'validate', token }
        });

        if (error || !data.valid) {
          setStep('expired');
          setErrorMessage(data?.error || 'Código inválido');
          return;
        }

        setBranchId(data.branchId);
        
        // Fetch branch name
        const { data: branch } = await supabase
          .from('branches')
          .select('name')
          .eq('id', data.branchId)
          .single();
        
        if (branch) setBranchName(branch.name);
        
        setStep('pin');
      } catch (err) {
        console.error('Validation error:', err);
        setStep('error');
        setErrorMessage('Error al validar el código');
      }
    }

    validateToken();
  }, [token]);

  // Start camera for selfie
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
      // If camera fails, proceed without selfie
      handleSubmit(null);
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Capture selfie
  const captureSelfie = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.7);
        setSelfieData(dataUrl);
        stopCamera();
      }
    }
  };

  // Handle PIN submission
  const handlePinSubmit = () => {
    if (pin.length !== 4) {
      setErrorMessage('Ingresa un PIN de 4 dígitos');
      return;
    }
    setStep('selfie');
    startCamera();
  };

  // Handle final submission
  const handleSubmit = async (photoUrl: string | null) => {
    setStep('processing');
    
    try {
      const { data, error } = await supabase.functions.invoke('attendance-token', {
        body: { 
          action: 'clock-in', 
          token, 
          pin,
          photoUrl 
        }
      });

      if (error || !data.success) {
        setStep('pin');
        setErrorMessage(data?.error || 'Error al registrar asistencia');
        setPin('');
        return;
      }

      setResult({
        action: data.action,
        userName: data.userName,
        time: data.time
      });
      setStep('success');
    } catch (err) {
      console.error('Submission error:', err);
      setStep('error');
      setErrorMessage('Error al procesar la solicitud');
    }
  };

  const handleRetry = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Users className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Hoppiness Club</h1>
        </div>
        {branchName && (
          <Badge variant="secondary">{branchName}</Badge>
        )}
      </div>

      <Card className="w-full max-w-sm shadow-xl">
        <CardContent className="p-6">
          {/* Validating */}
          {step === 'validating' && (
            <div className="text-center py-8">
              <RefreshCw className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-muted-foreground">Validando código...</p>
            </div>
          )}

          {/* Expired */}
          {step === 'expired' && (
            <div className="text-center py-8">
              <XCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
              <h2 className="text-xl font-bold mb-2">Código Vencido</h2>
              <p className="text-muted-foreground mb-6">{errorMessage}</p>
              <Button onClick={handleRetry} variant="outline">
                Volver a Escanear
              </Button>
            </div>
          )}

          {/* PIN Entry */}
          {step === 'pin' && (
            <div className="space-y-6">
              <div className="text-center">
                <Clock className="w-12 h-12 mx-auto mb-4 text-primary" />
                <h2 className="text-xl font-bold">Fichar Asistencia</h2>
                <p className="text-muted-foreground">Ingresa tu PIN de 4 dígitos</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="pin">PIN</Label>
                  <Input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setPin(value);
                      setErrorMessage('');
                    }}
                    placeholder="••••"
                    className="text-center text-2xl tracking-widest"
                    autoFocus
                  />
                </div>
                
                {errorMessage && (
                  <p className="text-sm text-destructive text-center">{errorMessage}</p>
                )}
                
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handlePinSubmit}
                  disabled={pin.length !== 4}
                >
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {/* Selfie */}
          {step === 'selfie' && (
            <div className="space-y-4">
              <div className="text-center">
                <Camera className="w-12 h-12 mx-auto mb-2 text-primary" />
                <h2 className="text-xl font-bold">Verificación</h2>
                <p className="text-muted-foreground text-sm">Toma una selfie para confirmar</p>
              </div>
              
              <div className="relative rounded-lg overflow-hidden bg-black aspect-[4/3]">
                {!selfieData ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img src={selfieData} alt="Selfie" className="w-full h-full object-cover" />
                )}
              </div>
              
              <canvas ref={canvasRef} className="hidden" />
              
              <div className="flex gap-2">
                {!selfieData ? (
                  <>
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleSubmit(null)}
                    >
                      Omitir
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={captureSelfie}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Capturar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        setSelfieData(null);
                        startCamera();
                      }}
                    >
                      Repetir
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={() => handleSubmit(selfieData)}
                    >
                      Confirmar
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Processing */}
          {step === 'processing' && (
            <div className="text-center py-8">
              <RefreshCw className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-muted-foreground">Registrando asistencia...</p>
            </div>
          )}

          {/* Success */}
          {step === 'success' && result && (
            <div className="text-center py-6">
              <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
                result.action === 'check_in' ? 'bg-green-500/10' : 'bg-orange-500/10'
              }`}>
                {result.action === 'check_in' ? (
                  <LogIn className="w-10 h-10 text-green-500" />
                ) : (
                  <LogOut className="w-10 h-10 text-orange-500" />
                )}
              </div>
              
              <h2 className="text-2xl font-bold mb-1">
                ¡Hola {result.userName.split(' ')[0]}!
              </h2>
              
              <Badge 
                variant={result.action === 'check_in' ? 'default' : 'secondary'}
                className="text-base px-4 py-1 mb-4"
              >
                {result.action === 'check_in' ? 'Ingreso' : 'Egreso'} registrado
              </Badge>
              
              <p className="text-3xl font-bold text-primary">{result.time}</p>
              
              <CheckCircle2 className="w-8 h-8 mx-auto mt-4 text-green-500" />
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="text-center py-8">
              <XCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
              <h2 className="text-xl font-bold mb-2">Error</h2>
              <p className="text-muted-foreground mb-6">{errorMessage}</p>
              <Button onClick={handleRetry} variant="outline">
                Volver al Inicio
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}