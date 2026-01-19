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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Plus,
  Receipt,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, isBefore, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

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

interface LocalContext {
  branch: Branch;
}

const TAX_TYPES = [
  { value: 'IIBB', label: 'Ingresos Brutos' },
  { value: 'IVA', label: 'IVA' },
  { value: 'GANANCIAS', label: 'Ganancias' },
  { value: 'MONOTRIBUTO', label: 'Monotributo' },
  { value: 'AUTONOMOS', label: 'Autónomos' },
  { value: 'MUNICIPAL', label: 'Tasa Municipal' },
  { value: 'OTROS', label: 'Otros' },
];

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: 'bg-yellow-500', icon: Clock },
  paid: { label: 'Pagado', color: 'bg-green-500', icon: CheckCircle },
  partial: { label: 'Parcial', color: 'bg-blue-500', icon: DollarSign },
  overdue: { label: 'Vencido', color: 'bg-red-500', icon: AlertTriangle },
  in_plan: { label: 'En Plan', color: 'bg-purple-500', icon: FileText },
};

export default function LocalTaxes() {
  const { branch } = useOutletContext<LocalContext>();
  const { user } = useAuth();
  
  const [taxes, setTaxes] = useState<TaxObligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  const [selectedTax, setSelectedTax] = useState<TaxObligation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    tax_type: 'IIBB',
    period: format(new Date(), 'yyyy-MM'),
    accrual_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: '',
    amount: '',
    notes: '',
  });

  const [payAmount, setPayAmount] = useState('');

  const fetchData = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('tax_obligations')
      .select('*')
      .eq('branch_id', branch.id)
      .order('due_date', { ascending: true });

    if (data) {
      // Update overdue status
      const today = startOfToday();
      const updated = data.map(tax => {
        if (tax.status === 'pending' && isBefore(parseISO(tax.due_date), today)) {
          return { ...tax, status: 'overdue' as const };
        }
        return tax;
      }) as TaxObligation[];
      setTaxes(updated);
    }
    if (error) console.error('Error fetching taxes:', error);
    
    setLoading(false);
  };

  useEffect(() => {
    if (branch?.id) fetchData();
  }, [branch?.id]);

  const resetForm = () => {
    setFormData({
      name: '',
      tax_type: 'IIBB',
      period: format(new Date(), 'yyyy-MM'),
      accrual_date: format(new Date(), 'yyyy-MM-dd'),
      due_date: '',
      amount: '',
      notes: '',
    });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.amount || !formData.due_date) {
      toast.error('Completá nombre, monto y vencimiento');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('tax_obligations').insert({
        branch_id: branch.id,
        name: formData.name.trim(),
        tax_type: formData.tax_type,
        period: formData.period,
        accrual_date: formData.accrual_date,
        due_date: formData.due_date,
        amount: parseFloat(formData.amount),
        status: 'pending',
        notes: formData.notes || null,
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success('Impuesto registrado');
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al registrar impuesto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedTax || !payAmount) return;

    const amount = parseFloat(payAmount);
    const remaining = selectedTax.amount - selectedTax.amount_paid;
    
    if (amount > remaining) {
      toast.error('El monto excede el saldo pendiente');
      return;
    }

    setIsSubmitting(true);

    try {
      const newPaid = selectedTax.amount_paid + amount;
      const newStatus = newPaid >= selectedTax.amount ? 'paid' : 'partial';

      // Update tax obligation
      const { error: taxError } = await supabase
        .from('tax_obligations')
        .update({
          amount_paid: newPaid,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedTax.id);

      if (taxError) throw taxError;

      // Create ledger transaction
      const { error: txError } = await supabase.from('transactions').insert({
        branch_id: branch.id,
        type: 'expense',
        amount: amount,
        concept: `Pago ${selectedTax.tax_type} - ${selectedTax.period}`,
        category_group: 'IMPUESTOS',
        doc_status: 'documented',
        accrual_date: selectedTax.accrual_date,
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        transaction_date: format(new Date(), 'yyyy-MM-dd'),
        status: 'paid',
        payment_origin: 'bank_transfer',
        receipt_type: 'OFFICIAL',
        recorded_by: user?.id,
        created_by: user?.id,
      });

      if (txError) console.error('Error creating transaction:', txError);

      toast.success('Pago registrado');
      setIsPayDialogOpen(false);
      setSelectedTax(null);
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

  const totals = {
    pending: taxes.filter(t => t.status !== 'paid').reduce((s, t) => s + (t.amount - t.amount_paid), 0),
    overdue: taxes.filter(t => t.status === 'overdue').reduce((s, t) => s + (t.amount - t.amount_paid), 0),
    paid: taxes.filter(t => t.status === 'paid').reduce((s, t) => s + t.amount, 0),
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
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
          <h1 className="text-2xl font-bold">Impuestos</h1>
          <p className="text-muted-foreground">Gestión de obligaciones fiscales</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Impuesto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Obligación Fiscal</DialogTitle>
              <DialogDescription>
                Cargá el impuesto devengado
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Impuesto</Label>
                  <Select
                    value={formData.tax_type}
                    onValueChange={v => setFormData(f => ({ ...f, tax_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TAX_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Período</Label>
                  <Input
                    type="month"
                    value={formData.period}
                    onChange={e => setFormData(f => ({ ...f, period: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nombre / Concepto</Label>
                <Input
                  placeholder="Ej: IIBB Enero 2026"
                  value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha Devengado</Label>
                  <Input
                    type="date"
                    value={formData.accrual_date}
                    onChange={e => setFormData(f => ({ ...f, accrual_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha Vencimiento</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={e => setFormData(f => ({ ...f, due_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Monto</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="0.00"
                    className="pl-10"
                    value={formData.amount}
                    onChange={e => setFormData(f => ({ ...f, amount: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Input
                  placeholder="Observaciones..."
                  value={formData.notes}
                  onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendiente Total</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(totals.pending)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencido</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(totals.overdue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagado (período)</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totals.paid)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Impuesto</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">Pagado</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taxes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No hay impuestos cargados
                  </TableCell>
                </TableRow>
              ) : (
                taxes.map(tax => {
                  const StatusIcon = STATUS_CONFIG[tax.status].icon;
                  const remaining = tax.amount - tax.amount_paid;
                  return (
                    <TableRow key={tax.id}>
                      <TableCell className="font-medium">{tax.name}</TableCell>
                      <TableCell>{tax.period}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {format(parseISO(tax.due_date), 'dd/MM/yyyy')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(tax.amount)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(tax.amount_paid)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(remaining)}</TableCell>
                      <TableCell>
                        <Badge className={`${STATUS_CONFIG[tax.status].color} text-white`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {STATUS_CONFIG[tax.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {tax.status !== 'paid' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedTax(tax);
                              setPayAmount(remaining.toString());
                              setIsPayDialogOpen(true);
                            }}
                          >
                            Pagar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pay Dialog */}
      <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              {selectedTax?.name} - Saldo: {selectedTax && formatCurrency(selectedTax.amount - selectedTax.amount_paid)}
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
            <Button onClick={handlePayment} disabled={isSubmitting}>
              {isSubmitting ? 'Procesando...' : 'Confirmar Pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
