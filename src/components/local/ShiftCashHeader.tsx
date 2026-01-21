import { useState } from 'react';
import { useShiftStatus } from '@/hooks/useShiftStatus';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, Wallet, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ShiftCashHeaderProps {
  branchId: string;
  onCashOpened?: () => void;
}

interface CashRegister {
  id: string;
  name: string;
}

export function ShiftCashHeader({ branchId, onCashOpened }: ShiftCashHeaderProps) {
  const { user } = useAuth();
  const shiftStatus = useShiftStatus(branchId);
  const [showOpenCashDialog, setShowOpenCashDialog] = useState(false);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [selectedRegister, setSelectedRegister] = useState('');
  const [openingAmount, setOpeningAmount] = useState('');
  const [isOpening, setIsOpening] = useState(false);

  const fetchCashRegisters = async () => {
    const { data } = await supabase
      .from('cash_registers')
      .select('id, name')
      .eq('branch_id', branchId)
      .eq('is_active', true)
      .order('display_order');
    
    if (data && data.length > 0) {
      setCashRegisters(data);
      setSelectedRegister(data[0].id);
    }
  };

  const handleOpenCashDialog = async () => {
    await fetchCashRegisters();
    setShowOpenCashDialog(true);
  };

  const handleOpenCash = async () => {
    if (!user || !selectedRegister) return;
    
    setIsOpening(true);
    try {
      const { error } = await supabase
        .from('cash_register_shifts')
        .insert({
          cash_register_id: selectedRegister,
          branch_id: branchId,
          opened_by: user.id,
          opening_amount: parseFloat(openingAmount) || 0,
          status: 'open',
        });

      if (error) throw error;

      toast.success('Caja abierta correctamente');
      setShowOpenCashDialog(false);
      setOpeningAmount('');
      shiftStatus.refetch();
      onCashOpened?.();
    } catch (error: any) {
      toast.error('Error al abrir caja: ' + error.message);
    } finally {
      setIsOpening(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatMinutes = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) {
      return `${h}h ${m}m`;
    }
    return `${m}m`;
  };

  if (shiftStatus.loading) {
    return null;
  }

  return (
    <>
      <div className="bg-card border-b px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
        {/* Shift Status */}
        <div className="flex items-center gap-2">
          {shiftStatus.isExtendedShift ? (
            <>
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-amber-600 font-medium">
                ⏰ Turno Extendido · Fuera del horario normal
              </span>
            </>
          ) : shiftStatus.currentShift ? (
            <>
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium">
                Turno {shiftStatus.currentShift.name}
              </span>
              <span className="text-muted-foreground">
                ({shiftStatus.currentShift.start_time.substring(0, 5)} - {shiftStatus.currentShift.end_time.substring(0, 5)})
              </span>
              {shiftStatus.shiftEndsIn !== null && (
                <Badge variant="outline" className="text-xs">
                  Cierra en {formatMinutes(shiftStatus.shiftEndsIn)}
                </Badge>
              )}
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Sin turnos configurados</span>
            </>
          )}
        </div>

        {/* Cash Status */}
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          {shiftStatus.hasCashOpen ? (
            <>
              <span className="font-medium">
                {shiftStatus.activeCashShift?.cash_register_name}:
              </span>
              <span className="text-emerald-600 font-semibold">
                {formatCurrency(shiftStatus.activeCashShift?.current_balance || 0)}
              </span>
              <span className="text-muted-foreground text-xs">
                ({shiftStatus.activeCashShift?.opened_by_name})
              </span>
            </>
          ) : (
            <>
              <span className="text-muted-foreground">Caja: Cerrada</span>
              <Button size="sm" variant="outline" onClick={handleOpenCashDialog}>
                Abrir Caja
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Open Cash Dialog */}
      <Dialog open={showOpenCashDialog} onOpenChange={setShowOpenCashDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir Caja</DialogTitle>
            <DialogDescription>
              Seleccioná la caja e ingresá el monto inicial de efectivo.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Caja</Label>
              <Select value={selectedRegister} onValueChange={setSelectedRegister}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar caja" />
                </SelectTrigger>
                <SelectContent>
                  {cashRegisters.map(reg => (
                    <SelectItem key={reg.id} value={reg.id}>
                      {reg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Efectivo inicial</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  placeholder="0"
                  className="pl-7"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpenCashDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleOpenCash} disabled={isOpening || !selectedRegister}>
              {isOpening ? 'Abriendo...' : 'Abrir Caja'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
