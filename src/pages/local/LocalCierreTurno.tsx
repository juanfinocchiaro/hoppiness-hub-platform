import { useState, useRef } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
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
  Users,
  Clock,
  XCircle,
  Camera,
  FileText,
  CalendarIcon,
  AlertTriangle,
  CheckCircle,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface LocalContext {
  branch: Branch;
}

interface BranchShift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
}

interface ShiftData {
  orders: any[];
  cancelledOrders: any[];
  cashShifts: any[];
  staffRecords: any[];
  notes: string[];
}

// Canales de venta: Mostrador, Web App, y Apps de Delivery
const CHANNEL_ICONS: Record<string, string> = {
  mostrador: '🖥️',
  webapp: '🌐',
  rappi: '🟠',
  pedidosya: '🟡',
  mp_delivery: '🔵',
};

// Helper to process attendance_logs into check_in/check_out pairs
interface AttendanceLogRow {
  id: string;
  timestamp: string;
  log_type: string;
  employee_id: string;
  employees: {
    id: string;
    full_name: string | null;
  } | null;
}

interface StaffRecord {
  check_in: string;
  check_out: string | null;
  name: string;
}

function processAttendanceLogs(logs: AttendanceLogRow[]): StaffRecord[] {
  // Group logs by employee
  const byEmployee = new Map<string, AttendanceLogRow[]>();
  
  for (const log of logs) {
    const empId = log.employee_id;
    if (!byEmployee.has(empId)) {
      byEmployee.set(empId, []);
    }
    byEmployee.get(empId)!.push(log);
  }
  
  const records: StaffRecord[] = [];
  
  for (const [, empLogs] of byEmployee) {
    // Sort by timestamp
    empLogs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    // Pair IN/OUT entries
    let inLog: AttendanceLogRow | null = null;
    
    for (const log of empLogs) {
      if (log.log_type === 'IN' || log.log_type === 'clock_in') {
        // Start a new pair
        inLog = log;
      } else if ((log.log_type === 'OUT' || log.log_type === 'clock_out') && inLog) {
        // Complete the pair
        records.push({
          check_in: inLog.timestamp,
          check_out: log.timestamp,
          name: inLog.employees?.full_name || 'Sin nombre',
        });
        inLog = null;
      }
    }
    
    // If there's an unpaired IN, add it as still active
    if (inLog) {
      records.push({
        check_in: inLog.timestamp,
        check_out: null,
        name: inLog.employees?.full_name || 'Sin nombre',
      });
    }
  }
  
  return records;
}

