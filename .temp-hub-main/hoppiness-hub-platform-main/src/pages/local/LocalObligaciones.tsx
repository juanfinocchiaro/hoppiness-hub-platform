import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
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
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Plus,
  Receipt,
  Landmark,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Smartphone,
  History,
  Edit2,
  Save
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, addMonths, isBefore, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

// ===== TIPOS =====
interface TaxObligation {
  id: string;
  branch_id: string;
  name: string;
  tax_type: string;
  period: string;
  accrual_date: string;
  due_date: string;
  amount: number;
  amount_paid: number;
  status: 'pending' | 'paid' | 'partial' | 'overdue' | 'in_plan';
  notes: string | null;
  created_at: string;
}

interface PaymentPlanInstallment {
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
  payment_plan_installments?: PaymentPlanInstallment[];
  tax_obligations?: TaxObligation;
}

interface LoanInstallment {
  id: string;
  loan_id: string;
  installment_number: number;
  due_date: string;
  amount_capital: number;
  amount_interest: number;
  amount_paid: number;
  status: 'pending' | 'paid' | 'partial' | 'overdue';
}

interface Loan {
  id: string;
  branch_id: string;
  lender_name: string;
  description: string | null;
  principal_amount: number;
  interest_rate: number;
  num_installments: number;
  start_date: string;
  status: 'active' | 'completed' | 'defaulted' | 'cancelled';
  notes: string | null;
  created_at: string;
  loan_installments?: LoanInstallment[];
}

interface LocalContext {
  branch: Branch;
}

// ===== CONSTANTES =====
const TAX_TYPES = [
  { value: 'IIBB', label: 'Ingresos Brutos' },
  { value: 'IVA', label: 'IVA' },
  { value: 'GANANCIAS', label: 'Ganancias' },
  { value: 'MONOTRIBUTO', label: 'Monotributo' },
  { value: 'AUTONOMOS', label: 'Autónomos' },
  { value: 'MUNICIPAL', label: 'Tasa Municipal' },
  { value: 'OTROS', label: 'Otros' },
];

const TAX_STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: 'bg-yellow-500', icon: Clock },
  paid: { label: 'Pagado', color: 'bg-green-500', icon: CheckCircle },
  partial: { label: 'Parcial', color: 'bg-blue-500', icon: DollarSign },
  overdue: { label: 'Vencido', color: 'bg-red-500', icon: AlertTriangle },
  in_plan: { label: 'En Plan', color: 'bg-purple-500', icon: FileText },
};

const MERCADOPAGO_LOAN_INFO = {
  characteristics: [
    'Devolución en 28 días (Dinero Plus) o cuotas mensuales',
    'Tasa CFT variable según historial crediticio',
    'Descuento automático de ventas MP si hay mora',
  ],
  typicalRates: {
    dineroPlus: { min: 85, max: 150 },
    cuotas: { min: 70, max: 120 },
  }
};

