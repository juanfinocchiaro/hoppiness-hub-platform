import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Plus,
  Calendar,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Edit2,
  Save
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface TaxObligation {
  id: string;
  name: string;
  period: string;
  amount: number;
  status: string;
}

interface Installment {
  id: string;
  plan_id: string;
  installment_number: number;
  due_date: string;
  amount_capital: number;
  amount_interest: number | null;
  amount_paid: number | null;
  status: 'pending' | 'paid' | 'partial' | 'overdue';
}

interface PaymentPlan {
  id: string;
  branch_id: string;
  tax_obligation_id: string | null;
  description: string;
  total_amount: number;
  down_payment: number | null;
  num_installments: number;
  interest_rate: number | null;
  start_date: string;
  status: 'active' | 'completed' | 'defaulted' | 'cancelled';
  notes: string | null;
  created_at: string;
  payment_plan_installments?: Installment[];
  tax_obligations?: TaxObligation;
}

interface LocalContext {
  branch: Branch;
}

export default function LocalPaymentPlans() {
  const { branch } = useOutletContext<LocalContext>();
  const { user } = useAuth();
  
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [taxObligations, setTaxObligations] = useState<TaxObligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<{plan: PaymentPlan, installment: Installment} | null>(null);
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set());
  const [editingInstallment, setEditingInstallment] = useState<string | null>(null);
  const [editDueDate, setEditDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    tax_obligation_id: '',
    description: '',
    total_amount: '',
    down_payment: '',
    interest_rate: '0',
    num_installments: '12',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  const [payAmount, setPayAmount] = useState('');

  const fetchData = async () => {
    setLoading(true);
    
    const [plansRes, taxRes] = await Promise.all([
      supabase
        .from('payment_plans')
        .select('*, payment_plan_installments(*), tax_obligations(*)')
        .eq('branch_id', branch.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('tax_obligations')
        .select('*')
        .eq('branch_id', branch.id)
        .eq('status', 'overdue')
        .order('period', { ascending: false }),
    ]);

    if (plansRes.data) setPlans(plansRes.data as PaymentPlan[]);
    if (taxRes.data) setTaxObligations(taxRes.data as TaxObligation[]);
    
    setLoading(false);
  };

  useEffect(() => {
    if (branch?.id) fetchData();
  }, [branch?.id]);

  const resetForm = () => {
    setFormData({
      tax_obligation_id: '',
      description: '',
      total_amount: '',
      down_payment: '',
      interest_rate: '0',
      num_installments: '12',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    });
  };

  const handleSubmit = async () => {
    if (!formData.description.trim() || !formData.total_amount || !formData.num_installments) {
      toast.error('Completá descripción, monto total y cuotas');
      return;
    }

    setIsSubmitting(true);

    try {
      const totalAmount = parseFloat(formData.total_amount);
      const downPayment = formData.down_payment ? parseFloat(formData.down_payment) : 0;
      const rate = parseFloat(formData.interest_rate) / 100;
      const numCuotas = parseInt(formData.num_installments);
      const startDate = parseISO(formData.start_date);

      const remainingAmount = totalAmount - downPayment;
      const totalWithInterest = remainingAmount * (1 + rate);

      // Create plan
      const { data: plan, error: planError } = await supabase
        .from('payment_plans')
        .insert({
          branch_id: branch.id,
          tax_obligation_id: formData.tax_obligation_id || null,
          description: formData.description.trim(),
          total_amount: totalAmount,
          down_payment: downPayment || null,
          interest_rate: parseFloat(formData.interest_rate) || null,
          num_installments: numCuotas,
          start_date: formData.start_date,
          status: 'active',
          notes: formData.notes || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (planError) throw planError;

      // Create installments
      const capitalPerCuota = remainingAmount / numCuotas;
      const interestPerCuota = (totalWithInterest - remainingAmount) / numCuotas;

      const installments = Array.from({ length: numCuotas }, (_, i) => ({
        plan_id: plan.id,
        installment_number: i + 1,
        due_date: format(addMonths(startDate, i + 1), 'yyyy-MM-dd'),
        amount_capital: capitalPerCuota,
        amount_interest: interestPerCuota > 0 ? interestPerCuota : null,
        status: 'pending',
      }));

      const { error: installError } = await supabase
        .from('payment_plan_installments')
        .insert(installments);

      if (installError) throw installError;

      // If there's a down payment, create expense transaction
      if (downPayment > 0) {
        await supabase.from('transactions').insert({
          branch_id: branch.id,
          type: 'expense',
          amount: downPayment,
          concept: `Anticipo Plan: ${formData.description}`,
          category_group: 'IMPUESTOS',
          doc_status: 'documented',
          accrual_date: formData.start_date,
          payment_date: formData.start_date,
          transaction_date: formData.start_date,
          status: 'paid',
          payment_origin: 'bank_transfer',
          receipt_type: 'OFFICIAL',
          recorded_by: user?.id,
          created_by: user?.id,
        });
      }

      toast.success('Plan de pago creado con cuotas');
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al crear plan de pago');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayInstallment = async () => {
    if (!selectedInstallment || !payAmount) return;

    const { plan, installment } = selectedInstallment;
    const amount = parseFloat(payAmount);
    const remaining = (installment.amount_capital + (installment.amount_interest || 0)) - (installment.amount_paid || 0);
    
    if (amount > remaining) {
      toast.error('El monto excede el saldo de la cuota');
      return;
    }

    setIsSubmitting(true);

    try {
      const newPaid = (installment.amount_paid || 0) + amount;
      const totalCuota = installment.amount_capital + (installment.amount_interest || 0);
      const newStatus = newPaid >= totalCuota ? 'paid' : 'partial';

      // Update installment
      await supabase
        .from('payment_plan_installments')
        .update({
          amount_paid: newPaid,
          status: newStatus,
          paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
        })
        .eq('id', installment.id);

      // Create expense transaction (capital reduces debt, interest goes to Financieros)
      const totalCuotaAmount = installment.amount_capital + (installment.amount_interest || 0);
      const capitalProportion = installment.amount_capital / totalCuotaAmount;
      const capitalPaid = amount * capitalProportion;
      const interestPaid = amount - capitalPaid;

      // Capital payment (reduces debt - goes to Impuestos)
      if (capitalPaid > 0) {
        await supabase.from('transactions').insert({
          branch_id: branch.id,
          type: 'expense',
          amount: capitalPaid,
          concept: `Cuota ${installment.installment_number} Capital - ${plan.description}`,
          category_group: 'IMPUESTOS',
          doc_status: 'documented',
          accrual_date: installment.due_date,
          payment_date: format(new Date(), 'yyyy-MM-dd'),
          transaction_date: format(new Date(), 'yyyy-MM-dd'),
          status: 'paid',
          payment_origin: 'bank_transfer',
          receipt_type: 'OFFICIAL',
          recorded_by: user?.id,
          created_by: user?.id,
        });
      }

      // Interest payment (P&L expense - Financieros)
      if (interestPaid > 0) {
        await supabase.from('transactions').insert({
          branch_id: branch.id,
          type: 'expense',
          amount: interestPaid,
          concept: `Cuota ${installment.installment_number} Interés - ${plan.description}`,
          category_group: 'FINANCIEROS',
          doc_status: 'documented',
          accrual_date: installment.due_date,
          payment_date: format(new Date(), 'yyyy-MM-dd'),
          transaction_date: format(new Date(), 'yyyy-MM-dd'),
          status: 'paid',
          payment_origin: 'bank_transfer',
          receipt_type: 'OFFICIAL',
          recorded_by: user?.id,
          created_by: user?.id,
        });
      }

      // Check if all installments paid -> complete plan
      const { data: allInstallments } = await supabase
        .from('payment_plan_installments')
        .select('status')
        .eq('plan_id', plan.id);

      const allPaid = allInstallments?.every(i => i.status === 'paid');
      if (allPaid) {
        await supabase
          .from('payment_plans')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', plan.id);
      }

      toast.success('Pago registrado');
      setIsPayDialogOpen(false);
      setSelectedInstallment(null);
      setPayAmount('');
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al registrar pago');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditDueDate = async (installmentId: string, newDate: string) => {
    try {
      await supabase
        .from('payment_plan_installments')
        .update({ due_date: newDate })
        .eq('id', installmentId);
      
      setEditingInstallment(null);
      toast.success('Fecha actualizada');
      fetchData();
    } catch (error) {
      toast.error('Error al actualizar fecha');
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount);

  const togglePlan = (planId: string) => {
    setExpandedPlans(prev => {
      const next = new Set(prev);
      if (next.has(planId)) next.delete(planId);
      else next.add(planId);
      return next;
    });
  };

  const getPlanProgress = (plan: PaymentPlan) => {
    const installments = plan.payment_plan_installments || [];
    const paid = installments.filter(i => i.status === 'paid').length;
    return (paid / plan.num_installments) * 100;
  };

  const getPlanRemaining = (plan: PaymentPlan) => {
    const installments = plan.payment_plan_installments || [];
    return installments.reduce((sum, i) => 
      sum + (i.amount_capital + (i.amount_interest || 0) - (i.amount_paid || 0)), 0);
  };

  const totals = {
    totalDebt: plans.filter(p => p.status === 'active').reduce((s, p) => s + getPlanRemaining(p), 0),
    activePlans: plans.filter(p => p.status === 'active').length,
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Planes de Pago</h1>
          <p className="text-muted-foreground">Moratorias y refinanciaciones fiscales</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Crear Plan de Pago</DialogTitle>
              <DialogDescription>
                Se generarán las cuotas automáticamente (editables después)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Link to Tax Obligation (optional) */}
              {taxObligations.length > 0 && (
                <div className="space-y-2">
                  <Label>Vincular a Obligación Vencida (opcional)</Label>
                  <Select
                    value={formData.tax_obligation_id}
                    onValueChange={v => {
                      const tax = taxObligations.find(t => t.id === v);
                      setFormData(f => ({
                        ...f,
                        tax_obligation_id: v,
                        description: tax ? `Plan ${tax.name} - ${tax.period}` : f.description,
                        total_amount: tax ? tax.amount.toString() : f.total_amount,
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sin vincular" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin vincular</SelectItem>
                      {taxObligations.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} - {t.period} ({formatCurrency(t.amount)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Descripción</Label>
                <Input
                  placeholder="Ej: Moratoria IIBB 2024"
                  value={formData.description}
                  onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monto Total Deuda</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="0"
                      className="pl-10"
                      value={formData.total_amount}
                      onChange={e => setFormData(f => ({ ...f, total_amount: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Anticipo (opcional)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="0"
                      className="pl-10"
                      value={formData.down_payment}
                      onChange={e => setFormData(f => ({ ...f, down_payment: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tasa Interés Total (%)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formData.interest_rate}
                    onChange={e => setFormData(f => ({ ...f, interest_rate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cantidad de Cuotas</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.num_installments}
                    onChange={e => setFormData(f => ({ ...f, num_installments: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Fecha Inicio (1ra cuota = mes siguiente)</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={e => setFormData(f => ({ ...f, start_date: e.target.value }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Creando...' : 'Crear Plan'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deuda Total en Planes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalDebt)}</div>
            <p className="text-xs text-muted-foreground">{totals.activePlans} planes activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planes Completados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plans.filter(p => p.status === 'completed').length}</div>
            <p className="text-xs text-muted-foreground">de {plans.length} totales</p>
          </CardContent>
        </Card>
      </div>

      {/* Plans List */}
      <div className="space-y-4">
        {plans.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No hay planes de pago registrados
            </CardContent>
          </Card>
        ) : (
          plans.map(plan => (
            <Card key={plan.id}>
              <Collapsible open={expandedPlans.has(plan.id)} onOpenChange={() => togglePlan(plan.id)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {expandedPlans.has(plan.id) ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                        <div>
                          <CardTitle className="text-lg">{plan.description}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {plan.num_installments} cuotas • Inicio: {format(parseISO(plan.start_date), 'MMM yyyy', { locale: es })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(getPlanRemaining(plan))}</p>
                          <p className="text-xs text-muted-foreground">restante</p>
                        </div>
                        <Badge variant={plan.status === 'completed' ? 'default' : plan.status === 'active' ? 'secondary' : 'destructive'}>
                          {plan.status === 'completed' ? 'Completado' : plan.status === 'active' ? 'Activo' : 'Cancelado'}
                        </Badge>
                      </div>
                    </div>
                    <Progress value={getPlanProgress(plan)} className="h-2 mt-2" />
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cuota</TableHead>
                          <TableHead>Vencimiento</TableHead>
                          <TableHead className="text-right">Capital</TableHead>
                          <TableHead className="text-right">Interés</TableHead>
                          <TableHead className="text-right">Pagado</TableHead>
                          <TableHead className="text-center">Estado</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(plan.payment_plan_installments || [])
                          .sort((a, b) => a.installment_number - b.installment_number)
                          .map(inst => (
                            <TableRow key={inst.id}>
                              <TableCell className="font-medium">#{inst.installment_number}</TableCell>
                              <TableCell>
                                {editingInstallment === inst.id ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="date"
                                      value={editDueDate}
                                      onChange={e => setEditDueDate(e.target.value)}
                                      className="w-36 h-8"
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleEditDueDate(inst.id, editDueDate)}
                                    >
                                      <Save className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    {format(parseISO(inst.due_date), 'dd/MM/yyyy')}
                                    {plan.status === 'active' && inst.status !== 'paid' && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingInstallment(inst.id);
                                          setEditDueDate(inst.due_date);
                                        }}
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(inst.amount_capital)}</TableCell>
                              <TableCell className="text-right">{inst.amount_interest ? formatCurrency(inst.amount_interest) : '-'}</TableCell>
                              <TableCell className="text-right">{inst.amount_paid ? formatCurrency(inst.amount_paid) : '-'}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={
                                  inst.status === 'paid' ? 'default' : 
                                  inst.status === 'partial' ? 'secondary' : 
                                  'outline'
                                }>
                                  {inst.status === 'paid' ? 'Pagada' : inst.status === 'partial' ? 'Parcial' : 'Pendiente'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {inst.status !== 'paid' && plan.status === 'active' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedInstallment({ plan, installment: inst });
                                      const remaining = (inst.amount_capital + (inst.amount_interest || 0)) - (inst.amount_paid || 0);
                                      setPayAmount(remaining.toString());
                                      setIsPayDialogOpen(true);
                                    }}
                                  >
                                    Pagar
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))
        )}
      </div>

      {/* Pay Installment Dialog */}
      <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago de Cuota</DialogTitle>
            {selectedInstallment && (
              <DialogDescription>
                Cuota #{selectedInstallment.installment.installment_number} - {selectedInstallment.plan.description}
              </DialogDescription>
            )}
          </DialogHeader>
          
          {selectedInstallment && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total cuota</p>
                  <p className="font-semibold">
                    {formatCurrency(selectedInstallment.installment.amount_capital + (selectedInstallment.installment.amount_interest || 0))}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ya pagado</p>
                  <p className="font-semibold">{formatCurrency(selectedInstallment.installment.amount_paid || 0)}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Monto a pagar</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    className="pl-10"
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPayDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handlePayInstallment} disabled={isSubmitting}>
              {isSubmitting ? 'Procesando...' : 'Confirmar Pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
