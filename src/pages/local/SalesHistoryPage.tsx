/**
 * SalesHistoryPage - Historial de ventas
 *
 * - POS habilitado: Tabs con Pedidos (filtros avanzados) + Mapa de calor
 * - Sin POS: Vista de cierres de turno (legacy)
 */
import { useState, useMemo, useCallback, Fragment } from 'react';
import { useParams } from 'react-router-dom';
import { format, subDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertCircle,
  CheckCircle,
  DollarSign,
  Pencil,
  Download,
  ShoppingBag,
  TrendingUp,
  Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportToExcel } from '@/lib/exportExcel';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useClosuresByDateRange, getShiftLabel } from '@/hooks/useShiftClosures';
import { PageHeader } from '@/components/ui/page-header';
import { usePermissions } from '@/hooks/usePermissions';
import { ShiftClosureModal } from '@/components/local/closure/ShiftClosureModal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePosEnabled } from '@/hooks/usePosEnabled';
import {
  usePosOrderHistory,
  DEFAULT_FILTERS,
  type OrderFilters,
  type PosOrder,
  type PosOrderFactura,
} from '@/hooks/pos/usePosOrderHistory';
import { OrderHistoryFilters } from '@/components/pos/OrderHistoryFilters';
import { OrderHistoryTable, type ReprintType } from '@/components/pos/OrderHistoryTable';
import { OrderHeatmapChart } from '@/components/pos/OrderHeatmapChart';
import { CancelOrderDialog } from '@/components/pos/CancelOrderDialog';
import { ChangeInvoiceModal, type ChangeInvoiceData } from '@/components/pos/ChangeInvoiceModal';
import { SalesAnalysisTab } from '@/components/pos/SalesAnalysisTab';
import FiscalReportsPage from './FiscalReportsPage';
import { useAfipConfig, useEmitirFactura } from '@/hooks/useAfipConfig';
import { usePrinting } from '@/hooks/usePrinting';
import { usePrintConfig } from '@/hooks/usePrintConfig';
import { useBranchPrinters } from '@/hooks/useBranchPrinters';
import {
  generateTicketCliente,
  generateTicketAnulacion,
  generateComandaCompleta,
  generateVale,
  generateComandaDelivery,
  generateArcaQrBitmap,
  generateInvoicedSalesSummary,
  type TicketClienteData,
  type AnulacionTicketData,
  type InvoicedSalesSummaryData,
} from '@/lib/escpos';
import { useFiscalBranchData } from '@/hooks/useFiscalReports';
import { toast } from 'sonner';
import type { ShiftType } from '@/types/shiftClosure';

const RANGE_OPTIONS = [
  { value: '7', label: 'Últimos 7 días' },
  { value: '15', label: 'Últimos 15 días' },
  { value: '30', label: 'Últimos 30 días' },
];

const fmtCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(value);

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
        <PosHistoryView
          branchId={branchId || ''}
          branchName={branch?.name || ''}
          daysBack={daysBack}
          setDaysBack={setDaysBack}
        />
      ) : (
        <ClosureHistoryView
          branchId={branchId || ''}
          branchName={branch?.name || ''}
          daysBack={daysBack}
          setDaysBack={setDaysBack}
        />
      )}
    </div>
  );
}

