import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Phone, Mail, MapPin, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface SupplierBalance {
  supplier_id: string;
  supplier_name: string;
  branch_id: string;
  branch_name: string;
  total_purchased: number;
  total_paid: number;
  current_balance: number;
}

interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
}

interface Movement {
  id: string;
  date: string;
  type: 'purchase' | 'payment';
  concept: string;
  amount: number;
  receipt_type?: string;
  payment_origin?: string;
}

export default function LocalSuppliers() {
  const { branchId } = useParams<{ branchId: string }>();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [balances, setBalances] = useState<SupplierBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  useEffect(() => {
    if (branchId) {
      fetchSuppliers();
      fetchBalances();
    }
  }, [branchId]);

  const fetchSuppliers = async () => {
    try {
      // First get suppliers linked to this branch
      const { data: branchSuppliers, error: bsError } = await supabase
        .from('branch_suppliers')
        .select('supplier_id')
        .eq('branch_id', branchId!);

      if (bsError) throw bsError;

      const supplierIds = branchSuppliers?.map(bs => bs.supplier_id) || [];

      if (supplierIds.length === 0) {
        // If no linked suppliers, get all active suppliers
        const { data, error } = await supabase
          .from('suppliers')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        setSuppliers(data || []);
      } else {
        const { data, error } = await supabase
          .from('suppliers')
          .select('*')
          .in('id', supplierIds)
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        setSuppliers(data || []);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  };

  const fetchBalances = async () => {
    try {
      const { data, error } = await supabase
        .from('supplier_balances')
        .select('*')
        .eq('branch_id', branchId!);

      if (error) throw error;
      setBalances(data || []);
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  };

  const fetchMovements = async (supplierId: string) => {
    setLoadingMovements(true);
    try {
      // Fetch purchases (transactions linked to supplier)
      const { data: purchases, error: purchasesError } = await supabase
        .from('transactions')
        .select('id, transaction_date, concept, amount, receipt_type')
        .eq('branch_id', branchId!)
        .eq('supplier_id', supplierId)
        .eq('type', 'expense')
        .eq('is_payment_to_supplier', false)
        .order('transaction_date', { ascending: false });

      if (purchasesError) throw purchasesError;

      // Fetch payments to supplier
      const { data: payments, error: paymentsError } = await supabase
        .from('supplier_payments')
        .select('id, payment_date, notes, amount, payment_origin')
        .eq('branch_id', branchId!)
        .eq('supplier_id', supplierId)
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Also fetch transactions marked as payment to supplier
      const { data: txPayments, error: txError } = await supabase
        .from('transactions')
        .select('id, transaction_date, concept, amount, payment_origin')
        .eq('branch_id', branchId!)
        .eq('supplier_id', supplierId)
        .eq('is_payment_to_supplier', true)
        .order('transaction_date', { ascending: false });

      if (txError) throw txError;

      // Combine and sort all movements
      const allMovements: Movement[] = [
        ...(purchases || []).map(p => ({
          id: p.id,
          date: p.transaction_date,
          type: 'purchase' as const,
          concept: p.concept,
          amount: p.amount,
          receipt_type: p.receipt_type
        })),
        ...(payments || []).map(p => ({
          id: p.id,
          date: p.payment_date,
          type: 'payment' as const,
          concept: p.notes || 'Pago a proveedor',
          amount: p.amount,
          payment_origin: p.payment_origin
        })),
        ...(txPayments || []).map(p => ({
          id: p.id,
          date: p.transaction_date,
          type: 'payment' as const,
          concept: p.concept,
          amount: p.amount,
          payment_origin: p.payment_origin
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setMovements(allMovements);
    } catch (error) {
      console.error('Error fetching movements:', error);
      toast.error('Error al cargar movimientos');
    } finally {
      setLoadingMovements(false);
    }
  };

  const getSupplierBalance = (supplierId: string): number => {
    const balance = balances.find(b => b.supplier_id === supplierId);
    return balance?.current_balance || 0;
  };

  const handleSupplierClick = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    fetchMovements(supplier.id);
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.contact_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalDebt = balances.reduce((sum, b) => sum + (b.current_balance > 0 ? b.current_balance : 0), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatPaymentOrigin = (origin: string) => {
    const labels: Record<string, string> = {
      cash: 'Efectivo',
      mercadopago: 'MercadoPago',
      bank_transfer: 'Transferencia',
      credit_card: 'Tarjeta'
    };
    return labels[origin] || origin;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Proveedores</h1>
          <p className="text-muted-foreground">Gestión de cuentas corrientes</p>
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-destructive/10">
              <DollarSign className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Deuda Total con Proveedores</p>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(totalDebt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar proveedor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Suppliers List */}
      <div className="grid gap-4">
        {filteredSuppliers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No hay proveedores registrados</p>
            </CardContent>
          </Card>
        ) : (
          filteredSuppliers.map((supplier) => {
            const balance = getSupplierBalance(supplier.id);
            const hasDebt = balance > 0;

            return (
              <Card
                key={supplier.id}
                className="hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => handleSupplierClick(supplier)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-foreground">{supplier.name}</h3>
                        {supplier.contact_name && (
                          <span className="text-sm text-muted-foreground">
                            ({supplier.contact_name})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        {supplier.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {supplier.phone}
                          </span>
                        )}
                        {supplier.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {supplier.email}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-1">Saldo Actual</p>
                      <p className={`text-lg font-bold ${hasDebt ? 'text-destructive' : 'text-green-500'}`}>
                        {formatCurrency(balance)}
                      </p>
                      {hasDebt && (
                        <Badge variant="destructive" className="mt-1 text-xs">
                          Debemos
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Supplier Detail Drawer */}
      <Sheet open={!!selectedSupplier} onOpenChange={() => setSelectedSupplier(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selectedSupplier?.name}</SheetTitle>
          </SheetHeader>

          {selectedSupplier && (
            <div className="mt-6 space-y-6">
              {/* Supplier Info */}
              <div className="space-y-2 text-sm">
                {selectedSupplier.contact_name && (
                  <p className="text-muted-foreground">
                    Contacto: <span className="text-foreground">{selectedSupplier.contact_name}</span>
                  </p>
                )}
                {selectedSupplier.phone && (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span className="text-foreground">{selectedSupplier.phone}</span>
                  </p>
                )}
                {selectedSupplier.email && (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="text-foreground">{selectedSupplier.email}</span>
                  </p>
                )}
                {selectedSupplier.address && (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="text-foreground">{selectedSupplier.address}</span>
                  </p>
                )}
              </div>

              {/* Balance Summary */}
              <Card>
                <CardContent className="py-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Saldo Actual</p>
                    <p className={`text-3xl font-bold ${getSupplierBalance(selectedSupplier.id) > 0 ? 'text-destructive' : 'text-green-500'}`}>
                      {formatCurrency(getSupplierBalance(selectedSupplier.id))}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Separator />

              {/* Movements History */}
              <div>
                <h4 className="font-semibold mb-4">Historial de Movimientos</h4>
                
                {loadingMovements ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : movements.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Sin movimientos registrados
                  </p>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3 pr-4">
                      {movements.map((movement) => (
                        <div
                          key={movement.id}
                          className="flex items-start justify-between p-3 rounded-lg bg-muted/50 border"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-full ${
                              movement.type === 'purchase' 
                                ? 'bg-destructive/10' 
                                : 'bg-green-500/10'
                            }`}>
                              {movement.type === 'purchase' ? (
                                <TrendingUp className="h-4 w-4 text-destructive" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-foreground text-sm">
                                {movement.concept}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(movement.date), "d 'de' MMMM, yyyy", { locale: es })}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                {movement.type === 'purchase' ? (
                                  <Badge variant="outline" className="text-xs">
                                    {movement.receipt_type === 'OFFICIAL' ? 'FIS' : 'INT'}
                                  </Badge>
                                ) : movement.payment_origin && (
                                  <Badge variant="secondary" className="text-xs">
                                    {formatPaymentOrigin(movement.payment_origin)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${
                              movement.type === 'purchase' 
                                ? 'text-destructive' 
                                : 'text-green-500'
                            }`}>
                              {movement.type === 'purchase' ? '+' : '-'}
                              {formatCurrency(movement.amount)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {movement.type === 'purchase' ? 'Compra' : 'Pago'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
