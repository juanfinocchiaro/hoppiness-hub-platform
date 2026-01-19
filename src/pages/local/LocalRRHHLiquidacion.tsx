import { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { 
  Users, 
  Wallet,
  Plus,
  DollarSign,
  RefreshCw,
  Lock,
  Unlock,
  Printer,
  FileText,
  Calculator,
  AlertCircle,
  CheckCircle2,
  Coins,
  Gift,
  ShoppingCart,
  CreditCard,
  Eye,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, differenceInMinutes, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface Employee {
  id: string;
  full_name: string;
  position: string | null;
  is_active: boolean;
}

interface PayrollPeriod {
  id: string;
  branch_id: string;
  month: string;
  status: 'open' | 'closed';
  tip_pool_amount: number;
  tip_distribution_method: 'equal' | 'hours_weighted';
  closed_at: string | null;
  closed_by: string | null;
}

interface PayrollEntry {
  id: string;
  period_id: string;
  employee_id: string;
  amount_white: number;
  amount_black: number;
  include_in_tips: boolean;
  notes: string | null;
}

interface PayrollAdjustment {
  id: string;
  period_id: string;
  employee_id: string;
  type: 'advance' | 'consumption' | 'extra' | 'tip';
  amount: number;
  description: string | null;
  source: 'manual' | 'import' | 'derived';
  created_at: string;
}

interface PayrollPayment {
  id: string;
  period_id: string;
  employee_id: string;
  amount: number;
  method: string;
  payment_date: string;
  notes: string | null;
}

interface EmployeeHours {
  employee_id: string;
  totalMinutes: number;
}

interface LocalContext {
  branch: Branch;
}

type AdjustmentType = 'advance' | 'consumption' | 'extra';

export default function LocalRRHHLiquidacion() {
  const { branch } = useOutletContext<LocalContext>();
  const { user } = useAuth();
  const { isAdmin, roles } = useUserRole();
  
  const isFranquiciado = roles.includes('franquiciado');
  const canViewSensitive = isAdmin || isFranquiciado;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [period, setPeriod] = useState<PayrollPeriod | null>(null);
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [adjustments, setAdjustments] = useState<PayrollAdjustment[]>([]);
  const [payments, setPayments] = useState<PayrollPayment[]>([]);
  const [employeeHours, setEmployeeHours] = useState<EmployeeHours[]>([]);
  
  // Selected month
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  
  // Dialogs
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [showTipDistributionDialog, setShowTipDistributionDialog] = useState(false);
  const [showClosePeriodDialog, setShowClosePeriodDialog] = useState(false);
  
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [adjustmentForm, setAdjustmentForm] = useState({
    type: 'advance' as AdjustmentType,
    amount: '',
    description: '',
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'cash',
    notes: '',
  });
  const [tipForm, setTipForm] = useState({
    totalAmount: '',
    method: 'equal' as 'equal' | 'hours_weighted',
  });

  // Generate month options (last 12 months + next month)
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = -12; i <= 1; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      options.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy', { locale: es }),
      });
    }
    return options.reverse();
  }, []);

  // Fetch data
  useEffect(() => {
    if (!branch?.id) return;
    fetchData();
  }, [branch?.id, selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch employees
      const { data: employeesData } = await supabase
        .from('employees')
        .select('id, full_name, position, is_active')
        .eq('branch_id', branch.id)
        .eq('is_active', true)
        .order('full_name');

      setEmployees(employeesData || []);

      // Fetch or create period
      let { data: periodData } = await supabase
        .from('payroll_periods')
        .select('*')
        .eq('branch_id', branch.id)
        .eq('month', selectedMonth)
        .single();

      if (!periodData) {
        // Create period
        const { data: newPeriod, error: createError } = await supabase
          .from('payroll_periods')
          .insert({
            branch_id: branch.id,
            month: selectedMonth,
            status: 'open',
            created_by: user?.id,
          })
          .select()
          .single();

        if (createError) throw createError;
        periodData = newPeriod;

        // Create entries for all employees
        if (employeesData?.length) {
          const entriesToCreate = employeesData.map(emp => ({
            period_id: newPeriod.id,
            employee_id: emp.id,
            amount_white: 0,
            amount_black: 0,
            include_in_tips: true,
          }));

          await supabase.from('payroll_entries').insert(entriesToCreate);
        }
      }

      setPeriod(periodData as PayrollPeriod);

      // Fetch entries, adjustments, payments in parallel
      const [entriesRes, adjustmentsRes, paymentsRes] = await Promise.all([
        supabase
          .from('payroll_entries')
          .select('*')
          .eq('period_id', periodData.id),
        supabase
          .from('payroll_adjustments')
          .select('*')
          .eq('period_id', periodData.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('payroll_payments')
          .select('*')
          .eq('period_id', periodData.id)
          .order('created_at', { ascending: false }),
      ]);

      setEntries(entriesRes.data as PayrollEntry[] || []);
      setAdjustments(adjustmentsRes.data as PayrollAdjustment[] || []);
      setPayments(paymentsRes.data as PayrollPayment[] || []);

      // Fetch employee hours for this month (for tip weighting)
      await fetchEmployeeHours(employeesData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeHours = async (emps: Employee[]) => {
    if (!emps.length) return;
    
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));

    const { data: logs } = await supabase
      .from('attendance_logs')
      .select('employee_id, log_type, timestamp')
      .in('employee_id', emps.map(e => e.id))
      .gte('timestamp', monthStart.toISOString())
      .lte('timestamp', monthEnd.toISOString())
      .order('timestamp');

    if (!logs) {
      setEmployeeHours([]);
      return;
    }

    // Calculate hours per employee
    const hoursMap: Record<string, number> = {};
    let lastIn: Record<string, Date> = {};

    for (const log of logs) {
      const logTime = parseISO(log.timestamp);
      if (log.log_type === 'IN') {
        lastIn[log.employee_id] = logTime;
      } else if (log.log_type === 'OUT' && lastIn[log.employee_id]) {
        const minutes = differenceInMinutes(logTime, lastIn[log.employee_id]);
        if (minutes > 0 && minutes < 24 * 60) {
          hoursMap[log.employee_id] = (hoursMap[log.employee_id] || 0) + minutes;
        }
        delete lastIn[log.employee_id];
      }
    }

    setEmployeeHours(
      Object.entries(hoursMap).map(([employee_id, totalMinutes]) => ({
        employee_id,
        totalMinutes,
      }))
    );
  };

  // Calculate totals per employee
  const employeeTotals = useMemo(() => {
    return employees.map(emp => {
      const entry = entries.find(e => e.employee_id === emp.id);
      const empAdjustments = adjustments.filter(a => a.employee_id === emp.id);
      const empPayments = payments.filter(p => p.employee_id === emp.id);
      const hours = employeeHours.find(h => h.employee_id === emp.id);

      const advances = empAdjustments.filter(a => a.type === 'advance').reduce((s, a) => s + Number(a.amount), 0);
      const consumptions = empAdjustments.filter(a => a.type === 'consumption').reduce((s, a) => s + Number(a.amount), 0);
      const extras = empAdjustments.filter(a => a.type === 'extra').reduce((s, a) => s + Number(a.amount), 0);
      const tips = empAdjustments.filter(a => a.type === 'tip').reduce((s, a) => s + Number(a.amount), 0);
      const paid = empPayments.reduce((s, p) => s + Number(p.amount), 0);

      const white = Number(entry?.amount_white || 0);
      const black = Number(entry?.amount_black || 0);
      const total = white + black + extras + tips - advances - consumptions;
      const balance = total - paid;

      return {
        employee: emp,
        entry,
        white,
        black,
        advances,
        consumptions,
        extras,
        tips,
        total,
        paid,
        balance,
        includeInTips: entry?.include_in_tips ?? true,
        hoursMinutes: hours?.totalMinutes || 0,
        adjustments: empAdjustments,
        payments: empPayments,
      };
    });
  }, [employees, entries, adjustments, payments, employeeHours]);

  // Grand totals
  const grandTotals = useMemo(() => {
    return employeeTotals.reduce(
      (acc, et) => ({
        white: acc.white + et.white,
        black: acc.black + et.black,
        advances: acc.advances + et.advances,
        consumptions: acc.consumptions + et.consumptions,
        extras: acc.extras + et.extras,
        tips: acc.tips + et.tips,
        total: acc.total + et.total,
        paid: acc.paid + et.paid,
        balance: acc.balance + et.balance,
      }),
      { white: 0, black: 0, advances: 0, consumptions: 0, extras: 0, tips: 0, total: 0, paid: 0, balance: 0 }
    );
  }, [employeeTotals]);

  const includedInTipsCount = employeeTotals.filter(et => et.includeInTips).length;
  const totalHoursForTips = employeeTotals
    .filter(et => et.includeInTips)
    .reduce((s, et) => s + et.hoursMinutes, 0);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount);

  const formatHours = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  };

  // Update entry (Blanco/Negro)
  const handleUpdateEntry = async (employeeId: string, field: 'amount_white' | 'amount_black' | 'include_in_tips', value: number | boolean) => {
    if (!period) return;
    
    const entry = entries.find(e => e.employee_id === employeeId);
    if (!entry) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('payroll_entries')
        .update({ [field]: value, updated_by: user?.id, updated_at: new Date().toISOString() })
        .eq('id', entry.id);

      if (error) throw error;

      setEntries(prev => prev.map(e => 
        e.id === entry.id ? { ...e, [field]: value } : e
      ));
    } catch (error) {
      console.error('Error updating entry:', error);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // Add adjustment
  const handleAddAdjustment = async () => {
    if (!period || !selectedEmployeeId || !adjustmentForm.amount) {
      toast.error('Completá todos los campos');
      return;
    }

    setSaving(true);
    try {
      // Create transaction in ledger
      const typeLabels = { advance: 'Adelanto', consumption: 'Consumo', extra: 'Extra' };
      const emp = employees.find(e => e.id === selectedEmployeeId);
      
      const { data: txn, error: txnError } = await supabase
        .from('transactions')
        .insert({
          branch_id: branch.id,
          type: 'expense',
          amount: parseFloat(adjustmentForm.amount),
          concept: `RRHH - ${typeLabels[adjustmentForm.type]} - ${emp?.full_name}`,
          notes: adjustmentForm.description || null,
          payment_origin: 'cash',
          receipt_type: 'INTERNAL',
          recorded_by: user?.id,
        })
        .select()
        .single();

      if (txnError) throw txnError;

      // Create adjustment
      const { data: adj, error: adjError } = await supabase
        .from('payroll_adjustments')
        .insert({
          period_id: period.id,
          employee_id: selectedEmployeeId,
          type: adjustmentForm.type,
          amount: parseFloat(adjustmentForm.amount),
          description: adjustmentForm.description || null,
          source: 'manual',
          created_by: user?.id,
          ledger_transaction_id: txn.id,
        })
        .select()
        .single();

      if (adjError) throw adjError;

      setAdjustments(prev => [adj as PayrollAdjustment, ...prev]);
      toast.success(`${typeLabels[adjustmentForm.type]} registrado`);
      setShowAdjustmentDialog(false);
      setAdjustmentForm({ type: 'advance', amount: '', description: '' });
    } catch (error) {
      console.error('Error adding adjustment:', error);
      toast.error('Error al registrar');
    } finally {
      setSaving(false);
    }
  };

  // Add payment
  const handleAddPayment = async () => {
    if (!period || !selectedEmployeeId || !paymentForm.amount) {
      toast.error('Completá todos los campos');
      return;
    }

    setSaving(true);
    try {
      const emp = employees.find(e => e.id === selectedEmployeeId);
      
      // Create transaction in ledger
      const { data: txn, error: txnError } = await supabase
        .from('transactions')
        .insert({
          branch_id: branch.id,
          type: 'expense',
          amount: parseFloat(paymentForm.amount),
          concept: `RRHH - Pago Sueldo - ${emp?.full_name}`,
          notes: paymentForm.notes || null,
          payment_origin: paymentForm.method as 'cash' | 'mercadopago' | 'bank_transfer',
          receipt_type: 'INTERNAL',
          recorded_by: user?.id,
        })
        .select()
        .single();

      if (txnError) throw txnError;

      // Create payment
      const { data: pmt, error: pmtError } = await supabase
        .from('payroll_payments')
        .insert({
          period_id: period.id,
          employee_id: selectedEmployeeId,
          amount: parseFloat(paymentForm.amount),
          method: paymentForm.method,
          notes: paymentForm.notes || null,
          created_by: user?.id,
          ledger_transaction_id: txn.id,
        })
        .select()
        .single();

      if (pmtError) throw pmtError;

      setPayments(prev => [pmt as PayrollPayment, ...prev]);
      toast.success('Pago registrado');
      setShowPaymentDialog(false);
      setPaymentForm({ amount: '', method: 'cash', notes: '' });
    } catch (error) {
      console.error('Error adding payment:', error);
      toast.error('Error al registrar');
    } finally {
      setSaving(false);
    }
  };

  // Distribute tips
  const handleDistributeTips = async () => {
    if (!period || !tipForm.totalAmount) {
      toast.error('Ingresá el monto total de propinas');
      return;
    }

    const totalTips = parseFloat(tipForm.totalAmount);
    if (includedInTipsCount === 0) {
      toast.error('No hay empleados incluidos en propinas');
      return;
    }

    if (tipForm.method === 'hours_weighted' && totalHoursForTips === 0) {
      toast.error('No hay horas registradas para ponderar');
      return;
    }

    setSaving(true);
    try {
      // Delete existing derived tips
      await supabase
        .from('payroll_adjustments')
        .delete()
        .eq('period_id', period.id)
        .eq('type', 'tip')
        .eq('source', 'derived');

      // Calculate distribution
      const includedEmployees = employeeTotals.filter(et => et.includeInTips);
      const newTips: { employee_id: string; amount: number }[] = [];

      if (tipForm.method === 'equal') {
        const perEmployee = totalTips / includedInTipsCount;
        includedEmployees.forEach(et => {
          newTips.push({ employee_id: et.employee.id, amount: Math.round(perEmployee) });
        });
      } else {
        // Hours weighted
        includedEmployees.forEach(et => {
          const share = et.hoursMinutes / totalHoursForTips;
          newTips.push({ employee_id: et.employee.id, amount: Math.round(totalTips * share) });
        });
      }

      // Insert new tips
      const tipsToInsert = newTips.map(t => ({
        period_id: period.id,
        employee_id: t.employee_id,
        type: 'tip' as const,
        amount: t.amount,
        description: `Propinas ${tipForm.method === 'equal' ? 'igualitario' : 'por horas'}`,
        source: 'derived' as const,
        created_by: user?.id,
      }));

      const { data: insertedTips, error } = await supabase
        .from('payroll_adjustments')
        .insert(tipsToInsert)
        .select();

      if (error) throw error;

      // Update period with tip info
      await supabase
        .from('payroll_periods')
        .update({
          tip_pool_amount: totalTips,
          tip_distribution_method: tipForm.method,
        })
        .eq('id', period.id);

      // Refresh adjustments
      setAdjustments(prev => {
        const withoutDerivedTips = prev.filter(a => !(a.type === 'tip' && a.source === 'derived'));
        return [...(insertedTips as PayrollAdjustment[]), ...withoutDerivedTips];
      });

      toast.success(`Propinas repartidas entre ${includedInTipsCount} empleados`);
      setShowTipDistributionDialog(false);
      setTipForm({ totalAmount: '', method: 'equal' });
    } catch (error) {
      console.error('Error distributing tips:', error);
      toast.error('Error al repartir propinas');
    } finally {
      setSaving(false);
    }
  };

  // Close period
  const handleClosePeriod = async () => {
    if (!period) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('payroll_periods')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          closed_by: user?.id,
        })
        .eq('id', period.id);

      if (error) throw error;

      setPeriod(prev => prev ? { ...prev, status: 'closed' } : null);
      toast.success('Período cerrado');
      setShowClosePeriodDialog(false);
    } catch (error) {
      console.error('Error closing period:', error);
      toast.error('Error al cerrar período');
    } finally {
      setSaving(false);
    }
  };

  // Reopen period (admin only)
  const handleReopenPeriod = async () => {
    if (!period || !canViewSensitive) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('payroll_periods')
        .update({ status: 'open', closed_at: null, closed_by: null })
        .eq('id', period.id);

      if (error) throw error;

      setPeriod(prev => prev ? { ...prev, status: 'open' } : null);
      toast.success('Período reabierto');
    } catch (error) {
      console.error('Error reopening period:', error);
      toast.error('Error al reabrir');
    } finally {
      setSaving(false);
    }
  };

  const openAdjustmentDialog = (employeeId: string, type: AdjustmentType) => {
    setSelectedEmployeeId(employeeId);
    setAdjustmentForm({ type, amount: '', description: '' });
    setShowAdjustmentDialog(true);
  };

  const openPaymentDialog = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setPaymentForm({ amount: '', method: 'cash', notes: '' });
    setShowPaymentDialog(true);
  };

  const openSummaryDialog = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setShowSummaryDialog(true);
  };

  const selectedEmployeeData = selectedEmployeeId 
    ? employeeTotals.find(et => et.employee.id === selectedEmployeeId) 
    : null;

  const isPeriodClosed = period?.status === 'closed';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Liquidación de Sueldos</h1>
          <p className="text-muted-foreground">Gestión integral de pagos al personal</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {isPeriodClosed ? (
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" />
              Cerrado
            </Badge>
          ) : (
            <Badge variant="default" className="gap-1 bg-green-600">
              <Unlock className="h-3 w-3" />
              Abierto
            </Badge>
          )}
          
          {saving && (
            <Badge variant="outline" className="gap-1">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Guardando...
            </Badge>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sueldos</p>
                <p className="text-2xl font-bold">{formatCurrency(grandTotals.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pagado</p>
                <p className="text-2xl font-bold">{formatCurrency(grandTotals.paid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo Pendiente</p>
                <p className="text-2xl font-bold">{formatCurrency(grandTotals.balance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Empleados</p>
                <p className="text-2xl font-bold">{employees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tips Distribution */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Coins className="h-4 w-4" />
                Propinas del Período
              </CardTitle>
              <CardDescription>
                Incluidos: {includedInTipsCount} / {employees.length} empleados
                {totalHoursForTips > 0 && ` • ${formatHours(totalHoursForTips)} totales`}
              </CardDescription>
            </div>
            <Button 
              onClick={() => setShowTipDistributionDialog(true)}
              disabled={isPeriodClosed || includedInTipsCount === 0}
              size="sm"
            >
              <Coins className="h-4 w-4 mr-2" />
              Repartir Propinas
            </Button>
          </div>
        </CardHeader>
        {grandTotals.tips > 0 && (
          <CardContent className="pt-0">
            <p className="text-sm">
              Total repartido: <strong>{formatCurrency(grandTotals.tips)}</strong>
              {period?.tip_distribution_method && (
                <span className="text-muted-foreground ml-2">
                  (método: {period.tip_distribution_method === 'equal' ? 'igualitario' : 'ponderado por horas'})
                </span>
              )}
            </p>
          </CardContent>
        )}
      </Card>

      {/* Main Grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Grilla de Liquidación</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Empleado</TableHead>
                  {canViewSensitive && <TableHead className="text-right min-w-[100px]">Blanco</TableHead>}
                  {canViewSensitive && <TableHead className="text-right min-w-[100px]">Negro</TableHead>}
                  <TableHead className="text-right min-w-[90px]">Adelantos</TableHead>
                  <TableHead className="text-right min-w-[90px]">Consumos</TableHead>
                  <TableHead className="text-right min-w-[90px]">Extras</TableHead>
                  <TableHead className="text-right min-w-[90px]">Propinas</TableHead>
                  <TableHead className="text-right min-w-[100px]">Total</TableHead>
                  <TableHead className="text-right min-w-[90px]">Pagado</TableHead>
                  <TableHead className="text-right min-w-[100px]">Saldo</TableHead>
                  <TableHead className="text-center min-w-[50px]">
                    <Tooltip>
                      <TooltipTrigger>
                        <Coins className="h-4 w-4" />
                      </TooltipTrigger>
                      <TooltipContent>Incluir en propinas</TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="min-w-[180px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeTotals.map((et) => (
                  <TableRow key={et.employee.id}>
                    <TableCell className="font-medium">
                      <div>
                        {et.employee.full_name}
                        {et.employee.position && (
                          <span className="text-xs text-muted-foreground block">{et.employee.position}</span>
                        )}
                      </div>
                    </TableCell>
                    
                    {canViewSensitive && (
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          className="w-24 text-right h-8"
                          value={et.white || ''}
                          onChange={(e) => handleUpdateEntry(et.employee.id, 'amount_white', parseFloat(e.target.value) || 0)}
                          disabled={isPeriodClosed}
                          placeholder="0"
                        />
                      </TableCell>
                    )}
                    
                    {canViewSensitive && (
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          className="w-24 text-right h-8"
                          value={et.black || ''}
                          onChange={(e) => handleUpdateEntry(et.employee.id, 'amount_black', parseFloat(e.target.value) || 0)}
                          disabled={isPeriodClosed}
                          placeholder="0"
                        />
                      </TableCell>
                    )}
                    
                    <TableCell className="text-right font-mono text-red-600">
                      {et.advances > 0 ? `-${formatCurrency(et.advances)}` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-red-600">
                      {et.consumptions > 0 ? `-${formatCurrency(et.consumptions)}` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-green-600">
                      {et.extras > 0 ? `+${formatCurrency(et.extras)}` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-green-600">
                      {et.tips > 0 ? `+${formatCurrency(et.tips)}` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {formatCurrency(et.total)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-blue-600">
                      {formatCurrency(et.paid)}
                    </TableCell>
                    <TableCell className={`text-right font-mono font-bold ${et.balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {formatCurrency(et.balance)}
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <Checkbox
                        checked={et.includeInTips}
                        onCheckedChange={(checked) => handleUpdateEntry(et.employee.id, 'include_in_tips', !!checked)}
                        disabled={isPeriodClosed}
                      />
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7"
                              onClick={() => openAdjustmentDialog(et.employee.id, 'advance')}
                              disabled={isPeriodClosed}
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Adelanto</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7"
                              onClick={() => openAdjustmentDialog(et.employee.id, 'consumption')}
                              disabled={isPeriodClosed}
                            >
                              <ShoppingCart className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Consumo</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7"
                              onClick={() => openAdjustmentDialog(et.employee.id, 'extra')}
                              disabled={isPeriodClosed}
                            >
                              <Gift className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Extra</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7"
                              onClick={() => openPaymentDialog(et.employee.id)}
                              disabled={isPeriodClosed}
                            >
                              <Wallet className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Registrar Pago</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7"
                              onClick={() => openSummaryDialog(et.employee.id)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ver Resumen</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                
                {/* Totals row */}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell>TOTALES</TableCell>
                  {canViewSensitive && <TableCell className="text-right">{formatCurrency(grandTotals.white)}</TableCell>}
                  {canViewSensitive && <TableCell className="text-right">{formatCurrency(grandTotals.black)}</TableCell>}
                  <TableCell className="text-right text-red-600">-{formatCurrency(grandTotals.advances)}</TableCell>
                  <TableCell className="text-right text-red-600">-{formatCurrency(grandTotals.consumptions)}</TableCell>
                  <TableCell className="text-right text-green-600">+{formatCurrency(grandTotals.extras)}</TableCell>
                  <TableCell className="text-right text-green-600">+{formatCurrency(grandTotals.tips)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(grandTotals.total)}</TableCell>
                  <TableCell className="text-right text-blue-600">{formatCurrency(grandTotals.paid)}</TableCell>
                  <TableCell className={`text-right ${grandTotals.balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {formatCurrency(grandTotals.balance)}
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Period Actions */}
      <div className="flex justify-end gap-3">
        {isPeriodClosed && canViewSensitive && (
          <Button variant="outline" onClick={handleReopenPeriod} disabled={saving}>
            <Unlock className="h-4 w-4 mr-2" />
            Reabrir Período
          </Button>
        )}
        {!isPeriodClosed && canViewSensitive && (
          <Button variant="destructive" onClick={() => setShowClosePeriodDialog(true)} disabled={saving}>
            <Lock className="h-4 w-4 mr-2" />
            Cerrar Período
          </Button>
        )}
      </div>

      {/* Dialog: Add Adjustment */}
      <Dialog open={showAdjustmentDialog} onOpenChange={setShowAdjustmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {adjustmentForm.type === 'advance' && 'Registrar Adelanto'}
              {adjustmentForm.type === 'consumption' && 'Registrar Consumo'}
              {adjustmentForm.type === 'extra' && 'Registrar Extra'}
            </DialogTitle>
            <DialogDescription>
              {selectedEmployeeData?.employee.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input
                type="number"
                placeholder="0"
                value={adjustmentForm.amount}
                onChange={(e) => setAdjustmentForm(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Textarea
                placeholder="Detalle..."
                value={adjustmentForm.description}
                onChange={(e) => setAdjustmentForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjustmentDialog(false)}>Cancelar</Button>
            <Button onClick={handleAddAdjustment} disabled={saving}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Add Payment */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              {selectedEmployeeData?.employee.full_name} • Saldo: {formatCurrency(selectedEmployeeData?.balance || 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input
                type="number"
                placeholder="0"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Método</Label>
              <Select value={paymentForm.method} onValueChange={(v) => setPaymentForm(prev => ({ ...prev, method: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                  <SelectItem value="mp">MercadoPago</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                placeholder="Detalle..."
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancelar</Button>
            <Button onClick={handleAddPayment} disabled={saving}>Registrar Pago</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Tip Distribution */}
      <Dialog open={showTipDistributionDialog} onOpenChange={setShowTipDistributionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Repartir Propinas</DialogTitle>
            <DialogDescription>
              Se repartirán entre {includedInTipsCount} empleados incluidos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Monto Total del Pozo</Label>
              <Input
                type="number"
                placeholder="0"
                value={tipForm.totalAmount}
                onChange={(e) => setTipForm(prev => ({ ...prev, totalAmount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Método de Distribución</Label>
              <Select 
                value={tipForm.method} 
                onValueChange={(v) => setTipForm(prev => ({ ...prev, method: v as 'equal' | 'hours_weighted' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equal">Igualitario (partes iguales)</SelectItem>
                  <SelectItem value="hours_weighted" disabled={totalHoursForTips === 0}>
                    Ponderado por horas
                    {totalHoursForTips === 0 && ' (sin horas)'}
                  </SelectItem>
                </SelectContent>
              </Select>
              {tipForm.method === 'hours_weighted' && totalHoursForTips > 0 && (
                <p className="text-xs text-muted-foreground">
                  Total horas incluidos: {formatHours(totalHoursForTips)}
                </p>
              )}
            </div>
            {tipForm.totalAmount && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Vista previa:</p>
                <p className="text-sm text-muted-foreground">
                  {tipForm.method === 'equal' 
                    ? `${formatCurrency(parseFloat(tipForm.totalAmount) / includedInTipsCount)} por empleado`
                    : 'Proporcional a horas trabajadas'
                  }
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTipDistributionDialog(false)}>Cancelar</Button>
            <Button onClick={handleDistributeTips} disabled={saving || !tipForm.totalAmount}>
              Repartir Propinas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Close Period */}
      <Dialog open={showClosePeriodDialog} onOpenChange={setShowClosePeriodDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar Período</DialogTitle>
            <DialogDescription>
              Una vez cerrado, no se podrán hacer cambios excepto por admin/franquiciado.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">
              <strong>Saldo pendiente total:</strong> {formatCurrency(grandTotals.balance)}
            </p>
            {grandTotals.balance > 0 && (
              <p className="text-sm text-orange-600 mt-2">
                ⚠️ Hay saldos pendientes de pago.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClosePeriodDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleClosePeriod} disabled={saving}>
              Cerrar Período
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Employee Summary */}
      <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resumen de Liquidación</DialogTitle>
            <DialogDescription>
              {selectedEmployeeData?.employee.full_name} • {format(new Date(selectedMonth + '-01'), 'MMMM yyyy', { locale: es })}
            </DialogDescription>
          </DialogHeader>
          
          {selectedEmployeeData && (
            <div className="space-y-4 py-4" id="employee-summary">
              <div className="border rounded-lg p-4 space-y-3">
                {canViewSensitive && (
                  <>
                    <div className="flex justify-between">
                      <span>Sueldo Blanco</span>
                      <span className="font-mono">{formatCurrency(selectedEmployeeData.white)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sueldo Negro</span>
                      <span className="font-mono">{formatCurrency(selectedEmployeeData.black)}</span>
                    </div>
                    <Separator />
                  </>
                )}
                
                <div className="flex justify-between">
                  <span>Extras</span>
                  <span className="font-mono text-green-600">+{formatCurrency(selectedEmployeeData.extras)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Propinas</span>
                  <span className="font-mono text-green-600">+{formatCurrency(selectedEmployeeData.tips)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Adelantos</span>
                  <span className="font-mono text-red-600">-{formatCurrency(selectedEmployeeData.advances)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Consumos</span>
                  <span className="font-mono text-red-600">-{formatCurrency(selectedEmployeeData.consumptions)}</span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between font-bold">
                  <span>Total a Cobrar</span>
                  <span className="font-mono">{formatCurrency(selectedEmployeeData.total)}</span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between">
                  <span>Pagos Realizados</span>
                  <span className="font-mono text-blue-600">{formatCurrency(selectedEmployeeData.paid)}</span>
                </div>
                
                <div className={`flex justify-between font-bold text-lg ${selectedEmployeeData.balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  <span>Saldo Pendiente</span>
                  <span className="font-mono">{formatCurrency(selectedEmployeeData.balance)}</span>
                </div>
              </div>

              {/* Detail lists */}
              {selectedEmployeeData.adjustments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Movimientos:</p>
                  <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                    {selectedEmployeeData.adjustments.map(adj => (
                      <div key={adj.id} className="flex justify-between text-muted-foreground">
                        <span>
                          {adj.type === 'advance' && 'Adelanto'}
                          {adj.type === 'consumption' && 'Consumo'}
                          {adj.type === 'extra' && 'Extra'}
                          {adj.type === 'tip' && 'Propina'}
                          {adj.description && `: ${adj.description}`}
                        </span>
                        <span className={adj.type === 'advance' || adj.type === 'consumption' ? 'text-red-600' : 'text-green-600'}>
                          {adj.type === 'advance' || adj.type === 'consumption' ? '-' : '+'}
                          {formatCurrency(adj.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedEmployeeData.payments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Pagos:</p>
                  <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                    {selectedEmployeeData.payments.map(pmt => (
                      <div key={pmt.id} className="flex justify-between text-muted-foreground">
                        <span>
                          {format(new Date(pmt.payment_date), 'dd/MM')} - {pmt.method}
                        </span>
                        <span className="text-blue-600">{formatCurrency(pmt.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <Button onClick={() => setShowSummaryDialog(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
