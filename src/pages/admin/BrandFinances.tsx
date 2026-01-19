import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  RefreshCw, Calendar, Plus, Building2, DollarSign, 
  TrendingUp, Receipt, Eye, EyeOff, Landmark
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

type PeriodType = 'current' | 'previous' | 'quarter';

interface BrandTransaction {
  id: string;
  concept: string;
  amount: number;
  type: 'income' | 'expense';
  receipt_type: 'OFFICIAL' | 'INTERNAL';
  category_name: string;
  date: string;
  branch_name?: string;
}

interface BranchCanon {
  branch_id: string;
  branch_name: string;
  canon_amount: number;
  royalty_percent: number;
  monthly_revenue: number;
}

export default function BrandFinances() {
  const { isAdmin, isFranquiciado, accessibleBranches, loading: roleLoading } = useUserRole();
  const [period, setPeriod] = useState<PeriodType>('current');
  const [loading, setLoading] = useState(true);
  const [managerialMode, setManagerialMode] = useState(true);
  const [transactions, setTransactions] = useState<BrandTransaction[]>([]);
  const [branchCanons, setBranchCanons] = useState<BranchCanon[]>([]);
  const [showNewExpenseDialog, setShowNewExpenseDialog] = useState(false);
  
  const [expenseForm, setExpenseForm] = useState({
    concept: '',
    amount: '',
    receipt_type: 'OFFICIAL' as 'OFFICIAL' | 'INTERNAL',
    notes: ''
  });

  const canToggleMode = isAdmin || isFranquiciado;

  const getPeriodDates = (p: PeriodType): { start: Date; end: Date } => {
    const now = new Date();
    switch (p) {
      case 'current':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'previous':
        const prevMonth = subMonths(now, 1);
        return { start: startOfMonth(prevMonth), end: endOfMonth(prevMonth) };
      case 'quarter':
        const threeMonthsAgo = subMonths(now, 3);
        return { start: startOfMonth(threeMonthsAgo), end: endOfMonth(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const fetchBrandData = async () => {
    setLoading(true);
    try {
      const { start, end } = getPeriodDates(period);
      
      // Fetch brand-level transactions (those with branch_id = null or marked as brand)
      // For now, we'll simulate brand expenses as a concept search
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select(`
          id, concept, amount, type, receipt_type, transaction_date,
          category:transaction_categories(name),
          branch:branches(name)
        `)
        .gte('transaction_date', format(start, 'yyyy-MM-dd'))
        .lte('transaction_date', format(end, 'yyyy-MM-dd'))
        .or('concept.ilike.%MARCA%,concept.ilike.%CANON%,concept.ilike.%FRANQUICIA%,concept.ilike.%CENTRAL%')
        .order('transaction_date', { ascending: false });

      if (txError) throw txError;

      const formattedTx: BrandTransaction[] = (txData || []).map(t => ({
        id: t.id,
        concept: t.concept,
        amount: t.amount,
        type: t.type as 'income' | 'expense',
        receipt_type: t.receipt_type as 'OFFICIAL' | 'INTERNAL',
        category_name: t.category?.name || 'Sin categoría',
        date: t.transaction_date,
        branch_name: t.branch?.name
      }));

      setTransactions(formattedTx);

      // Calculate estimated canon per branch (simulated - 5% royalty on revenue)
      const { data: ordersData } = await supabase
        .from('orders')
        .select('branch_id, total, status')
        .gte('created_at', format(start, 'yyyy-MM-dd'))
        .lte('created_at', format(end, 'yyyy-MM-dd'))
        .eq('status', 'delivered');

      const revenueByBranch: Record<string, number> = {};
      (ordersData || []).forEach(order => {
        if (!revenueByBranch[order.branch_id]) {
          revenueByBranch[order.branch_id] = 0;
        }
        revenueByBranch[order.branch_id] += order.total || 0;
      });

      const canonData: BranchCanon[] = accessibleBranches.map(branch => ({
        branch_id: branch.id,
        branch_name: branch.name,
        monthly_revenue: revenueByBranch[branch.id] || 0,
        royalty_percent: 5, // Fixed 5% royalty
        canon_amount: (revenueByBranch[branch.id] || 0) * 0.05
      }));

      setBranchCanons(canonData);

    } catch (error: any) {
      console.error('Error fetching brand data:', error);
      toast.error('Error al cargar datos de marca');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!roleLoading) {
      fetchBrandData();
    }
  }, [period, roleLoading]);

  const handleAddExpense = async () => {
    if (!expenseForm.concept || !expenseForm.amount) {
      toast.error('Completá concepto y monto');
      return;
    }

    try {
      // Get or create a brand expense category
      let categoryId: string | null = null;
      const { data: catData } = await supabase
        .from('transaction_categories')
        .select('id')
        .eq('name', 'Gastos Marca Central')
        .single();

      if (catData) {
        categoryId = catData.id;
      }

      // For brand expenses, we use the first branch as a proxy since branch_id is required
      const proxyBranchId = accessibleBranches[0]?.id;
      if (!proxyBranchId) {
        toast.error('No hay sucursales disponibles');
        return;
      }

      // Insert as expense - use type assertion for enum compatibility
      const insertData = {
        branch_id: proxyBranchId,
        type: 'expense' as const,
        amount: parseFloat(expenseForm.amount),
        concept: `MARCA - ${expenseForm.concept}`,
        category_id: categoryId,
        receipt_type: expenseForm.receipt_type as 'OFFICIAL' | 'INTERNAL',
        payment_origin: 'bank_transfer' as const,
        notes: expenseForm.notes || null,
        transaction_date: new Date().toISOString().split('T')[0]
      };
      
      const { error } = await supabase
        .from('transactions')
        .insert([insertData]);

      if (error) throw error;

      toast.success('Gasto de marca registrado');
      setShowNewExpenseDialog(false);
      setExpenseForm({ concept: '', amount: '', receipt_type: 'OFFICIAL', notes: '' });
      fetchBrandData();
    } catch (error: any) {
      console.error('Error adding expense:', error);
      toast.error('Error al registrar gasto');
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(value);

  const { start, end } = getPeriodDates(period);
  const periodLabel = `${format(start, "d 'de' MMMM", { locale: es })} - ${format(end, "d 'de' MMMM, yyyy", { locale: es })}`;

  // Totals
  const totalCanon = branchCanons.reduce((sum, b) => sum + b.canon_amount, 0);
  const totalBrandExpenses = transactions
    .filter(t => t.type === 'expense')
    .filter(t => managerialMode || t.receipt_type === 'OFFICIAL')
    .reduce((sum, t) => sum + t.amount, 0);
  const brandResult = totalCanon - totalBrandExpenses;

  if (roleLoading) {
    return (
      <div className="flex justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Finanzas Marca</h1>
          <p className="text-muted-foreground">{periodLabel}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {canToggleMode && (
            <div className="flex items-center gap-3 p-3 bg-sidebar rounded-lg border border-sidebar-border">
              <div className="flex items-center gap-2">
                {managerialMode ? (
                  <Eye className="h-4 w-4 text-primary" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
                <Label htmlFor="mode-switch" className="text-sm font-medium cursor-pointer">
                  {managerialMode ? 'Vista Real' : 'Vista Fiscal'}
                </Label>
              </div>
              <Switch
                id="mode-switch"
                checked={managerialMode}
                onCheckedChange={setManagerialMode}
              />
            </div>
          )}

          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Este mes</SelectItem>
              <SelectItem value="previous">Mes anterior</SelectItem>
              <SelectItem value="quarter">Último trimestre</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={fetchBrandData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Mode Indicator */}
      <div className="flex items-center gap-2">
        <Badge variant={managerialMode ? 'default' : 'secondary'} className="text-xs">
          {managerialMode ? 'Incluye movimientos internos' : 'Solo movimientos fiscales'}
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-green-500/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Canon Estimado</CardTitle>
            <Landmark className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalCanon)}</div>
            <p className="text-xs text-muted-foreground">5% sobre ventas de locales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Gastos Marca</CardTitle>
            <DollarSign className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(totalBrandExpenses)}</div>
          </CardContent>
        </Card>

        <Card className={brandResult >= 0 ? 'bg-green-500/5 border-green-500/20' : 'bg-destructive/5 border-destructive/20'}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Resultado Marca</CardTitle>
            <TrendingUp className={`h-4 w-4 ${brandResult >= 0 ? 'text-green-500' : 'text-destructive'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${brandResult >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {formatCurrency(brandResult)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Locales Activos</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{branchCanons.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Canon by Branch */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Canon por Sucursal</CardTitle>
            <CardDescription>Royalty 5% sobre facturación</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sucursal</TableHead>
                  <TableHead className="text-right">Facturación</TableHead>
                  <TableHead className="text-right">Royalty %</TableHead>
                  <TableHead className="text-right">Canon</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branchCanons.map((branch) => (
                  <TableRow key={branch.branch_id}>
                    <TableCell className="font-medium">{branch.branch_name}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(branch.monthly_revenue)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{branch.royalty_percent}%</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-green-600">
                      {formatCurrency(branch.canon_amount)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(branchCanons.reduce((s, b) => s + b.monthly_revenue, 0))}
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right text-green-600">
                    {formatCurrency(totalCanon)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Brand Expenses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gastos de Marca Central</CardTitle>
            <CardDescription>Gastos operativos a nivel de franquicia/marca</CardDescription>
          </div>
          {isAdmin && (
            <Button onClick={() => setShowNewExpenseDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Registrar Gasto
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay gastos de marca registrados este período
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Comprobante</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions
                  .filter(t => t.type === 'expense')
                  .filter(t => managerialMode || t.receipt_type === 'OFFICIAL')
                  .map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        {format(new Date(tx.date + 'T12:00:00'), 'dd/MM', { locale: es })}
                      </TableCell>
                      <TableCell className="font-medium">{tx.concept}</TableCell>
                      <TableCell>
                        <Badge variant={tx.receipt_type === 'OFFICIAL' ? 'default' : 'secondary'}>
                          {tx.receipt_type === 'OFFICIAL' ? 'Fiscal' : 'Interno'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-destructive">
                        -{formatCurrency(tx.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog: New Brand Expense */}
      <Dialog open={showNewExpenseDialog} onOpenChange={setShowNewExpenseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Gasto de Marca</DialogTitle>
            <DialogDescription>Gastos a nivel central de la franquicia</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Concepto</Label>
              <Input
                placeholder="Ej: Marketing corporativo, Sistemas, Asesoría legal"
                value={expenseForm.concept}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, concept: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input
                type="number"
                placeholder="0"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Comprobante</Label>
              <Select 
                value={expenseForm.receipt_type} 
                onValueChange={(v) => setExpenseForm(prev => ({ ...prev, receipt_type: v as 'OFFICIAL' | 'INTERNAL' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OFFICIAL">Con factura (Fiscal)</SelectItem>
                  <SelectItem value="INTERNAL">Sin comprobante (Interno)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                placeholder="Detalle adicional..."
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewExpenseDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddExpense}>
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
