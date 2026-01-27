/**
 * BrandDailySalesTable - Tabla consolidada de ventas diarias por sucursal y turno
 * Para el Panel Mi Marca
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, TrendingUp, TrendingDown, Minus, Sun, Sunset, Moon } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

type DateRange = {
  from: Date;
  to: Date;
};

interface BranchSalesData {
  branchId: string;
  branchName: string;
  morning: number;
  afternoon: number;
  night: number;
  total: number;
  vsLastPeriod: number | null;
}

const shiftLabels = {
  morning: 'Mañana',
  afternoon: 'Tarde',
  night: 'Noche',
};

export function BrandDailySalesTable() {
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const today = new Date();
    return {
      from: startOfWeek(today, { weekStartsOn: 1 }),
      to: endOfWeek(today, { weekStartsOn: 1 }),
    };
  });

  const presets = useMemo(() => {
    const today = new Date();
    return [
      { label: 'Hoy', from: today, to: today },
      { label: 'Esta semana', from: startOfWeek(today, { weekStartsOn: 1 }), to: endOfWeek(today, { weekStartsOn: 1 }) },
      { label: 'Este mes', from: startOfMonth(today), to: endOfMonth(today) },
      { label: 'Últimos 7 días', from: subDays(today, 6), to: today },
      { label: 'Últimos 30 días', from: subDays(today, 29), to: today },
    ];
  }, []);

  // Fetch branches
  const { data: branches } = useQuery({
    queryKey: ['branches-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });

  // Fetch sales for current period
  const { data: salesData, isLoading } = useQuery({
    queryKey: ['brand-daily-sales', dateRange.from, dateRange.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_sales')
        .select('branch_id, shift, sales_total')
        .gte('sale_date', format(dateRange.from, 'yyyy-MM-dd'))
        .lte('sale_date', format(dateRange.to, 'yyyy-MM-dd'));
      if (error) throw error;
      return data;
    },
    enabled: !!branches,
  });

  // Fetch sales for previous period (for comparison)
  const periodDays = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const prevFrom = subDays(dateRange.from, periodDays);
  const prevTo = subDays(dateRange.to, periodDays);

  const { data: prevSalesData } = useQuery({
    queryKey: ['brand-daily-sales-prev', prevFrom, prevTo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_sales')
        .select('branch_id, sales_total')
        .gte('sale_date', format(prevFrom, 'yyyy-MM-dd'))
        .lte('sale_date', format(prevTo, 'yyyy-MM-dd'));
      if (error) throw error;
      return data;
    },
    enabled: !!branches,
  });

  // Aggregate data by branch
  const aggregatedData = useMemo((): BranchSalesData[] => {
    if (!branches || !salesData) return [];

    const branchMap = new Map<string, { morning: number; afternoon: number; night: number; total: number }>();
    const prevBranchTotals = new Map<string, number>();

    // Initialize branches
    branches.forEach(b => {
      branchMap.set(b.id, { morning: 0, afternoon: 0, night: 0, total: 0 });
      prevBranchTotals.set(b.id, 0);
    });

    // Aggregate current period
    salesData.forEach(sale => {
      const branch = branchMap.get(sale.branch_id);
      if (branch) {
        const amount = Number(sale.sales_total) || 0;
        branch.total += amount;
        if (sale.shift === 'morning') branch.morning += amount;
        else if (sale.shift === 'afternoon') branch.afternoon += amount;
        else if (sale.shift === 'night') branch.night += amount;
      }
    });

    // Aggregate previous period
    if (prevSalesData) {
      prevSalesData.forEach(sale => {
        const current = prevBranchTotals.get(sale.branch_id) || 0;
        prevBranchTotals.set(sale.branch_id, current + (Number(sale.sales_total) || 0));
      });
    }

    // Build result
    return branches.map(b => {
      const data = branchMap.get(b.id)!;
      const prevTotal = prevBranchTotals.get(b.id) || 0;
      const vsLastPeriod = prevTotal > 0 ? ((data.total - prevTotal) / prevTotal) * 100 : null;

      return {
        branchId: b.id,
        branchName: b.name,
        ...data,
        vsLastPeriod,
      };
    }).sort((a, b) => b.total - a.total);
  }, [branches, salesData, prevSalesData]);

  // Calculate totals
  const totals = useMemo(() => {
    return aggregatedData.reduce(
      (acc, row) => ({
        morning: acc.morning + row.morning,
        afternoon: acc.afternoon + row.afternoon,
        night: acc.night + row.night,
        total: acc.total + row.total,
      }),
      { morning: 0, afternoon: 0, night: 0, total: 0 }
    );
  }, [aggregatedData]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(value);

  const renderTrend = (value: number | null) => {
    if (value === null) return <Minus className="w-4 h-4 text-muted-foreground" />;
    if (value > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (value < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Ventas por Sucursal y Turno</CardTitle>
            <CardDescription>
              Consolidado de ventas manuales cargadas por cada local
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant={
                  format(dateRange.from, 'yyyy-MM-dd') === format(preset.from, 'yyyy-MM-dd') &&
                  format(dateRange.to, 'yyyy-MM-dd') === format(preset.to, 'yyyy-MM-dd')
                    ? 'default'
                    : 'outline'
                }
                size="sm"
                onClick={() => setDateRange({ from: preset.from, to: preset.to })}
              >
                {preset.label}
              </Button>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Personalizado
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                    }
                  }}
                  locale={es}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Período: {format(dateRange.from, 'd MMM', { locale: es })} - {format(dateRange.to, 'd MMM yyyy', { locale: es })}
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sucursal</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span className="hidden sm:inline">{shiftLabels.morning}</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Sunset className="w-4 h-4 text-orange-500" />
                      <span className="hidden sm:inline">{shiftLabels.afternoon}</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Moon className="w-4 h-4 text-primary" />
                      <span className="hidden sm:inline">{shiftLabels.night}</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">vs Anterior</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aggregatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No hay ventas registradas en este período
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {aggregatedData.map((row) => (
                      <TableRow key={row.branchId}>
                        <TableCell className="font-medium">{row.branchName}</TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {row.morning > 0 ? formatCurrency(row.morning) : '-'}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {row.afternoon > 0 ? formatCurrency(row.afternoon) : '-'}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {row.night > 0 ? formatCurrency(row.night) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(row.total)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {renderTrend(row.vsLastPeriod)}
                            {row.vsLastPeriod !== null && (
                              <span
                                className={cn(
                                  'text-sm',
                                  row.vsLastPeriod > 0 && 'text-green-600',
                                  row.vsLastPeriod < 0 && 'text-red-600'
                                )}
                              >
                                {row.vsLastPeriod > 0 ? '+' : ''}
                                {row.vsLastPeriod.toFixed(0)}%
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals Row */}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>TOTAL MARCA</TableCell>
                      <TableCell className="text-center">{formatCurrency(totals.morning)}</TableCell>
                      <TableCell className="text-center">{formatCurrency(totals.afternoon)}</TableCell>
                      <TableCell className="text-center">{formatCurrency(totals.night)}</TableCell>
                      <TableCell className="text-right text-primary text-lg">
                        {formatCurrency(totals.total)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