export default function LocalCierreTurno() {
  const { branchId } = useParams<{ branchId: string }>();
  const { branch } = useOutletContext<LocalContext>();
  const reportRef = useRef<HTMLDivElement>(null);
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');
  const [newNote, setNewNote] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Fetch branch shifts
  const { data: shifts = [] } = useQuery({
    queryKey: ['branch-shifts', branchId],
    queryFn: async () => {
      const { data } = await supabase
        .from('branch_shifts')
        .select('id, name, start_time, end_time')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .order('sort_order');
      return (data || []) as BranchShift[];
    },
    enabled: !!branchId,
  });

  // Auto-select current shift
  const getCurrentShift = () => {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    
    for (const shift of shifts) {
      const start = shift.start_time.substring(0, 5);
      const end = shift.end_time.substring(0, 5);
      
      if (end < start) {
        if (currentTime >= start || currentTime < end) return shift.id;
      } else {
        if (currentTime >= start && currentTime < end) return shift.id;
      }
    }
    
    // Default to first shift or 'extended'
    return shifts[0]?.id || 'extended';
  };

  // Set initial shift
  useState(() => {
    if (shifts.length > 0 && !selectedShiftId) {
      setSelectedShiftId(getCurrentShift());
    }
  });

  const selectedShift = shifts.find(s => s.id === selectedShiftId);
  const isExtendedShift = selectedShiftId === 'extended';

  // Calculate time range for selected shift
  const getTimeRange = () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    if (isExtendedShift || !selectedShift) {
      // Extended: from last shift end to next day's first shift start
      const lastShift = shifts[shifts.length - 1];
      if (lastShift) {
        return {
          start: `${dateStr}T${lastShift.end_time}`,
          end: `${format(new Date(selectedDate.getTime() + 86400000), 'yyyy-MM-dd')}T${shifts[0]?.start_time || '12:00:00'}`,
        };
      }
      return { start: `${dateStr}T00:00:00`, end: `${dateStr}T23:59:59` };
    }
    
    const start = `${dateStr}T${selectedShift.start_time}`;
    let end = `${dateStr}T${selectedShift.end_time}`;
    
    // Handle midnight crossing
    if (selectedShift.end_time < selectedShift.start_time) {
      end = `${format(new Date(selectedDate.getTime() + 86400000), 'yyyy-MM-dd')}T${selectedShift.end_time}`;
    }
    
    return { start, end };
  };

  // Fetch shift data
  const { data: shiftData, isLoading } = useQuery({
    queryKey: ['shift-closure-data', branchId, selectedDate, selectedShiftId],
    queryFn: async (): Promise<ShiftData> => {
      const { start, end } = getTimeRange();
      
      // Fetch orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select(`
          id, created_at, total, payment_method, sales_channel, status,
          order_items (id, product_name_snapshot, quantity, unit_price, subtotal)
        `)
        .eq('branch_id', branchId)
        .gte('created_at', start)
        .lt('created_at', end)
        .neq('status', 'cancelled');

      // Fetch cancelled orders
      const { data: cancelledData } = await supabase
        .from('orders')
        .select('id, caller_number, total, notes, created_at')
        .eq('branch_id', branchId)
        .eq('status', 'cancelled')
        .gte('created_at', start)
        .lt('created_at', end);

      // Fetch cash register shifts in this period
      const { data: cashShiftsData } = await supabase
        .from('cash_register_shifts')
        .select(`
          id, opened_at, closed_at, opening_amount, closing_amount, 
          expected_amount, difference, status, notes,
          cash_registers (name),
          profiles:opened_by (full_name)
        `)
        .eq('branch_id', branchId)
        .gte('opened_at', start)
        .lt('opened_at', end);

      // Fetch staff attendance from attendance_logs (consolidated table)
      // Group by employee to calculate check-in/check-out pairs
      const { data: attendanceLogsData } = await supabase
        .from('attendance_logs')
        .select(`
          id, timestamp, log_type, employee_id,
          employees:employee_id (
            id,
            full_name
          )
        `)
        .eq('branch_id', branchId)
        .gte('timestamp', start)
        .lt('timestamp', end)
        .order('timestamp');

      // Transform attendance_logs to the same format as before
      // Group by employee_id and pair IN/OUT entries
      const staffData = processAttendanceLogs((attendanceLogsData || []) as AttendanceLogRow[]);

      // Fetch shift notes
      const { data: notesData } = await supabase
        .from('shift_notes')
        .select('note')
        .eq('branch_id', branchId)
        .eq('shift_date', format(selectedDate, 'yyyy-MM-dd'))
        .eq('shift_name', selectedShift?.name || 'Extendido');

      return {
        orders: ordersData || [],
        cancelledOrders: cancelledData || [],
        cashShifts: cashShiftsData || [],
        staffRecords: staffData || [],
        notes: (notesData || []).map(n => n.note),
      };
    },
    enabled: !!branchId && (shifts.length > 0 || isExtendedShift),
  });

  // Calculate summaries
  const totalSales = shiftData?.orders.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
  const orderCount = shiftData?.orders.length || 0;
  const avgTicket = orderCount > 0 ? totalSales / orderCount : 0;

  // Group by payment method
  const paymentBreakdown = shiftData?.orders.reduce((acc, order) => {
    const method = order.payment_method || 'otro';
    acc[method] = (acc[method] || 0) + (order.total || 0);
    return acc;
  }, {} as Record<string, number>) || {};

  // Group by channel
  const channelBreakdown = shiftData?.orders.reduce((acc, order) => {
    const channel = order.sales_channel || 'mostrador';
    acc[channel] = (acc[channel] || 0) + (order.total || 0);
    return acc;
  }, {} as Record<string, number>) || {};

  // Group products by category
  const productBreakdown = shiftData?.orders.flatMap(o => o.order_items || [])
    .reduce((acc, item) => {
      const name = item.product_name_snapshot || 'Producto';
      if (!acc[name]) {
        acc[name] = { quantity: 0, total: 0 };
      }
      acc[name].quantity += item.quantity;
      acc[name].total += item.subtotal;
      return acc;
    }, {} as Record<string, { quantity: number; total: number }>) || {};

  // Staff hours
  const staffHours = shiftData?.staffRecords.map(r => {
    const checkIn = new Date(r.check_in);
    const checkOut = r.check_out ? new Date(r.check_out) : null;
    const hours = checkOut ? (checkOut.getTime() - checkIn.getTime()) / 3600000 : 0;
    return {
      name: r.name || 'Sin nombre',
      checkIn: format(checkIn, 'HH:mm'),
      checkOut: checkOut ? format(checkOut, 'HH:mm') : 'Activo',
      hours: Math.round(hours * 10) / 10,
    };
  }) || [];

  const totalStaffHours = staffHours.reduce((sum, s) => sum + s.hours, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    try {
      await supabase.from('shift_notes').insert({
        branch_id: branchId,
        shift_date: format(selectedDate, 'yyyy-MM-dd'),
        shift_name: selectedShift?.name || 'Extendido',
        note: newNote.trim(),
      });
      
      toast.success('Nota agregada');
      setNewNote('');
    } catch (error: any) {
      toast.error('Error al agregar nota: ' + error.message);
    }
  };

  const handleCaptureImage = async () => {
    if (!reportRef.current) return;
    
    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });
      
      const link = document.createElement('a');
      link.download = `cierre-${selectedShift?.name || 'turno'}-${format(selectedDate, 'yyyy-MM-dd')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success('Imagen descargada');
    } catch (error) {
      toast.error('Error al capturar imagen');
    } finally {
      setIsExporting(false);
    }
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
      pdf.save(`cierre-${selectedShift?.name || 'turno'}-${format(selectedDate, 'yyyy-MM-dd')}.pdf`);
      
      toast.success('PDF descargado');
    } catch (error) {
      toast.error('Error al exportar PDF');
    } finally {
      setIsExporting(false);
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cierre de Turno</h1>
          <p className="text-muted-foreground">{branch?.name}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCaptureImage}
            disabled={isExporting}
          >
            <Camera className="w-4 h-4 mr-2" />
            Capturar
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportPDF}
            disabled={isExporting}
          >
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
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

        <Select 
          value={selectedShiftId} 
          onValueChange={setSelectedShiftId}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Seleccionar turno" />
          </SelectTrigger>
          <SelectContent>
            {shifts.map(shift => (
              <SelectItem key={shift.id} value={shift.id}>
                {shift.name} ({shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)})
              </SelectItem>
            ))}
            <SelectItem value="extended">
              ⏰ Turno Extendido
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Report Content */}
      <div ref={reportRef} className="space-y-6 bg-background p-4 rounded-lg">
        {/* Shift Header */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div>
            <h2 className="text-xl font-bold">
              {isExtendedShift ? '⏰ TURNO EXTENDIDO' : `TURNO ${selectedShift?.name?.toUpperCase()}`}
            </h2>
            <p className="text-muted-foreground">
              {selectedShift && `${selectedShift.start_time.substring(0, 5)} - ${selectedShift.end_time.substring(0, 5)}`}
            </p>
          </div>
          <Badge variant={orderCount > 0 ? 'default' : 'secondary'}>
            {orderCount > 0 ? '✅ Cerrado' : '⚪ Sin pedidos'}
          </Badge>
        </div>

        {/* Summary Cards */}
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
          {/* Sales by Channel */}
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
                        <span className="capitalize">{channel}</span>
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
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sin ventas en este turno
                </p>
              )}
            </CardContent>
          </Card>

          {/* Sales by Payment Method */}
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
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sin ventas en este turno
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Products Sold */}
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

        {/* Cash Register Summary */}
        {(shiftData?.cashShifts?.length || 0) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="w-5 h-5" />
                Arqueo de Caja
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {shiftData?.cashShifts.map((cashShift: any) => (
                <div key={cashShift.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{(cashShift.cash_registers as any)?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Abierta por {(cashShift.profiles as any)?.full_name} {format(new Date(cashShift.opened_at), 'HH:mm')}
                        {cashShift.closed_at && ` → Cerrada ${format(new Date(cashShift.closed_at), 'HH:mm')}`}
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
                      <p className="font-medium">{formatCurrency(cashShift.opening_amount)}</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <p className="text-muted-foreground">Esperado</p>
                      <p className="font-medium">{formatCurrency(cashShift.expected_amount || 0)}</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <p className="text-muted-foreground">Declarado</p>
                      <p className="font-medium">{formatCurrency(cashShift.closing_amount || 0)}</p>
                    </div>
                    <div className={`p-2 rounded ${
                      cashShift.difference === 0 
                        ? 'bg-primary/10' 
                        : 'bg-destructive/10'
                    }`}>
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

        {/* Staff */}
        {staffHours.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Personal del Turno
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Salida</TableHead>
                    <TableHead className="text-right">Horas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffHours.map((staff, i) => (
                    <TableRow key={i}>
                      <TableCell>{staff.name}</TableCell>
                      <TableCell>{staff.checkIn}</TableCell>
                      <TableCell>{staff.checkOut}</TableCell>
                      <TableCell className="text-right">{staff.hours}h</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-medium">
                    <TableCell colSpan={3}>TOTAL</TableCell>
                    <TableCell className="text-right">{totalStaffHours.toFixed(1)}h</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Cancelled Orders */}
        {(shiftData?.cancelledOrders?.length || 0) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="w-5 h-5" />
                Pedidos Cancelados ({shiftData?.cancelledOrders.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shiftData?.cancelledOrders.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell>#{order.caller_number || '-'}</TableCell>
                      <TableCell>{format(new Date(order.created_at), 'HH:mm')}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{order.notes || 'Sin motivo'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(order.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-3 text-right text-sm text-muted-foreground">
                Total cancelado: {formatCurrency(shiftData?.cancelledOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0) || 0)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📝 Notas del Turno
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(shiftData?.notes || []).map((note, i) => (
              <div key={i} className="p-3 bg-muted/50 rounded-lg">
                • {note}
              </div>
            ))}
            
            <div className="flex gap-2">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Agregar nota del turno..."
                className="min-h-[60px]"
              />
              <Button onClick={handleAddNote} disabled={!newNote.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
