import { useState } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, DollarSign, ShoppingCart, TrendingUp, Percent } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

export default function LocalReportesVentas() {
  const { branchId } = useParams();
  const { branch } = useOutletContext<{ branch: Branch }>();
  
  const [period, setPeriod] = useState<string>('this_month');

  // Get date range based on period
  const getDateRange = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    
    switch (period) {
      case 'today':
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return { start: today, end: now };
      case 'this_week':
        return { start: startOfWeek, end: now };
      case 'this_month':
        return { start: startOfMonth, end: now };
      case 'last_month':
        return { start: startOfLastMonth, end: endOfLastMonth };
      default:
        return { start: startOfMonth, end: now };
    }
  };

  // Fetch sales data
  const { data: salesData, isLoading } = useQuery({
    queryKey: ['sales-report', branchId, period],
    queryFn: async () => {
      const dateRange = getDateRange();
      
      // Get orders
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, total, created_at, status, sales_channel, payment_method')
        .eq('branch_id', branchId)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .in('status', ['delivered', 'ready', 'preparing', 'confirmed']);
      
      if (error) throw error;
      
      // Calculate stats
      const completedOrders = orders?.filter(o => o.status === 'delivered') || [];
      const totalSales = completedOrders.reduce((sum, o) => sum + o.total, 0);
      const orderCount = completedOrders.length;
      const avgTicket = orderCount > 0 ? totalSales / orderCount : 0;
      const completionRate = orders && orders.length > 0 
        ? (completedOrders.length / orders.length) * 100 
        : 0;
      
      // Sales by day
      const salesByDay: { [key: string]: number } = {};
      completedOrders.forEach(order => {
        const day = new Date(order.created_at).toLocaleDateString('es-AR', { 
          day: '2-digit', 
          month: '2-digit' 
        });
        salesByDay[day] = (salesByDay[day] || 0) + order.total;
      });
      
      const dailyData = Object.entries(salesByDay)
        .map(([day, amount]) => ({ day, amount }))
        .sort((a, b) => {
          const [dayA, monthA] = a.day.split('/').map(Number);
          const [dayB, monthB] = b.day.split('/').map(Number);
          return monthA !== monthB ? monthA - monthB : dayA - dayB;
        });
      
      // Sales by channel
      const salesByChannel: { [key: string]: number } = {};
      completedOrders.forEach(order => {
        const channel = order.sales_channel || 'mostrador';
        salesByChannel[channel] = (salesByChannel[channel] || 0) + order.total;
      });
      
      // Canales de venta: Mostrador, Web App, y Apps de Delivery
      const channelLabels: { [key: string]: string } = {
        mostrador: 'Mostrador',
        webapp: 'Web App',
        rappi: 'Rappi',
        pedidosya: 'PedidosYa',
        mp_delivery: 'MP Delivery',
      };
      
      const channelData = Object.entries(salesByChannel)
        .map(([channel, amount]) => ({
          channel,
          label: channelLabels[channel] || channel,
          amount,
          percentage: totalSales > 0 ? (amount / totalSales) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount);
      
      // Sales by payment method
      const salesByPayment: { [key: string]: number } = {};
      completedOrders.forEach(order => {
        const method = order.payment_method || 'efectivo';
        salesByPayment[method] = (salesByPayment[method] || 0) + order.total;
      });
      
      const paymentLabels: { [key: string]: string } = {
        efectivo: 'Efectivo',
        mercadopago: 'MercadoPago',
        transferencia: 'Transferencia',
        tarjeta: 'Tarjeta',
        qr: 'QR',
      };
      
      const paymentData = Object.entries(salesByPayment)
        .map(([method, amount]) => ({
          method,
          label: paymentLabels[method] || method,
          amount,
          percentage: totalSales > 0 ? (amount / totalSales) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount);
      
      return {
        totalSales,
        orderCount,
        avgTicket,
        completionRate,
        dailyData,
        channelData,
        paymentData,
      };
    },
    enabled: !!branchId,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reporte de Ventas</h1>
          <p className="text-muted-foreground">{branch?.name}</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="this_week">Esta semana</SelectItem>
              <SelectItem value="this_month">Este mes</SelectItem>
              <SelectItem value="last_month">Mes anterior</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ventas</p>
                <p className="text-2xl font-bold">{formatCurrency(salesData?.totalSales || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pedidos</p>
                <p className="text-2xl font-bold">{salesData?.orderCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ticket Prom.</p>
                <p className="text-2xl font-bold">{formatCurrency(salesData?.avgTicket || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Percent className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completados</p>
                <p className="text-2xl font-bold">{Math.round(salesData?.completionRate || 0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Sales Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Ventas por Día</CardTitle>
        </CardHeader>
        <CardContent>
          {salesData?.dailyData && salesData.dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesData.dailyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis 
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  className="text-xs"
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Ventas']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No hay datos para el período seleccionado
            </div>
          )}
        </CardContent>
      </Card>

      {/* Channel & Payment Breakdown */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ventas por Canal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {salesData?.channelData?.map(channel => (
              <div key={channel.channel} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{channel.label}</span>
                  <span className="font-medium">{formatCurrency(channel.amount)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${channel.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-10 text-right">
                    {Math.round(channel.percentage)}%
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Ventas por Método de Pago</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {salesData?.paymentData?.map(payment => (
              <div key={payment.method} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{payment.label}</span>
                  <span className="font-medium">{formatCurrency(payment.amount)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${payment.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-10 text-right">
                    {Math.round(payment.percentage)}%
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
