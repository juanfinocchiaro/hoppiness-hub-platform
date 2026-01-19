import { useState, useEffect } from 'react';
import { useParams, useOutletContext, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Plus, 
  Wallet,
  RefreshCw,
  Truck,
  Zap,
  Building2,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;
type Supplier = Tables<'suppliers'>;

interface GeneralPayment {
  id: string;
  concept: string;
  amount: number;
  category: string;
  date: string;
  notes: string | null;
  supplier_name?: string;
}

const EXPENSE_CATEGORIES = [
  { value: 'servicios', label: 'Servicios (luz, agua, gas, internet)' },
  { value: 'alquiler', label: 'Alquiler' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'insumos', label: 'Insumos de limpieza' },
  { value: 'marketing', label: 'Marketing y publicidad' },
  { value: 'impuestos', label: 'Impuestos y tasas' },
  { value: 'otros', label: 'Otros gastos' },
];

export default function LocalPagos() {
  const { branchId } = useParams<{ branchId: string }>();
  const { branch } = useOutletContext<{ branch: Branch | null }>();
  const { user } = useAuth();
  const { isAdmin, isFranquiciado, isGerente } = useUserRole();
  
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<GeneralPayment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [monthTotals, setMonthTotals] = useState({ servicios: 0, proveedores: 0, otros: 0 });
  
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    concept: '',
    amount: '',
    category: 'servicios',
    supplier_id: '',
    notes: '',
  });

  // Fetch suppliers
  useEffect(() => {
    async function fetchSuppliers() {
      const { data } = await supabase
        .from('suppliers')
        .select('*')
        .eq('is_active', true)
        .order('name');
      setSuppliers(data || []);
    }
    fetchSuppliers();
  }, []);

  // Fetch payments (expenses that are not RRHH)
  useEffect(() => {
    if (!branchId) return;
    
    async function fetchPayments() {
      setLoading(true);
      try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
          .from('transactions')
          .select('*, suppliers(name)')
          .eq('branch_id', branchId)
          .eq('type', 'expense')
          .gte('transaction_date', startOfMonth.toISOString().split('T')[0])
          .not('concept', 'ilike', '%RRHH%')
          .order('transaction_date', { ascending: false });

        if (error) throw error;

        const generalPayments: GeneralPayment[] = (data || []).map(t => ({
          id: t.id,
          concept: t.concept,
          amount: t.amount,
          category: t.concept.toLowerCase().includes('servicio') ? 'servicios' : 
                   t.supplier_id ? 'proveedores' : 'otros',
          date: t.transaction_date,
          notes: t.notes,
          supplier_name: (t.suppliers as any)?.name,
        }));

        setPayments(generalPayments);

        // Calculate totals
        const totals = generalPayments.reduce((acc, p) => {
          if (p.supplier_name) acc.proveedores += p.amount;
          else if (p.category === 'servicios') acc.servicios += p.amount;
          else acc.otros += p.amount;
          return acc;
        }, { servicios: 0, proveedores: 0, otros: 0 });

        setMonthTotals(totals);
      } catch (error) {
        console.error('Error fetching payments:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPayments();
  }, [branchId]);

  // Map category to category_group for ledger
  const getCategoryGroup = (category: string) => {
    switch (category) {
      case 'servicios':
      case 'alquiler':
      case 'mantenimiento':
        return 'Gastos Operativos';
      case 'impuestos':
        return 'Impuestos';
      case 'marketing':
        return 'Estructura';
      default:
        return 'Gastos Operativos';
    }
  };

  const handleRegisterPayment = async () => {
    if (!branchId || !paymentForm.concept || !paymentForm.amount) {
      toast.error('Completá concepto y monto');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          branch_id: branchId,
          type: 'expense',
          direction: 'expense',
          amount: parseFloat(paymentForm.amount),
          concept: paymentForm.concept,
          category_group: getCategoryGroup(paymentForm.category),
          supplier_id: paymentForm.supplier_id || null,
          notes: paymentForm.notes || null,
          payment_origin: 'cash',
          receipt_type: 'INTERNAL',
          recorded_by: user?.id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Pago registrado en ledger unificado');
      setShowPaymentDialog(false);
      setPaymentForm({ concept: '', amount: '', category: 'servicios', supplier_id: '', notes: '' });
      
      // Refresh with actual data from DB
      const newPayment: GeneralPayment = {
        id: data.id,
        concept: data.concept,
        amount: data.amount,
        category: paymentForm.category,
        date: data.transaction_date,
        notes: data.notes,
        supplier_name: suppliers.find(s => s.id === paymentForm.supplier_id)?.name,
      };
      setPayments(prev => [newPayment, ...prev]);
    } catch (error) {
      console.error('Error registering payment:', error);
      toast.error('Error al registrar el pago');
    }
  };

  const canManage = isAdmin || isFranquiciado || isGerente;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Pagos</h1>
          <p className="text-muted-foreground">Gastos operativos y servicios · {branch?.name}</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowPaymentDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Registrar Pago
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Zap className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Servicios</p>
                <p className="text-2xl font-bold">${monthTotals.servicios.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Truck className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Proveedores</p>
                <p className="text-2xl font-bold">${monthTotals.proveedores.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-900/30">
                <Building2 className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Otros Gastos</p>
                <p className="text-2xl font-bold">${monthTotals.otros.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="flex gap-2">
        <Link to={`/local/${branchId}/proveedores`}>
          <Button variant="outline" size="sm">
            <Truck className="h-4 w-4 mr-2" />
            Ver Proveedores
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pagos del Mes</CardTitle>
          <CardDescription>Servicios, proveedores y gastos operativos</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay pagos registrados este mes
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {format(new Date(payment.date + 'T12:00:00'), 'dd/MM', { locale: es })}
                    </TableCell>
                    <TableCell className="font-medium">{payment.concept}</TableCell>
                    <TableCell>
                      {payment.supplier_name ? (
                        <Badge variant="outline">{payment.supplier_name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${payment.amount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>Servicios, gastos operativos o proveedores</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select 
                value={paymentForm.category} 
                onValueChange={(v) => setPaymentForm(prev => ({ ...prev, category: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Concepto</Label>
              <Input
                placeholder="Ej: Factura de luz marzo"
                value={paymentForm.concept}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, concept: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Proveedor (opcional)</Label>
              <Select 
                value={paymentForm.supplier_id} 
                onValueChange={(v) => setPaymentForm(prev => ({ ...prev, supplier_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin proveedor</SelectItem>
                  {suppliers.map((sup) => (
                    <SelectItem key={sup.id} value={sup.id}>
                      {sup.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              <Label>Notas (opcional)</Label>
              <Textarea
                placeholder="Detalle adicional..."
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRegisterPayment}>
              Registrar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
