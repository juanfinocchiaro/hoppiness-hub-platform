import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, Download } from 'lucide-react';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface BranchResultsTabProps {
  branchId: string;
  branchName: string;
}

type Period = 'this_month' | 'last_month' | 'last_3_months';

export default function BranchResultsTab({ branchId, branchName }: BranchResultsTabProps) {
  const [period, setPeriod] = useState<Period>('this_month');

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'last_month':
        return {
          start: startOfMonth(subMonths(now, 1)),
          end: endOfMonth(subMonths(now, 1)),
          label: format(subMonths(now, 1), 'MMMM yyyy', { locale: es }),
        };
      case 'last_3_months':
        return {
          start: startOfMonth(subMonths(now, 2)),
          end: endOfMonth(now),
          label: 'Últimos 3 meses',
        };
      default:
        return {
          start: startOfMonth(now),
          end: endOfMonth(now),
          label: format(now, 'MMMM yyyy', { locale: es }),
        };
    }
  };

  const { start, end, label } = getDateRange();

  // Fetch sales
  const { data: salesData } = useQuery({
    queryKey: ['branch-results-sales', branchId, period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('total')
        .eq('branch_id', branchId)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .in('status', ['delivered', 'ready']);

      if (error) throw error;
      
      const grossSales = data?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
      const discounts = 0; // discount_amount doesn't exist, set to 0
      
      return { grossSales, discounts, netSales: grossSales - discounts };
    },
  });

  // Fetch expenses (transactions)
  const { data: expensesData } = useQuery({
    queryKey: ['branch-results-expenses', branchId, period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('amount, category:transaction_categories(name)')
        .eq('branch_id', branchId)
        .eq('type', 'expense')
        .gte('transaction_date', start.toISOString().split('T')[0])
        .lte('transaction_date', end.toISOString().split('T')[0]);

      if (error) throw error;

      // Group by category
      const grouped: Record<string, number> = {};
      data?.forEach((t) => {
        const catName = (t.category as any)?.name || 'Otros';
        grouped[catName] = (grouped[catName] || 0) + (t.amount || 0);
      });

      return grouped;
    },
  });

  const grossSales = salesData?.grossSales || 0;
  const discounts = salesData?.discounts || 0;
  const netSales = salesData?.netSales || 0;

  // Estimate CMV at 35% (should come from actual recipe costs)
  const cmv = netSales * 0.35;
  const grossMargin = netSales - cmv;
  const grossMarginPct = netSales > 0 ? (grossMargin / netSales) * 100 : 0;

  // Sum expenses
  const totalExpenses = Object.values(expensesData || {}).reduce((sum, v) => sum + v, 0);
  const operatingResult = grossMargin - totalExpenses;
  const operatingMarginPct = netSales > 0 ? (operatingResult / netSales) * 100 : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const ResultLine = ({
    label,
    amount,
    isTotal,
    isNegative,
    percentage,
  }: {
    label: string;
    amount: number;
    isTotal?: boolean;
    isNegative?: boolean;
    percentage?: number;
  }) => (
    <div
      className={`flex items-center justify-between py-2 ${
        isTotal ? 'font-bold border-t pt-3' : ''
      }`}
    >
      <span className={isTotal ? 'text-base' : 'text-muted-foreground'}>
        {isNegative && !isTotal && '(-) '}
        {label}
      </span>
      <div className="flex items-center gap-4">
        <span className={isNegative ? 'text-destructive' : ''}>
          {isNegative ? '-' : ''}
          {formatCurrency(Math.abs(amount))}
        </span>
        {percentage !== undefined && (
          <span className="text-sm text-muted-foreground w-12 text-right">
            {percentage.toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">Este mes</SelectItem>
              <SelectItem value="last_month">Mes anterior</SelectItem>
              <SelectItem value="last_3_months">Últimos 3 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar Excel
        </Button>
      </div>

      {/* P&L Statement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Estado de Resultados - {branchName}
          </CardTitle>
          <p className="text-sm text-muted-foreground capitalize">{label}</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* INGRESOS */}
          <div className="space-y-1">
            <h3 className="font-medium text-sm uppercase text-muted-foreground">Ingresos</h3>
            <ResultLine label="Ventas Brutas" amount={grossSales} />
            <ResultLine label="Descuentos" amount={discounts} isNegative />
            <ResultLine label="Ventas Netas" amount={netSales} isTotal />
          </div>

          <Separator className="my-4" />

          {/* COSTOS */}
          <div className="space-y-1">
            <h3 className="font-medium text-sm uppercase text-muted-foreground">Costos</h3>
            <ResultLine
              label="CMV (Costo de Mercadería)"
              amount={cmv}
              isNegative
              percentage={35}
            />
            <ResultLine
              label="Margen Bruto"
              amount={grossMargin}
              isTotal
              percentage={grossMarginPct}
            />
          </div>

          <Separator className="my-4" />

          {/* GASTOS OPERATIVOS */}
          <div className="space-y-1">
            <h3 className="font-medium text-sm uppercase text-muted-foreground">
              Gastos Operativos
            </h3>
            {Object.entries(expensesData || {}).map(([category, amount]) => (
              <ResultLine key={category} label={category} amount={amount} isNegative />
            ))}
            {Object.keys(expensesData || {}).length === 0 && (
              <p className="text-sm text-muted-foreground py-2">
                Sin gastos registrados en el período
              </p>
            )}
            <ResultLine label="Total Gastos" amount={totalExpenses} isNegative isTotal />
          </div>

          <Separator className="my-4" />

          {/* RESULTADO */}
          <ResultLine
            label="RESULTADO OPERATIVO"
            amount={operatingResult}
            isTotal
            percentage={operatingMarginPct}
          />
        </CardContent>
      </Card>
    </div>
  );
}
