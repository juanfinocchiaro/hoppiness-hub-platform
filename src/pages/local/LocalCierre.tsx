import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  CreditCard,
  Banknote,
  Smartphone,
  Users,
  Clock,
  XCircle,
  Printer,
  Download,
  AlertTriangle,
} from 'lucide-react';

interface SalesSummary {
  totalSales: number;
  orderCount: number;
  avgTicket: number;
}

interface PaymentBreakdown {
  method: string;
  amount: number;
  percentage: number;
}

interface ChannelBreakdown {
  channel: string;
  amount: number;
  percentage: number;
  color: string;
}

interface CashSummary {
  openingAmount: number;
  cashIn: number;
  cashOut: number;
  expectedAmount: number;
  declaredAmount: number | null;
  difference: number | null;
  shiftId: string | null;
  status: string;
}

interface StaffHours {
  name: string;
  checkIn: string;
  checkOut: string | null;
  hours: number;
}

interface CancelledOrder {
  id: string;
  orderNumber: number;
  reason: string;
  amount: number;
}

export default function LocalCierre() {
  const { branchId } = useParams<{ branchId: string }>();
  const today = format(new Date(), 'yyyy-MM-dd');

  // Fetch branch info
  const { data: branch } = useQuery({
    queryKey: ['branch', branchId],
    queryFn: async () => {
      const { data } = await supabase
        .from('branches')
        .select('*')
        .eq('id', branchId)
        .single();
      return data;
    },
    enabled: !!branchId,
  });

  // Fetch orders summary
  const { data: salesData, isLoading: loadingSales } = useQuery({
    queryKey: ['cierre-sales', branchId, today],
    queryFn: async () => {
      const startOfDay = `${today}T00:00:00`;
      const endOfDay = `${today}T23:59:59`;

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, total, payment_method, sales_channel, status')
        .eq('branch_id', branchId)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .in('status', ['delivered', 'ready', 'preparing', 'confirmed']);

      if (error) throw error;

      const completedOrders = orders || [];
      const totalSales = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const orderCount = completedOrders.length;
      const avgTicket = orderCount > 0 ? totalSales / orderCount : 0;

      // Payment breakdown
      const paymentMap: Record<string, number> = {};
      completedOrders.forEach(o => {
        const method = o.payment_method || 'Otro';
        paymentMap[method] = (paymentMap[method] || 0) + (o.total || 0);
      });
      const payments: PaymentBreakdown[] = Object.entries(paymentMap).map(([method, amount]) => ({
        method,
        amount,
        percentage: totalSales > 0 ? (amount / totalSales) * 100 : 0,
      }));

      // Channel breakdown
      const channelMap: Record<string, number> = {};
      completedOrders.forEach(o => {
        const channel = o.sales_channel || 'mostrador';
        channelMap[channel] = (channelMap[channel] || 0) + (o.total || 0);
      });
      const channels: ChannelBreakdown[] = Object.entries(channelMap).map(([channel, amount]) => ({
        channel,
        amount,
        percentage: totalSales > 0 ? (amount / totalSales) * 100 : 0,
        color: getChannelColor(channel),
      }));

      return {
        summary: { totalSales, orderCount, avgTicket } as SalesSummary,
        payments: payments.sort((a, b) => b.amount - a.amount),
        channels: channels.sort((a, b) => b.amount - a.amount),
      };
    },
    enabled: !!branchId,
  });

  // Fetch cash register status
  const { data: cashData, isLoading: loadingCash } = useQuery({
    queryKey: ['cierre-cash', branchId, today],
    queryFn: async () => {
      const startOfDay = `${today}T00:00:00`;
      
      // Get today's shift
      const { data: shift } = await supabase
        .from('cash_register_shifts')
        .select('*')
        .eq('branch_id', branchId)
        .gte('opened_at', startOfDay)
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!shift) {
        return {
          openingAmount: 0,
          cashIn: 0,
          cashOut: 0,
          expectedAmount: 0,
          declaredAmount: null,
          difference: null,
          shiftId: null,
          status: 'no_shift',
        } as CashSummary;
      }

      // Get movements for this shift
      const { data: movements } = await supabase
        .from('cash_register_movements')
        .select('*')
        .eq('shift_id', shift.id);

      const cashIn = (movements || [])
        .filter(m => m.type === 'income' && m.payment_method === 'efectivo')
        .reduce((sum, m) => sum + m.amount, 0);
      
      const cashOut = (movements || [])
        .filter(m => m.type === 'expense')
        .reduce((sum, m) => sum + m.amount, 0);

      const expectedAmount = shift.opening_amount + cashIn - cashOut;

      return {
        openingAmount: shift.opening_amount,
        cashIn,
        cashOut,
        expectedAmount,
        declaredAmount: shift.closing_amount,
        difference: shift.difference,
        shiftId: shift.id,
        status: shift.status,
      } as CashSummary;
    },
    enabled: !!branchId,
  });

  // Fetch staff hours
  const { data: staffData, isLoading: loadingStaff } = useQuery({
    queryKey: ['cierre-staff', branchId, today],
    queryFn: async () => {
      const startOfDay = `${today}T00:00:00`;
      const endOfDay = `${today}T23:59:59`;

      const { data: records } = await supabase
        .from('attendance_records')
        .select(`
          *,
          profiles:user_id (full_name)
        `)
        .eq('branch_id', branchId)
        .gte('check_in', startOfDay)
        .lte('check_in', endOfDay);

      return (records || []).map(r => {
        const checkInTime = new Date(r.check_in);
        const checkOutTime = r.check_out ? new Date(r.check_out) : null;
        const hours = checkOutTime 
          ? (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)
          : 0;
        
        return {
          name: (r.profiles as any)?.full_name || 'Sin nombre',
          checkIn: format(checkInTime, 'HH:mm'),
          checkOut: checkOutTime ? format(checkOutTime, 'HH:mm') : null,
          hours: Math.round(hours * 10) / 10,
        } as StaffHours;
      });
    },
    enabled: !!branchId,
  });

  // Fetch cancelled orders
  const { data: cancelledOrders, isLoading: loadingCancelled } = useQuery({
    queryKey: ['cierre-cancelled', branchId, today],
    queryFn: async () => {
      const startOfDay = `${today}T00:00:00`;
      const endOfDay = `${today}T23:59:59`;

      const { data: orders } = await supabase
        .from('orders')
        .select('id, caller_number, total, notes')
        .eq('branch_id', branchId)
        .eq('status', 'cancelled')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

      return (orders || []).map(o => ({
        id: o.id,
        orderNumber: o.caller_number || 0,
        reason: o.notes || 'Sin motivo especificado',
        amount: o.total || 0,
      })) as CancelledOrder[];
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

  const getPaymentIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'efectivo':
        return <Banknote className="w-4 h-4" />;
      case 'mercadopago':
        return <Smartphone className="w-4 h-4" />;
      case 'tarjeta':
      case 'debito':
      case 'credito':
        return <CreditCard className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  const isLoading = loadingSales || loadingCash || loadingStaff || loadingCancelled;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const totalStaffHours = (staffData || []).reduce((sum, s) => sum + s.hours, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cierre del Día</h1>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })} • {branch?.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Sales Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ventas Total</p>
                <p className="text-3xl font-bold">{formatCurrency(salesData?.summary.totalSales || 0)}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pedidos</p>
                <p className="text-3xl font-bold">{salesData?.summary.orderCount || 0}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-full">
                <ShoppingCart className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ticket Promedio</p>
                <p className="text-3xl font-bold">{formatCurrency(salesData?.summary.avgTicket || 0)}</p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-full">
                <TrendingUp className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Ventas por Método de Pago
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(salesData?.payments || []).map((payment) => (
              <div key={payment.method} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {getPaymentIcon(payment.method)}
                    <span className="capitalize">{payment.method}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatCurrency(payment.amount)}</span>
                    <Badge variant="secondary" className="text-xs">
                      {payment.percentage.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
                <Progress value={payment.percentage} className="h-2" />
              </div>
            ))}
            {(salesData?.payments || []).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Sin ventas hoy
              </p>
            )}
          </CardContent>
        </Card>

        {/* Sales by Channel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Ventas por Canal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(salesData?.channels || []).map((channel) => (
              <div key={channel.channel} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize">{channel.channel}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatCurrency(channel.amount)}</span>
                    <Badge variant="secondary" className="text-xs">
                      {channel.percentage.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
                <Progress 
                  value={channel.percentage} 
                  className="h-2"
                  style={{ '--progress-color': channel.color } as any}
                />
              </div>
            ))}
            {(salesData?.channels || []).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Sin ventas hoy
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cash Register */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="w-5 h-5" />
            Arqueo de Caja
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cashData?.status === 'no_shift' ? (
            <div className="text-center py-8 text-muted-foreground">
              <Banknote className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No hay turno de caja abierto hoy</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Inicio</p>
                <p className="text-xl font-bold">{formatCurrency(cashData?.openingAmount || 0)}</p>
              </div>
              <div className="p-4 bg-emerald-500/10 rounded-lg">
                <p className="text-sm text-muted-foreground">+ Ingresos</p>
                <p className="text-xl font-bold text-emerald-600">{formatCurrency(cashData?.cashIn || 0)}</p>
              </div>
              <div className="p-4 bg-red-500/10 rounded-lg">
                <p className="text-sm text-muted-foreground">- Egresos</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(cashData?.cashOut || 0)}</p>
              </div>
              <div className="p-4 bg-blue-500/10 rounded-lg">
                <p className="text-sm text-muted-foreground">= Esperado</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(cashData?.expectedAmount || 0)}</p>
              </div>
              <div className={`p-4 rounded-lg ${
                cashData?.difference === null 
                  ? 'bg-muted/50' 
                  : cashData?.difference === 0 
                    ? 'bg-emerald-500/10' 
                    : 'bg-amber-500/10'
              }`}>
                <p className="text-sm text-muted-foreground">Diferencia</p>
                {cashData?.difference === null ? (
                  <p className="text-xl font-bold text-muted-foreground">Pendiente</p>
                ) : (
                  <p className={`text-xl font-bold ${
                    cashData?.difference === 0 ? 'text-emerald-600' : 'text-amber-600'
                  }`}>
                    {formatCurrency(cashData?.difference || 0)}
                    {cashData?.difference !== 0 && (
                      <AlertTriangle className="w-4 h-4 inline ml-1" />
                    )}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Staff Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Horas Trabajadas Hoy
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(staffData || []).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Sin registros de fichaje hoy</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Salida</TableHead>
                    <TableHead className="text-right">Horas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffData?.map((staff, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{staff.name}</TableCell>
                      <TableCell>{staff.checkIn}</TableCell>
                      <TableCell>
                        {staff.checkOut || (
                          <Badge variant="outline" className="text-amber-600">
                            <Clock className="w-3 h-3 mr-1" />
                            Activo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{staff.hours} hs</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 pt-4 border-t flex justify-end">
                <Badge variant="secondary" className="text-base">
                  Total: {totalStaffHours.toFixed(1)} hs
                </Badge>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Cancelled Orders */}
      {(cancelledOrders || []).length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              Pedidos Cancelados ({cancelledOrders?.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cancelledOrders?.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">#{order.orderNumber}</TableCell>
                    <TableCell className="text-muted-foreground">{order.reason}</TableCell>
                    <TableCell className="text-right text-destructive">
                      {formatCurrency(order.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getChannelColor(channel: string): string {
  const colors: Record<string, string> = {
    'mostrador': '#3b82f6',
    'delivery': '#10b981',
    'pedidosya': '#f97316',
    'rappi': '#ef4444',
    'whatsapp': '#22c55e',
    'web': '#8b5cf6',
  };
  return colors[channel.toLowerCase()] || '#6b7280';
}
