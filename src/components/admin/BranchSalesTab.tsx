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
import { BarChart3, Download, TrendingUp, ShoppingCart, DollarSign, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { startOfMonth, endOfMonth, subMonths, format, eachDayOfInterval, parseISO, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

interface BranchSalesTabProps {
  branchId: string;
  branchName: string;
}

type Period = 'this_month' | 'last_month' | 'last_3_months';

export default function BranchSalesTab({ branchId, branchName }: BranchSalesTabProps) {
  const [period, setPeriod] = useState<Period>('this_month');

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'last_month':
        return {
          start: startOfMonth(subMonths(now, 1)),
          end: endOfMonth(subMonths(now, 1)),
        };
      case 'last_3_months':
        return {
          start: startOfMonth(subMonths(now, 2)),
          end: endOfMonth(now),
        };
      default:
        return {
          start: startOfMonth(now),
          end: endOfMonth(now),
        };
    }
  };

  const { start, end } = getDateRange();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['branch-sales', branchId, period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, total, status, sales_channel, created_at')
        .eq('branch_id', branchId)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .in('status', ['delivered', 'ready']);

      if (error) throw error;
      return data || [];
    },
  });

  // Calculate metrics
  const totalSales = orders?.reduce((sum, o) => sum + ((o as any).total || 0), 0) || 0;
  const totalOrders = orders?.length || 0;
  const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0;
  const completedOrders = orders?.filter((o) => (o as any).status === 'delivered').length || 0;
  const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

  // Daily sales chart data
  const dailySales = eachDayOfInterval({ start, end }).map((date) => {
    const dayOrders = orders?.filter((o) => {
      const orderDate = startOfDay(parseISO(o.created_at));
      return orderDate.getTime() === startOfDay(date).getTime();
    });
    return {
      date: format(date, 'dd/MM', { locale: es }),
      ventas: dayOrders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0,
    };
  });

  // Sales by channel
  const channelSales = orders?.reduce((acc, o) => {
    const channel = o.sales_channel || 'mostrador';
    acc[channel] = (acc[channel] || 0) + (o.total || 0);
    return acc;
  }, {} as Record<string, number>) || {};

  const channelData = Object.entries(channelSales)
    .map(([channel, amount]) => ({
      channel: getChannelLabel(channel),
      amount,
      percentage: totalSales > 0 ? (amount / totalSales) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Canales de venta: Mostrador, Web App, Rappi, PedidosYa, MP Delivery
  function getChannelLabel(channel: string) {
    const labels: Record<string, string> = {
      mostrador: 'Mostrador',
      webapp: 'Web App',
      rappi: 'Rappi',
      pedidosya: 'PedidosYa',
      mp_delivery: 'MP Delivery',
    };
    return labels[channel] || channel;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

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

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">Ventas</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalSales)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="text-sm">Pedidos</span>
            </div>
            <p className="text-2xl font-bold">{totalOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Ticket Promedio</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(avgTicket)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Completados</span>
            </div>
            <p className="text-2xl font-bold">{completionRate.toFixed(0)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Sales Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Ventas por día
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 bg-muted rounded animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailySales}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Ventas']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="ventas" radius={[4, 4, 0, 0]} className="fill-primary" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Sales by Channel */}
      <Card>
        <CardHeader>
          <CardTitle>Ventas por canal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {channelData.map((item) => (
              <div key={item.channel} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{item.channel}</span>
                  <span className="font-medium">
                    {formatCurrency(item.amount)} ({item.percentage.toFixed(0)}%)
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
            {channelData.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No hay ventas en este período
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
