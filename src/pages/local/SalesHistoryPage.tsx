/**
 * SalesHistoryPage - Historial de ventas
 *
 * - POS habilitado: Tabs con Pedidos (filtros avanzados) + Mapa de calor
 * - Sin POS: Vista de cierres de turno (legacy)
 */
import { useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { format, subDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertCircle, CheckCircle, DollarSign, Pencil, Download, ShoppingBag, Receipt, TrendingUp } from 'lucide-react';
import { exportToExcel } from '@/lib/exportExcel';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useClosuresByDateRange, getShiftLabel } from '@/hooks/useShiftClosures';
import { PageHeader } from '@/components/ui/page-header';
import { usePermissionsV2 } from '@/hooks/usePermissionsV2';
import { ShiftClosureModal } from '@/components/local/closure/ShiftClosureModal';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePosEnabled } from '@/hooks/usePosEnabled';
import { usePosOrderHistory, DEFAULT_FILTERS, type OrderFilters, type PosOrder } from '@/hooks/pos/usePosOrderHistory';
import { OrderHistoryFilters } from '@/components/pos/OrderHistoryFilters';
import { OrderHistoryTable } from '@/components/pos/OrderHistoryTable';
import { OrderHeatmapChart } from '@/components/pos/OrderHeatmapChart';
import { useAfipConfig } from '@/hooks/useAfipConfig';
import { usePrinting } from '@/hooks/usePrinting';
import { usePrintConfig } from '@/hooks/usePrintConfig';
import { useBranchPrinters } from '@/hooks/useBranchPrinters';
import { toast } from 'sonner';
import type { ShiftType } from '@/types/shiftClosure';

const RANGE_OPTIONS = [
  { value: '7', label: 'Últimos 7 días' },
  { value: '15', label: 'Últimos 15 días' },
  { value: '30', label: 'Últimos 30 días' },
];

const fmtCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(value);

export default function SalesHistoryPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const [daysBack, setDaysBack] = useState('7');
  const posEnabled = usePosEnabled(branchId);

  const { data: branch } = useQuery({
    queryKey: ['branch-name', branchId],
    queryFn: async () => {
      const { data } = await supabase.from('branches').select('name').eq('id', branchId!).single();
      return data;
    },
    enabled: !!branchId,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historial de Ventas"
        subtitle="Cierres de turno registrados"
        breadcrumb={[
          { label: 'Dashboard', href: `/milocal/${branchId}` },
          { label: 'Historial de Ventas' },
        ]}
      />

      {posEnabled ? (
        <PosHistoryView branchId={branchId || ''} branchName={branch?.name || ''} daysBack={daysBack} setDaysBack={setDaysBack} />
      ) : (
        <ClosureHistoryView branchId={branchId || ''} branchName={branch?.name || ''} daysBack={daysBack} setDaysBack={setDaysBack} />
      )}
    </div>
  );
}

