import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  FileText,
  Receipt,
  Search,
  Filter,
  Calendar,
  DollarSign,
  Building2,
  CreditCard,
  Banknote,
  Smartphone,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;
type Supplier = Tables<'suppliers'>;

interface TransactionCategory {
  id: string;
  name: string;
  category_group: string;
  display_order: number;
}

interface Transaction {
  id: string;
  branch_id: string;
  amount: number;
  type: 'income' | 'expense';
  category_id: string | null;
  supplier_id: string | null;
  transaction_date: string;
  receipt_type: 'OFFICIAL' | 'INTERNAL';
  tax_percentage: number | null;
  payment_origin: 'cash' | 'mercadopago' | 'bank_transfer' | 'credit_card';
  concept: string;
  notes: string | null;
  receipt_number: string | null;
  is_payment_to_supplier: boolean;
  created_at: string;
  transaction_categories?: TransactionCategory;
  suppliers?: Supplier;
}

interface LocalContext {
  branch: Branch;
}

const PAYMENT_ORIGINS = [
  { value: 'cash', label: 'Efectivo', icon: Banknote },
  { value: 'mercadopago', label: 'MercadoPago', icon: Smartphone },
  { value: 'bank_transfer', label: 'Transferencia', icon: Building2 },
  { value: 'credit_card', label: 'Tarjeta', icon: CreditCard },
];

const CATEGORY_GROUPS = {
  INGRESOS: { label: 'Ingresos', color: 'text-success' },
  CMV: { label: 'Costo Mercadería', color: 'text-destructive' },
  GASTOS_OPERATIVOS: { label: 'Gastos Operativos', color: 'text-orange-600' },
  RRHH: { label: 'RRHH', color: 'text-purple-600' },
  ESTRUCTURA: { label: 'Estructura', color: 'text-blue-600' },
  IMPUESTOS: { label: 'Impuestos', color: 'text-red-600' },
};

