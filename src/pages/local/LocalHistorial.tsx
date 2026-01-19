import { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useExportToExcel } from '@/hooks/useExportToExcel';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Search, Download, RefreshCw, CalendarIcon, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import ExpandableOrderRow from '@/components/orders/ExpandableOrderRow';
import type { Tables, Enums } from '@/integrations/supabase/types';

type Order = Tables<'orders'>;
type OrderStatus = Enums<'order_status'>;

interface OrderWithItems extends Order {
  items?: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    notes: string | null;
    product: { name: string } | null;
  }>;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: 'bg-slate-400' },
  pending: { label: 'Pendiente', color: 'bg-yellow-500' },
  confirmed: { label: 'Confirmado', color: 'bg-blue-500' },
  preparing: { label: 'Preparando', color: 'bg-orange-500' },
  ready: { label: 'Listo', color: 'bg-green-500' },
  waiting_pickup: { label: 'Esperando cadete', color: 'bg-purple-500' },
  in_transit: { label: 'En viaje', color: 'bg-cyan-500' },
  delivered: { label: 'Entregado', color: 'bg-gray-500' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500' },
};

type DateFilter = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export default function LocalHistorial() {
  const { branchId } = useParams();
  const { branch } = useOutletContext<{ branch: Tables<'branches'> | null }>();
  const { exportToExcel } = useExportToExcel();
  
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>();
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>();

  const getDateRange = () => {
    const now = new Date();
    switch (dateFilter) {
      case 'today':
        return { from: startOfDay(now), to: endOfDay(now) };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
      case 'week':
        return { from: startOfDay(subDays(now, 7)), to: endOfDay(now) };
      case 'month':
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case 'custom':
        if (customDateFrom && customDateTo) {
          return { from: startOfDay(customDateFrom), to: endOfDay(customDateTo) };
        }
        return { from: startOfDay(now), to: endOfDay(now) };
      default:
        return { from: startOfDay(now), to: endOfDay(now) };
    }
  };

  const fetchOrders = async () => {
    if (!branchId) return;
    
    setLoading(true);
    try {
      const { from, to } = getDateRange();
      
      let query = supabase
        .from('orders')
        .select(`
          *,
          items:order_items(
            id,
            quantity,
            unit_price,
            notes,
            product:products(name)
          )
        `)
        .eq('branch_id', branchId)
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as OrderStatus);
      }

      if (channelFilter !== 'all') {
        query = query.eq('sales_channel', channelFilter as Enums<'sales_channel'>);
      }

      const { data, error } = await query;

      if (error) throw error;
      setOrders(data as OrderWithItems[]);
    } catch (error: any) {
      toast.error('Error al cargar historial: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [branchId, dateFilter, statusFilter, channelFilter, customDateFrom, customDateTo]);

  const filteredOrders = orders.filter(order =>
    order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer_phone.includes(searchTerm) ||
    order.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = () => {
    exportToExcel(
      filteredOrders,
      [
        { key: 'created_at', label: 'Fecha', format: (v: string) => format(new Date(v), 'dd/MM/yyyy HH:mm', { locale: es }) },
        { key: 'customer_name', label: 'Cliente' },
        { key: 'customer_phone', label: 'Teléfono' },
        { key: 'order_type', label: 'Tipo' },
        { key: 'sales_channel', label: 'Canal' },
        { key: 'payment_method', label: 'Método Pago' },
        { key: 'status', label: 'Estado', format: (v: string) => STATUS_CONFIG[v as OrderStatus]?.label || v },
        { key: 'total', label: 'Total', format: (v: number) => Number(v) },
      ],
      { filename: `historial_${branch?.name || 'pedidos'}`, sheetName: 'Historial' }
    );
  };

  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case 'today': return 'Hoy';
      case 'yesterday': return 'Ayer';
      case 'week': return 'Última semana';
      case 'month': return 'Este mes';
      case 'custom': 
        if (customDateFrom && customDateTo) {
          return `${format(customDateFrom, 'dd/MM')} - ${format(customDateTo, 'dd/MM')}`;
        }
        return 'Personalizado';
      default: return '';
    }
  };

  // Calculate stats
  const stats = {
    total: filteredOrders.length,
    revenue: filteredOrders.reduce((sum, o) => sum + Number(o.total), 0),
    delivered: filteredOrders.filter(o => o.status === 'delivered').length,
    cancelled: filteredOrders.filter(o => o.status === 'cancelled').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Historial de Pedidos</h1>
          <p className="text-muted-foreground">{branch?.name} · {getDateFilterLabel()}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchOrders} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={filteredOrders.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Pedidos totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              ${stats.revenue.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">Ingresos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.delivered}</div>
            <p className="text-xs text-muted-foreground">Entregados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-500">{stats.cancelled}</div>
            <p className="text-xs text-muted-foreground">Cancelados</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, teléfono o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
              <SelectTrigger className="w-40">
                <CalendarIcon className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="yesterday">Ayer</SelectItem>
                <SelectItem value="week">Última semana</SelectItem>
                <SelectItem value="month">Este mes</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Canal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="mostrador">Mostrador</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
                <SelectItem value="takeaway">Take Away</SelectItem>
                <SelectItem value="rappi">Rappi</SelectItem>
                <SelectItem value="pedidos_ya">PedidosYa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-3 mt-4 p-3 bg-muted/50 rounded-lg">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn(!customDateFrom && "text-muted-foreground")}>
                    {customDateFrom ? format(customDateFrom, 'dd/MM/yyyy') : 'Desde'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customDateFrom}
                    onSelect={setCustomDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">-</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn(!customDateTo && "text-muted-foreground")}>
                    {customDateTo ? format(customDateTo, 'dd/MM/yyyy') : 'Hasta'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customDateTo}
                    onSelect={setCustomDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orders Table with Expandable Rows */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-muted/50">
                <tr>
                  <th className="w-12 p-3"></th>
                  <th className="w-24 text-left p-3 text-sm font-medium">Fecha</th>
                  <th className="text-left p-3 text-sm font-medium">Cliente</th>
                  <th className="w-32 text-left p-3 text-sm font-medium">Canal</th>
                  <th className="w-28 text-left p-3 text-sm font-medium">Estado</th>
                  <th className="w-28 text-right p-3 text-sm font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto" />
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      No se encontraron pedidos
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <ExpandableOrderRow 
                      key={order.id} 
                      order={order} 
                      statusConfig={STATUS_CONFIG}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
