import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend 
} from 'recharts';
import { 
  DollarSign, ShoppingCart, TrendingUp, Calendar, 
  RefreshCw, Store, CreditCard, Megaphone, Download 
} from 'lucide-react';
import { useExportToExcel } from '@/hooks/useExportToExcel';
import { toast } from 'sonner';
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

const SALES_CHANNEL_LABELS: Record<string, string> = {
  atencion_presencial: 'Presencial',
  whatsapp: 'WhatsApp',
  mas_delivery: '+Delivery',
  pedidos_ya: 'PedidosYa',
  rappi: 'Rappi',
  mercadopago_delivery: 'MP Delivery',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta_debito: 'Débito',
  tarjeta_credito: 'Crédito',
  mercadopago_qr: 'MP QR',
  mercadopago_link: 'MP Link',
  transferencia: 'Transferencia',
  vales: 'Vales',
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#10b981',
  '#f59e0b',
  '#ef4444',
];

type DateRange = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

interface ReportData {
  totalSales: number;
  totalOrders: number;
  avgTicket: number;
  cancelledOrders: number;
  byChannel: { name: string; value: number; count: number }[];
  byPayment: { name: string; value: number; count: number }[];
  byStatus: { name: string; value: number }[];
  byDay: { date: string; total: number; orders: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
}

export default function SalesReports() {
  const { accessibleBranches, loading: roleLoading } = useUserRole();
  const { exportToExcel } = useExportToExcel();
  
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [loading, setLoading] = useState(true);
  const [rawOrders, setRawOrders] = useState<any[]>([]);
  const [reportData, setReportData] = useState<ReportData>({
    totalSales: 0,
    totalOrders: 0,
    avgTicket: 0,
    cancelledOrders: 0,
    byChannel: [],
    byPayment: [],
    byStatus: [],
    byDay: [],
    topProducts: [],
  });

  const getDateRange = (range: DateRange): { start: Date; end: Date } => {
    const now = new Date();
    switch (range) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
      case 'week':
        return { start: startOfWeek(now, { locale: es }), end: endOfWeek(now, { locale: es }) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      default:
        return { start: startOfDay(now), end: endOfDay(now) };
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange(dateRange);
      
      let query = supabase
        .from('orders')
        .select(`
          *,
          items:order_items(
            quantity,
            unit_price,
            product:products(name)
          )
        `)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (selectedBranch !== 'all') {
        query = query.eq('branch_id', selectedBranch);
      }

      const { data: orders, error } = await query;
      if (error) throw error;

      // Store raw orders for export
      setRawOrders(orders || []);
      const completedOrders = orders?.filter(o => o.status !== 'cancelled') || [];
      const cancelledOrders = orders?.filter(o => o.status === 'cancelled') || [];
      
      const totalSales = completedOrders.reduce((sum, o) => sum + Number(o.total), 0);
      const totalOrders = completedOrders.length;
      const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

      // By Channel
      const channelMap = new Map<string, { value: number; count: number }>();
      completedOrders.forEach(o => {
        const channel = o.sales_channel || 'atencion_presencial';
        const current = channelMap.get(channel) || { value: 0, count: 0 };
        channelMap.set(channel, { 
          value: current.value + Number(o.total), 
          count: current.count + 1 
        });
      });
      const byChannel = Array.from(channelMap.entries()).map(([key, data]) => ({
        name: SALES_CHANNEL_LABELS[key] || key,
        value: data.value,
        count: data.count,
      }));

      // By Payment Method
      const paymentMap = new Map<string, { value: number; count: number }>();
      completedOrders.forEach(o => {
        const payment = o.payment_method || 'efectivo';
        const current = paymentMap.get(payment) || { value: 0, count: 0 };
        paymentMap.set(payment, { 
          value: current.value + Number(o.total), 
          count: current.count + 1 
        });
      });
      const byPayment = Array.from(paymentMap.entries()).map(([key, data]) => ({
        name: PAYMENT_METHOD_LABELS[key] || key,
        value: data.value,
        count: data.count,
      }));

      // By Status
      const statusMap = new Map<string, number>();
      orders?.forEach(o => {
        const current = statusMap.get(o.status) || 0;
        statusMap.set(o.status, current + 1);
      });
      const byStatus = Array.from(statusMap.entries()).map(([key, value]) => ({
        name: ORDER_STATUS_LABELS[key] || key,
        value,
      }));

      // By Day (for week/month views)
      const dayMap = new Map<string, { total: number; orders: number }>();
      completedOrders.forEach(o => {
        const day = format(new Date(o.created_at), 'dd/MM');
        const current = dayMap.get(day) || { total: 0, orders: 0 };
        dayMap.set(day, { 
          total: current.total + Number(o.total), 
          orders: current.orders + 1 
        });
      });
      const byDay = Array.from(dayMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Top Products
      const productMap = new Map<string, { quantity: number; revenue: number }>();
      completedOrders.forEach(o => {
        o.items?.forEach((item: any) => {
          const name = item.product?.name || 'Producto';
          const current = productMap.get(name) || { quantity: 0, revenue: 0 };
          productMap.set(name, {
            quantity: current.quantity + item.quantity,
            revenue: current.revenue + (item.quantity * Number(item.unit_price)),
          });
        });
      });
      const topProducts = Array.from(productMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      setReportData({
        totalSales,
        totalOrders,
        avgTicket,
        cancelledOrders: cancelledOrders.length,
        byChannel,
        byPayment,
        byStatus,
        byDay,
        topProducts,
      });
    } catch (error: any) {
      toast.error('Error al cargar reportes: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!roleLoading) {
      fetchReportData();
    }
  }, [selectedBranch, dateRange, roleLoading]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);

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
          <h1 className="text-2xl font-bold">Reportes de Ventas</h1>
          <p className="text-muted-foreground">Estadísticas y análisis de ventas</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-[180px]">
              <Store className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sucursal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las sucursales</SelectItem>
              {accessibleBranches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="yesterday">Ayer</SelectItem>
              <SelectItem value="week">Esta semana</SelectItem>
              <SelectItem value="month">Este mes</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={fetchReportData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <Button 
            variant="outline" 
            onClick={() => {
              const branchName = selectedBranch === 'all' 
                ? 'todas' 
                : accessibleBranches.find(b => b.id === selectedBranch)?.name || '';
              
              exportToExcel(
                rawOrders.map(o => ({
                  ...o,
                  branch_name: accessibleBranches.find(b => b.id === o.branch_id)?.name || o.branch_id,
                })),
                [
                  { key: 'created_at', label: 'Fecha', format: (v: string) => format(new Date(v), 'dd/MM/yyyy HH:mm') },
                  { key: 'branch_name', label: 'Sucursal' },
                  { key: 'customer_name', label: 'Cliente' },
                  { key: 'customer_phone', label: 'Teléfono' },
                  { key: 'order_type', label: 'Tipo' },
                  { key: 'sales_channel', label: 'Canal', format: (v: string) => SALES_CHANNEL_LABELS[v] || v },
                  { key: 'status', label: 'Estado', format: (v: string) => ORDER_STATUS_LABELS[v] || v },
                  { key: 'payment_method', label: 'Método Pago', format: (v: string) => PAYMENT_METHOD_LABELS[v] || v },
                  { key: 'subtotal', label: 'Subtotal', format: (v: number) => Number(v) },
                  { key: 'delivery_fee', label: 'Envío', format: (v: number) => Number(v || 0) },
                  { key: 'total', label: 'Total', format: (v: number) => Number(v) },
                ],
                { filename: `ventas_${branchName}_${dateRange}`, sheetName: 'Ventas' }
              );
              toast.success('Exportación iniciada');
            }}
            disabled={loading || rawOrders.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(reportData.totalSales)}</div>
            <p className="text-xs text-muted-foreground">
              {reportData.totalOrders} pedidos completados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(reportData.avgTicket)}</div>
            <p className="text-xs text-muted-foreground">Por pedido</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Totales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              Completados en el período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cancelados</CardTitle>
            <ShoppingCart className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{reportData.cancelledOrders}</div>
            <p className="text-xs text-muted-foreground">
              Pedidos cancelados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="channels" className="space-y-4">
        <TabsList>
          <TabsTrigger value="channels">
            <Megaphone className="h-4 w-4 mr-2" />
            Por Canal
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="h-4 w-4 mr-2" />
            Por Pago
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <Calendar className="h-4 w-4 mr-2" />
            Evolución
          </TabsTrigger>
          <TabsTrigger value="products">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Productos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Ventas por Canal</CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.byChannel.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={reportData.byChannel}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {reportData.byChannel.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Sin datos para mostrar
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detalle por Canal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData.byChannel.map((channel, i) => (
                    <div key={channel.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                        <span>{channel.name}</span>
                        <Badge variant="secondary">{channel.count} pedidos</Badge>
                      </div>
                      <span className="font-semibold">{formatCurrency(channel.value)}</span>
                    </div>
                  ))}
                  {reportData.byChannel.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">Sin datos</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Ventas por Método de Pago</CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.byPayment.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportData.byPayment}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Sin datos para mostrar
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detalle por Método</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData.byPayment.map((payment) => (
                    <div key={payment.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span>{payment.name}</span>
                        <Badge variant="secondary">{payment.count} pedidos</Badge>
                      </div>
                      <span className="font-semibold">{formatCurrency(payment.value)}</span>
                    </div>
                  ))}
                  {reportData.byPayment.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">Sin datos</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Evolución de Ventas</CardTitle>
            </CardHeader>
            <CardContent>
              {reportData.byDay.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={reportData.byDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      formatter={(value: number, name: string) => 
                        name === 'total' ? formatCurrency(value) : value
                      } 
                    />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="total" 
                      stroke="hsl(var(--primary))" 
                      name="Ventas"
                      strokeWidth={2}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="orders" 
                      stroke="hsl(var(--chart-2))" 
                      name="Pedidos"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  Sin datos para mostrar. Selecciona "Esta semana" o "Este mes" para ver la evolución.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Productos</CardTitle>
            </CardHeader>
            <CardContent>
              {reportData.topProducts.length > 0 ? (
                <div className="space-y-4">
                  {reportData.topProducts.map((product, i) => (
                    <div key={product.name} className="flex items-center gap-4">
                      <span className="w-6 text-center font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {product.quantity} unidades vendidas
                        </p>
                      </div>
                      <span className="font-bold">{formatCurrency(product.revenue)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  Sin datos para mostrar
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
