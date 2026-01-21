import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Calculator, Clock, DollarSign, ArrowUpRight, ArrowDownRight, 
  Plus, Settings, CreditCard, Banknote, Play, Square, History,
  Wallet, TrendingUp, TrendingDown, RefreshCw, Trash2, Edit2, Ban
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { handleError } from '@/lib/errorHandler';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface LocalContext {
  branch: Branch;
}

interface CashRegister {
  id: string;
  branch_id: string;
  name: string;
  display_order: number;
  is_active: boolean;
}

interface CashRegisterShift {
  id: string;
  cash_register_id: string;
  branch_id: string;
  opened_by: string;
  closed_by: string | null;
  opened_at: string;
  closed_at: string | null;
  opening_amount: number;
  closing_amount: number | null;
  expected_amount: number | null;
  difference: number | null;
  notes: string | null;
  status: 'open' | 'closed';
}

interface CashRegisterMovement {
  id: string;
  shift_id: string;
  branch_id: string;
  type: 'income' | 'expense' | 'withdrawal' | 'deposit';
  payment_method: string;
  amount: number;
  concept: string;
  order_id: string | null;
  recorded_by: string | null;
  created_at: string;
}

interface PaymentMethod {
  id: string;
  branch_id: string;
  name: string;
  code: string;
  is_cash: boolean;
  is_active: boolean;
  display_order: number;
}

