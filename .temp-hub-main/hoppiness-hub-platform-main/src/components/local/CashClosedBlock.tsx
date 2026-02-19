import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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

interface CashClosedBlockProps {
  branchId: string;
  onCashOpened: () => void;
}

/**
 * Full-screen centered block shown when cash register is closed.
 * Includes input for opening amount and action button.
 */
export function CashClosedBlock({ branchId, onCashOpened }: CashClosedBlockProps) {
  const { user } = useAuth();
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [selectedRegister, setSelectedRegister] = useState('');
  const [openingAmount, setOpeningAmount] = useState('');
  const [isOpening, setIsOpening] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCashRegisters();
  }, [branchId]);

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
      setOpeningAmount('');
      onCashOpened();
    } catch (error: any) {
      toast.error('Error al abrir caja: ' + error.message);
    } finally {
      setIsOpening(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (cashRegisters.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md p-8">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Banknote className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">Sin cajas configuradas</h2>
          <p className="text-muted-foreground">
            No hay cajas configuradas para esta sucursal. 
            Configurá una caja desde el panel de Caja.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md p-8 bg-card border rounded-xl shadow-sm">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Banknote className="w-10 h-10 text-primary" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">La caja está cerrada</h2>
          <p className="text-muted-foreground">
            Para empezar a tomar pedidos, abrí la caja.
          </p>
        </div>
        
        <div className="space-y-4 text-left">
          {cashRegisters.length > 1 && (
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
          )}
          
          <div className="space-y-2">
            <Label>Efectivo inicial</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                placeholder="0"
                className="pl-7 text-lg h-12"
              />
            </div>
          </div>
        </div>

        <Button 
          onClick={handleOpenCash} 
          disabled={isOpening || !selectedRegister}
          className="w-full h-12 text-lg"
        >
          {isOpening ? 'Abriendo...' : 'Abrir Caja'}
        </Button>
      </div>
    </div>
  );
}
