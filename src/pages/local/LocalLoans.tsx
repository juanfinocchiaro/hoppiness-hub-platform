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
  Landmark,
  Calendar,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Clock,
  DollarSign,
  Percent
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

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

export default function LocalLoans() {
  const { branch } = useOutletContext<LocalContext>();
  const { user } = useAuth();
  
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<{loan: Loan, installment: LoanInstallment} | null>(null);
  const [expandedLoans, setExpandedLoans] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    lender_name: '',
    description: '',
    principal_amount: '',
    interest_rate: '0',
    num_installments: '12',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  const [payAmount, setPayAmount] = useState('');

  const fetchData = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('loans')
      .select('*, loan_installments(*)')
      .eq('branch_id', branch.id)
      .order('created_at', { ascending: false });

    if (data) setLoans(data as Loan[]);
    if (error) console.error('Error fetching loans:', error);
    
    setLoading(false);
  };

  useEffect(() => {
    if (branch?.id) fetchData();
  }, [branch?.id]);

  const resetForm = () => {
    setFormData({
      lender_name: '',
      description: '',
      principal_amount: '',
      interest_rate: '0',
      num_installments: '12',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    });
  };

  const handleSubmit = async () => {
    if (!formData.lender_name.trim() || !formData.principal_amount || !formData.num_installments) {
      toast.error('Completá prestamista, monto y cuotas');
      return;
    }

    setIsSubmitting(true);

    try {
      const principal = parseFloat(formData.principal_amount);
      const rate = parseFloat(formData.interest_rate) / 100;
      const numCuotas = parseInt(formData.num_installments);
      const startDate = parseISO(formData.start_date);

      // Create loan
      const { data: loan, error: loanError } = await supabase
        .from('loans')
        .insert({
          branch_id: branch.id,
          lender_name: formData.lender_name.trim(),
          description: formData.description || null,
          principal_amount: principal,
          interest_rate: parseFloat(formData.interest_rate),
          num_installments: numCuotas,
          start_date: formData.start_date,
          status: 'active',
          notes: formData.notes || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (loanError) throw loanError;

      // Create installments
      const capitalPerCuota = principal / numCuotas;
      const totalInterest = principal * rate;
      const interestPerCuota = totalInterest / numCuotas;

      const installments = Array.from({ length: numCuotas }, (_, i) => ({
        loan_id: loan.id,
        installment_number: i + 1,
        due_date: format(addMonths(startDate, i + 1), 'yyyy-MM-dd'),
        amount_capital: capitalPerCuota,
        amount_interest: interestPerCuota,
        status: 'pending',
      }));

      const { error: installError } = await supabase
        .from('loan_installments')
        .insert(installments);

      if (installError) throw installError;

      // Create income transaction (entrada de dinero como deuda)
      const { error: txError } = await supabase.from('transactions').insert({
        branch_id: branch.id,
        type: 'income',
        amount: principal,
        concept: `Préstamo: ${formData.lender_name}`,
        category_group: 'DEUDA',
        doc_status: 'documented',
        accrual_date: formData.start_date,
        payment_date: formData.start_date,
        transaction_date: formData.start_date,
        status: 'paid',
        payment_origin: 'bank_transfer',
        receipt_type: 'INTERNAL',
        recorded_by: user?.id,
        created_by: user?.id,
        notes: `Alta préstamo ID: ${loan.id}`,
      });

      if (txError) console.error('Error creating income transaction:', txError);

      toast.success('Préstamo registrado con cuotas');
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al registrar préstamo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayInstallment = async () => {
    if (!selectedInstallment || !payAmount) return;

    const { loan, installment } = selectedInstallment;
    const amount = parseFloat(payAmount);
    const remaining = (installment.amount_capital + installment.amount_interest) - installment.amount_paid;
    
    if (amount > remaining) {
      toast.error('El monto excede el saldo de la cuota');
      return;
    }

    setIsSubmitting(true);

    try {
      const newPaid = installment.amount_paid + amount;
      const totalCuota = installment.amount_capital + installment.amount_interest;
      const newStatus = newPaid >= totalCuota ? 'paid' : 'partial';

      // Update installment
      await supabase
        .from('loan_installments')
        .update({
          amount_paid: newPaid,
          status: newStatus,
          paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
        })
        .eq('id', installment.id);

      // Create expense transaction for capital (reduce debt)
      const capitalProportion = installment.amount_capital / totalCuota;
      const capitalPaid = amount * capitalProportion;
      const interestPaid = amount - capitalPaid;

      // Capital payment (reduces debt, not P&L expense)
      if (capitalPaid > 0) {
        await supabase.from('transactions').insert({
          branch_id: branch.id,
          type: 'expense',
          amount: capitalPaid,
          concept: `Cuota ${installment.installment_number} Capital - ${loan.lender_name}`,
          category_group: 'DEUDA',
          doc_status: 'internal',
          accrual_date: installment.due_date,
          payment_date: format(new Date(), 'yyyy-MM-dd'),
          transaction_date: format(new Date(), 'yyyy-MM-dd'),
          status: 'paid',
          payment_origin: 'bank_transfer',
          receipt_type: 'INTERNAL',
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
          concept: `Cuota ${installment.installment_number} Interés - ${loan.lender_name}`,
          category_group: 'FINANCIEROS',
          doc_status: 'internal',
          accrual_date: installment.due_date,
          payment_date: format(new Date(), 'yyyy-MM-dd'),
          transaction_date: format(new Date(), 'yyyy-MM-dd'),
          status: 'paid',
          payment_origin: 'bank_transfer',
          receipt_type: 'INTERNAL',
          recorded_by: user?.id,
          created_by: user?.id,
        });
      }

      // Check if all installments paid -> complete loan
      const { data: allInstallments } = await supabase
        .from('loan_installments')
        .select('status')
        .eq('loan_id', loan.id);

      const allPaid = allInstallments?.every(i => i.status === 'paid');
      if (allPaid) {
        await supabase
          .from('loans')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', loan.id);
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

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount);

  const toggleLoan = (loanId: string) => {
    setExpandedLoans(prev => {
      const next = new Set(prev);
      if (next.has(loanId)) next.delete(loanId);
      else next.add(loanId);
      return next;
    });
  };

  const getLoanProgress = (loan: Loan) => {
    const installments = loan.loan_installments || [];
    const paid = installments.filter(i => i.status === 'paid').length;
    return (paid / loan.num_installments) * 100;
  };

  const getLoanRemaining = (loan: Loan) => {
    const installments = loan.loan_installments || [];
    return installments.reduce((sum, i) => sum + (i.amount_capital + i.amount_interest - i.amount_paid), 0);
  };

  const totals = {
    totalDebt: loans.filter(l => l.status === 'active').reduce((s, l) => s + getLoanRemaining(l), 0),
    activeLoans: loans.filter(l => l.status === 'active').length,
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
          <h1 className="text-2xl font-bold">Préstamos</h1>
          <p className="text-muted-foreground">Gestión de financiamiento</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Préstamo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar Préstamo</DialogTitle>
              <DialogDescription>
                Se generarán las cuotas automáticamente
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Prestamista</Label>
                <Input
                  placeholder="Nombre del banco/persona"
                  value={formData.lender_name}
                  onChange={e => setFormData(f => ({ ...f, lender_name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Descripción (opcional)</Label>
                <Input
                  placeholder="Ej: Préstamo para equipamiento"
                  value={formData.description}
                  onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Capital (monto prestado)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="0"
                      className="pl-10"
                      value={formData.principal_amount}
                      onChange={e => setFormData(f => ({ ...f, principal_amount: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tasa Interés Total (%)</Label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="0"
                      className="pl-10"
                      value={formData.interest_rate}
                      onChange={e => setFormData(f => ({ ...f, interest_rate: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cantidad de Cuotas</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.num_installments}
                    onChange={e => setFormData(f => ({ ...f, num_installments: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha de Inicio</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={e => setFormData(f => ({ ...f, start_date: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Creando...' : 'Crear Préstamo'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deuda Total Activa</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalDebt)}</div>
            <p className="text-xs text-muted-foreground">{totals.activeLoans} préstamos activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Préstamos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loans.length}</div>
            <p className="text-xs text-muted-foreground">
              {loans.filter(l => l.status === 'completed').length} completados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Loans List */}
      <div className="space-y-4">
        {loans.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No hay préstamos registrados
            </CardContent>
          </Card>
        ) : (
          loans.map(loan => {
            const isExpanded = expandedLoans.has(loan.id);
            const progress = getLoanProgress(loan);
            const remaining = getLoanRemaining(loan);
            const installments = (loan.loan_installments || []).sort((a, b) => a.installment_number - b.installment_number);

            return (
              <Card key={loan.id}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleLoan(loan.id)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <div>
                            <CardTitle className="text-lg">{loan.lender_name}</CardTitle>
                            <p className="text-sm text-muted-foreground">{loan.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={loan.status === 'active' ? 'default' : 'secondary'}>
                            {loan.status === 'active' ? 'Activo' : loan.status === 'completed' ? 'Completado' : loan.status}
                          </Badge>
                          <p className="text-sm font-medium mt-1">Pendiente: {formatCurrency(remaining)}</p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progreso</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-4 mb-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Capital:</span>
                          <p className="font-medium">{formatCurrency(loan.principal_amount)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Tasa:</span>
                          <p className="font-medium">{loan.interest_rate}%</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Cuotas:</span>
                          <p className="font-medium">{loan.num_installments}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Inicio:</span>
                          <p className="font-medium">{format(parseISO(loan.start_date), 'dd/MM/yyyy')}</p>
                        </div>
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Vencimiento</TableHead>
                            <TableHead className="text-right">Capital</TableHead>
                            <TableHead className="text-right">Interés</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Pagado</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {installments.map(inst => {
                            const total = inst.amount_capital + inst.amount_interest;
                            const saldo = total - inst.amount_paid;
                            return (
                              <TableRow key={inst.id}>
                                <TableCell>{inst.installment_number}</TableCell>
                                <TableCell>{format(parseISO(inst.due_date), 'dd/MM/yyyy')}</TableCell>
                                <TableCell className="text-right">{formatCurrency(inst.amount_capital)}</TableCell>
                                <TableCell className="text-right text-orange-600">{formatCurrency(inst.amount_interest)}</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(total)}</TableCell>
                                <TableCell className="text-right text-green-600">{formatCurrency(inst.amount_paid)}</TableCell>
                                <TableCell>
                                  <Badge variant={inst.status === 'paid' ? 'default' : 'outline'}>
                                    {inst.status === 'paid' ? 'Pagada' : inst.status === 'partial' ? 'Parcial' : 'Pendiente'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {inst.status !== 'paid' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedInstallment({ loan, installment: inst });
                                        setPayAmount(saldo.toString());
                                        setIsPayDialogOpen(true);
                                      }}
                                    >
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
                </Collapsible>
              </Card>
            );
          })
        )}
      </div>

      {/* Pay Dialog */}
      <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pagar Cuota</DialogTitle>
            <DialogDescription>
              Cuota {selectedInstallment?.installment.installment_number} - {selectedInstallment?.loan.lender_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
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