/* ─── POS View ─── */
function PosHistoryView({ branchId, branchName, daysBack, setDaysBack }: {
  branchId: string; branchName: string; daysBack: string; setDaysBack: (v: string) => void;
}) {
  const [filters, setFilters] = useState<OrderFilters>(DEFAULT_FILTERS);
  const { orders, totals, isLoading } = usePosOrderHistory(branchId, parseInt(daysBack), filters);

  // Printing & ARCA for reprint
  const { data: afipConfig } = useAfipConfig(branchId);
  const printing = usePrinting(branchId);
  const { data: printConfig } = usePrintConfig(branchId);
  const { data: printersData } = useBranchPrinters(branchId);
  const allPrinters = printersData ?? [];

  const handleReprintInvoice = useCallback(async (order: PosOrder) => {
    const factura = order.facturas_emitidas?.[0];
    if (!factura) {
      toast.error('Este pedido no tiene factura asociada');
      return;
    }
    if (printing.bridgeStatus !== 'connected') {
      toast.error('Sistema de impresión no disponible');
      return;
    }
    const ticketPrinter = printConfig?.ticket_printer_id
      ? allPrinters.find(p => p.id === printConfig.ticket_printer_id && p.is_active)
      : null;
    if (!ticketPrinter) {
      toast.error('No hay impresora de tickets configurada');
      return;
    }
    await printing.printFiscalTicket({
      razon_social: afipConfig?.razon_social || '',
      cuit: afipConfig?.cuit || '',
      direccion_fiscal: afipConfig?.direccion_fiscal || '',
      punto_venta: factura.punto_venta,
      tipo_comprobante: factura.tipo_comprobante,
      numero_comprobante: factura.numero_comprobante,
      cae: factura.cae || '',
      cae_vencimiento: factura.cae_vencimiento || '',
      fecha_emision: factura.fecha_emision.replace(/-/g, ''),
      neto: factura.neto,
      iva: factura.iva,
      total: factura.total,
      numero_pedido: order.numero_pedido,
      branchName,
    }, ticketPrinter);
  }, [afipConfig, printing, printConfig, allPrinters, branchName]);

  const handleExport = () => {
    if (!orders.length) return;
    exportToExcel(
      orders.map(o => ({
        numero: o.numero_pedido,
        fecha: o.created_at ? format(new Date(o.created_at), 'dd/MM/yy HH:mm') : '',
        canal: o.canal_venta || '',
        servicio: o.tipo_servicio || '',
        cliente: o.cliente_nombre || '',
        items: o.pedido_items?.length || 0,
        total: o.total,
        pago: o.pedido_pagos?.map(p => p.metodo).join(', ') || '',
        estado: o.estado,
      })),
      { numero: '#', fecha: 'Fecha', canal: 'Canal', servicio: 'Servicio', cliente: 'Cliente', items: 'Items', total: 'Total', pago: 'Pago', estado: 'Estado' },
      { filename: `pedidos-${branchName || 'local'}` },
    );
  };

  return (
    <Tabs defaultValue="pedidos" className="space-y-4">
      <TabsList>
        <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
        <TabsTrigger value="heatmap">Mapa de calor</TabsTrigger>
      </TabsList>

      <TabsContent value="pedidos" className="space-y-4">
        <OrderHistoryFilters
          daysBack={daysBack}
          onDaysBackChange={setDaysBack}
          filters={filters}
          onFiltersChange={setFilters}
          onExport={handleExport}
          hasData={orders.length > 0}
        />

        {/* KPIs */}
        {!isLoading && (
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="font-medium">{fmtCurrency(totals.totalVendido)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-muted-foreground" />
              <span>{totals.cantidad} pedidos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span>Ticket prom: {fmtCurrency(totals.ticketPromedio)}</span>
            </div>
          </div>
        )}

        <OrderHistoryTable orders={orders} isLoading={isLoading} branchId={branchId} hasOpenShift onReprintInvoice={handleReprintInvoice} />
      </TabsContent>

      <TabsContent value="heatmap" className="space-y-4">
        <div className="flex gap-2 items-center">
          <Select value={daysBack} onValueChange={setDaysBack}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <OrderHeatmapChart branchId={branchId} daysBack={parseInt(daysBack)} />
      </TabsContent>
    </Tabs>
  );
}

/* ─── Closure View (non-POS, unchanged logic) ─── */
function ClosureHistoryView({ branchId, branchName, daysBack, setDaysBack }: {
  branchId: string; branchName: string; daysBack: string; setDaysBack: (v: string) => void;
}) {
  const [editDate, setEditDate] = useState<Date | null>(null);
  const [editShift, setEditShift] = useState<ShiftType | null>(null);
  const { isSuperadmin, isEncargado, isFranquiciado } = usePermissionsV2(branchId);
  const canEdit = isSuperadmin || isEncargado || isFranquiciado;

  const today = startOfDay(new Date());
  const fromDate = subDays(today, parseInt(daysBack));
  const { data: closures, isLoading } = useClosuresByDateRange(branchId, fromDate, today);

  const closuresByDate = useMemo(() => {
    if (!closures) return [];
    const grouped = new Map<string, typeof closures>();
    closures.forEach(c => {
      const existing = grouped.get(c.fecha) || [];
      existing.push(c);
      grouped.set(c.fecha, existing);
    });
    return Array.from(grouped.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [closures]);

  const totals = useMemo(() => {
    if (!closures) return { vendido: 0, hamburguesas: 0, alertas: 0 };
    return closures.reduce((acc, c) => ({
      vendido: acc.vendido + Number(c.total_vendido || 0),
      hamburguesas: acc.hamburguesas + Number(c.total_hamburguesas || 0),
      alertas: acc.alertas + (c.tiene_alerta_facturacion || c.tiene_alerta_posnet || c.tiene_alerta_apps || c.tiene_alerta_caja ? 1 : 0),
    }), { vendido: 0, hamburguesas: 0, alertas: 0 });
  }, [closures]);

  const handleEdit = (fecha: string, turno: string) => {
    setEditDate(new Date(fecha + 'T12:00:00'));
    setEditShift(turno as ShiftType);
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 items-center">
          <Select value={daysBack} onValueChange={setDaysBack}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {closures && closures.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => exportToExcel(
              closures.map((c: any) => ({
                fecha: c.closure_date || '-',
                turno: getShiftLabel(c.shift_type),
                hamburguesas: c.total_hamburguesas || 0,
                vendido: c.total_vendido || 0,
                estado: c.has_alerts ? 'Con alertas' : 'OK',
              })),
              { fecha: 'Fecha', turno: 'Turno', hamburguesas: 'Hamburguesas', vendido: 'Vendido', estado: 'Estado' },
              { filename: 'ventas-historial' }
            )}>
              <Download className="w-4 h-4 mr-1" /> Excel
            </Button>
          )}
        </div>
        {!isLoading && closures && (
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="font-medium">{fmtCurrency(totals.vendido)}</span>
            </div>
            <div className="text-muted-foreground">{totals.hamburguesas} hamburguesas</div>
            {totals.alertas > 0 && (
              <Badge variant="destructive" className="text-xs">{totals.alertas} alertas</Badge>
            )}
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : !closures || closures.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No hay cierres registrados en este período</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead className="text-right">Hamburguesas</TableHead>
                  <TableHead className="text-right">Vendido</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  {canEdit && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {closuresByDate.map(([fecha, dayClosures]) =>
                  dayClosures.map((closure, idx) => {
                    const hasAlerts = closure.tiene_alerta_facturacion || closure.tiene_alerta_posnet || closure.tiene_alerta_apps || closure.tiene_alerta_caja;
                    return (
                      <TableRow key={closure.id}>
                        <TableCell className="font-medium">
                          {idx === 0 ? format(new Date(fecha + 'T12:00:00'), 'EEE d MMM', { locale: es }) : <span className="text-transparent">-</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline">{getShiftLabel(closure.turno)}</Badge>
                            {closure.fuente === 'pos' && <Badge variant="secondary" className="text-xs">POS</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{closure.total_hamburguesas}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{fmtCurrency(Number(closure.total_vendido || 0))}</TableCell>
                        <TableCell className="text-center">
                          {hasAlerts ? <AlertCircle className="w-4 h-4 text-warning mx-auto" /> : <CheckCircle className="w-4 h-4 text-success mx-auto" />}
                        </TableCell>
                        {canEdit && (
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(closure.fecha, closure.turno)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {canEdit && editDate && editShift && (
        <ShiftClosureModal
          open={!!editDate}
          onOpenChange={(open) => { if (!open) { setEditDate(null); setEditShift(null); } }}
          branchId={branchId}
          branchName={branchName}
          defaultShift={editShift}
          defaultDate={editDate}
        />
      )}
    </>
  );
}
