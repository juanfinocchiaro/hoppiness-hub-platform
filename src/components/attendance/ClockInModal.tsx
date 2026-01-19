import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock, LogIn, LogOut, Delete, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ClockInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
}

interface Employee {
  id: string;
  full_name: string;
  current_status: 'WORKING' | 'OFF_DUTY';
}

export default function ClockInModal({ open, onOpenChange, branchId }: ClockInModalProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ name: string; action: 'IN' | 'OUT'; time: string } | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setPin('');
      setSuccess(null);
    }
  }, [open]);

  // Auto-close after success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        onOpenChange(false);
        setSuccess(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [success, onOpenChange]);

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  const handleSubmit = useCallback(async () => {
    if (pin.length !== 4) {
      toast.error('Ingresá un PIN de 4 dígitos');
      return;
    }

    setLoading(true);
    try {
      // Find employee by PIN in this branch
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id, full_name, current_status')
        .eq('branch_id', branchId)
        .eq('pin_code', pin)
        .eq('is_active', true)
        .maybeSingle();

      if (empError) throw empError;

      if (!employee) {
        toast.error('PIN incorrecto');
        setPin('');
        setLoading(false);
        return;
      }

      // Determine action based on current status
      const action: 'IN' | 'OUT' = employee.current_status === 'WORKING' ? 'OUT' : 'IN';

      // Insert attendance log
      const { error: logError } = await supabase
        .from('attendance_logs')
        .insert({
          employee_id: employee.id,
          branch_id: branchId,
          log_type: action,
        });

      if (logError) throw logError;

      const timeStr = format(new Date(), 'HH:mm', { locale: es });
      
      setSuccess({
        name: employee.full_name,
        action,
        time: timeStr,
      });

      toast.success(
        action === 'IN' 
          ? `¡Hola ${employee.full_name}! Entrada registrada a las ${timeStr}`
          : `¡Hasta luego ${employee.full_name}! Salida registrada a las ${timeStr}`
      );

    } catch (error) {
      console.error('Error clocking in/out:', error);
      toast.error('Error al registrar fichaje');
      setPin('');
    } finally {
      setLoading(false);
    }
  }, [pin, branchId]);

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (pin.length === 4 && !loading && !success) {
      handleSubmit();
    }
  }, [pin, loading, success, handleSubmit]);

  const NumpadButton = ({ digit, onClick, className = '' }: { digit: string; onClick: () => void; className?: string }) => (
    <Button
      type="button"
      variant="outline"
      className={`h-16 text-2xl font-bold ${className}`}
      onClick={onClick}
      disabled={loading}
    >
      {digit}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Clock className="h-6 w-6 text-primary" />
            Registro de Asistencia
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center space-y-4">
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${
              success.action === 'IN' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
            }`}>
              {success.action === 'IN' ? (
                <LogIn className="h-10 w-10" />
              ) : (
                <LogOut className="h-10 w-10" />
              )}
            </div>
            <div>
              <p className="text-2xl font-bold">{success.name}</p>
              <p className="text-muted-foreground mt-1">
                {success.action === 'IN' ? 'Entrada' : 'Salida'} registrada a las{' '}
                <span className="font-semibold">{success.time}</span>
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-green-500" />
              Cerrando automáticamente...
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* PIN Display */}
            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-14 h-14 rounded-lg border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                    pin.length > i
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-muted'
                  }`}
                >
                  {pin.length > i ? '●' : ''}
                </div>
              ))}
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <NumpadButton
                  key={digit}
                  digit={digit}
                  onClick={() => handlePinInput(digit)}
                />
              ))}
              <Button
                type="button"
                variant="ghost"
                className="h-16 text-muted-foreground"
                onClick={handleClear}
                disabled={loading}
              >
                Borrar
              </Button>
              <NumpadButton
                digit="0"
                onClick={() => handlePinInput('0')}
              />
              <Button
                type="button"
                variant="ghost"
                className="h-16"
                onClick={handleBackspace}
                disabled={loading}
              >
                <Delete className="h-6 w-6" />
              </Button>
            </div>

            {loading && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verificando...
              </div>
            )}

            <p className="text-center text-sm text-muted-foreground">
              Ingresá tu PIN de 4 dígitos para fichar entrada o salida
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}