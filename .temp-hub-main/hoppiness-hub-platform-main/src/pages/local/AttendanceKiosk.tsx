import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/lib/errorHandler';
import { Clock, Users, RefreshCw } from 'lucide-react';

const QR_REFRESH_INTERVAL = 15000; // 15 seconds

export default function AttendanceKiosk() {
  const { branchId } = useParams();
  const [qrToken, setQrToken] = useState<string>('');
  const [serverTime, setServerTime] = useState<Date>(new Date());
  const [progress, setProgress] = useState(100);
  const [loading, setLoading] = useState(true);
  const [branchName, setBranchName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch branch info
  useEffect(() => {
    async function fetchBranch() {
      if (!branchId) return;
      const { data } = await supabase
        .from('branches')
        .select('name')
        .eq('id', branchId)
        .single();
      
      if (data) setBranchName(data.name);
    }
    fetchBranch();
  }, [branchId]);

  // Generate new QR token
  const generateToken = useCallback(async () => {
    if (!branchId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('attendance-token', {
        body: { action: 'generate', branchId }
      });

      if (error) throw error;
      
      setQrToken(data.token);
      setServerTime(new Date(data.serverTime));
      setProgress(100);
      setError(null);
    } catch (err: any) {
      handleError(err, { showToast: false, context: 'AttendanceKiosk.generateToken' });
      setError('Error generando código QR');
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  // Initial token generation and auto-refresh
  useEffect(() => {
    generateToken();
    
    const refreshInterval = setInterval(() => {
      generateToken();
    }, QR_REFRESH_INTERVAL);

    return () => clearInterval(refreshInterval);
  }, [generateToken]);

  // Progress bar countdown
  useEffect(() => {
    const startTime = Date.now();
    
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / QR_REFRESH_INTERVAL) * 100);
      setProgress(remaining);
    }, 100);

    return () => clearInterval(progressInterval);
  }, [qrToken]);

  // Clock update
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setServerTime(prev => new Date(prev.getTime() + 1000));
    }, 1000);

    return () => clearInterval(clockInterval);
  }, []);

  const qrUrl = qrToken 
    ? `${window.location.origin}/clock-in?token=${encodeURIComponent(qrToken)}`
    : '';

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-AR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-AR', { 
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (!branchId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Sucursal no especificada</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex flex-col items-center justify-center p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Users className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold">Hoppiness Club</h1>
        </div>
        <h2 className="text-xl text-muted-foreground">Control de Asistencia</h2>
        {branchName && (
          <Badge variant="secondary" className="mt-2 text-base px-4 py-1">
            {branchName}
          </Badge>
        )}
      </div>

      {/* Main Card with QR */}
      <Card className="w-full max-w-md shadow-2xl">
        <CardContent className="p-8">
          {/* Clock */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 text-5xl font-bold font-mono text-primary">
              <Clock className="w-10 h-10" />
              {formatTime(serverTime)}
            </div>
            <p className="text-muted-foreground mt-2 capitalize">{formatDate(serverTime)}</p>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center">
            <div className="relative bg-white p-4 rounded-xl shadow-inner">
              {loading && !qrToken ? (
                <div className="w-64 h-64 flex items-center justify-center">
                  <RefreshCw className="w-12 h-12 animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="w-64 h-64 flex items-center justify-center text-destructive">
                  {error}
                </div>
              ) : (
                <QRCodeSVG 
                  value={qrUrl}
                  size={256}
                  level="M"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              )}
            </div>
            
            {/* Progress bar */}
            <div className="w-full mt-4">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-center text-muted-foreground mt-1">
                El código se actualiza automáticamente
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-6 text-center">
            <p className="text-lg font-medium">Escanea para fichar</p>
            <p className="text-muted-foreground">Ingreso / Egreso</p>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-muted-foreground text-sm mt-8">
        Usa la cámara de tu celular para escanear el código QR
      </p>
    </div>
  );
}