export default function LocalObligaciones() {
  const { branch } = useOutletContext<LocalContext>();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('impuestos');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [taxes, setTaxes] = useState<TaxObligation[]>([]);
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  
  // Dialog states
  const [isTaxDialogOpen, setIsTaxDialogOpen] = useState(false);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [isLoanDialogOpen, setIsLoanDialogOpen] = useState(false);
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  
  // Expanded items
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set());
  const [expandedLoans, setExpandedLoans] = useState<Set<string>>(new Set());
  
  // Selected for payment
  const [selectedTax, setSelectedTax] = useState<TaxObligation | null>(null);
  const [selectedPlanInstallment, setSelectedPlanInstallment] = useState<{plan: PaymentPlan, installment: PaymentPlanInstallment} | null>(null);
  const [selectedLoanInstallment, setSelectedLoanInstallment] = useState<{loan: Loan, installment: LoanInstallment} | null>(null);
  
  const [payAmount, setPayAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Forms
  const [taxForm, setTaxForm] = useState({
    name: '', tax_type: 'IIBB', period: format(new Date(), 'yyyy-MM'),
    accrual_date: format(new Date(), 'yyyy-MM-dd'), due_date: '', amount: '', notes: ''
  });
  
  const [planForm, setPlanForm] = useState({
    tax_obligation_id: '', description: '', total_amount: '', down_payment: '',
    interest_rate: '0', num_installments: '12', start_date: format(new Date(), 'yyyy-MM-dd'), notes: ''
  });
  
  const [loanForm, setLoanForm] = useState({
    lender_name: '', description: '', principal_amount: '', interest_rate: '0',
    num_installments: '12', start_date: format(new Date(), 'yyyy-MM-dd'), notes: '',
    is_historical: false, already_paid_installments: '0'
  });

  // ===== FETCH DATA =====
  const fetchData = async () => {
    setLoading(true);
    
    const [taxRes, planRes, loanRes] = await Promise.all([
      supabase.from('tax_obligations').select('*').eq('branch_id', branch.id).order('due_date'),
      supabase.from('payment_plans').select('*, payment_plan_installments(*), tax_obligations(*)').eq('branch_id', branch.id).order('created_at', { ascending: false }),
      supabase.from('loans').select('*, loan_installments(*)').eq('branch_id', branch.id).order('created_at', { ascending: false }),
    ]);

    if (taxRes.data) {
      const today = startOfToday();
      const updated = taxRes.data.map(tax => {
        if (tax.status === 'pending' && isBefore(parseISO(tax.due_date), today)) {
          return { ...tax, status: 'overdue' as const };
        }
        return tax;
      }) as TaxObligation[];
      setTaxes(updated);
    }
    if (planRes.data) setPlans(planRes.data as PaymentPlan[]);
    if (loanRes.data) setLoans(loanRes.data as Loan[]);
    
    setLoading(false);
  };

  useEffect(() => {
    if (branch?.id) fetchData();
  }, [branch?.id]);

  // ===== FORMATTERS =====
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount);

  // ===== HANDLERS =====
  const handleSubmitTax = async () => {
    if (!taxForm.name.trim() || !taxForm.amount || !taxForm.due_date) {
      toast.error('Completá nombre, monto y vencimiento');
      return;
    }
    setIsSubmitting(true);
    try {
      await supabase.from('tax_obligations').insert({
        branch_id: branch.id, name: taxForm.name.trim(), tax_type: taxForm.tax_type,
        period: taxForm.period, accrual_date: taxForm.accrual_date, due_date: taxForm.due_date,
        amount: parseFloat(taxForm.amount), status: 'pending', notes: taxForm.notes || null, created_by: user?.id,
      });
      toast.success('Impuesto registrado');
      setIsTaxDialogOpen(false);
      setTaxForm({ name: '', tax_type: 'IIBB', period: format(new Date(), 'yyyy-MM'), accrual_date: format(new Date(), 'yyyy-MM-dd'), due_date: '', amount: '', notes: '' });
      fetchData();
    } catch (error) {
      toast.error('Error al registrar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayTax = async () => {
    if (!selectedTax || !payAmount) return;
    const amount = parseFloat(payAmount);
    const remaining = selectedTax.amount - selectedTax.amount_paid;
    if (amount > remaining) { toast.error('Monto excede saldo'); return; }
    
    setIsSubmitting(true);
    try {
      const newPaid = selectedTax.amount_paid + amount;
      const newStatus = newPaid >= selectedTax.amount ? 'paid' : 'partial';
      
      await supabase.from('tax_obligations').update({ amount_paid: newPaid, status: newStatus }).eq('id', selectedTax.id);
      await supabase.from('transactions').insert({
        branch_id: branch.id, type: 'expense', amount, concept: `Pago ${selectedTax.tax_type} - ${selectedTax.period}`,
        category_group: 'IMPUESTOS', doc_status: 'documented', accrual_date: selectedTax.accrual_date,
        payment_date: format(new Date(), 'yyyy-MM-dd'), transaction_date: format(new Date(), 'yyyy-MM-dd'),
        status: 'paid', payment_origin: 'bank_transfer', receipt_type: 'OFFICIAL', recorded_by: user?.id, created_by: user?.id,
      });
      
      toast.success('Pago registrado');
      setIsPayDialogOpen(false);
      setSelectedTax(null);
      setPayAmount('');
      fetchData();
    } catch (error) {
      toast.error('Error al pagar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitPlan = async () => {
    if (!planForm.description.trim() || !planForm.total_amount || !planForm.num_installments) {
      toast.error('Completá descripción, monto y cuotas');
      return;
    }
    setIsSubmitting(true);
    try {
      const totalAmount = parseFloat(planForm.total_amount);
      const downPayment = planForm.down_payment ? parseFloat(planForm.down_payment) : 0;
      const rate = parseFloat(planForm.interest_rate) / 100;
      const numCuotas = parseInt(planForm.num_installments);
      const startDate = parseISO(planForm.start_date);
      const remainingAmount = totalAmount - downPayment;
      const totalWithInterest = remainingAmount * (1 + rate);

      const { data: plan } = await supabase.from('payment_plans').insert({
        branch_id: branch.id, tax_obligation_id: planForm.tax_obligation_id || null,
        description: planForm.description.trim(), total_amount: totalAmount,
        down_payment: downPayment || null, interest_rate: parseFloat(planForm.interest_rate) || null,
        num_installments: numCuotas, start_date: planForm.start_date, status: 'active',
        notes: planForm.notes || null, created_by: user?.id,
      }).select().single();

      const capitalPerCuota = remainingAmount / numCuotas;
      const interestPerCuota = (totalWithInterest - remainingAmount) / numCuotas;
      const installments = Array.from({ length: numCuotas }, (_, i) => ({
        plan_id: plan!.id, installment_number: i + 1,
        due_date: format(addMonths(startDate, i + 1), 'yyyy-MM-dd'),
        amount_capital: capitalPerCuota, amount_interest: interestPerCuota > 0 ? interestPerCuota : null, status: 'pending',
      }));
      await supabase.from('payment_plan_installments').insert(installments);

      if (downPayment > 0) {
        await supabase.from('transactions').insert({
          branch_id: branch.id, type: 'expense', amount: downPayment, concept: `Anticipo Plan: ${planForm.description}`,
          category_group: 'IMPUESTOS', doc_status: 'documented', accrual_date: planForm.start_date,
          payment_date: planForm.start_date, transaction_date: planForm.start_date, status: 'paid',
          payment_origin: 'bank_transfer', receipt_type: 'OFFICIAL', recorded_by: user?.id, created_by: user?.id,
        });
      }

      toast.success('Plan de pago creado');
      setIsPlanDialogOpen(false);
      setPlanForm({ tax_obligation_id: '', description: '', total_amount: '', down_payment: '', interest_rate: '0', num_installments: '12', start_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
      fetchData();
    } catch (error) {
      toast.error('Error al crear plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitLoan = async () => {
    if (!loanForm.lender_name.trim() || !loanForm.principal_amount || !loanForm.num_installments) {
      toast.error('Completá prestamista, monto y cuotas');
      return;
    }
    setIsSubmitting(true);
    try {
      const principal = parseFloat(loanForm.principal_amount);
      const rate = parseFloat(loanForm.interest_rate) / 100;
      const numCuotas = parseInt(loanForm.num_installments);
      const startDate = parseISO(loanForm.start_date);
      const alreadyPaid = loanForm.is_historical ? parseInt(loanForm.already_paid_installments) : 0;

      const { data: loan } = await supabase.from('loans').insert({
        branch_id: branch.id, lender_name: loanForm.lender_name.trim(),
        description: loanForm.description || null, principal_amount: principal,
        interest_rate: parseFloat(loanForm.interest_rate), num_installments: numCuotas,
        start_date: loanForm.start_date, status: 'active', notes: loanForm.notes || null, created_by: user?.id,
      }).select().single();

      const capitalPerCuota = principal / numCuotas;
      const totalInterest = principal * rate;
      const interestPerCuota = totalInterest / numCuotas;
      const installments = Array.from({ length: numCuotas }, (_, i) => {
        const isPaid = i < alreadyPaid;
        return {
          loan_id: loan!.id, installment_number: i + 1,
          due_date: format(addMonths(startDate, i + 1), 'yyyy-MM-dd'),
          amount_capital: capitalPerCuota, amount_interest: interestPerCuota,
          amount_paid: isPaid ? (capitalPerCuota + interestPerCuota) : 0,
          status: isPaid ? 'paid' : 'pending', paid_at: isPaid ? new Date().toISOString() : null,
        };
      });
      await supabase.from('loan_installments').insert(installments);

      if (!loanForm.is_historical) {
        const isMPLoan = loanForm.lender_name.toLowerCase().includes('mercado');
        await supabase.from('transactions').insert({
          branch_id: branch.id, type: 'income', amount: principal, concept: `Préstamo: ${loanForm.lender_name}`,
          category_group: 'DEUDA', doc_status: isMPLoan ? 'documented' : 'internal',
          accrual_date: loanForm.start_date, payment_date: loanForm.start_date, transaction_date: loanForm.start_date,
          status: 'paid', payment_origin: isMPLoan ? 'mercadopago' : 'bank_transfer',
          receipt_type: 'INTERNAL', recorded_by: user?.id, created_by: user?.id,
        });
      }

      toast.success(loanForm.is_historical ? `Préstamo histórico registrado (${alreadyPaid} cuotas pagas)` : 'Préstamo registrado');
      setIsLoanDialogOpen(false);
      setLoanForm({ lender_name: '', description: '', principal_amount: '', interest_rate: '0', num_installments: '12', start_date: format(new Date(), 'yyyy-MM-dd'), notes: '', is_historical: false, already_paid_installments: '0' });
      fetchData();
    } catch (error) {
      toast.error('Error al registrar préstamo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayPlanInstallment = async () => {
    if (!selectedPlanInstallment || !payAmount) return;
    const { plan, installment } = selectedPlanInstallment;
    const amount = parseFloat(payAmount);
    const total = installment.amount_capital + (installment.amount_interest || 0);
    const remaining = total - (installment.amount_paid || 0);
    if (amount > remaining) { toast.error('Monto excede saldo'); return; }

    setIsSubmitting(true);
    try {
      const newPaid = (installment.amount_paid || 0) + amount;
      const newStatus = newPaid >= total ? 'paid' : 'partial';
      await supabase.from('payment_plan_installments').update({ amount_paid: newPaid, status: newStatus, paid_at: newStatus === 'paid' ? new Date().toISOString() : null }).eq('id', installment.id);

      const capitalProportion = installment.amount_capital / total;
      const capitalPaid = amount * capitalProportion;
      const interestPaid = amount - capitalPaid;

      if (capitalPaid > 0) {
        await supabase.from('transactions').insert({
          branch_id: branch.id, type: 'expense', amount: capitalPaid, concept: `Cuota ${installment.installment_number} Capital - ${plan.description}`,
          category_group: 'IMPUESTOS', doc_status: 'documented', accrual_date: installment.due_date, payment_date: format(new Date(), 'yyyy-MM-dd'),
          transaction_date: format(new Date(), 'yyyy-MM-dd'), status: 'paid', payment_origin: 'bank_transfer', receipt_type: 'OFFICIAL', recorded_by: user?.id, created_by: user?.id,
        });
      }
      if (interestPaid > 0) {
        await supabase.from('transactions').insert({
          branch_id: branch.id, type: 'expense', amount: interestPaid, concept: `Cuota ${installment.installment_number} Interés - ${plan.description}`,
          category_group: 'FINANCIEROS', doc_status: 'documented', accrual_date: installment.due_date, payment_date: format(new Date(), 'yyyy-MM-dd'),
          transaction_date: format(new Date(), 'yyyy-MM-dd'), status: 'paid', payment_origin: 'bank_transfer', receipt_type: 'OFFICIAL', recorded_by: user?.id, created_by: user?.id,
        });
      }

      const { data: allInstallments } = await supabase.from('payment_plan_installments').select('status').eq('plan_id', plan.id);
      if (allInstallments?.every(i => i.status === 'paid')) {
        await supabase.from('payment_plans').update({ status: 'completed' }).eq('id', plan.id);
      }

      toast.success('Cuota pagada');
      setIsPayDialogOpen(false);
      setSelectedPlanInstallment(null);
      setPayAmount('');
      fetchData();
    } catch (error) {
      toast.error('Error al pagar cuota');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayLoanInstallment = async () => {
    if (!selectedLoanInstallment || !payAmount) return;
    const { loan, installment } = selectedLoanInstallment;
    const amount = parseFloat(payAmount);
    const total = installment.amount_capital + installment.amount_interest;
    const remaining = total - installment.amount_paid;
    if (amount > remaining) { toast.error('Monto excede saldo'); return; }

    setIsSubmitting(true);
    try {
      const newPaid = installment.amount_paid + amount;
      const newStatus = newPaid >= total ? 'paid' : 'partial';
      await supabase.from('loan_installments').update({ amount_paid: newPaid, status: newStatus, paid_at: newStatus === 'paid' ? new Date().toISOString() : null }).eq('id', installment.id);

      const isMPLoan = loan.lender_name.toLowerCase().includes('mercado');
      const capitalProportion = installment.amount_capital / total;
      const capitalPaid = amount * capitalProportion;
      const interestPaid = amount - capitalPaid;

      if (capitalPaid > 0) {
        await supabase.from('transactions').insert({
          branch_id: branch.id, type: 'expense', amount: capitalPaid, concept: `Cuota ${installment.installment_number} Capital - ${loan.lender_name}`,
          category_group: 'DEUDA', doc_status: isMPLoan ? 'documented' : 'internal', accrual_date: installment.due_date, payment_date: format(new Date(), 'yyyy-MM-dd'),
          transaction_date: format(new Date(), 'yyyy-MM-dd'), status: 'paid', payment_origin: isMPLoan ? 'mercadopago' : 'bank_transfer',
          receipt_type: 'INTERNAL', recorded_by: user?.id, created_by: user?.id,
        });
      }
      if (interestPaid > 0) {
        await supabase.from('transactions').insert({
          branch_id: branch.id, type: 'expense', amount: interestPaid, concept: `Cuota ${installment.installment_number} Interés - ${loan.lender_name}`,
          category_group: 'FINANCIEROS', doc_status: isMPLoan ? 'documented' : 'internal', accrual_date: installment.due_date, payment_date: format(new Date(), 'yyyy-MM-dd'),
          transaction_date: format(new Date(), 'yyyy-MM-dd'), status: 'paid', payment_origin: isMPLoan ? 'mercadopago' : 'bank_transfer',
          receipt_type: 'INTERNAL', recorded_by: user?.id, created_by: user?.id,
        });
      }

      const { data: allInstallments } = await supabase.from('loan_installments').select('status').eq('loan_id', loan.id);
      if (allInstallments?.every(i => i.status === 'paid')) {
        await supabase.from('loans').update({ status: 'completed' }).eq('id', loan.id);
      }

      toast.success('Cuota pagada');
      setIsPayDialogOpen(false);
      setSelectedLoanInstallment(null);
      setPayAmount('');
      fetchData();
    } catch (error) {
      toast.error('Error al pagar cuota');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===== CALCULATED TOTALS =====
  const taxTotals = {
    pending: taxes.filter(t => t.status !== 'paid').reduce((s, t) => s + (t.amount - t.amount_paid), 0),
    overdue: taxes.filter(t => t.status === 'overdue').reduce((s, t) => s + (t.amount - t.amount_paid), 0),
  };

  const getPlanRemaining = (plan: PaymentPlan) => {
    const inst = plan.payment_plan_installments || [];
    return inst.reduce((sum, i) => sum + (i.amount_capital + (i.amount_interest || 0) - (i.amount_paid || 0)), 0);
  };

  const getLoanRemaining = (loan: Loan) => {
    const inst = loan.loan_installments || [];
    return inst.reduce((sum, i) => sum + (i.amount_capital + i.amount_interest - i.amount_paid), 0);
  };

  const planTotals = {
    totalDebt: plans.filter(p => p.status === 'active').reduce((s, p) => s + getPlanRemaining(p), 0),
    count: plans.filter(p => p.status === 'active').length,
  };

  const loanTotals = {
    totalDebt: loans.filter(l => l.status === 'active').reduce((s, l) => s + getLoanRemaining(l), 0),
    count: loans.filter(l => l.status === 'active').length,
  };

  const globalTotal = taxTotals.pending + planTotals.totalDebt + loanTotals.totalDebt;

  const isMPLoan = loanForm.lender_name.toLowerCase().includes('mercado') || loanForm.lender_name.toLowerCase() === 'mp';

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Obligaciones</h1>
        <p className="text-muted-foreground">Impuestos, planes de pago y préstamos</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deuda Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(globalTotal)}</div>
            <p className="text-xs text-muted-foreground">Todas las obligaciones</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impuestos</CardTitle>
            <Receipt className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(taxTotals.pending)}</div>
            <p className="text-xs text-muted-foreground">{taxTotals.overdue > 0 && <span className="text-destructive">{formatCurrency(taxTotals.overdue)} vencido</span>}</p>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planes de Pago</CardTitle>
            <FileText className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(planTotals.totalDebt)}</div>
            <p className="text-xs text-muted-foreground">{planTotals.count} activo{planTotals.count !== 1 && 's'}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Préstamos</CardTitle>
            <Landmark className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(loanTotals.totalDebt)}</div>
            <p className="text-xs text-muted-foreground">{loanTotals.count} activo{loanTotals.count !== 1 && 's'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="impuestos" className="flex items-center gap-2">
            <Receipt className="w-4 h-4" /> Impuestos
          </TabsTrigger>
          <TabsTrigger value="planes" className="flex items-center gap-2">
            <FileText className="w-4 h-4" /> Planes de Pago
          </TabsTrigger>
          <TabsTrigger value="prestamos" className="flex items-center gap-2">
            <Landmark className="w-4 h-4" /> Préstamos
          </TabsTrigger>
        </TabsList>

        {/* ===== TAB: IMPUESTOS ===== */}
        <TabsContent value="impuestos" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isTaxDialogOpen} onOpenChange={setIsTaxDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" /> Nuevo Impuesto</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar Obligación Fiscal</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select value={taxForm.tax_type} onValueChange={v => setTaxForm(f => ({ ...f, tax_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{TAX_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Período</Label>
                      <Input type="month" value={taxForm.period} onChange={e => setTaxForm(f => ({ ...f, period: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre / Concepto</Label>
                    <Input placeholder="Ej: IIBB Enero 2026" value={taxForm.name} onChange={e => setTaxForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Fecha Devengado</Label>
                      <Input type="date" value={taxForm.accrual_date} onChange={e => setTaxForm(f => ({ ...f, accrual_date: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Fecha Vencimiento</Label>
                      <Input type="date" value={taxForm.due_date} onChange={e => setTaxForm(f => ({ ...f, due_date: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Monto</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type="number" placeholder="0" className="pl-10" value={taxForm.amount} onChange={e => setTaxForm(f => ({ ...f, amount: e.target.value }))} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsTaxDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSubmitTax} disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Impuesto</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxes.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No hay impuestos cargados</TableCell></TableRow>
                  ) : taxes.map(tax => {
                    const StatusIcon = TAX_STATUS_CONFIG[tax.status].icon;
                    const remaining = tax.amount - tax.amount_paid;
                    return (
                      <TableRow key={tax.id}>
                        <TableCell className="font-medium">{tax.name}</TableCell>
                        <TableCell>{tax.period}</TableCell>
                        <TableCell>{format(parseISO(tax.due_date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="text-right">{formatCurrency(tax.amount)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(remaining)}</TableCell>
                        <TableCell>
                          <Badge className={`${TAX_STATUS_CONFIG[tax.status].color} text-white`}>
                            <StatusIcon className="w-3 h-3 mr-1" />{TAX_STATUS_CONFIG[tax.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {tax.status !== 'paid' && (
                            <Button size="sm" variant="outline" onClick={() => { setSelectedTax(tax); setPayAmount((tax.amount - tax.amount_paid).toString()); setIsPayDialogOpen(true); }}>
                              Pagar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== TAB: PLANES DE PAGO ===== */}
        <TabsContent value="planes" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" /> Nuevo Plan</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Crear Plan de Pago</DialogTitle>
                  <DialogDescription>Se generarán las cuotas automáticamente</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Descripción</Label>
                    <Input placeholder="Ej: Moratoria IIBB 2024" value={planForm.description} onChange={e => setPlanForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Monto Total Deuda</Label>
                      <Input type="number" placeholder="0" value={planForm.total_amount} onChange={e => setPlanForm(f => ({ ...f, total_amount: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Anticipo (opcional)</Label>
                      <Input type="number" placeholder="0" value={planForm.down_payment} onChange={e => setPlanForm(f => ({ ...f, down_payment: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Tasa Interés %</Label>
                      <Input type="number" value={planForm.interest_rate} onChange={e => setPlanForm(f => ({ ...f, interest_rate: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Cuotas</Label>
                      <Input type="number" value={planForm.num_installments} onChange={e => setPlanForm(f => ({ ...f, num_installments: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Inicio</Label>
                      <Input type="date" value={planForm.start_date} onChange={e => setPlanForm(f => ({ ...f, start_date: e.target.value }))} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsPlanDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSubmitPlan} disabled={isSubmitting}>{isSubmitting ? 'Creando...' : 'Crear Plan'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {plans.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No hay planes de pago</CardContent></Card>
            ) : plans.map(plan => {
              const isExpanded = expandedPlans.has(plan.id);
              const remaining = getPlanRemaining(plan);
              const progress = ((plan.payment_plan_installments || []).filter(i => i.status === 'paid').length / plan.num_installments) * 100;
              return (
                <Collapsible key={plan.id} open={isExpanded} onOpenChange={() => setExpandedPlans(prev => { const n = new Set(prev); n.has(plan.id) ? n.delete(plan.id) : n.add(plan.id); return n; })}>
                  <Card>
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <div className="text-left">
                            <CardTitle className="text-base">{plan.description}</CardTitle>
                            <p className="text-sm text-muted-foreground">{plan.num_installments} cuotas · {format(parseISO(plan.start_date), 'MMM yyyy', { locale: es })}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-lg font-bold">{formatCurrency(remaining)}</p>
                            <p className="text-xs text-muted-foreground">restante</p>
                          </div>
                          <Badge variant={plan.status === 'completed' ? 'default' : 'secondary'}>{plan.status === 'completed' ? 'Completado' : 'Activo'}</Badge>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent>
                        <Progress value={progress} className="mb-4" />
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Cuota</TableHead>
                              <TableHead>Vencimiento</TableHead>
                              <TableHead className="text-right">Capital</TableHead>
                              <TableHead className="text-right">Interés</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                              <TableHead>Estado</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(plan.payment_plan_installments || []).sort((a, b) => a.installment_number - b.installment_number).map(inst => {
                              const total = inst.amount_capital + (inst.amount_interest || 0);
                              const isPaid = inst.status === 'paid';
                              return (
                                <TableRow key={inst.id} className={isPaid ? 'opacity-50' : ''}>
                                  <TableCell>#{inst.installment_number}</TableCell>
                                  <TableCell>{format(parseISO(inst.due_date), 'dd/MM/yyyy')}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(inst.amount_capital)}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(inst.amount_interest || 0)}</TableCell>
                                  <TableCell className="text-right font-medium">{formatCurrency(total)}</TableCell>
                                  <TableCell>
                                    <Badge variant={isPaid ? 'default' : 'outline'}>{isPaid ? 'Pagada' : 'Pendiente'}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    {!isPaid && (
                                      <Button size="sm" variant="outline" onClick={() => { setSelectedPlanInstallment({ plan, installment: inst }); setPayAmount((total - (inst.amount_paid || 0)).toString()); setIsPayDialogOpen(true); }}>
                                        Pagar
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        </TabsContent>

        {/* ===== TAB: PRÉSTAMOS ===== */}
        <TabsContent value="prestamos" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isLoanDialogOpen} onOpenChange={setIsLoanDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" /> Nuevo Préstamo</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Registrar Préstamo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-muted-foreground" />
                      <Label htmlFor="historical" className="text-sm font-normal">Es préstamo viejo (ya tenía cuotas pagas)</Label>
                    </div>
                    <Switch id="historical" checked={loanForm.is_historical} onCheckedChange={v => setLoanForm(f => ({ ...f, is_historical: v }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Prestamista</Label>
                    <Input placeholder="Ej: MercadoPago, Banco Galicia" value={loanForm.lender_name} onChange={e => setLoanForm(f => ({ ...f, lender_name: e.target.value }))} />
                  </div>
                  {isMPLoan && (
                    <Alert className="border-blue-200 bg-blue-50">
                      <Smartphone className="h-4 w-4 text-blue-600" />
                      <AlertTitle className="text-blue-800">Préstamo MercadoPago Detectado</AlertTitle>
                      <AlertDescription className="text-blue-700">
                        <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                          {MERCADOPAGO_LOAN_INFO.characteristics.map((c, i) => <li key={i}>{c}</li>)}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label>Descripción (opcional)</Label>
                    <Input placeholder="Ej: Préstamo para equipamiento" value={loanForm.description} onChange={e => setLoanForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Monto Principal</Label>
                      <Input type="number" placeholder="0" value={loanForm.principal_amount} onChange={e => setLoanForm(f => ({ ...f, principal_amount: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Tasa Interés %</Label>
                      <Input type="number" value={loanForm.interest_rate} onChange={e => setLoanForm(f => ({ ...f, interest_rate: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cuotas</Label>
                      <Input type="number" value={loanForm.num_installments} onChange={e => setLoanForm(f => ({ ...f, num_installments: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Fecha Inicio</Label>
                      <Input type="date" value={loanForm.start_date} onChange={e => setLoanForm(f => ({ ...f, start_date: e.target.value }))} />
                    </div>
                  </div>
                  {loanForm.is_historical && (
                    <div className="space-y-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <Label>Cuotas ya pagadas</Label>
                      <Input type="number" min="0" max={loanForm.num_installments} value={loanForm.already_paid_installments} onChange={e => setLoanForm(f => ({ ...f, already_paid_installments: e.target.value }))} />
                      <p className="text-xs text-amber-600">Estas cuotas se marcarán como pagadas sin crear transacciones</p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsLoanDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSubmitLoan} disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {loans.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No hay préstamos</CardContent></Card>
            ) : loans.map(loan => {
              const isExpanded = expandedLoans.has(loan.id);
              const remaining = getLoanRemaining(loan);
              const progress = ((loan.loan_installments || []).filter(i => i.status === 'paid').length / loan.num_installments) * 100;
              const isMP = loan.lender_name.toLowerCase().includes('mercado');
              return (
                <Collapsible key={loan.id} open={isExpanded} onOpenChange={() => setExpandedLoans(prev => { const n = new Set(prev); n.has(loan.id) ? n.delete(loan.id) : n.add(loan.id); return n; })}>
                  <Card className={isMP ? 'border-blue-200' : ''}>
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base">{loan.lender_name}</CardTitle>
                              {isMP && <Badge variant="outline" className="text-xs border-blue-300 text-blue-600"><Smartphone className="w-3 h-3 mr-1" />MP</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground">{loan.num_installments} cuotas · {loan.interest_rate}% interés</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-lg font-bold">{formatCurrency(remaining)}</p>
                            <p className="text-xs text-muted-foreground">restante de {formatCurrency(loan.principal_amount)}</p>
                          </div>
                          <Badge variant={loan.status === 'completed' ? 'default' : 'secondary'}>{loan.status === 'completed' ? 'Completado' : 'Activo'}</Badge>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent>
                        <Progress value={progress} className="mb-4" />
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Cuota</TableHead>
                              <TableHead>Vencimiento</TableHead>
                              <TableHead className="text-right">Capital</TableHead>
                              <TableHead className="text-right">Interés</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                              <TableHead>Estado</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(loan.loan_installments || []).sort((a, b) => a.installment_number - b.installment_number).map(inst => {
                              const total = inst.amount_capital + inst.amount_interest;
                              const isPaid = inst.status === 'paid';
                              return (
                                <TableRow key={inst.id} className={isPaid ? 'opacity-50' : ''}>
                                  <TableCell>#{inst.installment_number}</TableCell>
                                  <TableCell>{format(parseISO(inst.due_date), 'dd/MM/yyyy')}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(inst.amount_capital)}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(inst.amount_interest)}</TableCell>
                                  <TableCell className="text-right font-medium">{formatCurrency(total)}</TableCell>
                                  <TableCell>
                                    <Badge variant={isPaid ? 'default' : 'outline'}>{isPaid ? 'Pagada' : 'Pendiente'}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    {!isPaid && (
                                      <Button size="sm" variant="outline" onClick={() => { setSelectedLoanInstallment({ loan, installment: inst }); setPayAmount((total - inst.amount_paid).toString()); setIsPayDialogOpen(true); }}>
                                        Pagar
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* ===== PAY DIALOG ===== */}
      <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              {selectedTax && `${selectedTax.name} - Saldo: ${formatCurrency(selectedTax.amount - selectedTax.amount_paid)}`}
              {selectedPlanInstallment && `Cuota ${selectedPlanInstallment.installment.installment_number} - ${selectedPlanInstallment.plan.description}`}
              {selectedLoanInstallment && `Cuota ${selectedLoanInstallment.installment.installment_number} - ${selectedLoanInstallment.loan.lender_name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Monto a pagar</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="number" className="pl-10" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsPayDialogOpen(false); setSelectedTax(null); setSelectedPlanInstallment(null); setSelectedLoanInstallment(null); setPayAmount(''); }}>
              Cancelar
            </Button>
            <Button onClick={() => {
              if (selectedTax) handlePayTax();
              else if (selectedPlanInstallment) handlePayPlanInstallment();
              else if (selectedLoanInstallment) handlePayLoanInstallment();
            }} disabled={isSubmitting}>
              {isSubmitting ? 'Pagando...' : 'Confirmar Pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
