import { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  TrendingUp,
  TrendingDown,
  FileSpreadsheet,
  Download,
  Calendar,
  DollarSign,
  ArrowRightLeft,
  Wallet,
  Package,
  BarChart3
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';
import ProductRankingChart from '@/components/reports/ProductRankingChart';
import MarginAnalysis from '@/components/reports/MarginAnalysis';
import IngredientConsumption from '@/components/reports/IngredientConsumption';

type Branch = Tables<'branches'>;

interface Transaction {
  id: string;
  branch_id: string;
  amount: number;
  type: 'income' | 'expense';
  category_group: string | null;
  concept: string;
  accrual_date: string | null;
  payment_date: string | null;
  account_id: string | null;
  doc_status: string | null;
  status: string;
}

interface FinanceAccount {
  id: string;
  code: string;
  name: string;
  account_type: string;
}

interface LocalContext {
  branch: Branch;
}

const COA_GROUPS_ORDER = [
  'INGRESOS',
  'CMV',
  'GASTOS_OPERATIVOS',
  'COMERCIALIZACION',
  'LOGISTICA',
  'ESTRUCTURA',
  'RRHH',
  'ADMINISTRACION',
  'IMPUESTOS',
  'FINANCIEROS',
  'INVERSIONES',
  'DEUDA',
  'MOVIMIENTOS',
];

const GROUP_LABELS: Record<string, string> = {
  INGRESOS: 'Ingresos',
  CMV: 'Costo de Mercadería',
  GASTOS_OPERATIVOS: 'Gastos Operativos',
  COMERCIALIZACION: 'Comercialización',
  LOGISTICA: 'Logística',
  ESTRUCTURA: 'Servicios/Ocupación',
  RRHH: 'RRHH',
  ADMINISTRACION: 'Administración',
  IMPUESTOS: 'Impuestos',
  FINANCIEROS: 'Financieros',
  INVERSIONES: 'Inversiones',
  DEUDA: 'Movimientos Deuda',
  MOVIMIENTOS: 'Movimientos de Caja',
};

export default function LocalFinanceReports() {
  const { branch } = useOutletContext<LocalContext>();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [viewMode, setViewMode] = useState<'economic' | 'cashflow'>('economic');
  const [docFilter, setDocFilter] = useState<'all' | 'documented' | 'internal'>('all');

  const fetchData = async () => {
    setLoading(true);
    
    const dateField = viewMode === 'economic' ? 'accrual_date' : 'payment_date';
    
    const [txRes, accRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('*')
        .eq('branch_id', branch.id)
        .gte(dateField, dateFrom)
        .lte(dateField, dateTo)
        .order(dateField, { ascending: false }),
      supabase
        .from('finance_accounts')
        .select('*')
        .eq('branch_id', branch.id)
        .eq('is_active', true)
        .order('display_order'),
    ]);

    if (txRes.data) setTransactions(txRes.data as Transaction[]);
    if (accRes.data) setAccounts(accRes.data);
    
    setLoading(false);
  };

  useEffect(() => {
    if (branch?.id) fetchData();
  }, [branch?.id, dateFrom, dateTo, viewMode]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (docFilter === 'all') return true;
      if (docFilter === 'documented') return t.doc_status === 'documented';
      if (docFilter === 'internal') return t.doc_status === 'internal' || t.doc_status === 'undocumented';
      return true;
    });
  }, [transactions, docFilter]);

  // P&L Calculation (Economic Result by accrual_date)
  const plData = useMemo(() => {
    const grouped: Record<string, { income: number; expense: number }> = {};
    
    filteredTransactions.forEach(tx => {
      const group = tx.category_group || 'OTROS';
      if (!grouped[group]) grouped[group] = { income: 0, expense: 0 };
      
      if (tx.type === 'income') {
        grouped[group].income += Number(tx.amount);
      } else {
        grouped[group].expense += Number(tx.amount);
      }
    });

    const rows = COA_GROUPS_ORDER
      .filter(g => grouped[g])
      .map(group => ({
        group,
        label: GROUP_LABELS[group] || group,
        income: grouped[group]?.income || 0,
        expense: grouped[group]?.expense || 0,
        net: (grouped[group]?.income || 0) - (grouped[group]?.expense || 0),
      }));

    const totals = rows.reduce(
      (acc, r) => ({
        income: acc.income + r.income,
        expense: acc.expense + r.expense,
        net: acc.net + r.net,
      }),
      { income: 0, expense: 0, net: 0 }
    );

    return { rows, totals };
  }, [filteredTransactions]);

  // Cashflow by account
  const cashflowData = useMemo(() => {
    const byAccount: Record<string, { inflows: number; outflows: number }> = {};
    
    filteredTransactions.forEach(tx => {
      const accountCode = tx.account_id || 'EFECTIVO';
      if (!byAccount[accountCode]) byAccount[accountCode] = { inflows: 0, outflows: 0 };
      
      if (tx.type === 'income') {
        byAccount[accountCode].inflows += Number(tx.amount);
      } else {
        byAccount[accountCode].outflows += Number(tx.amount);
      }
    });

    const rows = accounts.map(acc => ({
      code: acc.code,
      name: acc.name,
      inflows: byAccount[acc.code]?.inflows || 0,
      outflows: byAccount[acc.code]?.outflows || 0,
      net: (byAccount[acc.code]?.inflows || 0) - (byAccount[acc.code]?.outflows || 0),
    }));

    const totals = rows.reduce(
      (acc, r) => ({
        inflows: acc.inflows + r.inflows,
        outflows: acc.outflows + r.outflows,
        net: acc.net + r.net,
      }),
      { inflows: 0, outflows: 0, net: 0 }
    );

    return { rows, totals };
  }, [filteredTransactions, accounts]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount);

  const handleExport = () => {
    const data = viewMode === 'economic' 
      ? plData.rows.map(r => ({
          Rubro: r.label,
          Ingresos: r.income,
          Egresos: r.expense,
          Neto: r.net,
        }))
      : cashflowData.rows.map(r => ({
          Cuenta: r.name,
          Entradas: r.inflows,
          Salidas: r.outflows,
          Neto: r.net,
        }));

    const csv = [
      Object.keys(data[0] || {}).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${viewMode === 'economic' ? 'P&L' : 'Cashflow'}_${dateFrom}_${dateTo}.csv`;
    link.click();
  };

  const setQuickPeriod = (months: number) => {
    const end = endOfMonth(new Date());
    const start = startOfMonth(subMonths(new Date(), months - 1));
    setDateFrom(format(start, 'yyyy-MM-dd'));
    setDateTo(format(end, 'yyyy-MM-dd'));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <HoppinessLoader size="md" text="Cargando reportes" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reportes Financieros</h1>
          <p className="text-muted-foreground">
            {viewMode === 'economic' ? 'Estado de Resultados (P&L)' : 'Flujo de Caja (Cashflow)'}
          </p>
        </div>
        
        <Button variant="outline" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Vista</Label>
              <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="economic">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4" />
                      P&L (Devengado)
                    </div>
                  </SelectItem>
                  <SelectItem value="cashflow">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      Cashflow (Pagos)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Desde</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-[150px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Hasta</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-[150px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo Doc.</Label>
              <Select value={docFilter} onValueChange={(v: any) => setDocFilter(v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="documented">Documentado</SelectItem>
                  <SelectItem value="internal">Interno</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setQuickPeriod(1)}>Este Mes</Button>
              <Button variant="outline" size="sm" onClick={() => setQuickPeriod(3)}>3 Meses</Button>
              <Button variant="outline" size="sm" onClick={() => setQuickPeriod(12)}>12 Meses</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {viewMode === 'economic' ? 'Ingresos' : 'Entradas'}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(viewMode === 'economic' ? plData.totals.income : cashflowData.totals.inflows)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {viewMode === 'economic' ? 'Egresos' : 'Salidas'}
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(viewMode === 'economic' ? plData.totals.expense : cashflowData.totals.outflows)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {viewMode === 'economic' ? 'Resultado Neto' : 'Flujo Neto'}
            </CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(viewMode === 'economic' ? plData.totals.net : cashflowData.totals.net) >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {formatCurrency(viewMode === 'economic' ? plData.totals.net : cashflowData.totals.net)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Table */}
      <Card>
        <CardContent className="pt-6">
          {viewMode === 'economic' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rubro</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                  <TableHead className="text-right">Egresos</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plData.rows.map(row => (
                  <TableRow key={row.group}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell className="text-right text-green-600">
                      {row.income > 0 ? formatCurrency(row.income) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      {row.expense > 0 ? formatCurrency(row.expense) : '-'}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${row.net >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {formatCurrency(row.net)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right text-green-600">{formatCurrency(plData.totals.income)}</TableCell>
                  <TableCell className="text-right text-destructive">{formatCurrency(plData.totals.expense)}</TableCell>
                  <TableCell className={`text-right ${plData.totals.net >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {formatCurrency(plData.totals.net)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cuenta</TableHead>
                  <TableHead className="text-right">Entradas</TableHead>
                  <TableHead className="text-right">Salidas</TableHead>
                  <TableHead className="text-right">Flujo Neto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cashflowData.rows.map(row => (
                  <TableRow key={row.code}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-right text-green-600">
                      {row.inflows > 0 ? formatCurrency(row.inflows) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      {row.outflows > 0 ? formatCurrency(row.outflows) : '-'}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${row.net >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {formatCurrency(row.net)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right text-green-600">{formatCurrency(cashflowData.totals.inflows)}</TableCell>
                  <TableCell className="text-right text-destructive">{formatCurrency(cashflowData.totals.outflows)}</TableCell>
                  <TableCell className={`text-right ${cashflowData.totals.net >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {formatCurrency(cashflowData.totals.net)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Product Reports Section */}
      <div className="pt-6 border-t">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Reportes de Productos
        </h2>
        
        <div className="grid gap-6 lg:grid-cols-2">
          <ProductRankingChart 
            branchId={branch.id} 
            startDate={new Date(dateFrom)}
            endDate={new Date(dateTo)}
          />
          <MarginAnalysis branchId={branch.id} />
        </div>
        
        <div className="mt-6">
          <IngredientConsumption branchId={branch.id} days={30} />
        </div>
      </div>
    </div>
  );
}
