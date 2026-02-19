/**
 * CierreTurnoPage - Reporte de cierre de turno (Fase 6)
 * Adaptado para usar pedidos, pedido_pagos y cash_register_shifts
 */
import { useState, useRef, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
  Camera,
  FileText,
  CalendarIcon,
  XCircle,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';

type Branch = Tables<'branches'>;

interface LocalContext {
  branch: Branch;
}

interface ShiftData {
  orders: any[];
  cancelledOrders: any[];
  cashShifts: any[];
}

const CHANNEL_ICONS: Record<string, string> = {
  mostrador: '🖥️',
  webapp: '🌐',
  rappi: '🟠',
  pedidos_ya: '🟡',
  mp_delivery: '🔵',
};

export default function CierreTurnoPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { branch } = useOutletContext<LocalContext>();
  const reportRef = useRef<HTMLDivElement>(null);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [newNote, setNewNote] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const start = `${dateStr}T00:00:00`;
  const end = `${dateStr}T23:59:59`;

  const { data: shiftData, isLoading } = useQuery({
    queryKey: ['shift-closure-data', branchId, dateStr],
    queryFn: async (): Promise<ShiftData> => {
      const { data: ordersData } = await supabase
        .from('pedidos')
        .select(`
          id, created_at, total, estado, canal_venta, tipo_servicio, canal_app,
          pedido_pagos (metodo, monto),
          pedido_items (nombre, cantidad, precio_unitario, subtotal)
        `)
        .eq('branch_id', branchId!)
        .gte('created_at', start)
        .lt('created_at', end)
        .neq('estado', 'cancelado');

      const { data: cancelledData } = await supabase
        .from('pedidos')
        .select('id, numero_llamador, total, cliente_notas, created_at')
        .eq('branch_id', branchId!)
        .eq('estado', 'cancelado')
        .gte('created_at', start)
        .lt('created_at', end);

      const { data: cashShiftsData } = await supabase
        .from('cash_register_shifts')
        .select(`
          id, opened_at, closed_at, opening_amount, closing_amount,
          expected_amount, difference, status, notes,
          cash_registers (name)
        `)
        .eq('branch_id', branchId!)
        .gte('opened_at', start)
        .lt('opened_at', end);

      return {
        orders: ordersData || [],
        cancelledOrders: cancelledData || [],
        cashShifts: cashShiftsData || [],
      };
    },
    enabled: !!branchId,
  });

  const totalSales = shiftData?.orders.reduce((sum, o) => sum + Number(o.total || 0), 0) || 0;
  const orderCount = shiftData?.orders.length || 0;
  const avgTicket = orderCount > 0 ? totalSales / orderCount : 0;

  const paymentBreakdown = shiftData?.orders.flatMap((o) => o.pedido_pagos || []).reduce(
    (acc, pago) => {
      const method = pago.metodo || 'otro';
      acc[method] = (acc[method] || 0) + Number(pago.monto || 0);
      return acc;
    },
    {} as Record<string, number>
  ) || {};

  const channelBreakdown = shiftData?.orders.reduce((acc, order) => {
    let channel = order.canal_venta || 'mostrador';
    if (channel === 'apps' && order.canal_app) {
      channel = order.canal_app;
    }
    acc[channel] = (acc[channel] || 0) + Number(order.total || 0);
    return acc;
  }, {} as Record<string, number>) || {};

  const productBreakdown =
    shiftData?.orders
      .flatMap((o) => o.pedido_items || [])
      .reduce(
        (acc, item) => {
          const name = item.nombre || 'Producto';
          if (!acc[name]) {
            acc[name] = { quantity: 0, total: 0 };
          }
          acc[name].quantity += item.cantidad || 0;
          acc[name].total += Number(item.subtotal || 0);
          return acc;
        },
        {} as Record<string, { quantity: number; total: number }>
      ) || {};

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    toast.info('Notas del turno: funcionalidad pendiente (requiere tabla shift_notes)');
    setNewNote('');
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`cierre-turno-${dateStr}.pdf`);
      toast.success('PDF descargado');
    } catch (error) {
      toast.error('Error al exportar PDF');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <HoppinessLoader size="md" text="Cargando cierre" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cierre de Turno</h1>
          <p className="text-muted-foreground">{branch?.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={isExporting}>
            <FileText className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(selectedDate, "d 'de' MMMM, yyyy", { locale: es })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div ref={reportRef} className="space-y-6 bg-background p-4 rounded-lg">
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div>
            <h2 className="text-xl font-bold">REPORTE DEL DÍA</h2>
            <p className="text-muted-foreground">{format(selectedDate, "d 'de' MMMM, yyyy", { locale: es })}</p>
          </div>
          <Badge variant={orderCount > 0 ? 'default' : 'secondary'}>
            {orderCount > 0 ? '✅ Con pedidos' : '⚪ Sin pedidos'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ventas Total</p>
                  <p className="text-3xl font-bold">{formatCurrency(totalSales)}</p>
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
                  <p className="text-3xl font-bold">{orderCount}</p>
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
                  <p className="text-3xl font-bold">{formatCurrency(avgTicket)}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-full">
                  <TrendingUp className="w-6 h-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Ventas por Canal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(Object.entries(channelBreakdown) as [string, number][])
                .sort(([, a], [, b]) => b - a)
                .map(([channel, amount]) => (
                  <div key={channel} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span>{CHANNEL_ICONS[channel.toLowerCase()] || '📦'}</span>
                        <span className="capitalize">{channel.replace('_', ' ')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatCurrency(amount)}</span>
                        <Badge variant="secondary" className="text-xs">
                          {totalSales > 0 ? ((amount / totalSales) * 100).toFixed(0) : 0}%
                        </Badge>
                      </div>
                    </div>
                    <Progress value={totalSales > 0 ? (amount / totalSales) * 100 : 0} className="h-2" />
                  </div>
                ))}
              {Object.keys(channelBreakdown).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Sin ventas en este día</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Ventas por Método de Pago
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(Object.entries(paymentBreakdown) as [string, number][])
                .sort(([, a], [, b]) => b - a)
                .map(([method, amount]) => (
                  <div key={method} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {method === 'efectivo' ? (
                          <Banknote className="w-4 h-4" />
                        ) : (
                          <CreditCard className="w-4 h-4" />
                        )}
                        <span className="capitalize">{method.replace('_', ' ')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatCurrency(amount)}</span>
                        <Badge variant="secondary" className="text-xs">
                          {totalSales > 0 ? ((amount / totalSales) * 100).toFixed(0) : 0}%
                        </Badge>
                      </div>
                    </div>
                    <Progress value={totalSales > 0 ? (amount / totalSales) * 100 : 0} className="h-2" />
                  </div>
                ))}
              {Object.keys(paymentBreakdown).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Sin ventas en este día</p>
              )}
            </CardContent>
          </Card>
        </div>

        {Object.keys(productBreakdown).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>🍔 Productos Vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible defaultValue="products">
                <AccordionItem value="products">
                  <AccordionTrigger>
                    Ver detalle ({Object.keys(productBreakdown).length} productos)
                  </AccordionTrigger>
                  <AccordionContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead className="text-right">Cantidad</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(Object.entries(productBreakdown) as [string, { quantity: number; total: number }][])
                          .sort(([, a], [, b]) => b.total - a.total)
                          .map(([name, data]) => (
                            <TableRow key={name}>
                              <TableCell>{name}</TableCell>
                              <TableCell className="text-right">{data.quantity}</TableCell>
                              <TableCell className="text-right">{formatCurrency(data.total)}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        )}

        {shiftData?.cashShifts && shiftData.cashShifts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="w-5 h-5" />
                Arqueo de Caja
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {shiftData.cashShifts.map((cashShift: any) => (
                <div key={cashShift.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{cashShift.cash_registers?.name || 'Caja'}</p>
                      <p className="text-sm text-muted-foreground">
                        Abierta {format(new Date(cashShift.opened_at), 'HH:mm')}
                        {cashShift.closed_at && ` — Cerrada ${format(new Date(cashShift.closed_at), 'HH:mm')}`}
                      </p>
                    </div>
                    {cashShift.difference !== null && (
                      <Badge variant={cashShift.difference === 0 ? 'default' : 'destructive'}>
                        {cashShift.difference === 0 ? '✅' : '⚠️'} {formatCurrency(cashShift.difference)}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="p-2 bg-muted/50 rounded">
                      <p className="text-muted-foreground">Inicial</p>
                      <p className="font-medium">{formatCurrency(cashShift.opening_amount || 0)}</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <p className="text-muted-foreground">Esperado</p>
                      <p className="font-medium">{formatCurrency(cashShift.expected_amount || 0)}</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <p className="text-muted-foreground">Declarado</p>
                      <p className="font-medium">{formatCurrency(cashShift.closing_amount || 0)}</p>
                    </div>
                    <div
                      className={`p-2 rounded ${
                        cashShift.difference === 0 ? 'bg-primary/10' : 'bg-destructive/10'
                      }`}
                    >
                      <p className="text-muted-foreground">Diferencia</p>
                      <p className="font-medium">
                        {cashShift.difference !== null ? formatCurrency(cashShift.difference) : 'Pendiente'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {shiftData?.cancelledOrders && shiftData.cancelledOrders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="w-5 h-5" />
                Pedidos Cancelados ({shiftData.cancelledOrders.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shiftData.cancelledOrders.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell>#{order.numero_llamador || '-'}</TableCell>
                      <TableCell>{format(new Date(order.created_at), 'HH:mm')}</TableCell>
                      <TableCell className="text-right">{formatCurrency(order.total || 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
