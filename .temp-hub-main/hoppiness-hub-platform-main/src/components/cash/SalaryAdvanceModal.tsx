import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Banknote, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCreateAdvance } from '@/hooks/useSalaryAdvances';
import { SupervisorPinDialog } from './SupervisorPinDialog';
import { OperatorInfo } from '@/hooks/useOperatorVerification';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';

interface SalaryAdvanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  shiftId?: string;
}

export function SalaryAdvanceModal({
  open,
  onOpenChange,
  branchId,
  shiftId,
}: SalaryAdvanceModalProps) {
  const { user } = useAuth();
  const [employeeId, setEmployeeId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [reason, setReason] = useState('');
  const [showPinDialog, setShowPinDialog] = useState(false);
  
  const createAdvance = useCreateAdvance();
  
  // Verificar si el usuario es encargado o superior
  const { data: userRoles } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('is_active', true);
      return data?.map(r => r.role) || [];
    },
    enabled: !!user,
  });
  
  const isSupervisor = userRoles?.some(r => 
    ['encargado', 'franquiciado', 'admin', 'coordinador'].includes(r as string)
  );
  
  // Cargar empleados de la sucursal
  const { data: employees = [] } = useQuery({
    queryKey: ['branch-employees', branchId],
    queryFn: async () => {
      const { data } = await supabase
        .from('employees')
        .select('id, full_name')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .order('full_name');
      return data || [];
    },
    enabled: !!branchId && open,
  });
  
  useEffect(() => {
    if (open) {
      setEmployeeId('');
      setAmount('');
      setPaymentMethod('cash');
      setReason('');
    }
  }, [open]);
  
  const handleSubmit = () => {
    if (!employeeId || !amount) return;
    
    if (isSupervisor) {
      // Supervisor puede autorizar directamente
      handleCreateAdvance(user!.id);
    } else {
      // Cajero necesita PIN
      setShowPinDialog(true);
    }
  };
  
  const handleCreateAdvance = (authorizedBy: string) => {
    createAdvance.mutate({
      branchId,
      employeeId,
      amount: parseFloat(amount),
      reason: reason || undefined,
      paymentMethod,
      authorizedBy,
      shiftId: paymentMethod === 'cash' ? shiftId : undefined,
    }, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };
  
  const handlePinSuccess = (supervisor: OperatorInfo) => {
    setShowPinDialog(false);
    handleCreateAdvance(supervisor.userId);
  };
  
  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(num);
  };
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              Registrar Adelanto de Sueldo
            </DialogTitle>
            <DialogDescription>
              {paymentMethod === 'cash' 
                ? 'Se descontará del efectivo de caja'
                : 'Quedará pendiente de transferencia'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="employee">Empleado</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar empleado..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount">Monto</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="pl-8"
                />
              </div>
              {amount && (
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(amount)}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Método de pago</Label>
              <RadioGroup
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as 'cash' | 'transfer')}
                className="grid grid-cols-2 gap-4"
              >
                <div>
                  <RadioGroupItem
                    value="cash"
                    id="cash"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="cash"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <Banknote className="mb-2 h-6 w-6" />
                    <span className="text-sm font-medium">Efectivo</span>
                    <span className="text-xs text-muted-foreground">
                      Descuenta de caja
                    </span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="transfer"
                    id="transfer"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="transfer"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <CreditCard className="mb-2 h-6 w-6" />
                    <span className="text-sm font-medium">Transferencia</span>
                    <span className="text-xs text-muted-foreground">
                      Queda pendiente
                    </span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo (opcional)</Label>
              <Textarea
                id="reason"
                placeholder="Ej: Urgencia familiar"
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={2}
              />
            </div>
            
            {!isSupervisor && (
              <div className="p-3 rounded-lg bg-accent/50 border border-border text-foreground text-sm">
                Se requerirá PIN de un encargado para autorizar
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createAdvance.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!employeeId || !amount || createAdvance.isPending}
            >
              {createAdvance.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {isSupervisor ? 'Autorizar y Registrar' : 'Solicitar Autorización'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <SupervisorPinDialog
        open={showPinDialog}
        onOpenChange={setShowPinDialog}
        branchId={branchId}
        onSuccess={handlePinSuccess}
        title="Autorizar Adelanto"
        description={`Adelanto de ${formatCurrency(amount)} requiere autorización`}
      />
    </>
  );
}