export default function LocalCaja() {
  const { branch } = useOutletContext<LocalContext>();
  const { user } = useAuth();
  const { isAdmin, isGerente } = useUserRole();
  const { toast } = useToast();
  
  const canVoidMovements = isAdmin || isGerente;

  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [shifts, setShifts] = useState<Record<string, CashRegisterShift | null>>({});
  const [movements, setMovements] = useState<Record<string, CashRegisterMovement[]>>({});
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  
  // Dialog states
  const [openShiftDialog, setOpenShiftDialog] = useState(false);
  const [closeShiftDialog, setCloseShiftDialog] = useState(false);
  const [movementDialog, setMovementDialog] = useState(false);
  const [paymentMethodsDialog, setPaymentMethodsDialog] = useState(false);
  const [historyDialog, setHistoryDialog] = useState(false);
  const [registersConfigDialog, setRegistersConfigDialog] = useState(false);
  const [alivioDialog, setAlivioDialog] = useState(false);
  
  // Alivio form
  const [alivioAmount, setAlivioAmount] = useState('');
  const [alivioNotes, setAlivioNotes] = useState('');
  
  // Form states
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [movementType, setMovementType] = useState<'income' | 'expense' | 'withdrawal' | 'deposit'>('income');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementConcept, setMovementConcept] = useState('');
  const [movementPaymentMethod, setMovementPaymentMethod] = useState('');
  
  // Payment method form
  const [newMethodName, setNewMethodName] = useState('');
  const [newMethodCode, setNewMethodCode] = useState('');
  const [newMethodIsCash, setNewMethodIsCash] = useState(false);
  
  // Register editing
  const [editingRegisters, setEditingRegisters] = useState<CashRegister[]>([]);

  // Fetch user profile name
  useEffect(() => {
    if (user?.id) {
      supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.full_name) setUserName(data.full_name);
        });
    }
  }, [user?.id]);

  useEffect(() => {
    if (branch?.id) {
      fetchData();
    }
  }, [branch?.id]);

  useEffect(() => {
    if (registers.length > 0 && !selectedTab) {
      setSelectedTab(registers[0].id);
    }
  }, [registers]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch ALL cash registers (including inactive for config)
      const { data: allRegistersData } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('branch_id', branch.id)
        .order('display_order');
      
      // Fetch active registers for operation
      const activeRegisters = (allRegistersData || []).filter(r => r.is_active);

      if (activeRegisters.length > 0) {
        setRegisters(activeRegisters as CashRegister[]);
        
        // Fetch open shifts for each register
        const shiftsMap: Record<string, CashRegisterShift | null> = {};
        const movementsMap: Record<string, CashRegisterMovement[]> = {};
        
        for (const register of activeRegisters) {
          const { data: shiftData } = await supabase
            .from('cash_register_shifts')
            .select('*')
            .eq('cash_register_id', register.id)
            .eq('status', 'open')
            .limit(1)
            .single();
          
          shiftsMap[register.id] = shiftData as CashRegisterShift | null;
          
          if (shiftData) {
            const { data: movementsData } = await supabase
              .from('cash_register_movements')
              .select('*')
              .eq('shift_id', shiftData.id)
              .order('created_at', { ascending: false });
            
            movementsMap[register.id] = (movementsData || []) as CashRegisterMovement[];
          } else {
            movementsMap[register.id] = [];
          }
        }
        
        setShifts(shiftsMap);
        setMovements(movementsMap);
      } else {
        setRegisters([]);
      }
      
      // Store all registers for config
      setEditingRegisters((allRegistersData || []) as CashRegister[]);

      // Fetch payment methods
      const { data: methodsData } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('branch_id', branch.id)
        .order('display_order');

      if (methodsData) {
        setPaymentMethods(methodsData as PaymentMethod[]);
      }
    } catch (error) {
      handleError(error, { showToast: false, context: 'LocalCaja.fetchData' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenShift = async () => {
    if (!user || !selectedTab) return;
    
    try {
      const { error } = await supabase
        .from('cash_register_shifts')
        .insert({
          cash_register_id: selectedTab,
          branch_id: branch.id,
          opened_by: user.id,
          opening_amount: parseFloat(openingAmount) || 0,
          status: 'open'
        });

      if (error) throw error;

      toast({ title: 'Caja abierta', description: 'La caja se abrió correctamente' });
      setOpenShiftDialog(false);
      setOpeningAmount('');
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Print alivio receipt
  const printAlivioReceipt = (data: {
    cajero: string;
    fecha: Date;
    origen: string;
    destino: string;
    saldoAntes: number;
    monto: number;
    saldoRestante: number;
    notas?: string;
    alivioNum: number;
  }) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
      toast({ title: 'Error', description: 'No se pudo abrir ventana de impresión', variant: 'destructive' });
      return;
    }

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Comprobante de Alivio</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { 
              font-family: 'Courier New', monospace; 
              font-size: 12px; 
              padding: 10px;
              max-width: 280px;
              margin: 0 auto;
            }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 8px; }
            .title { font-size: 14px; font-weight: bold; }
            .row { display: flex; justify-content: space-between; padding: 2px 0; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .bold { font-weight: bold; }
            .center { text-align: center; }
            .amount { font-size: 14px; font-weight: bold; }
            .signature { margin-top: 30px; border-top: 1px solid #000; padding-top: 5px; text-align: center; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">═══════════════════</div>
            <div class="title">COMPROBANTE DE ALIVIO</div>
            <div class="title">═══════════════════</div>
          </div>
          
          <div class="row"><span>Sucursal:</span><span class="bold">${branch.name}</span></div>
          <div class="row"><span>Fecha:</span><span>${format(data.fecha, "dd/MM/yyyy HH:mm", { locale: es })}</span></div>
          <div class="row"><span>Alivio Nº:</span><span class="bold">${data.alivioNum}</span></div>
          
          <div class="divider"></div>
          
          <div class="row"><span>Cajero:</span><span class="bold">${data.cajero}</span></div>
          
          <div class="divider"></div>
          
          <div class="row"><span>De:</span><span>${data.origen}</span></div>
          <div class="row"><span>A:</span><span>${data.destino}</span></div>
          
          <div class="divider"></div>
          
          <div class="row"><span>Saldo antes:</span><span>$${data.saldoAntes.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div>
          <div class="row amount"><span>Monto alivio:</span><span>$${data.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div>
          
          <div class="divider"></div>
          
          <div class="row bold"><span>Saldo restante:</span><span>$${data.saldoRestante.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div>
          
          ${data.notas ? `<div class="divider"></div><div class="center"><em>Notas: ${data.notas}</em></div>` : ''}
          
          <div class="signature">
            <br><br>
            _____________________________<br>
            Firma Cajero
            <br><br><br>
            _____________________________<br>
            Firma Receptor (opcional)
          </div>
          
          <div class="header" style="margin-top: 20px;">
            <div class="title">═══════════════════</div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Handle "Hacer Alivio" - transfer cash to relief register
  const handleHacerAlivio = async () => {
    const currentShift = shifts[selectedTab];
    if (!user || !currentShift) return;
    
    const amount = parseFloat(alivioAmount) || 0;
    if (amount <= 0) {
      toast({ title: 'Error', description: 'El monto debe ser mayor a 0', variant: 'destructive' });
      return;
    }
    
    const saldoAntes = calculateExpectedAmount(selectedTab);
    const saldoRestante = saldoAntes - amount;
    
    // Find relief register (Caja de Alivio)
    const reliefRegister = registers.find(r => r.name.toLowerCase().includes('alivio'));
    const cajaOrigen = registers.find(r => r.id === selectedTab)?.name || 'Caja de Venta';
    const cajaDestino = reliefRegister?.name || 'Caja de Alivio';
    
    try {
      // Count today's alivios for this register
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('cash_register_movements')
        .select('*', { count: 'exact', head: true })
        .eq('shift_id', currentShift.id)
        .eq('type', 'withdrawal')
        .ilike('concept', '%alivio%');
      
      const alivioNum = (count || 0) + 1;

      // 1. Create withdrawal movement from current register
      const { error: withdrawalError } = await supabase
        .from('cash_register_movements')
        .insert({
          shift_id: currentShift.id,
          branch_id: branch.id,
          type: 'withdrawal',
          payment_method: 'efectivo',
          amount: amount,
          concept: `Alivio a ${cajaDestino}${alivioNotes ? ` - ${alivioNotes}` : ''}`,
          recorded_by: user.id
        });

      if (withdrawalError) throw withdrawalError;

      // 2. If relief register has an open shift, add deposit there
      if (reliefRegister) {
        const reliefShift = shifts[reliefRegister.id];
        if (reliefShift) {
          await supabase
            .from('cash_register_movements')
            .insert({
              shift_id: reliefShift.id,
              branch_id: branch.id,
              type: 'deposit',
              payment_method: 'efectivo',
              amount: amount,
              concept: `Alivio desde ${cajaOrigen}`,
              recorded_by: user.id
            });
        }
      }

      // 3. Print receipt
      printAlivioReceipt({
        cajero: userName || user.email || 'Usuario',
        fecha: new Date(),
        origen: cajaOrigen,
        destino: cajaDestino,
        saldoAntes,
        monto: amount,
        saldoRestante,
        notas: alivioNotes || undefined,
        alivioNum
      });

      toast({ title: 'Alivio realizado', description: `Se transfirieron ${formatCurrency(amount)}` });
      setAlivioDialog(false);
      setAlivioAmount('');
      setAlivioNotes('');
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleCloseShift = async () => {
    const currentShift = shifts[selectedTab];
    if (!user || !currentShift) return;
    
    const closing = parseFloat(closingAmount) || 0;
    const expected = calculateExpectedAmount(selectedTab);
    
    try {
      const { error } = await supabase
        .from('cash_register_shifts')
        .update({
          closed_by: user.id,
          closed_at: new Date().toISOString(),
          closing_amount: closing,
          expected_amount: expected,
          difference: closing - expected,
          notes: closingNotes || null,
          status: 'closed'
        })
        .eq('id', currentShift.id);

      if (error) throw error;

      toast({ title: 'Caja cerrada', description: 'El arqueo se completó correctamente' });
      setCloseShiftDialog(false);
      setClosingAmount('');
      setClosingNotes('');
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleAddMovement = async () => {
    const currentShift = shifts[selectedTab];
    if (!user || !currentShift) return;
    
    const amount = parseFloat(movementAmount) || 0;
    
    // Determine direction and category_group for ledger
    const isDeposit = movementType === 'deposit';
    const isWithdrawal = movementType === 'withdrawal';
    const isIncome = movementType === 'income' || isDeposit;
    const direction = (isWithdrawal || isDeposit) ? 'transfer' : (isIncome ? 'income' : 'expense');
    const categoryGroup = isIncome ? 'Ingresos' : ((isWithdrawal || isDeposit) ? 'Transferencias' : 'Gastos Operativos');
    
    try {
      // 1. Create unified transaction in ledger
      const { data: transactionData, error: txError } = await supabase
        .from('transactions')
        .insert([{
          branch_id: branch.id,
          type: isIncome ? 'income' : 'expense',
          amount: amount,
          concept: movementConcept,
          direction: direction,
          category_group: categoryGroup,
          account_id: movementPaymentMethod,
          receipt_type: 'INTERNAL',
          caja_id: selectedTab,
          turno_id: currentShift.id,
          created_by: user.id,
          metadata: { movement_type: movementType }
        }])
        .select('id')
        .single();

      if (txError) throw txError;

      // 2. Create cash register movement linked to transaction
      const { data, error } = await supabase
        .from('cash_register_movements')
        .insert({
          shift_id: currentShift.id,
          branch_id: branch.id,
          type: movementType,
          payment_method: movementPaymentMethod,
          amount: amount,
          concept: movementConcept,
          recorded_by: user.id,
          transaction_id: transactionData?.id
        })
        .select()
        .single();

      if (error) throw error;

      // Update state locally without refetching
      if (data) {
        setMovements(prev => ({
          ...prev,
          [selectedTab]: [data as CashRegisterMovement, ...(prev[selectedTab] || [])]
        }));
      }

      toast({ title: 'Movimiento registrado' });
      setMovementDialog(false);
      setMovementAmount('');
      setMovementConcept('');
      setMovementPaymentMethod('');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleVoidMovement = async (movementId: string, registerId: string) => {
    if (!canVoidMovements) {
      toast({ title: 'Sin permisos', description: 'No tenés permisos para anular movimientos', variant: 'destructive' });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('cash_register_movements')
        .delete()
        .eq('id', movementId);

      if (error) throw error;

      // Update state locally
      setMovements(prev => ({
        ...prev,
        [registerId]: (prev[registerId] || []).filter(m => m.id !== movementId)
      }));

      toast({ title: 'Movimiento anulado', description: 'El movimiento fue eliminado correctamente' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleAddPaymentMethod = async () => {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .insert({
          branch_id: branch.id,
          name: newMethodName,
          code: newMethodCode.toLowerCase().replace(/\s+/g, '_'),
          is_cash: newMethodIsCash,
          display_order: paymentMethods.length + 1
        });

      if (error) throw error;

      toast({ title: 'Medio de pago agregado' });
      setNewMethodName('');
      setNewMethodCode('');
      setNewMethodIsCash(false);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleTogglePaymentMethod = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeletePaymentMethod = async (id: string) => {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Medio de pago eliminado' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleUpdateRegisterName = (id: string, newName: string) => {
    setEditingRegisters(prev => 
      prev.map(r => r.id === id ? { ...r, name: newName } : r)
    );
  };

  const handleToggleRegister = (id: string, isActive: boolean) => {
    setEditingRegisters(prev => 
      prev.map(r => r.id === id ? { ...r, is_active: isActive } : r)
    );
  };

  const handleSaveRegistersConfig = async () => {
    try {
      for (const register of editingRegisters) {
        const { error } = await supabase
          .from('cash_registers')
          .update({ 
            name: register.name, 
            is_active: register.is_active 
          })
          .eq('id', register.id);
        
        if (error) throw error;
      }
      
      toast({ title: 'Configuración guardada' });
      setRegistersConfigDialog(false);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Calculate expected amount from movements (linked to transactions ledger)
  const calculateExpectedAmount = (registerId: string): number => {
    const shift = shifts[registerId];
    const registerMovements = movements[registerId] || [];
    
    if (!shift) return 0;
    
    let expected = shift.opening_amount;
    
    // Filter cash movements only for physical count
    for (const mov of registerMovements) {
      const isCashMethod = paymentMethods.find(m => m.code === mov.payment_method)?.is_cash;
      if (!isCashMethod) continue;
      
      if (mov.type === 'income' || mov.type === 'deposit') {
        expected += mov.amount;
      } else {
        expected -= mov.amount;
      }
    }
    
    return expected;
  };

  // Get shift totals - these are derived from movements which are linked to transactions
  const getShiftTotals = (registerId: string) => {
    const registerMovements = movements[registerId] || [];
    
    let income = 0;
    let expense = 0;
    
    for (const mov of registerMovements) {
      if (mov.type === 'income' || mov.type === 'deposit') {
        income += mov.amount;
      } else {
        expense += mov.amount;
      }
    }
    
    return { income, expense };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Caja</h1>
          <p className="text-muted-foreground">Apertura, movimientos y arqueo de caja</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={registersConfigDialog} onOpenChange={setRegistersConfigDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Configurar Cajas
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configurar Cajas</DialogTitle>
                <DialogDescription>Editá los nombres y habilitá o deshabilitá las cajas de esta sucursal</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-3">
                {editingRegisters.map((register, idx) => (
                  <div key={register.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <span className="text-sm font-medium text-muted-foreground w-6">{idx + 1}</span>
                    <Input 
                      value={register.name}
                      onChange={(e) => handleUpdateRegisterName(register.id, e.target.value)}
                      className="flex-1"
                    />
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground">Activa</Label>
                      <Switch 
                        checked={register.is_active}
                        onCheckedChange={(checked) => handleToggleRegister(register.id, checked)}
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setRegistersConfigDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveRegistersConfig}>
                  Guardar Cambios
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={paymentMethodsDialog} onOpenChange={setPaymentMethodsDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <CreditCard className="h-4 w-4 mr-2" />
                Medios de Pago
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Gestionar Medios de Pago</DialogTitle>
              <DialogDescription>Agregá y configurá los medios de pago disponibles</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Add new payment method */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Agregar Nuevo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Nombre</Label>
                      <Input 
                        placeholder="Ej: Cuenta DNI" 
                        value={newMethodName}
                        onChange={(e) => setNewMethodName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Código</Label>
                      <Input 
                        placeholder="Ej: cuenta_dni" 
                        value={newMethodCode}
                        onChange={(e) => setNewMethodCode(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={newMethodIsCash}
                        onCheckedChange={setNewMethodIsCash}
                      />
                      <Label>Es efectivo (afecta arqueo)</Label>
                    </div>
                    <Button onClick={handleAddPaymentMethod} disabled={!newMethodName || !newMethodCode}>
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* List of payment methods */}
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {paymentMethods.map((method) => (
                    <div 
                      key={method.id} 
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {method.is_cash ? (
                          <Banknote className="h-4 w-4 text-green-600" />
                        ) : (
                          <CreditCard className="h-4 w-4 text-blue-600" />
                        )}
                        <div>
                          <p className="font-medium">{method.name}</p>
                          <p className="text-xs text-muted-foreground">{method.code}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={method.is_active}
                          onCheckedChange={(checked) => handleTogglePaymentMethod(method.id, checked)}
                        />
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeletePaymentMethod(method.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {registers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No hay cajas configuradas para esta sucursal.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${registers.length}, 1fr)` }}>
            {registers.map((register) => (
              <TabsTrigger key={register.id} value={register.id} className="relative">
                {register.name}
                {shifts[register.id] && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {registers.map((register) => {
            const currentShift = shifts[register.id];
            const totals = getShiftTotals(register.id);
            const expectedCash = calculateExpectedAmount(register.id);
            const registerMovements = movements[register.id] || [];

            return (
              <TabsContent key={register.id} value={register.id} className="space-y-4 mt-4">
                {/* Stats Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Card className="bg-green-500/5 border-green-500/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Efectivo Esperado</CardTitle>
                      <Banknote className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(expectedCash)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {currentShift ? 'Caja abierta' : 'Caja cerrada'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
                      <ArrowUpRight className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(totals.income)}</div>
                      <p className="text-xs text-muted-foreground">Ventas + Depósitos</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Egresos</CardTitle>
                      <ArrowDownRight className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(totals.expense)}</div>
                      <p className="text-xs text-muted-foreground">Gastos + Retiros</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Movimientos</CardTitle>
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{registerMovements.length}</div>
                      <p className="text-xs text-muted-foreground">En esta caja</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Cash Register Control */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {currentShift ? (
                          <>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                              <div className="text-sm text-muted-foreground">
                                <span className="font-medium">Monto de Apertura:</span>{' '}
                                <span className="font-bold text-foreground">{formatCurrency(currentShift.opening_amount)}</span>
                              </div>
                              <span className="hidden sm:inline text-muted-foreground">•</span>
                              <div className="text-sm text-muted-foreground">
                                <span className="font-medium">Abierta desde:</span>{' '}
                                <span className="font-bold text-foreground">
                                  {format(new Date(currentShift.opened_at), "dd/MM HH:mm", { locale: es })}
                                </span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">Caja cerrada</span>
                        )}
                      </div>
                      {currentShift && (
                        <Badge variant="default" className="bg-green-500 shrink-0">
                          <Clock className="h-3 w-3 mr-1" />
                          Abierta
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {currentShift ? (
                      <>

                        <div className="flex flex-wrap gap-2">
                          <Dialog open={movementDialog} onOpenChange={setMovementDialog}>
                            <DialogTrigger asChild>
                              <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Agregar Movimiento
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Nuevo Movimiento</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Tipo</Label>
                                  <Select value={movementType} onValueChange={(v) => setMovementType(v as any)}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="income">Ingreso</SelectItem>
                                      <SelectItem value="expense">Gasto</SelectItem>
                                      <SelectItem value="deposit">Depósito</SelectItem>
                                      <SelectItem value="withdrawal">Retiro</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>Medio de Pago</Label>
                                  <Select value={movementPaymentMethod} onValueChange={setMovementPaymentMethod}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Seleccionar..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {paymentMethods.filter(m => m.is_active).map((method) => (
                                        <SelectItem key={method.id} value={method.code}>
                                          {method.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>Monto</Label>
                                  <Input 
                                    type="number" 
                                    placeholder="0.00"
                                    value={movementAmount}
                                    onChange={(e) => setMovementAmount(e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label>Concepto</Label>
                                  <Input 
                                    placeholder="Descripción del movimiento"
                                    value={movementConcept}
                                    onChange={(e) => setMovementConcept(e.target.value)}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setMovementDialog(false)}>
                                  Cancelar
                                </Button>
                                <Button 
                                  onClick={handleAddMovement}
                                  disabled={!movementAmount || !movementConcept || !movementPaymentMethod}
                                >
                                  Registrar
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          {/* Hacer Alivio Button */}
                          <Dialog open={alivioDialog} onOpenChange={setAlivioDialog}>
                            <DialogTrigger asChild>
                              <Button variant="secondary">
                                <Wallet className="h-4 w-4 mr-2" />
                                Hacer Alivio
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Hacer Alivio</DialogTitle>
                                <DialogDescription>
                                  Transferir efectivo de {registers.find(r => r.id === selectedTab)?.name || 'esta caja'} a Caja de Alivio
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="p-4 bg-muted/50 rounded-lg">
                                  <p className="text-sm text-muted-foreground">Efectivo disponible en caja</p>
                                  <p className="text-2xl font-bold text-primary">
                                    {formatCurrency(expectedCash)}
                                  </p>
                                </div>
                                
                                {/* Quick amount buttons */}
                                <div>
                                  <Label className="text-xs text-muted-foreground">Montos rápidos</Label>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {[50000, 100000, 150000, 200000, 300000].map((amount) => (
                                      <Button
                                        key={amount}
                                        type="button"
                                        variant={alivioAmount === String(amount) ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setAlivioAmount(String(amount))}
                                        disabled={amount > expectedCash}
                                        className="flex-1 min-w-[70px]"
                                      >
                                        ${(amount / 1000).toFixed(0)}k
                                      </Button>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <Label>Monto a transferir</Label>
                                  <Input 
                                    type="number" 
                                    placeholder="0.00"
                                    value={alivioAmount}
                                    onChange={(e) => setAlivioAmount(e.target.value)}
                                  />
                                  {parseFloat(alivioAmount) > expectedCash && (
                                    <p className="text-xs text-destructive mt-1">
                                      El monto supera el efectivo disponible
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <Label>Notas (opcional)</Label>
                                  <Input 
                                    placeholder="Ej: Alivio de mediodía"
                                    value={alivioNotes}
                                    onChange={(e) => setAlivioNotes(e.target.value)}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setAlivioDialog(false)}>
                                  Cancelar
                                </Button>
                                <Button 
                                  onClick={handleHacerAlivio}
                                  disabled={!alivioAmount || parseFloat(alivioAmount) <= 0}
                                >
                                  Confirmar Alivio
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          {/* Cerrar Caja Button */}
                          <Dialog open={closeShiftDialog} onOpenChange={setCloseShiftDialog}>
                            <DialogTrigger asChild>
                              <Button variant="destructive">
                                <Square className="h-4 w-4 mr-2" />
                                Cerrar Caja
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Cerrar {registers.find(r => r.id === selectedTab)?.name || 'Caja'}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                {/* Period Summary */}
                                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                                  <p className="text-sm font-medium">Resumen del período</p>
                                  <p className="text-xs text-muted-foreground">
                                    Abierta: {format(new Date(currentShift.opened_at), "dd/MM HH:mm", { locale: es })} → Ahora
                                  </p>
                                </div>

                                {/* Amounts breakdown */}
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Monto de apertura:</span>
                                    <span className="font-medium">{formatCurrency(currentShift.opening_amount)}</span>
                                  </div>
                                  <div className="flex justify-between text-green-600">
                                    <span>+ Ingresos (ventas, depósitos):</span>
                                    <span className="font-medium">+{formatCurrency(totals.income)}</span>
                                  </div>
                                  <div className="flex justify-between text-red-600">
                                    <span>- Egresos (gastos, alivios):</span>
                                    <span className="font-medium">-{formatCurrency(totals.expense)}</span>
                                  </div>
                                  <div className="border-t pt-2 flex justify-between font-bold">
                                    <span>= Efectivo esperado:</span>
                                    <span className="text-primary">{formatCurrency(expectedCash)}</span>
                                  </div>
                                </div>

                                {/* Count input */}
                                <div className="border-t pt-4">
                                  <Label className="flex items-center gap-2">
                                    <Banknote className="h-4 w-4" />
                                    Efectivo declarado (contá la caja)
                                  </Label>
                                  <Input 
                                    type="number" 
                                    placeholder="0.00"
                                    className="mt-2 text-lg"
                                    value={closingAmount}
                                    onChange={(e) => setClosingAmount(e.target.value)}
                                  />
                                </div>

                                {/* Difference */}
                                {closingAmount && (
                                  <div className={`p-4 rounded-lg ${
                                    parseFloat(closingAmount) - expectedCash >= 0 
                                      ? 'bg-green-500/10 border border-green-500/30' 
                                      : 'bg-red-500/10 border border-red-500/30'
                                  }`}>
                                    <p className="text-sm text-muted-foreground">Diferencia</p>
                                    <p className={`text-xl font-bold ${
                                      parseFloat(closingAmount) - expectedCash >= 0 
                                        ? 'text-green-600' 
                                        : 'text-red-600'
                                    }`}>
                                      {formatCurrency(parseFloat(closingAmount) - expectedCash)}
                                    </p>
                                  </div>
                                )}

                                <div>
                                  <Label>Notas (opcional)</Label>
                                  <Textarea 
                                    placeholder="Observaciones del cierre..."
                                    value={closingNotes}
                                    onChange={(e) => setClosingNotes(e.target.value)}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setCloseShiftDialog(false)}>
                                  Cancelar
                                </Button>
                                <Button 
                                  variant="destructive"
                                  onClick={handleCloseShift}
                                  disabled={!closingAmount}
                                >
                                  Confirmar Cierre
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <Button variant="outline" onClick={() => setHistoryDialog(true)}>
                            <History className="h-4 w-4 mr-2" />
                            Ver Todos
                          </Button>
                        </div>

                        {/* Quick View: Recent Movements */}
                        {registerMovements.length > 0 && (
                          <div className="mt-6 border-t pt-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium flex items-center gap-2">
                                <History className="h-4 w-4" />
                                Últimos Movimientos
                              </h4>
                              <Badge variant="secondary">{registerMovements.length} total</Badge>
                            </div>
                            <div className="space-y-2">
                              {registerMovements.slice(0, 5).map((mov) => (
                                <div 
                                  key={mov.id} 
                                  className="flex items-center justify-between p-2 bg-muted/30 rounded-lg text-sm group"
                                >
                                  <div className="flex items-center gap-2">
                                    {mov.type === 'income' || mov.type === 'deposit' ? (
                                      <ArrowUpRight className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <ArrowDownRight className="h-4 w-4 text-red-500" />
                                    )}
                                    <span className="truncate max-w-[150px] sm:max-w-[250px]">{mov.concept}</span>
                                    <span className="text-xs text-muted-foreground hidden sm:inline">
                                      {format(new Date(mov.created_at), 'HH:mm')}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`font-semibold ${
                                      mov.type === 'income' || mov.type === 'deposit' 
                                        ? 'text-green-600' 
                                        : 'text-red-600'
                                    }`}>
                                      {mov.type === 'income' || mov.type === 'deposit' ? '+' : '-'}
                                      {formatCurrency(mov.amount)}
                                    </span>
                                    {canVoidMovements && (
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                          >
                                            <Ban className="h-3 w-3 text-destructive" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>¿Anular movimiento?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Vas a eliminar el movimiento "{mov.concept}" por {formatCurrency(mov.amount)}. Esta acción no se puede deshacer.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction 
                                              onClick={() => handleVoidMovement(mov.id, register.id)}
                                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                              Anular
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {registerMovements.length > 5 && (
                                <Button 
                                  variant="ghost" 
                                  className="w-full text-sm text-muted-foreground"
                                  onClick={() => setHistoryDialog(true)}
                                >
                                  Ver {registerMovements.length - 5} movimientos más...
                                </Button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Movements History Dialog */}
                        <Dialog open={historyDialog} onOpenChange={setHistoryDialog}>
                          <DialogContent className="max-w-2xl max-h-[80vh]">
                            <DialogHeader>
                              <DialogTitle>Movimientos de la Caja</DialogTitle>
                              <DialogDescription>
                                {registerMovements.length} movimientos desde {currentShift && format(new Date(currentShift.opened_at), "dd/MM HH:mm", { locale: es })}
                              </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="h-[400px] pr-4">
                              {registerMovements.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                  No hay movimientos registrados
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {registerMovements.map((mov) => (
                                    <div 
                                      key={mov.id} 
                                      className="flex items-center justify-between p-3 border rounded-lg group"
                                    >
                                      <div className="flex items-center gap-3">
                                        {mov.type === 'income' || mov.type === 'deposit' ? (
                                          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                                            <ArrowUpRight className="h-4 w-4 text-green-600" />
                                          </div>
                                        ) : (
                                          <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                                            <ArrowDownRight className="h-4 w-4 text-red-600" />
                                          </div>
                                        )}
                                        <div>
                                          <p className="font-medium">{mov.concept}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {format(new Date(mov.created_at), 'HH:mm', { locale: es })} • {mov.payment_method}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className={`font-bold ${
                                          mov.type === 'income' || mov.type === 'deposit' 
                                            ? 'text-green-600' 
                                            : 'text-red-600'
                                        }`}>
                                          {mov.type === 'income' || mov.type === 'deposit' ? '+' : '-'}
                                          {formatCurrency(mov.amount)}
                                        </span>
                                        {canVoidMovements && (
                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 opacity-50 hover:opacity-100 transition-opacity"
                                              >
                                                <Ban className="h-4 w-4 text-destructive" />
                                              </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                              <AlertDialogHeader>
                                                <AlertDialogTitle>¿Anular movimiento?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                  Vas a eliminar el movimiento "{mov.concept}" por {formatCurrency(mov.amount)}. Esta acción no se puede deshacer.
                                                </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction 
                                                  onClick={() => handleVoidMovement(mov.id, register.id)}
                                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                >
                                                  Anular
                                                </AlertDialogAction>
                                              </AlertDialogFooter>
                                            </AlertDialogContent>
                                          </AlertDialog>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground mb-4">
                          No hay una caja abierta. Abrí la caja para comenzar a registrar movimientos.
                        </p>
                        <Dialog open={openShiftDialog} onOpenChange={setOpenShiftDialog}>
                          <DialogTrigger asChild>
                            <Button>
                              <Play className="h-4 w-4 mr-2" />
                              Abrir Caja
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Abrir Caja</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Monto inicial en caja (efectivo)</Label>
                                <Input 
                                  type="number" 
                                  placeholder="0.00"
                                  value={openingAmount}
                                  onChange={(e) => setOpeningAmount(e.target.value)}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setOpenShiftDialog(false)}>
                                Cancelar
                              </Button>
                              <Button onClick={handleOpenShift}>
                                Abrir Caja
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}