export default function LocalTransactions() {
  const { branch } = useOutletContext<LocalContext>();
  const { user } = useAuth();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterReceipt, setFilterReceipt] = useState<'all' | 'OFFICIAL' | 'INTERNAL'>('all');
  
  // Form state
  const [formData, setFormData] = useState({
    type: 'expense' as 'income' | 'expense',
    concept: '',
    amount: '',
    category_id: '',
    supplier_id: '',
    payment_origin: 'cash' as 'cash' | 'mercadopago' | 'bank_transfer' | 'credit_card',
    receipt_type: 'INTERNAL' as 'OFFICIAL' | 'INTERNAL',
    tax_percentage: '',
    receipt_number: '',
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
    is_payment_to_supplier: false,
  });

  const fetchData = async () => {
    setLoading(true);
    
    const [transactionsRes, categoriesRes, suppliersRes] = await Promise.all([
      supabase
        .from('transactions')
        .select(`
          *,
          transaction_categories(*),
          suppliers(*)
        `)
        .eq('branch_id', branch.id)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('transaction_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order'),
      supabase
        .from('suppliers')
        .select('*')
        .eq('is_active', true)
        .order('name'),
    ]);

    if (transactionsRes.data) setTransactions(transactionsRes.data as Transaction[]);
    if (categoriesRes.data) setCategories(categoriesRes.data);
    if (suppliersRes.data) setSuppliers(suppliersRes.data);
    
    setLoading(false);
  };

  useEffect(() => {
    if (branch?.id) fetchData();
  }, [branch?.id]);

  const resetForm = () => {
    setFormData({
      type: 'expense',
      concept: '',
      amount: '',
      category_id: '',
      supplier_id: '',
      payment_origin: 'cash',
      receipt_type: 'INTERNAL',
      tax_percentage: '',
      receipt_number: '',
      transaction_date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
      is_payment_to_supplier: false,
    });
  };

  const handleSubmit = async () => {
    if (!formData.concept.trim() || !formData.amount) {
      toast.error('Concepto y monto son requeridos');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('transactions').insert({
        branch_id: branch.id,
        type: formData.type,
        concept: formData.concept.trim(),
        amount: parseFloat(formData.amount),
        category_id: formData.category_id || null,
        supplier_id: formData.supplier_id || null,
        payment_origin: formData.payment_origin,
        receipt_type: formData.receipt_type,
        tax_percentage: formData.receipt_type === 'OFFICIAL' && formData.tax_percentage 
          ? parseFloat(formData.tax_percentage) 
          : null,
        receipt_number: formData.receipt_type === 'OFFICIAL' ? formData.receipt_number : null,
        transaction_date: formData.transaction_date,
        notes: formData.notes || null,
        is_payment_to_supplier: formData.is_payment_to_supplier,
        recorded_by: user?.id,
      });

      if (error) throw error;

      toast.success('Transacción registrada');
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al registrar la transacción');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount);

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.concept.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesReceipt = filterReceipt === 'all' || t.receipt_type === filterReceipt;
    return matchesSearch && matchesType && matchesReceipt;
  });

  const totals = {
    income: transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
    expense: transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
  };

  const groupedCategories = categories.reduce((acc, cat) => {
    if (!acc[cat.category_group]) acc[cat.category_group] = [];
    acc[cat.category_group].push(cat);
    return acc;
  }, {} as Record<string, TransactionCategory[]>);

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
          <h1 className="text-2xl font-bold">Transacciones</h1>
          <p className="text-muted-foreground">{branch.name} - Control de Ingresos y Egresos</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Transacción
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Transacción</DialogTitle>
              <DialogDescription>
                Ingresá los datos del movimiento
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Type Toggle */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formData.type === 'expense' ? 'default' : 'outline'}
                  className={`flex-1 ${formData.type === 'expense' ? 'bg-destructive hover:bg-destructive/90' : ''}`}
                  onClick={() => setFormData(f => ({ ...f, type: 'expense' }))}
                >
                  <TrendingDown className="w-4 h-4 mr-2" />
                  Egreso
                </Button>
                <Button
                  type="button"
                  variant={formData.type === 'income' ? 'default' : 'outline'}
                  className={`flex-1 ${formData.type === 'income' ? 'bg-success hover:bg-success/90' : ''}`}
                  onClick={() => setFormData(f => ({ ...f, type: 'income' }))}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Ingreso
                </Button>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={formData.transaction_date}
                  onChange={e => setFormData(f => ({ ...f, transaction_date: e.target.value }))}
                />
              </div>

              {/* Concept */}
              <div className="space-y-2">
                <Label>Concepto *</Label>
                <Input
                  placeholder="Ej: Pago carnicería, Venta salón..."
                  value={formData.concept}
                  onChange={e => setFormData(f => ({ ...f, concept: e.target.value }))}
                />
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label>Monto *</Label>
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

              {/* Category */}
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={v => setFormData(f => ({ ...f, category_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(groupedCategories).map(([group, cats]) => (
                      <div key={group}>
                        <div className={`px-2 py-1 text-xs font-semibold ${CATEGORY_GROUPS[group as keyof typeof CATEGORY_GROUPS]?.color || ''}`}>
                          {CATEGORY_GROUPS[group as keyof typeof CATEGORY_GROUPS]?.label || group}
                        </div>
                        {cats.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Origin */}
              <div className="space-y-2">
                <Label>Origen/Destino del Pago</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_ORIGINS.map(origin => (
                    <Button
                      key={origin.value}
                      type="button"
                      variant={formData.payment_origin === origin.value ? 'default' : 'outline'}
                      size="sm"
                      className="justify-start"
                      onClick={() => setFormData(f => ({ ...f, payment_origin: origin.value as any }))}
                    >
                      <origin.icon className="w-4 h-4 mr-2" />
                      {origin.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Supplier (for expenses) */}
              {formData.type === 'expense' && (
                <div className="space-y-2">
                  <Label>Proveedor (opcional)</Label>
                  <Select
                    value={formData.supplier_id}
                    onValueChange={v => setFormData(f => ({ ...f, supplier_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sin proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin proveedor</SelectItem>
                      {suppliers.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {formData.supplier_id && (
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        id="is_payment"
                        checked={formData.is_payment_to_supplier}
                        onChange={e => setFormData(f => ({ ...f, is_payment_to_supplier: e.target.checked }))}
                        className="rounded"
                      />
                      <Label htmlFor="is_payment" className="text-sm font-normal">
                        Es un pago a proveedor (reduce deuda)
                      </Label>
                    </div>
                  )}
                </div>
              )}

              <Separator />

              {/* Receipt Type Toggle - THE CORE LOGIC */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Tipo de Comprobante</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={formData.receipt_type === 'INTERNAL' ? 'default' : 'outline'}
                    className={`h-auto py-3 flex-col ${formData.receipt_type === 'INTERNAL' ? 'bg-muted-foreground hover:bg-muted-foreground/90' : ''}`}
                    onClick={() => setFormData(f => ({ ...f, receipt_type: 'INTERNAL' }))}
                  >
                    <Receipt className="w-5 h-5 mb-1" />
                    <span className="text-sm font-medium">Interno / X</span>
                    <span className="text-xs opacity-70">Sin factura fiscal</span>
                  </Button>
                  <Button
                    type="button"
                    variant={formData.receipt_type === 'OFFICIAL' ? 'default' : 'outline'}
                    className={`h-auto py-3 flex-col ${formData.receipt_type === 'OFFICIAL' ? 'bg-primary hover:bg-primary/90' : ''}`}
                    onClick={() => setFormData(f => ({ ...f, receipt_type: 'OFFICIAL' }))}
                  >
                    <FileText className="w-5 h-5 mb-1" />
                    <span className="text-sm font-medium">Fiscal / Factura</span>
                    <span className="text-xs opacity-70">Con comprobante AFIP</span>
                  </Button>
                </div>
              </div>

              {/* Official receipt fields */}
              {formData.receipt_type === 'OFFICIAL' && (
                <div className="space-y-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="space-y-2">
                    <Label>IVA %</Label>
                    <Select
                      value={formData.tax_percentage}
                      onValueChange={v => setFormData(f => ({ ...f, tax_percentage: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar IVA" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Exento (0%)</SelectItem>
                        <SelectItem value="10.5">10.5%</SelectItem>
                        <SelectItem value="21">21%</SelectItem>
                        <SelectItem value="27">27%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Número de Comprobante</Label>
                    <Input
                      placeholder="Ej: 0001-00012345"
                      value={formData.receipt_number}
                      onChange={e => setFormData(f => ({ ...f, receipt_number: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Textarea
                  placeholder="Observaciones adicionales..."
                  value={formData.notes}
                  onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
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
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-success" />
              Ingresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{formatCurrency(totals.income)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-destructive" />
              Egresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totals.expense)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totals.income - totals.expense >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(totals.income - totals.expense)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por concepto..."
                className="pl-10"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="income">Ingresos</SelectItem>
                <SelectItem value="expense">Egresos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterReceipt} onValueChange={(v: any) => setFilterReceipt(v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="OFFICIAL">Fiscales</SelectItem>
                <SelectItem value="INTERNAL">Internos</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchData}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-center">Tipo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No hay transacciones registradas
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm">
                      {format(new Date(t.transaction_date), 'dd/MM/yy', { locale: es })}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{t.concept}</p>
                        {t.suppliers && (
                          <p className="text-xs text-muted-foreground">{t.suppliers.name}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.transaction_categories?.name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {PAYMENT_ORIGINS.find(o => o.value === t.payment_origin)?.label || t.payment_origin}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-semibold ${t.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={t.receipt_type === 'OFFICIAL' ? 'default' : 'secondary'}
                        className={t.receipt_type === 'OFFICIAL' ? 'bg-primary' : 'bg-muted text-muted-foreground'}
                      >
                        {t.receipt_type === 'OFFICIAL' ? 'FIS' : 'INT'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
    </div>
  );
}
