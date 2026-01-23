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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Receipt, Banknote, CreditCard, Plus, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SupervisorPinDialog } from './SupervisorPinDialog';
import { OperatorInfo } from '@/hooks/useOperatorVerification';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface QuickExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  shiftId?: string;
  pinThreshold?: number;
}

interface ExpenseCategory {
  id: string;
  name: string;
  category_group: string;
}

interface CashRegister {
  id: string;
  name: string;
}

// Grupos de gastos (excluimos INGRESOS)
const EXPENSE_GROUPS = [
  { value: 'GASTOS_OPERATIVOS', label: 'Gastos Operativos' },
  { value: 'ESTRUCTURA', label: 'Estructura' },
  { value: 'CMV', label: 'CMV (Costo de Mercadería)' },
  { value: 'RRHH', label: 'Recursos Humanos' },
  { value: 'IMPUESTOS', label: 'Impuestos y Financieros' },
];

export function QuickExpenseModal({
  open,
  onOpenChange,
  branchId,
  shiftId,
  pinThreshold = 50000,
}: QuickExpenseModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [notes, setNotes] = useState('');
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Category selection
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryGroup, setNewCategoryGroup] = useState('GASTOS_OPERATIVOS');
  
  // Cash register selection
  const [selectedCashRegisterId, setSelectedCashRegisterId] = useState<string>('');
  
  // Fetch expense categories
  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: async (): Promise<ExpenseCategory[]> => {
      const { data, error } = await supabase
        .from('transaction_categories')
        .select('id, name, category_group')
        .eq('is_active', true)
        .neq('category_group', 'INGRESOS')
        .order('category_group')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Fetch cash registers for the branch
  const { data: cashRegisters = [] } = useQuery({
    queryKey: ['cash-registers-list', branchId],
    queryFn: async (): Promise<CashRegister[]> => {
      const { data, error } = await supabase
        .from('cash_registers')
        .select('id, name')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });
  
  // Group categories for the selector
  const categoriesByGroup = categories.reduce((acc, cat) => {
    if (!acc[cat.category_group]) {
      acc[cat.category_group] = [];
    }
    acc[cat.category_group].push(cat);
    return acc;
  }, {} as Record<string, ExpenseCategory[]>);
  
  // Verificar si el usuario es encargado o superior usando user_roles_v2
  useEffect(() => {
    async function checkRole() {
      if (!user) return;
      const { data } = await supabase
        .from('user_roles_v2')
        .select('brand_role, local_role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      
      if (data) {
        const isBrandSupervisor = ['superadmin', 'coordinador'].includes(data.brand_role || '');
        const isLocalSupervisor = ['franquiciado', 'encargado'].includes(data.local_role || '');
        setIsSupervisor(isBrandSupervisor || isLocalSupervisor);
        setIsAdmin(data.brand_role === 'superadmin' || data.local_role === 'franquiciado');
      }
    }
    checkRole();
  }, [user]);
  
  // Create new category mutation
  const createCategory = useMutation({
    mutationFn: async () => {
      if (!newCategoryName.trim()) throw new Error('Nombre requerido');
      
      const { data, error } = await supabase
        .from('transaction_categories')
        .insert({
          name: newCategoryName.trim(),
          category_group: newCategoryGroup,
          is_active: true,
        })
        .select('id, name, category_group')
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (newCat) => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      setSelectedCategoryId(newCat.id);
      setShowNewCategory(false);
      setNewCategoryName('');
      toast.success(`Categoría "${newCat.name}" creada`);
    },
    onError: (error) => {
      console.error('Error creating category:', error);
      toast.error('Error al crear la categoría');
    },
  });
  
  const createExpense = useMutation({
    mutationFn: async (authorizedBy?: string) => {
      if (!user) throw new Error('No autenticado');
      
      const amountNum = parseFloat(amount);
      const isCash = paymentMethod === 'cash';
      
      // Si es efectivo, crear movimiento de caja directamente
      if (isCash && shiftId) {
        const selectedCategory = categories.find(c => c.id === selectedCategoryId);
        const conceptWithCategory = selectedCategory 
          ? `[${selectedCategory.name}] ${concept}`
          : concept;
        
        const { error: movError } = await supabase
          .from('cash_register_movements')
          .insert({
            branch_id: branchId,
            shift_id: shiftId,
            type: 'egreso',
            amount: amountNum,
            concept: conceptWithCategory,
            payment_method: 'efectivo',
            recorded_by: user.id,
            operated_by: user.id,
            authorized_by: authorizedBy || (isSupervisor ? user.id : null),
            requires_authorization: amountNum >= pinThreshold,
          });
        
        if (movError) throw movError;
      }
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-registers'] });
      toast.success('Gasto registrado correctamente');
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error al crear gasto:', error);
      toast.error('Error al registrar el gasto');
    },
  });
  
  useEffect(() => {
    if (open) {
      setConcept('');
      setAmount('');
      setPaymentMethod('cash');
      setNotes('');
      setSelectedCategoryId('');
      setShowNewCategory(false);
      setNewCategoryName('');
      // Default to first cash register (usually "Caja de Venta")
      if (cashRegisters.length > 0) {
        setSelectedCashRegisterId(cashRegisters[0].id);
      }
    }
  }, [open, cashRegisters]);
  
  const handleSubmit = () => {
    if (!concept || !amount) return;
    
    const amountNum = parseFloat(amount);
    const needsPin = !isSupervisor && amountNum >= pinThreshold;
    
    if (needsPin) {
      setShowPinDialog(true);
    } else {
      createExpense.mutate(undefined);
    }
  };
  
  const handlePinSuccess = (supervisor: OperatorInfo) => {
    setShowPinDialog(false);
    createExpense.mutate(supervisor.userId);
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
  
  const getGroupLabel = (groupValue: string) => {
    return EXPENSE_GROUPS.find(g => g.value === groupValue)?.label || groupValue;
  };
  
  const amountNum = parseFloat(amount) || 0;
  const needsPin = !isSupervisor && amountNum >= pinThreshold;
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Registrar Gasto
            </DialogTitle>
            <DialogDescription>
              {paymentMethod === 'cash' 
                ? 'Se descontará del efectivo de caja'
                : 'Quedará pendiente de transferencia'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Category selector */}
            <div className="space-y-2">
              <Label>Tipo de gasto</Label>
              {!showNewCategory ? (
                <div className="flex gap-2">
                  <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Seleccionar categoría..." />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_GROUPS.map(group => {
                        const groupCats = categoriesByGroup[group.value];
                        if (!groupCats || groupCats.length === 0) return null;
                        return (
                          <SelectGroup key={group.value}>
                            <SelectLabel>{group.label}</SelectLabel>
                            {groupCats.map(cat => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {isAdmin && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowNewCategory(true)}
                      title="Crear nuevo tipo de gasto"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Nueva categoría</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNewCategory(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                  <Input
                    placeholder="Nombre del tipo de gasto"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    autoFocus
                  />
                  <Select value={newCategoryGroup} onValueChange={setNewCategoryGroup}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_GROUPS.map(group => (
                        <SelectItem key={group.value} value={group.value}>
                          {group.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    className="w-full"
                    onClick={() => createCategory.mutate()}
                    disabled={!newCategoryName.trim() || createCategory.isPending}
                  >
                    {createCategory.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Crear y seleccionar
                  </Button>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="concept">Concepto</Label>
              <Input
                id="concept"
                placeholder="Ej: Reparación aire acondicionado"
                value={concept}
                onChange={e => setConcept(e.target.value)}
              />
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
                    id="expense-cash"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="expense-cash"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <Banknote className="mb-2 h-6 w-6" />
                    <span className="text-sm font-medium">Efectivo</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="transfer"
                    id="expense-transfer"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="expense-transfer"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <CreditCard className="mb-2 h-6 w-6" />
                    <span className="text-sm font-medium">Transferencia</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            {/* Cash register selector - only when cash is selected */}
            {paymentMethod === 'cash' && cashRegisters.length > 1 && (
              <div className="space-y-2">
                <Label>¿De qué caja sale?</Label>
                <Select value={selectedCashRegisterId} onValueChange={setSelectedCashRegisterId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar caja..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cashRegisters.map(register => (
                      <SelectItem key={register.id} value={register.id}>
                        {register.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Detalles adicionales..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
              />
            </div>
            
            {needsPin && (
              <div className="p-3 rounded-lg bg-accent/50 border border-border text-foreground text-sm">
                Monto mayor a {formatCurrency(pinThreshold.toString())} requiere PIN de encargado
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createExpense.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!concept || !amount || createExpense.isPending}
            >
              {createExpense.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {needsPin ? 'Solicitar Autorización' : 'Registrar Gasto'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <SupervisorPinDialog
        open={showPinDialog}
        onOpenChange={setShowPinDialog}
        branchId={branchId}
        onSuccess={handlePinSuccess}
        title="Autorizar Gasto"
        description={`Gasto de ${formatCurrency(amount)} requiere autorización`}
      />
    </>
  );
}
