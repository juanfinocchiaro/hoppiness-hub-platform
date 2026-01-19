import { useState, useEffect, useRef } from 'react';
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
  Plus,
  TrendingUp,
  TrendingDown,
  FileText,
  Receipt,
  Search,
  DollarSign,
  Building2,
  CreditCard,
  Banknote,
  Smartphone,
  RefreshCw,
  Paperclip,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileCheck,
  Upload
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;
type Supplier = Tables<'suppliers'>;

interface COAAccount {
  id: string;
  code: string;
  name: string;
  level: number;
  parent_id: string | null;
  account_type: string;
}

interface FinanceAccount {
  id: string;
  code: string;
  name: string;
  account_type: string;
}

interface Transaction {
  id: string;
  branch_id: string;
  amount: number;
  type: 'income' | 'expense';
  category_id: string | null;
  coa_account_id: string | null;
  account_id: string | null;
  supplier_id: string | null;
  transaction_date: string;
  accrual_date: string | null;
  payment_date: string | null;
  due_date: string | null;
  receipt_type: 'OFFICIAL' | 'INTERNAL';
  doc_status: string | null;
  status: string | null;
  payment_origin: string;
  concept: string;
  notes: string | null;
  receipt_number: string | null;
  attachments: any;
  created_at: string;
  coa_accounts?: COAAccount | null;
  suppliers?: Supplier | null;
}

interface LocalContext {
  branch: Branch;
}

const PAYMENT_ORIGINS = [
  { value: 'cash', label: 'Efectivo', icon: Banknote },
  { value: 'transfer', label: 'Transferencia', icon: Building2 },
  { value: 'mercadopago', label: 'MercadoPago', icon: Smartphone },
  { value: 'card', label: 'Tarjeta', icon: CreditCard },
  { value: 'echeq', label: 'eCheq', icon: FileCheck },
];

const DOC_STATUS_OPTIONS = [
  { value: 'documented', label: 'Documentado (Blanco)', color: 'bg-green-100 text-green-800' },
  { value: 'undocumented', label: 'Sin Documentar (Negro)', color: 'bg-red-100 text-red-800' },
  { value: 'internal', label: 'Interno', color: 'bg-gray-100 text-gray-800' },
];

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente', icon: Clock },
  { value: 'paid', label: 'Pagado', icon: CheckCircle2 },
  { value: 'partial', label: 'Parcial', icon: AlertCircle },
];

