import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Users, Search, Plus, Minus, DollarSign, TrendingUp, CreditCard } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type Branch = Tables<'branches'>;
type Customer = Tables<'customers'>;
type BranchCustomerAccount = Tables<'branch_customer_accounts'>;

interface ContextType {
  branch: Branch;
}

interface CustomerWithAccount extends Customer {
  account: BranchCustomerAccount | null;
}

type MovementType = 'credit' | 'payment';

export default function LocalCustomers() {
  const { branch } = useOutletContext<ContextType>();
  const [customers, setCustomers] = useState<CustomerWithAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showWithBalance, setShowWithBalance] = useState(false);
  
  // Movement dialog
  const [movementOpen, setMovementOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithAccount | null>(null);
  const [movementType, setMovementType] = useState<MovementType>('payment');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementNotes, setMovementNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, [branch.id]);

  async function fetchCustomers() {
    setLoading(true);
    const [customersRes, accountsRes] = await Promise.all([
      supabase.from('customers').select('*').eq('is_active', true).order('full_name'),
      supabase.from('branch_customer_accounts').select('*').eq('branch_id', branch.id),
    ]);

    if (customersRes.data) {
      const accountsMap = new Map(
        (accountsRes.data || []).map(acc => [acc.customer_id, acc])
      );
      
      setCustomers(
        customersRes.data.map(cust => ({
          ...cust,
          account: accountsMap.get(cust.id) || null,
        }))
      );
    }
    setLoading(false);
  }

  const filteredCustomers = customers.filter(cust => {
    const matchesSearch = 
      cust.full_name.toLowerCase().includes(search.toLowerCase()) ||
      cust.phone?.includes(search) ||
      cust.email?.toLowerCase().includes(search.toLowerCase());
    
    if (showWithBalance && (cust.account?.balance || 0) === 0) return false;
    return matchesSearch;
  });

  const openMovement = (customer: CustomerWithAccount) => {
    setSelectedCustomer(customer);
    setMovementType('payment');
    setMovementAmount('');
    setMovementNotes('');
    setMovementOpen(true);
  };

  const handleMovement = async () => {
    if (!selectedCustomer || !movementAmount) return;
    
    const amount = parseFloat(movementAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Monto inválido');
      return;
    }

    setIsSubmitting(true);
    try {
      // Ensure account exists
      let accountId = selectedCustomer.account?.id;
      
      if (!accountId) {
        const { data: newAccount, error: accError } = await supabase
          .from('branch_customer_accounts')
          .insert({
            branch_id: branch.id,
            customer_id: selectedCustomer.id,
            balance: 0,
          })
          .select()
          .single();
        
        if (accError) throw accError;
        accountId = newAccount.id;
      }

      // Insert movement (trigger will update balance)
      const finalAmount = movementType === 'credit' ? amount : -amount;
      
      const { error: moveError } = await supabase
        .from('customer_account_movements')
        .insert({
          account_id: accountId,
          amount: finalAmount,
          type: movementType,
          notes: movementNotes || null,
        });

      if (moveError) throw moveError;

      toast.success(movementType === 'payment' ? 'Pago registrado' : 'Crédito agregado');
      setMovementOpen(false);
      fetchCustomers();
    } catch (error) {
      console.error(error);
      toast.error('Error al registrar movimiento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const totalBalance = customers.reduce((sum, c) => sum + (c.account?.balance || 0), 0);
  const customersWithBalance = customers.filter(c => (c.account?.balance || 0) > 0).length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cuenta Corriente Clientes</h1>
          <p className="text-muted-foreground">Gestión de cuentas de clientes en esta sucursal</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Clientes</p>
                <p className="text-2xl font-bold">{customers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-sm text-muted-foreground">Con Saldo</p>
                <p className="text-2xl font-bold">{customersWithBalance}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={totalBalance > 0 ? 'border-amber-500' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-sm text-muted-foreground">Saldo Total</p>
                <p className="text-2xl font-bold">{formatPrice(totalBalance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={showWithBalance ? 'default' : 'outline'}
          onClick={() => setShowWithBalance(!showWithBalance)}
        >
          <CreditCard className="w-4 h-4 mr-2" />
          Con Saldo
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-right">Límite</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map(cust => {
                  const balance = cust.account?.balance || 0;
                  const limit = cust.account?.credit_limit;

                  return (
                    <TableRow key={cust.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{cust.full_name}</p>
                          {cust.dni && (
                            <p className="text-xs text-muted-foreground">DNI: {cust.dni}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {cust.phone && <p>{cust.phone}</p>}
                          {cust.email && <p className="text-muted-foreground">{cust.email}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={balance > 0 ? 'destructive' : 'secondary'}>
                          {formatPrice(balance)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {limit ? formatPrice(limit) : '—'}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => openMovement(cust)}>
                          <DollarSign className="w-4 h-4 mr-1" />
                          Movimiento
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredCustomers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No se encontraron clientes
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Movement Dialog */}
      <Dialog open={movementOpen} onOpenChange={setMovementOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Movimiento</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedCustomer.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  Saldo actual: {formatPrice(selectedCustomer.account?.balance || 0)}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Movimiento</Label>
                <Select value={movementType} onValueChange={(v) => setMovementType(v as MovementType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="payment">
                      <span className="flex items-center gap-2">
                        <Minus className="w-3 h-3 text-green-600" />
                        Pago (reduce saldo)
                      </span>
                    </SelectItem>
                    <SelectItem value="credit">
                      <span className="flex items-center gap-2">
                        <Plus className="w-3 h-3 text-red-600" />
                        Crédito (aumenta saldo)
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Monto ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Textarea
                  value={movementNotes}
                  onChange={(e) => setMovementNotes(e.target.value)}
                  placeholder="Detalle del movimiento..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMovementOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleMovement} disabled={isSubmitting || !movementAmount}>
              {isSubmitting ? 'Guardando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
