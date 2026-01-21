import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Banknote } from 'lucide-react';
import { toast } from 'sonner';

interface CashRegister {
  id: string;
  name: string;
}

interface OpenCashModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  onCashOpened: () => void;
  /** Optional: If provided, shows a message about the pending order */
  pendingOrderMessage?: string;
  /** Optional: Callback after cash is opened with order context */
  onCashOpenedWithOrder?: () => void;
}

export function OpenCashModal({
  open,
  onOpenChange,
  branchId,
  onCashOpened,
  pendingOrderMessage,
  onCashOpenedWithOrder,
}: OpenCashModalProps) {
  const { user } = useAuth();
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [selectedRegister, setSelectedRegister] = useState('');
  const [openingAmount, setOpeningAmount] = useState('');
  const [isOpening, setIsOpening] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && branchId) {
      fetchCashRegisters();
    }
  }, [open, branchId]);

  const fetchCashRegisters = async () => {
    setLoading(true);
    try {
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
    } finally {
      setLoading(false);
    }
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
      onOpenChange(false);
      setOpeningAmount('');
      onCashOpened();
      onCashOpenedWithOrder?.();
    } catch (error: any) {
      toast.error('Error al abrir caja: ' + error.message);
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Abrir Caja
          </DialogTitle>
          <DialogDescription>
            {pendingOrderMessage || 'Necesitás abrir la caja para poder operar.'}
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            Cargando cajas...
          </div>
        ) : cashRegisters.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No hay cajas configuradas para esta sucursal.
          </div>
        ) : (
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
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleOpenCash} 
            disabled={isOpening || !selectedRegister || loading}
          >
            {isOpening ? 'Abriendo...' : pendingOrderMessage ? 'Abrir Caja y Aceptar Pedido' : 'Abrir Caja'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