/* ─── POS View ─── */
function PosHistoryView({
  branchId,
  branchName,
  daysBack,
  setDaysBack,
}: {
  branchId: string;
  branchName: string;
  daysBack: string;
  setDaysBack: (v: string) => void;
}) {
  const [filters, setFilters] = useState<OrderFilters>(DEFAULT_FILTERS);
  const { orders, totals, isLoading } = usePosOrderHistory(branchId, parseInt(daysBack), filters);
  const queryClient = useQueryClient();

  // Cancel/Change invoice state
  const [cancellingOrder, setCancellingOrder] = useState<PosOrder | null>(null);
  const [changingInvoiceOrder, setChangingInvoiceOrder] = useState<PosOrder | null>(null);

  // Printing & ARCA for reprint
  const { data: afipConfig } = useAfipConfig(branchId);
  const { data: fiscalBranch } = useFiscalBranchData(branchId);
  const printing = usePrinting(branchId);
  const { data: printConfig } = usePrintConfig(branchId);
  const { data: printersData } = useBranchPrinters(branchId);
  const allPrinters = printersData ?? [];
  const emitirFactura = useEmitirFactura();

  const formatMetodoPago = (method?: string) => {
    switch (method) {
      case 'efectivo':
        return 'Efectivo';
      case 'tarjeta_debito':
        return 'Tarjeta debito';
      case 'tarjeta_credito':
        return 'Tarjeta credito';
      case 'mercadopago_qr':
        return 'QR Mercado Pago';
      case 'transferencia':
        return 'Transferencia';
      default:
        return undefined;
    }
  };

  const mapFiscalDocType = (tipoComprobante: string) => {
    switch (tipoComprobante) {
      case 'A':
        return { tipo: 'A' as const, codigo: '01', esNC: false };
      case 'B':
        return { tipo: 'B' as const, codigo: '06', esNC: false };
      case 'C':
        return { tipo: 'C' as const, codigo: '11', esNC: false };
      case 'NC_A':
        return { tipo: 'A' as const, codigo: '03', esNC: true };
      case 'NC_B':
        return { tipo: 'B' as const, codigo: '08', esNC: true };
      case 'NC_C':
        return { tipo: 'C' as const, codigo: '13', esNC: true };
      default:
        return { tipo: 'B' as const, codigo: '06', esNC: false };
    }
  };

  const buildPrintableOrder = (order: PosOrder) => ({
    numero_pedido: order.numero_pedido,
    tipo_servicio: order.tipo_servicio,
    numero_llamador: order.numero_llamador ?? null,
    canal_venta: order.canal_venta,
    cliente_nombre: order.cliente_nombre,
    referencia_app: (order as any).referencia_app ?? null,
    created_at: order.created_at,
    items: order.pedido_items.map((i) => ({
      nombre: i.nombre,
      cantidad: i.cantidad,
      notas: i.notas,
      estacion: 'armado' as const,
      precio_unitario: i.precio_unitario,
      subtotal: i.subtotal,
      categoria_carta_id: i.categoria_carta_id,
    })),
    total: order.total,
    descuento: order.descuento || 0,
    cliente_telefono: order.cliente_telefono,
    cliente_direccion: order.cliente_direccion,
  });

  const printFiscalDocument = useCallback(
    async (order: PosOrder, factura: PosOrderFactura, successMessage: string) => {
      if (printing.bridgeStatus !== 'connected') {
        throw new Error('Sistema de impresión no disponible');
      }
      const ticketPrinter = printConfig?.ticket_printer_id
        ? allPrinters.find((p) => p.id === printConfig.ticket_printer_id && p.is_active)
        : null;
      if (!ticketPrinter) {
        throw new Error('No hay impresora de tickets configurada');
      }

      const printableOrder = buildPrintableOrder(order);
      const afipExtra = afipConfig as unknown as { iibb?: string; condicion_iva?: string } | null;
      const payment = order.pedido_pagos?.[0];
      const fiscalType = mapFiscalDocType(factura.tipo_comprobante);

      const ticketData: TicketClienteData = {
        order: printableOrder,
        branchName,
        metodo_pago: formatMetodoPago(payment?.metodo),
        factura: {
          tipo: fiscalType.tipo,
          codigo: fiscalType.codigo,
          numero: `${String(factura.punto_venta).padStart(5, '0')}-${String(factura.numero_comprobante).padStart(8, '0')}`,
          fecha: factura.fecha_emision,
          emisor: {
            razon_social: afipConfig?.razon_social || '',
            cuit: afipConfig?.cuit || '',
            iibb: afipExtra?.iibb || afipConfig?.cuit || '',
            condicion_iva: afipExtra?.condicion_iva || 'Responsable Inscripto',
            domicilio: afipConfig?.direccion_fiscal || '',
            inicio_actividades: afipConfig?.inicio_actividades || '',
          },
          receptor: {
            nombre: factura.receptor_razon_social || order.cliente_nombre || undefined,
            documento_tipo: factura.receptor_cuit ? 'CUIT' : 'DNI',
            documento_numero: factura.receptor_cuit || undefined,
            condicion_iva: factura.receptor_condicion_iva || 'Consumidor Final',
          },
          neto_gravado: factura.neto || 0,
          iva: factura.iva || 0,
          otros_tributos: 0,
          iva_contenido: factura.iva || 0,
          otros_imp_nacionales: 0,
          cae: factura.cae || '',
          cae_vto: factura.cae_vencimiento || '',
        },
      };
      if (ticketData.factura) {
        try {
          const qr = await generateArcaQrBitmap(ticketData.factura);
          ticketData.factura = { ...ticketData.factura, qr_bitmap_b64: qr };
        } catch {
          // fallback sin QR
        }
      }

      const data = generateTicketCliente(ticketData, ticketPrinter.paper_width);
      const { printRawBase64 } = await import('@/lib/qz-print');
      await printRawBase64(ticketPrinter.ip_address!, ticketPrinter.port, data);
      toast.success(successMessage);
    },
    [afipConfig, allPrinters, branchName, printConfig?.ticket_printer_id, printing.bridgeStatus],
  );

  // Fetch vale category IDs
  const { data: valeCategoryIds } = useQuery({
    queryKey: ['vale-category-ids'],
    queryFn: async () => {
      const { data } = await supabase
        .from('menu_categorias' as any)
        .select('id, tipo_impresion')
        .eq('activo', true);
      return new Set(
        ((data as any[]) ?? [])
          .filter((c: any) => c.tipo_impresion === 'vale')
          .map((c: any) => c.id as string),
      );
    },
    staleTime: 5 * 60 * 1000,
  });

  const invalidateOrders = () => {
    queryClient.invalidateQueries({ queryKey: ['pos-order-history', branchId] });
  };

  // ─── Cancel Order Handler ───
  const handleCancelOrder = useCallback(async () => {
    if (!cancellingOrder) return;
    const order = cancellingOrder;
    const activeInvoice = order.facturas_emitidas?.find((f) => !f.anulada);

    try {
      // If there's an active invoice, emit credit note first
      if (activeInvoice) {
        const { data, error } = await supabase.functions.invoke('emitir-nota-credito', {
          body: { factura_id: activeInvoice.id, branch_id: branchId },
        });
        if (error) {
          let detail = error.message;
          try {
            const body = await (error as any).context?.json?.();
            if (body?.error) detail = body.error;
            else if (body?.details) detail = body.details;
          } catch {
            /* use default message */
          }
          throw new Error(detail);
        }
        if (!data?.success) throw new Error(data?.error || 'Error al emitir nota de crédito');
        toast.success(`Nota de crédito ${data.tipo} emitida: N° ${data.numero}`);

        const ncDoc: PosOrderFactura = {
          ...activeInvoice,
          tipo_comprobante: data.tipo || 'NC_B',
          punto_venta: data.punto_venta ?? activeInvoice.punto_venta,
          numero_comprobante: data.numero ?? 0,
          cae: data.cae ?? null,
          cae_vencimiento: data.cae_vencimiento ?? null,
          fecha_emision: new Date().toISOString().slice(0, 10),
          total: data.total ?? activeInvoice.total,
          anulada: false,
          factura_asociada_id: activeInvoice.id,
        };
        try {
          await printFiscalDocument(order, ncDoc, 'Nota de Crédito impresa');
        } catch (printError) {
          const printMsg =
            printError instanceof Error ? printError.message : 'Error desconocido de impresión';
          toast.error('NC emitida pero no se pudo imprimir', { description: printMsg });
        }
      }

      // Mark order as cancelled
      const { error: updateError } = await supabase
        .from('pedidos')
        .update({ estado: 'cancelado' })
        .eq('id', order.id);
      if (updateError) throw updateError;

      // Print cancellation ticket
      try {
        if (printing.bridgeStatus === 'connected') {
          const ticketPrinter = printConfig?.ticket_printer_id
            ? allPrinters.find((p) => p.id === printConfig.ticket_printer_id && p.is_active)
            : null;
          if (ticketPrinter) {
            const printableOrder = buildPrintableOrder(order);
            const payment = order.pedido_pagos?.[0];
            const anulacionData: AnulacionTicketData = {
              order: printableOrder,
              branchName,
              metodo_pago: formatMetodoPago(payment?.metodo),
            };
            const ticketBytes = generateTicketAnulacion(anulacionData, ticketPrinter.paper_width);
            const { printRawBase64 } = await import('@/lib/qz-print');
            await printRawBase64(ticketPrinter.ip_address!, ticketPrinter.port, ticketBytes);
          }
        }
      } catch (printErr) {
        const printMsg = printErr instanceof Error ? printErr.message : 'Error desconocido';
        toast.error('Pedido anulado pero no se pudo imprimir ticket', { description: printMsg });
      }

      toast.success(`Pedido #${order.numero_pedido} anulado`);
      invalidateOrders();
      setCancellingOrder(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error('Error al anular pedido', { description: msg });
    }
  }, [
    cancellingOrder,
    branchId,
    printFiscalDocument,
    printing.bridgeStatus,
    printConfig?.ticket_printer_id,
    allPrinters,
    branchName,
  ]);

  // ─── Change Invoice Handler ───
  const handleChangeInvoice = useCallback(
    async (data: ChangeInvoiceData) => {
      if (!changingInvoiceOrder) return;
      const order = changingInvoiceOrder;
      const activeInvoice = order.facturas_emitidas?.find((f) => !f.anulada);

      if (!activeInvoice) {
        toast.error('No hay factura activa para cambiar');
        return;
      }

      try {
        // 1. Emit credit note for original
        const { data: ncData, error: ncError } = await supabase.functions.invoke(
          'emitir-nota-credito',
          {
            body: { factura_id: activeInvoice.id, branch_id: branchId },
          },
        );
        if (ncError) {
          let detail = ncError.message;
          try {
            const body = await (ncError as any).context?.json?.();
            if (body?.error) detail = body.error;
            else if (body?.details) detail = body.details;
          } catch {
            /* use default message */
          }
          throw new Error(detail);
        }
        if (!ncData?.success) throw new Error(ncData?.error || 'Error al emitir nota de crédito');
        toast.success(`NC ${ncData.tipo} emitida: N° ${ncData.numero}`);

        // 2. Emit new invoice with corrected data
        const items = order.pedido_items.map((i) => ({
          descripcion: i.nombre,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
        }));

        await emitirFactura.mutateAsync({
          branch_id: branchId,
          pedido_id: order.id,
          tipo_factura: data.tipo_factura,
          receptor_cuit: data.receptor_cuit || undefined,
          receptor_razon_social: data.receptor_razon_social || undefined,
          receptor_condicion_iva: data.receptor_condicion_iva || undefined,
          items,
          total: order.total,
        });

        invalidateOrders();
        setChangingInvoiceOrder(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        toast.error('Error al cambiar facturación', { description: msg });
      }
    },
    [changingInvoiceOrder, branchId, emitirFactura],
  );

  const handleReprint = useCallback(
    async (order: PosOrder, type: ReprintType) => {
      if (printing.bridgeStatus !== 'connected') {
        toast.error('Sistema de impresión no disponible');
        return;
      }
      const ticketPrinter = printConfig?.ticket_printer_id
        ? allPrinters.find((p) => p.id === printConfig.ticket_printer_id && p.is_active)
        : null;
      if (!ticketPrinter) {
        toast.error('No hay impresora de tickets configurada');
        return;
      }

      const printableOrder = buildPrintableOrder(order);

      try {
        switch (type) {
          case 'ticket': {
            const ticketData: TicketClienteData = {
              order: printableOrder,
              branchName,
            };
            const data = generateTicketCliente(ticketData, ticketPrinter.paper_width);
            const { printRawBase64 } = await import('@/lib/qz-print');
            await printRawBase64(ticketPrinter.ip_address!, ticketPrinter.port, data);
            toast.success('Ticket impreso');
            break;
          }
          case 'comanda': {
            const data = generateComandaCompleta(
              printableOrder,
              branchName,
              ticketPrinter.paper_width,
            );
            const comandaPrinter = printConfig?.comanda_printer_id
              ? allPrinters.find((p) => p.id === printConfig.comanda_printer_id && p.is_active)
              : ticketPrinter;
            const { printRawBase64 } = await import('@/lib/qz-print');
            await printRawBase64(
              (comandaPrinter || ticketPrinter).ip_address!,
              (comandaPrinter || ticketPrinter).port,
              data,
            );
            toast.success('Comanda impresa');
            break;
          }
          case 'vale': {
            const valePrinter = printConfig?.vale_printer_id
              ? allPrinters.find((p) => p.id === printConfig.vale_printer_id && p.is_active)
              : ticketPrinter;
            const printer = valePrinter || ticketPrinter;
            const { printRawBase64 } = await import('@/lib/qz-print');

            const valeCatIds = valeCategoryIds || new Set<string>();
            const valeItems = printableOrder.items.filter(
              (item) => item.categoria_carta_id && valeCatIds.has(item.categoria_carta_id),
            );

            if (valeItems.length === 0) {
              toast.info('Este pedido no tiene items de tipo vale (bebidas)');
              break;
            }

            for (const item of valeItems) {
              for (let i = 0; i < item.cantidad; i++) {
                const data = generateVale(
                  item.nombre || 'Producto',
                  printableOrder.numero_pedido,
                  printableOrder.created_at,
                  printableOrder.canal_venta || undefined,
                  undefined,
                  printer.paper_width,
                );
                await printRawBase64(printer.ip_address!, printer.port, data);
              }
            }
            toast.success(`${valeItems.length} vale(s) impresos`);
            break;
          }
          case 'delivery': {
            const data = generateComandaDelivery(
              printableOrder,
              branchName,
              ticketPrinter.paper_width,
            );
            const { printRawBase64 } = await import('@/lib/qz-print');
            await printRawBase64(ticketPrinter.ip_address!, ticketPrinter.port, data);
            toast.success('Ticket delivery impreso');
            break;
          }
          case 'factura': {
            const factura = order.facturas_emitidas
              ?.filter((f) => !f.anulada && !f.tipo_comprobante.startsWith('NC_'))
              .sort((a, b) => b.numero_comprobante - a.numero_comprobante)[0];
            if (!factura) {
              toast.error('Este pedido no tiene factura para reimprimir');
              return;
            }
            await printFiscalDocument(order, factura, 'Factura reimpresa');
            break;
          }
          case 'nota_credito': {
            const notaCredito = order.facturas_emitidas
              ?.filter((f) => f.tipo_comprobante.startsWith('NC_'))
              .sort((a, b) => b.numero_comprobante - a.numero_comprobante)[0];
            if (!notaCredito) {
              toast.error('Este pedido no tiene nota de crédito para reimprimir');
              return;
            }
            await printFiscalDocument(order, notaCredito, 'Nota de Crédito reimpresa');
            break;
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        toast.error('Error al reimprimir', { description: msg });
      }
    },
    [
      buildPrintableOrder,
      printConfig,
      allPrinters,
      branchName,
      valeCategoryIds,
      printFiscalDocument,
      printing.bridgeStatus,
    ],
  );

  const handleExport = () => {
    if (!orders.length) return;
    exportToExcel(
      orders.map((o) => ({
        numero: o.numero_pedido,
        fecha: o.created_at ? format(new Date(o.created_at), 'dd/MM/yy HH:mm') : '',
        canal: o.canal_venta || '',
        servicio: o.tipo_servicio || '',
        cliente: o.cliente_nombre || '',
        items: o.pedido_items?.length || 0,
        total: o.total,
        pago: o.pedido_pagos?.map((p) => p.metodo).join(', ') || '',
        estado: o.estado,
      })),
      {
        numero: '#',
        fecha: 'Fecha',
        canal: 'Canal',
        servicio: 'Servicio',
        cliente: 'Cliente',
        items: 'Items',
        total: 'Total',
        pago: 'Pago',
        estado: 'Estado',
      },
      { filename: `pedidos-${branchName || 'local'}` },
    );
  };

  const handlePrintInvoicedSummary = async () => {
    if (!fiscalBranch || printing.bridgeStatus !== 'connected') {
      toast.error('Impresión no disponible');
      return;
    }
    const ticketPrinter = printConfig?.ticket_printer_id
      ? allPrinters.find((p) => p.id === printConfig.ticket_printer_id && p.is_active)
      : null;
    if (!ticketPrinter) {
      toast.error('No hay impresora de tickets configurada');
      return;
    }
    const invoicedOrders = orders.filter((o) =>
      o.facturas_emitidas?.some(
        (f) => !f.anulada && f.cae && !f.tipo_comprobante.startsWith('NC_'),
      ),
    );
    if (invoicedOrders.length === 0) {
      toast.info('No hay ventas facturadas en el período');
      return;
    }
    const ventas = invoicedOrders
      .flatMap((o) =>
        (o.facturas_emitidas || [])
          .filter((f) => !f.anulada && f.cae && !f.tipo_comprobante.startsWith('NC_'))
          .map((f) => ({
            fecha: f.fecha_emision,
            tipo: f.tipo_comprobante,
            numero: `${String(f.punto_venta).padStart(5, '0')}-${String(f.numero_comprobante).padStart(8, '0')}`,
            total: f.total,
            cae: f.cae || '',
          })),
      )
      .sort((a, b) => a.numero.localeCompare(b.numero));

    const summaryData: InvoicedSalesSummaryData = {
      fecha_desde: orders[orders.length - 1]?.created_at || '',
      fecha_hasta: orders[0]?.created_at || '',
      ventas,
      total: ventas.reduce((s, v) => s + v.total, 0),
    };
    try {
      const data = generateInvoicedSalesSummary(
        summaryData,
        fiscalBranch,
        ticketPrinter.paper_width,
      );
      const { printRawBase64 } = await import('@/lib/qz-print');
      await printRawBase64(ticketPrinter.ip_address!, ticketPrinter.port, data);
      toast.success('Resumen de ventas facturadas impreso');
    } catch (e: any) {
      toast.error('Error al imprimir: ' + e.message);
    }
  };

  const changingInvoiceFactura = changingInvoiceOrder?.facturas_emitidas?.find((f) => !f.anulada);

  return (
    <>
      <Tabs defaultValue="pedidos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
          <TabsTrigger value="analisis">Análisis</TabsTrigger>
          <TabsTrigger value="heatmap">Mapa de calor</TabsTrigger>
          <TabsTrigger value="fiscal">Reportes Fiscales</TabsTrigger>
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

          {/* KPIs + ARCA print */}
          {!isLoading && (
            <div className="flex flex-wrap gap-4 text-sm items-center">
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
              <div className="ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintInvoicedSummary}
                  disabled={printing.bridgeStatus !== 'connected'}
                  title="Imprimir resumen de ventas facturadas para inspección ARCA"
                >
                  <Printer className="w-4 h-4 mr-1" /> Resumen facturado
                </Button>
              </div>
            </div>
          )}

          <OrderHistoryTable
            orders={orders}
            isLoading={isLoading}
            branchId={branchId}
            hasOpenShift
            onReprint={handleReprint}
            onCancelOrder={(order) => setCancellingOrder(order)}
            onChangeInvoice={(order) => setChangingInvoiceOrder(order)}
            valeCategoryIds={valeCategoryIds}
          />
        </TabsContent>

        <TabsContent value="analisis" className="space-y-4">
          <SalesAnalysisTab
            branchId={branchId}
            daysBack={daysBack}
            onDaysBackChange={setDaysBack}
          />
        </TabsContent>

        <TabsContent value="heatmap" className="space-y-4">
          <div className="flex gap-2 items-center">
            <Select value={daysBack} onValueChange={setDaysBack}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <OrderHeatmapChart branchId={branchId} daysBack={parseInt(daysBack)} />
        </TabsContent>

        <TabsContent value="fiscal" className="space-y-4">
          <FiscalReportsPage />
        </TabsContent>
      </Tabs>

      {/* Cancel Order Dialog */}
      {cancellingOrder && (
        <CancelOrderDialog
          open={!!cancellingOrder}
          onOpenChange={(v) => {
            if (!v) setCancellingOrder(null);
          }}
          order={cancellingOrder}
          onConfirm={handleCancelOrder}
        />
      )}

      {/* Change Invoice Modal */}
      {changingInvoiceOrder && changingInvoiceFactura && (
        <ChangeInvoiceModal
          open={!!changingInvoiceOrder}
          onOpenChange={(v) => {
            if (!v) setChangingInvoiceOrder(null);
          }}
          facturaOriginal={changingInvoiceFactura}
          pedidoId={changingInvoiceOrder.id}
          branchId={branchId}
          onConfirm={handleChangeInvoice}
        />
      )}
    </>
  );
}

/* ─── Closure View (non-POS, unchanged logic) ─── */
function ClosureHistoryView({
  branchId,
  branchName,
  daysBack,
  setDaysBack,
}: {
  branchId: string;
  branchName: string;
  daysBack: string;
  setDaysBack: (v: string) => void;
}) {
  const [editDate, setEditDate] = useState<Date | null>(null);
  const [editShift, setEditShift] = useState<ShiftType | null>(null);
  const { isSuperadmin, isEncargado, isFranquiciado } = usePermissions(branchId);
  const canEdit = isSuperadmin || isEncargado || isFranquiciado;

  const today = startOfDay(new Date());
  const fromDate = subDays(today, parseInt(daysBack));
  const { data: closures, isLoading } = useClosuresByDateRange(branchId, fromDate, today);

  const closuresByDate = useMemo(() => {
    if (!closures) return [];
    const grouped = new Map<string, typeof closures>();
    closures.forEach((c) => {
      const existing = grouped.get(c.fecha) || [];
      existing.push(c);
      grouped.set(c.fecha, existing);
    });
    return Array.from(grouped.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [closures]);

  const totals = useMemo(() => {
    if (!closures) return { vendido: 0, hamburguesas: 0, alertas: 0 };
    return closures.reduce(
      (acc, c) => ({
        vendido: acc.vendido + Number(c.total_vendido || 0),
        hamburguesas: acc.hamburguesas + Number(c.total_hamburguesas || 0),
        alertas:
          acc.alertas +
          (c.tiene_alerta_facturacion ||
          c.tiene_alerta_posnet ||
          c.tiene_alerta_apps ||
          c.tiene_alerta_caja
            ? 1
            : 0),
      }),
      { vendido: 0, hamburguesas: 0, alertas: 0 },
    );
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
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {closures && closures.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportToExcel(
                  closures.map((c: any) => ({
                    fecha: c.closure_date || '-',
                    turno: getShiftLabel(c.shift_type),
                    hamburguesas: c.total_hamburguesas || 0,
                    vendido: c.total_vendido || 0,
                    estado: c.has_alerts ? 'Con alertas' : 'OK',
                  })),
                  {
                    fecha: 'Fecha',
                    turno: 'Turno',
                    hamburguesas: 'Hamburguesas',
                    vendido: 'Vendido',
                    estado: 'Estado',
                  },
                  { filename: 'ventas-historial' },
                )
              }
            >
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
              <Badge variant="destructive" className="text-xs">
                {totals.alertas} alertas
              </Badge>
            )}
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
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
                {closuresByDate.map(([fecha, dayClosures]) => (
                  <Fragment key={fecha}>
                    {dayClosures.map((closure, idx) => {
                      const hasAlerts =
                        closure.tiene_alerta_facturacion ||
                        closure.tiene_alerta_posnet ||
                        closure.tiene_alerta_apps ||
                        closure.tiene_alerta_caja;
                      return (
                        <TableRow key={closure.id}>
                          <TableCell className="font-medium">
                            {idx === 0 ? (
                              format(new Date(fecha + 'T12:00:00'), 'EEE d MMM', { locale: es })
                            ) : (
                              <span className="text-transparent">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Badge variant="outline">{getShiftLabel(closure.turno)}</Badge>
                              {closure.fuente === 'pos' && (
                                <Badge variant="secondary" className="text-xs">
                                  POS
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {closure.total_hamburguesas}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium">
                            {fmtCurrency(Number(closure.total_vendido || 0))}
                          </TableCell>
                          <TableCell className="text-center">
                            {hasAlerts ? (
                              <AlertCircle className="w-4 h-4 text-warning mx-auto" />
                            ) : (
                              <CheckCircle className="w-4 h-4 text-success mx-auto" />
                            )}
                          </TableCell>
                          {canEdit && (
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEdit(closure.fecha, closure.turno)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {canEdit && editDate && editShift && (
        <ShiftClosureModal
          open={!!editDate}
          onOpenChange={(open) => {
            if (!open) {
              setEditDate(null);
              setEditShift(null);
            }
          }}
          branchId={branchId}
          branchName={branchName}
          defaultShift={editShift}
          defaultDate={editDate}
        />
      )}
    </>
  );
}
