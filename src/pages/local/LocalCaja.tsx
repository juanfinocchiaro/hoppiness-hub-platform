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
import { 
  Calculator, Clock, DollarSign, ArrowUpRight, ArrowDownRight, 
  Plus, Settings, CreditCard, Banknote, Play, Square, History,
  Wallet, TrendingUp, TrendingDown, RefreshCw, Trash2, Edit2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
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
  const { toast } = useToast();

  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [shifts, setShifts] = useState<Record<string, CashRegisterShift | null>>({});
  const [movements, setMovements] = useState<Record<string, CashRegisterMovement[]>>({});
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<string>('');
  
  // Dialog states
  const [openShiftDialog, setOpenShiftDialog] = useState(false);
  const [closeShiftDialog, setCloseShiftDialog] = useState(false);
  const [movementDialog, setMovementDialog] = useState(false);
  const [paymentMethodsDialog, setPaymentMethodsDialog] = useState(false);
  const [historyDialog, setHistoryDialog] = useState(false);
  const [registersConfigDialog, setRegistersConfigDialog] = useState(false);
  
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
      console.error('Error fetching data:', error);
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

      toast({ title: 'Turno iniciado', description: 'El turno se abrió correctamente' });
      setOpenShiftDialog(false);
      setOpeningAmount('');
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

      toast({ title: 'Turno cerrado', description: 'El arqueo se completó correctamente' });
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
    
    try {
      const { error } = await supabase
        .from('cash_register_movements')
        .insert({
          shift_id: currentShift.id,
          branch_id: branch.id,
          type: movementType,
          payment_method: movementPaymentMethod,
          amount: parseFloat(movementAmount) || 0,
          concept: movementConcept,
          recorded_by: user.id
        });

      if (error) throw error;

      toast({ title: 'Movimiento registrado' });
      setMovementDialog(false);
      setMovementAmount('');
      setMovementConcept('');
      setMovementPaymentMethod('');
      fetchData();
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

  const calculateExpectedAmount = (registerId: string): number => {
    const shift = shifts[registerId];
    const registerMovements = movements[registerId] || [];
    
    if (!shift) return 0;
    
    let expected = shift.opening_amount;
    
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
          <p className="text-muted-foreground">Arqueos y cierres de turno</p>
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
                        {currentShift ? 'Turno actual' : 'Sin turno'}
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
                      <p className="text-xs text-muted-foreground">En este turno</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Shift Control */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        <CardTitle>Turno Actual</CardTitle>
                      </div>
                      {currentShift && (
                        <Badge variant="default" className="bg-green-500">
                          Abierto desde {format(new Date(currentShift.opened_at), 'HH:mm', { locale: es })}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {currentShift ? (
                      <>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="p-4 bg-muted/50 rounded-lg">
                            <p className="text-sm text-muted-foreground">Apertura</p>
                            <p className="text-lg font-bold">{formatCurrency(currentShift.opening_amount)}</p>
                          </div>
                          <div className="p-4 bg-muted/50 rounded-lg">
                            <p className="text-sm text-muted-foreground">Inicio</p>
                            <p className="text-lg font-bold">
                              {format(new Date(currentShift.opened_at), "dd/MM HH:mm", { locale: es })}
                            </p>
                          </div>
                        </div>

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

                          <Dialog open={closeShiftDialog} onOpenChange={setCloseShiftDialog}>
                            <DialogTrigger asChild>
                              <Button variant="destructive">
                                <Square className="h-4 w-4 mr-2" />
                                Cerrar Turno
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Cerrar Turno - Arqueo</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="p-4 bg-muted/50 rounded-lg">
                                  <p className="text-sm text-muted-foreground">Efectivo esperado en caja</p>
                                  <p className="text-2xl font-bold text-green-600">
                                    {formatCurrency(expectedCash)}
                                  </p>
                                </div>
                                <div>
                                  <Label>Conteo real de efectivo</Label>
                                  <Input 
                                    type="number" 
                                    placeholder="0.00"
                                    value={closingAmount}
                                    onChange={(e) => setClosingAmount(e.target.value)}
                                  />
                                </div>
                                {closingAmount && (
                                  <div className={`p-4 rounded-lg ${
                                    parseFloat(closingAmount) - expectedCash >= 0 
                                      ? 'bg-green-500/10 text-green-700' 
                                      : 'bg-red-500/10 text-red-700'
                                  }`}>
                                    <p className="text-sm">Diferencia</p>
                                    <p className="text-xl font-bold">
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
                            Ver Movimientos
                          </Button>
                        </div>

                        {/* Movements History Dialog */}
                        <Dialog open={historyDialog} onOpenChange={setHistoryDialog}>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Movimientos del Turno</DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="h-[400px]">
                              {registerMovements.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                  No hay movimientos registrados
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {registerMovements.map((mov) => (
                                    <div 
                                      key={mov.id} 
                                      className="flex items-center justify-between p-3 border rounded-lg"
                                    >
                                      <div className="flex items-center gap-3">
                                        {mov.type === 'income' || mov.type === 'deposit' ? (
                                          <ArrowUpRight className="h-5 w-5 text-green-500" />
                                        ) : (
                                          <ArrowDownRight className="h-5 w-5 text-red-500" />
                                        )}
                                        <div>
                                          <p className="font-medium">{mov.concept}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {format(new Date(mov.created_at), 'HH:mm', { locale: es })} • {mov.payment_method}
                                          </p>
                                        </div>
                                      </div>
                                      <span className={`font-bold ${
                                        mov.type === 'income' || mov.type === 'deposit' 
                                          ? 'text-green-600' 
                                          : 'text-red-600'
                                      }`}>
                                        {mov.type === 'income' || mov.type === 'deposit' ? '+' : '-'}
                                        {formatCurrency(mov.amount)}
                                      </span>
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
                          No hay un turno abierto. Iniciá un nuevo turno para comenzar a registrar movimientos.
                        </p>
                        <Dialog open={openShiftDialog} onOpenChange={setOpenShiftDialog}>
                          <DialogTrigger asChild>
                            <Button>
                              <Play className="h-4 w-4 mr-2" />
                              Iniciar Turno
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Iniciar Nuevo Turno</DialogTitle>
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
                                Abrir Turno
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