export default function LocalTransactions() {
  const { branch } = useOutletContext<LocalContext>();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [coaAccounts, setCoaAccounts] = useState<COAAccount[]>([]);
  const [financeAccounts, setFinanceAccounts] = useState<FinanceAccount[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterDocStatus, setFilterDocStatus] = useState<'all' | 'documented' | 'undocumented' | 'internal'>('all');
  
  // Form state
  const [formData, setFormData] = useState({
    type: 'expense' as 'income' | 'expense',
    concept: '',
    amount: '',
    coa_account_id: '',
    account_id: '',
    supplier_id: '',
    payment_origin: 'cash',
    doc_status: 'undocumented' as 'documented' | 'undocumented' | 'internal',
    status: 'paid' as 'pending' | 'paid' | 'partial',
    accrual_date: format(new Date(), 'yyyy-MM-dd'),
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: '',
    receipt_type: 'INTERNAL' as 'OFFICIAL' | 'INTERNAL',
    receipt_number: '',
    notes: '',
  });

  const fetchData = async () => {
    setLoading(true);
    
    const [transactionsRes, coaRes, financeRes, suppliersRes] = await Promise.all([
      supabase
        .from('transactions')
        .select(`
          *,
          coa_accounts(*),
          suppliers(*)
        `)
        .eq('branch_id', branch.id)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('coa_accounts')
        .select('*')
        .eq('is_active', true)
        .order('level')
        .order('display_order'),
      supabase
        .from('finance_accounts')
        .select('*')
        .eq('branch_id', branch.id)
        .eq('is_active', true)
        .order('display_order'),
      supabase
        .from('suppliers')
        .select('*')
        .eq('is_active', true)
        .order('name'),
    ]);

    if (transactionsRes.data) setTransactions(transactionsRes.data as Transaction[]);
    if (coaRes.data) setCoaAccounts(coaRes.data);
    if (financeRes.data) setFinanceAccounts(financeRes.data);
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
      coa_account_id: '',
      account_id: '',
      supplier_id: '',
      payment_origin: 'cash',
      doc_status: 'undocumented',
      status: 'paid',
      accrual_date: format(new Date(), 'yyyy-MM-dd'),
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      due_date: '',
      receipt_type: 'INTERNAL',
      receipt_number: '',
      notes: '',
    });
    setAttachmentFiles([]);
  };

  // Determine if attachment is required based on rules
  const isAttachmentRequired = () => {
    // Cash expense => required
    if (formData.type === 'expense' && formData.payment_origin === 'cash') return true;
    // Transfer => required
    if (formData.payment_origin === 'transfer') return true;
    // eCheq => required
    if (formData.payment_origin === 'echeq') return true;
    // Documented => required
    if (formData.doc_status === 'documented') return true;
    return false;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachmentFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async () => {
    if (!formData.concept.trim() || !formData.amount) {
      toast.error('Concepto y monto son requeridos');
      return;
    }

    if (isAttachmentRequired() && attachmentFiles.length === 0) {
      toast.error('Se requiere adjuntar comprobante para este tipo de transacción');
      return;
    }

    if (formData.payment_origin === 'echeq' && !formData.due_date) {
      toast.error('eCheq requiere fecha de vencimiento');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload attachments if any
      let attachmentUrls: string[] = [];
      if (attachmentFiles.length > 0) {
        for (const file of attachmentFiles) {
          const fileName = `${branch.id}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('invoices')
            .upload(fileName, file);
          
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('invoices').getPublicUrl(fileName);
            attachmentUrls.push(urlData.publicUrl);
          }
        }
      }

      const { error } = await supabase.from('transactions').insert([{
        branch_id: branch.id,
        type: formData.type,
        concept: formData.concept.trim(),
        amount: parseFloat(formData.amount),
        coa_account_id: formData.coa_account_id || null,
        account_id: formData.account_id || null,
        supplier_id: formData.supplier_id || null,
        payment_origin: formData.payment_origin as 'cash' | 'mercadopago' | 'bank_transfer' | 'credit_card',
        doc_status: formData.doc_status,
        status: formData.status,
        receipt_type: formData.doc_status === 'documented' ? 'OFFICIAL' : 'INTERNAL',
        receipt_number: formData.doc_status === 'documented' ? formData.receipt_number : null,
        accrual_date: formData.accrual_date,
        payment_date: formData.status !== 'pending' ? formData.payment_date : null,
        due_date: formData.due_date || null,
        transaction_date: formData.accrual_date,
        attachments: attachmentUrls.length > 0 ? attachmentUrls : null,
        attachment_required: isAttachmentRequired(),
        notes: formData.notes || null,
        recorded_by: user?.id,
        created_by: user?.id,
      }]);

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
    const matchesDoc = filterDocStatus === 'all' || t.doc_status === filterDocStatus;
    return matchesSearch && matchesType && matchesDoc;
  });

  const totals = {
    income: transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
    expense: transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
  };

  // Group COA by level 1 (groups)
  const coaGroups = coaAccounts.filter(a => a.level === 1);
  const coaRubros = coaAccounts.filter(a => a.level === 2);
  const coaDetalles = coaAccounts.filter(a => a.level === 3);

  // Build hierarchical COA selection
  const getCoaHierarchy = () => {
    const hierarchy: { group: COAAccount; rubros: { rubro: COAAccount; detalles: COAAccount[] }[] }[] = [];
    
    coaGroups.forEach(group => {
      const groupRubros = coaRubros.filter(r => r.parent_id === group.id);
      const rubrosWithDetalles = groupRubros.map(rubro => ({
        rubro,
        detalles: coaDetalles.filter(d => d.parent_id === rubro.id)
      }));
      hierarchy.push({ group, rubros: rubrosWithDetalles });
    });
    
    return hierarchy;
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
          <h1 className="text-2xl font-bold">Movimientos</h1>
          <p className="text-muted-foreground">{branch.name} - Ledger Contable</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Movimiento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Movimiento</DialogTitle>
              <DialogDescription>
                Ingresá los datos del movimiento contable
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

              <div className="grid grid-cols-2 gap-4">
                {/* Accrual Date (Devengado) */}
                <div className="space-y-2">
                  <Label>Fecha Devengado</Label>
                  <Input
                    type="date"
                    value={formData.accrual_date}
                    onChange={e => setFormData(f => ({ ...f, accrual_date: e.target.value }))}
                  />
                </div>

                {/* Payment Date */}
                <div className="space-y-2">
                  <Label>Fecha Pago</Label>
                  <Input
                    type="date"
                    value={formData.payment_date}
                    onChange={e => setFormData(f => ({ ...f, payment_date: e.target.value }))}
                    disabled={formData.status === 'pending'}
                  />
                </div>
              </div>

              {/* Due Date for eCheq */}
              {formData.payment_origin === 'echeq' && (
                <div className="space-y-2">
                  <Label>Fecha Vencimiento eCheq *</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={e => setFormData(f => ({ ...f, due_date: e.target.value }))}
                  />
                </div>
              )}

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

              {/* COA Selection - 3 Level */}
              <div className="space-y-2">
                <Label>Cuenta Contable (COA)</Label>
                <Select
                  value={formData.coa_account_id}
                  onValueChange={v => setFormData(f => ({ ...f, coa_account_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cuenta" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {getCoaHierarchy().map(({ group, rubros }) => (
                      <div key={group.id}>
                        <div className="px-2 py-1 text-xs font-bold bg-muted text-muted-foreground">
                          {group.code}. {group.name}
                        </div>
                        {rubros.map(({ rubro, detalles }) => (
                          <div key={rubro.id}>
                            <div className="px-4 py-1 text-xs font-semibold text-foreground/70">
                              {rubro.code} {rubro.name}
                            </div>
                            {detalles.map(detalle => (
                              <SelectItem key={detalle.id} value={detalle.id} className="pl-8">
                                {detalle.code} {detalle.name}
                              </SelectItem>
                            ))}
                            {detalles.length === 0 && (
                              <SelectItem value={rubro.id} className="pl-6">
                                {rubro.code} {rubro.name}
                              </SelectItem>
                            )}
                          </div>
                        ))}
                        {rubros.length === 0 && (
                          <SelectItem value={group.id} className="pl-4">
                            {group.code} {group.name}
                          </SelectItem>
                        )}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Finance Account (Caja, Banco, etc) */}
              <div className="space-y-2">
                <Label>Cuenta Financiera</Label>
                <Select
                  value={formData.account_id}
                  onValueChange={v => setFormData(f => ({ ...f, account_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Caja / Banco / MP..." />
                  </SelectTrigger>
                  <SelectContent>
                    {financeAccounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Origin */}
              <div className="space-y-2">
                <Label>Medio de Pago</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_ORIGINS.map(origin => (
                    <Button
                      key={origin.value}
                      type="button"
                      variant={formData.payment_origin === origin.value ? 'default' : 'outline'}
                      size="sm"
                      className="justify-start"
                      onClick={() => setFormData(f => ({ ...f, payment_origin: origin.value }))}
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
                </div>
              )}

              <Separator />

              {/* Doc Status (Blanco/Negro/Internal) */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Estado Documental</Label>
                <div className="grid grid-cols-3 gap-2">
                  {DOC_STATUS_OPTIONS.map(opt => (
                    <Button
                      key={opt.value}
                      type="button"
                      variant={formData.doc_status === opt.value ? 'default' : 'outline'}
                      size="sm"
                      className={formData.doc_status === opt.value ? '' : ''}
                      onClick={() => setFormData(f => ({ ...f, doc_status: opt.value as any }))}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Status (Pending/Paid/Partial) */}
              <div className="space-y-3">
                <Label>Estado de Pago</Label>
                <div className="grid grid-cols-3 gap-2">
                  {STATUS_OPTIONS.map(opt => (
                    <Button
                      key={opt.value}
                      type="button"
                      variant={formData.status === opt.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFormData(f => ({ ...f, status: opt.value as any }))}
                    >
                      <opt.icon className="w-4 h-4 mr-1" />
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Official receipt fields */}
              {formData.doc_status === 'documented' && (
                <div className="space-y-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
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

              {/* Attachment Upload */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  Adjuntos
                  {isAttachmentRequired() && (
                    <Badge variant="destructive" className="text-xs">Requerido</Badge>
                  )}
                </Label>
                <div 
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                    isAttachmentRequired() && attachmentFiles.length === 0 
                      ? 'border-destructive/50 bg-destructive/5' 
                      : 'border-muted-foreground/30 hover:border-primary/50'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {attachmentFiles.length > 0 ? (
                    <div className="flex flex-wrap gap-2 justify-center">
                      {attachmentFiles.map((f, i) => (
                        <Badge key={i} variant="secondary">{f.name}</Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Upload className="w-6 h-6" />
                      <span className="text-sm">Click para adjuntar comprobantes</span>
                    </div>
                  )}
                </div>
                {isAttachmentRequired() && (
                  <p className="text-xs text-muted-foreground">
                    {formData.payment_origin === 'cash' && 'Efectivo requiere recibo firmado/foto'}
                    {formData.payment_origin === 'transfer' && 'Transferencia requiere comprobante'}
                    {formData.payment_origin === 'echeq' && 'eCheq requiere comprobante + vencimiento'}
                    {formData.doc_status === 'documented' && ' | Documentado requiere factura'}
                  </p>
                )}
              </div>

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
            <Select value={filterDocStatus} onValueChange={(v: any) => setFilterDocStatus(v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo Doc</SelectItem>
                <SelectItem value="documented">Blanco</SelectItem>
                <SelectItem value="undocumented">Negro</SelectItem>
                <SelectItem value="internal">Interno</SelectItem>
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
                <TableHead>Cuenta</TableHead>
                <TableHead>Medio</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-center">Doc</TableHead>
                <TableHead className="text-center">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No hay movimientos registrados
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm">
                      {format(new Date(t.accrual_date || t.transaction_date), 'dd/MM/yy', { locale: es })}
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
                      {t.coa_accounts?.name || '-'}
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
                        variant="secondary"
                        className={`text-xs ${
                          t.doc_status === 'documented' ? 'bg-green-100 text-green-800' :
                          t.doc_status === 'undocumented' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {t.doc_status === 'documented' ? 'B' : t.doc_status === 'undocumented' ? 'N' : 'I'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {t.status === 'paid' && <CheckCircle2 className="w-4 h-4 text-success mx-auto" />}
                      {t.status === 'pending' && <Clock className="w-4 h-4 text-warning mx-auto" />}
                      {t.status === 'partial' && <AlertCircle className="w-4 h-4 text-orange-500 mx-auto" />}
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
