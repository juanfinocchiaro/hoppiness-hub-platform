/**
 * FiscalReportsPage — Reportes Fiscales ARCA
 *
 * Informe X, Cierre Z, Auditoría, Reimpresión de comprobantes.
 * Accessible desde Historial de Ventas (tab "Reportes Fiscales").
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
  FileText, Lock, Search, Printer, CheckCircle, AlertTriangle,
  Calendar, Hash,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  useFiscalBranchData,
  useFiscalXReport,
  useGenerateZClosing,
  useLastZClosing,
  useFiscalAuditReport,
  useZClosings,
} from '@/hooks/useFiscalReports';

import { usePrintConfig } from '@/hooks/usePrintConfig';
import { useBranchPrinters } from '@/hooks/useBranchPrinters';
import {
  generateInformeX, generateCierreZ, generateInformeAuditoria,
  type FiscalXData, type FiscalZData, type FiscalAuditData,
} from '@/lib/escpos';

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(v);

export default function FiscalReportsPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: branchData } = useFiscalBranchData(branchId);
  const { data: lastZ, isLoading: loadingLastZ } = useLastZClosing(branchId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reportes Fiscales</h2>
          <p className="text-muted-foreground">ARCA — Informes X, Cierres Z y Auditoría</p>
        </div>
        {!loadingLastZ && lastZ && (
          <Badge variant="outline" className="text-sm gap-1.5 py-1.5 px-3">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Último Z: N° {String((lastZ as any).z_number).padStart(4, '0')} — {format(new Date((lastZ as any).date), 'dd/MM/yyyy')}
          </Badge>
        )}
        {!loadingLastZ && !lastZ && (
          <Badge variant="outline" className="text-sm gap-1.5 py-1.5 px-3">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Sin cierres Z registrados
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InformeXCard branchId={branchId!} branchData={branchData} />
        <CierreZCard branchId={branchId!} branchData={branchData} lastZ={lastZ} />
        <AuditoriaCard branchId={branchId!} branchData={branchData} />
        <ReimprimirCard branchId={branchId!} branchData={branchData} />
      </div>
    </div>
  );
}

// ─── Informe X Card ───────────────────────────────────────────

function InformeXCard({ branchId, branchData }: {
  branchId: string;
  branchData: any;
}) {
  const xReport = useFiscalXReport(branchId);
  const [previewData, setPreviewData] = useState<FiscalXData | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const { data: printConfig } = usePrintConfig(branchId);
  const { data: printers } = useBranchPrinters(branchId);

  const handleClick = () => {
    setSelectedDate(new Date().toISOString().slice(0, 10));
    setDatePickerOpen(true);
  };

  const handleGenerate = async () => {
    setDatePickerOpen(false);
    try {
      const data = await xReport.mutateAsync(selectedDate);
      setPreviewData(data);
    } catch (e: any) {
      toast.error(e.message || 'Error al generar Informe X');
    }
  };

  const handlePrint = async () => {
    if (!previewData || !branchData) return;
    const ticketPrinter = printConfig?.ticket_printer_id
      ? (printers ?? []).find((p: any) => p.id === printConfig.ticket_printer_id && p.is_active)
      : null;

    if (!ticketPrinter) {
      toast.error('No hay impresora de tickets configurada', {
        description: 'Andá a Configuración > Impresoras para configurarla.',
      });
      return;
    }

    try {
      const data = generateInformeX(previewData, branchData, ticketPrinter.paper_width);
      const { printRawBase64 } = await import('@/lib/qz-print');
      await printRawBase64(ticketPrinter.ip_address!, ticketPrinter.port, data);
      toast.success('Informe X impreso');
    } catch (e: any) {
      toast.error('Error de impresión: ' + e.message);
    }
  };

  return (
    <>
      <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={handleClick}>
        <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
          <div className="rounded-xl bg-blue-50 p-4">
            <FileText className="h-10 w-10 text-blue-600" />
          </div>
          <CardTitle className="text-lg">INFORME X</CardTitle>
          <CardDescription className="text-center">Consulta en vivo — No cierra jornada</CardDescription>
          {xReport.isPending && <Skeleton className="h-4 w-32" />}
        </CardContent>
      </Card>

      {/* Date picker dialog */}
      <Dialog open={datePickerOpen} onOpenChange={setDatePickerOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Informe X</DialogTitle>
            <DialogDescription>Seleccioná la fecha para generar el informe</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDatePickerOpen(false)}>Cancelar</Button>
            <Button onClick={handleGenerate} disabled={xReport.isPending}>
              {xReport.isPending ? 'Generando...' : 'Generar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={!!previewData} onOpenChange={() => setPreviewData(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Informe X — Vista Previa</DialogTitle>
            <DialogDescription>Fecha: {selectedDate}</DialogDescription>
          </DialogHeader>
          {previewData && <XReportPreview data={previewData} />}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPreviewData(null)}>Cerrar</Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function XReportPreview({ data }: { data: FiscalXData }) {
  return (
    <div className="font-mono text-xs space-y-2 bg-muted p-4 rounded-lg">
      <div className="text-center font-bold">INFORME X</div>
      <div className="text-center text-muted-foreground">
        Fecha: {data.fecha} — Hora: {data.hora}
      </div>
      <hr />
      <div className="font-bold">Comprobantes</div>
      <Row label="Facturas B" value={data.facturas_b} />
      <Row label="Facturas C" value={data.facturas_c} />
      <Row label="NC B" value={data.notas_credito_b} />
      <Row label="NC C" value={data.notas_credito_c} />
      <hr />
      <div className="font-bold">IVA</div>
      <Row label="Gravado 21%" value={fmtCurrency(data.gravado_21)} />
      <Row label="IVA 21%" value={fmtCurrency(data.iva_21)} />
      <Row label="Gravado 10.5%" value={fmtCurrency(data.gravado_105)} />
      <Row label="IVA 10.5%" value={fmtCurrency(data.iva_105)} />
      <Row label="Exento" value={fmtCurrency(data.exento)} />
      <hr />
      <div className="font-bold">Totales</div>
      <Row label="Subtotal neto" value={fmtCurrency(data.subtotal_neto)} />
      <Row label="Total IVA" value={fmtCurrency(data.total_iva)} />
      <Row label="TOTAL VENTAS" value={fmtCurrency(data.total_ventas)} bold />
      <hr />
      <div className="font-bold">Medios de Pago</div>
      <Row label="Efectivo" value={fmtCurrency(data.pago_efectivo)} />
      <Row label="Débito" value={fmtCurrency(data.pago_debito)} />
      <Row label="Crédito" value={fmtCurrency(data.pago_credito)} />
      <Row label="MP / QR" value={fmtCurrency(data.pago_qr)} />
      <Row label="Transferencia" value={fmtCurrency(data.pago_transferencia)} />
      {data.ultimo_comprobante && (
        <>
          <hr />
          <div className="text-center text-muted-foreground">
            Último: {data.ultimo_comprobante}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Cierre Z Card ────────────────────────────────────────────

function CierreZCard({ branchId, branchData, lastZ }: {
  branchId: string;
  branchData: any;
  lastZ: any;
}) {
  const generateZ = useGenerateZClosing(branchId);
  const [previewData, setPreviewData] = useState<FiscalZData | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [existingZ, setExistingZ] = useState<FiscalZData | null>(null);
  const { data: printConfig } = usePrintConfig(branchId);
  const { data: printers } = useBranchPrinters(branchId);
  const xReport = useFiscalXReport(branchId);

  const handleClick = async () => {
    try {
      const xData = await xReport.mutateAsync(undefined);
      if (xData.total_comprobantes === 0) {
        toast.info('No hay comprobantes emitidos hoy para generar Cierre Z');
        return;
      }
      setConfirmOpen(true);
    } catch (e: any) {
      if (e.message?.includes('Ya existe')) {
        setExistingZ(lastZ);
      } else {
        toast.error(e.message || 'Error al verificar');
      }
    }
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    try {
      const data = await generateZ.mutateAsync(undefined);
      setPreviewData(data);
      toast.success(`Cierre Z N° ${(data as any).z_number} generado correctamente`);
    } catch (e: any) {
      if (e.message?.includes('Ya existe')) {
        toast.error('Ya se generó el Cierre Z del día');
        setExistingZ(lastZ);
      } else {
        toast.error(e.message || 'Error al generar Cierre Z');
      }
    }
  };

  const handlePrint = async (zData: FiscalZData) => {
    if (!branchData) return;
    const ticketPrinter = printConfig?.ticket_printer_id
      ? (printers ?? []).find((p: any) => p.id === printConfig.ticket_printer_id && p.is_active)
      : null;

    if (!ticketPrinter) {
      toast.error('No hay impresora de tickets configurada', {
        description: 'Andá a Configuración > Impresoras para configurarla.',
      });
      return;
    }

    try {
      const data = generateCierreZ(zData, branchData, ticketPrinter.paper_width);
      const { printRawBase64 } = await import('@/lib/qz-print');
      await printRawBase64(ticketPrinter.ip_address!, ticketPrinter.port, data);
      toast.success('Cierre Z impreso');
    } catch (e: any) {
      toast.error('Error de impresión: ' + e.message);
    }
  };

  const nextZ = lastZ ? (lastZ as any).z_number + 1 : 1;
  const today = format(new Date(), 'dd/MM/yyyy');

  return (
    <>
      <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={handleClick}>
        <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
          <div className="rounded-xl bg-red-50 p-4">
            <Lock className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="text-lg">CIERRE Z</CardTitle>
          <CardDescription className="text-center">Cierre definitivo del día fiscal</CardDescription>
          {(generateZ.isPending || xReport.isPending) && <Skeleton className="h-4 w-32" />}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Cierre Z</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Confirmar Cierre Z N° {String(nextZ).padStart(4, '0')} del {today}?
              <br /><br />
              <strong>Este cierre es definitivo y no puede modificarse.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} className="bg-red-600 hover:bg-red-700">
              Confirmar Cierre Z
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!previewData} onOpenChange={() => setPreviewData(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cierre Z N° {String((previewData as any)?.z_number || 0).padStart(4, '0')}</DialogTitle>
            <DialogDescription>Cierre generado exitosamente</DialogDescription>
          </DialogHeader>
          {previewData && <ZReportPreview data={previewData} />}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPreviewData(null)}>Cerrar</Button>
            <Button onClick={() => handlePrint(previewData!)}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!existingZ} onOpenChange={() => setExistingZ(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cierre Z ya generado</DialogTitle>
            <DialogDescription>
              Ya se generó el Cierre Z del día. Podés reimprimirlo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setExistingZ(null)}>Cerrar</Button>
            <Button onClick={() => { handlePrint(existingZ!); setExistingZ(null); }}>
              <Printer className="h-4 w-4 mr-2" />
              Reimprimir Z
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ZReportPreview({ data }: { data: FiscalZData }) {
  const d = data as any;
  return (
    <div className="font-mono text-xs space-y-2 bg-muted p-4 rounded-lg">
      <div className="text-center font-bold">CIERRE Z N° {String(d.z_number).padStart(4, '0')}</div>
      <hr />
      <div className="font-bold">Comprobantes: {d.total_invoices}</div>
      <Row label="Facturas B" value={d.total_invoices_b} />
      <Row label="Facturas C" value={d.total_invoices_c} />
      <Row label="NC B" value={d.total_credit_notes_b} />
      <Row label="NC C" value={d.total_credit_notes_c} />
      <hr />
      <div className="font-bold">Totales</div>
      <Row label="Subtotal neto" value={fmtCurrency(d.subtotal_net)} />
      <Row label="Total IVA" value={fmtCurrency(d.total_vat)} />
      <Row label="TOTAL VENTAS" value={fmtCurrency(d.total_sales)} bold />
      <hr />
      <Row label="Notas de Crédito" value={fmtCurrency(d.total_credit_notes_amount)} />
      <Row label="NETO" value={fmtCurrency(d.net_total)} bold />
      <hr />
      <div className="font-bold">Medios de Pago</div>
      <Row label="Efectivo" value={fmtCurrency(d.payment_cash)} />
      <Row label="Débito" value={fmtCurrency(d.payment_debit)} />
      <Row label="Crédito" value={fmtCurrency(d.payment_credit)} />
      <Row label="MP / QR" value={fmtCurrency(d.payment_qr)} />
      <Row label="Transferencia" value={fmtCurrency(d.payment_transfer)} />
    </div>
  );
}

// ─── Auditoría Card ───────────────────────────────────────────

function AuditoriaCard({ branchId, branchData }: {
  branchId: string;
  branchData: any;
}) {
  const auditReport = useFiscalAuditReport(branchId);
  const { data: zClosings } = useZClosings(branchId);
  const [mode, setMode] = useState<'date' | 'z'>('date');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [fromZ, setFromZ] = useState('');
  const [toZ, setToZ] = useState('');
  const [previewData, setPreviewData] = useState<FiscalAuditData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: printConfig } = usePrintConfig(branchId);
  const { data: printers } = useBranchPrinters(branchId);

  const handleOpen = () => {
    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    setFromDate(thirtyDaysAgo);
    setToDate(today);
    if (zClosings?.length) {
      setFromZ(String((zClosings as any[])[zClosings.length - 1]?.z_number || 1));
      setToZ(String((zClosings as any[])[0]?.z_number || 1));
    }
    setDialogOpen(true);
  };

  const handleGenerate = async () => {
    try {
      const data = await auditReport.mutateAsync({
        mode,
        fromDate: mode === 'date' ? fromDate : undefined,
        toDate: mode === 'date' ? toDate : undefined,
        fromZ: mode === 'z' ? parseInt(fromZ) : undefined,
        toZ: mode === 'z' ? parseInt(toZ) : undefined,
      });
      setPreviewData(data);
      setDialogOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'Error al generar informe de auditoría');
    }
  };

  const handlePrint = async () => {
    if (!previewData || !branchData) return;
    const ticketPrinter = printConfig?.ticket_printer_id
      ? (printers ?? []).find((p: any) => p.id === printConfig.ticket_printer_id && p.is_active)
      : null;

    if (!ticketPrinter) {
      toast.error('No hay impresora de tickets configurada', {
        description: 'Andá a Configuración > Impresoras para configurarla.',
      });
      return;
    }

    try {
      const printData = generateInformeAuditoria(previewData, branchData, ticketPrinter.paper_width);
      const { printRawBase64 } = await import('@/lib/qz-print');
      await printRawBase64(ticketPrinter.ip_address!, ticketPrinter.port, printData);
      toast.success('Informe de auditoría impreso');
    } catch (e: any) {
      toast.error('Error de impresión: ' + e.message);
    }
  };

  return (
    <>
      <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={handleOpen}>
        <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
          <div className="rounded-xl bg-amber-50 p-4">
            <Search className="h-10 w-10 text-amber-600" />
          </div>
          <CardTitle className="text-lg">AUDITORÍA</CardTitle>
          <CardDescription className="text-center">Consolidado de Cierres Z por período</CardDescription>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Informe de Auditoría</DialogTitle>
            <DialogDescription>Seleccioná el rango para el informe</DialogDescription>
          </DialogHeader>
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'date' | 'z')}>
            <TabsList className="w-full">
              <TabsTrigger value="date" className="flex-1 gap-1.5">
                <Calendar className="h-4 w-4" /> Por fecha
              </TabsTrigger>
              <TabsTrigger value="z" className="flex-1 gap-1.5">
                <Hash className="h-4 w-4" /> Por N° de Z
              </TabsTrigger>
            </TabsList>
            <TabsContent value="date" className="space-y-3 mt-3">
              <div>
                <Label>Desde</Label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div>
                <Label>Hasta</Label>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </TabsContent>
            <TabsContent value="z" className="space-y-3 mt-3">
              <div>
                <Label>Desde Z N°</Label>
                <Input type="number" value={fromZ} onChange={(e) => setFromZ(e.target.value)} min={1} />
              </div>
              <div>
                <Label>Hasta Z N°</Label>
                <Input type="number" value={toZ} onChange={(e) => setToZ(e.target.value)} min={1} />
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleGenerate} disabled={auditReport.isPending}>
              {auditReport.isPending ? 'Generando...' : 'Generar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewData} onOpenChange={() => setPreviewData(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Informe de Auditoría</DialogTitle>
          </DialogHeader>
          {previewData && <AuditPreview data={previewData} />}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPreviewData(null)}>Cerrar</Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AuditPreview({ data }: { data: FiscalAuditData }) {
  return (
    <div className="font-mono text-xs space-y-2 bg-muted p-4 rounded-lg">
      <div className="text-center font-bold">INFORME DE AUDITORÍA</div>
      <div className="text-center text-muted-foreground">
        Z {data.desde_z} a Z {data.hasta_z} — {data.cantidad_jornadas} jornadas
      </div>
      <hr />
      <div className="font-bold">Resumen por Jornada</div>
      {data.jornadas?.map((j, i) => (
        <Row
          key={i}
          label={`${j.fecha} | Z ${String(j.z_number).padStart(4, '0')}`}
          value={fmtCurrency(j.total_sales)}
        />
      ))}
      <hr />
      <div className="font-bold">Totales del Período</div>
      <Row label="Total comprobantes" value={data.total_comprobantes} />
      <Row label="Ventas brutas" value={fmtCurrency(data.total_ventas_brutas)} />
      <Row label="Notas de crédito" value={fmtCurrency(data.total_nc)} />
      <Row label="Total neto" value={fmtCurrency(data.total_neto)} bold />
      <Row label="IVA 21%" value={fmtCurrency(data.total_iva_21)} />
      <Row label="IVA 10.5%" value={fmtCurrency(data.total_iva_105)} />
    </div>
  );
}

// ─── Reimprimir Card ──────────────────────────────────────────

function ReimprimirCard({ branchId, branchData }: {
  branchId: string;
  branchData: any;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<'number' | 'recent' | 'date'>('recent');
  const [searchNumber, setSearchNumber] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [printing2, setPrinting2] = useState<string | null>(null);
  
  const { data: printConfig } = usePrintConfig(branchId);
  const { data: printers } = useBranchPrinters(branchId);

  const handleReprint = async (factura: any) => {
    setPrinting2(factura.id);
    try {
      // Fetch full order data for ticket generation
      const { data: pedido, error: pedidoErr } = await supabase
        .from('pedidos')
        .select('*')
        .eq('id', factura.pedido_id)
        .single();
      if (pedidoErr) throw pedidoErr;

      const { data: items } = await supabase
        .from('pedido_items')
        .select('*')
        .eq('pedido_id', factura.pedido_id);

      const { data: pagos } = await supabase
        .from('pedido_pagos')
        .select('*')
        .eq('pedido_id', factura.pedido_id)
        .limit(1);

      const pago = pagos?.[0];

      const { generateTicketCliente, generateArcaQrBitmap } = await import('@/lib/escpos');

      const tipoComprobante = factura.tipo_comprobante || '';
      const isNC = tipoComprobante.includes('NC') || tipoComprobante.includes('Nota de Crédito');
      const tipoLetra = tipoComprobante.includes('B') ? 'B' : tipoComprobante.includes('C') ? 'C' : 'A';

      const facturaData = {
        tipo: tipoLetra as 'A' | 'B' | 'C',
        codigo: tipoLetra === 'B' ? (isNC ? '008' : '006') : tipoLetra === 'C' ? (isNC ? '013' : '011') : (isNC ? '003' : '001'),
        numero: `${String(factura.punto_venta).padStart(5, '0')}-${String(factura.numero_comprobante).padStart(8, '0')}`,
        fecha: format(new Date(factura.created_at), 'dd/MM/yyyy'),
        emisor: {
          razon_social: branchData?.razon_social || '',
          cuit: branchData?.cuit || '',
          iibb: branchData?.iibb || '',
          condicion_iva: branchData?.condicion_iva || 'Responsable Inscripto',
          inicio_actividades: branchData?.inicio_actividades || '',
          direccion_fiscal: branchData?.direccion_fiscal || '',
          punto_venta: factura.punto_venta,
        },
        cae: factura.cae || '',
        cae_vto: factura.cae_vencimiento || '',
        qr_base64: '',
        detalle_iva: [],
        subtotal_neto: factura.total || 0,
        total_iva: 0,
        total: factura.total || 0,
      };

      try {
        facturaData.qr_base64 = await generateArcaQrBitmap(facturaData as any);
      } catch { /* QR optional */ }

      const ticketData = {
        order: {
          numero_pedido: pedido.numero_pedido,
          tipo_servicio: pedido.tipo_servicio,
          numero_llamador: pedido.numero_llamador,
          canal_venta: pedido.canal_venta,
          cliente_nombre: pedido.cliente_nombre,
          referencia_app: (pedido as any).referencia_app || null,
          created_at: pedido.created_at,
          items: (items || []).map((it: any) => ({
            nombre: it.nombre,
            cantidad: it.cantidad,
            notas: it.notas,
            estacion: it.estacion,
            precio_unitario: it.precio_unitario,
            subtotal: it.subtotal,
          })),
          total: pedido.total,
          descuento: pedido.descuento,
          descuento_porcentaje: (pedido as any).descuento_porcentaje,
        },
        branchName: branchData?.name || branchData?.razon_social || '',
        metodo_pago: pago?.metodo || undefined,
        factura: facturaData as any,
      };

      // Try thermal printer first
      const ticketPrinter = printConfig?.ticket_printer_id
        ? (printers ?? []).find((p: any) => p.id === printConfig.ticket_printer_id && p.is_active)
        : null;

      if (!ticketPrinter) {
        toast.error('No hay impresora de tickets configurada', {
          description: 'Andá a Configuración > Impresoras para configurarla.',
        });
        return;
      }

      const base64 = generateTicketCliente(ticketData as any, ticketPrinter.paper_width);
      const { printRawBase64 } = await import('@/lib/qz-print');
      await printRawBase64(ticketPrinter.ip_address!, ticketPrinter.port, base64);
      toast.success('Comprobante reimpreso');
    } catch (e: any) {
      toast.error('Error al reimprimir: ' + (e.message || 'Error desconocido'));
    } finally {
      setPrinting2(null);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('facturas_emitidas')
        .select('*, pedidos!inner(numero_pedido, total, cliente_nombre)')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false });

      if (searchMode === 'number') {
        query = query.eq('numero_comprobante', parseInt(searchNumber));
      } else if (searchMode === 'date') {
        query = query.gte('created_at', searchDate + 'T00:00:00')
          .lte('created_at', searchDate + 'T23:59:59');
      } else {
        query = query.limit(10);
      }

      const { data, error } = await query;
      if (error) throw error;
      setResults(data || []);
    } catch (e: any) {
      toast.error(e.message || 'Error al buscar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { setDialogOpen(true); handleSearch(); }}>
        <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
          <div className="rounded-xl bg-green-50 p-4">
            <Printer className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-lg">REIMPRIMIR</CardTitle>
          <CardDescription className="text-center">Buscar y reimprimir comprobantes</CardDescription>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reimprimir Comprobante</DialogTitle>
          </DialogHeader>
          <Tabs value={searchMode} onValueChange={(v) => { setSearchMode(v as any); }}>
            <TabsList className="w-full">
              <TabsTrigger value="recent" className="flex-1">Últimos 10</TabsTrigger>
              <TabsTrigger value="number" className="flex-1">Por número</TabsTrigger>
              <TabsTrigger value="date" className="flex-1">Por fecha</TabsTrigger>
            </TabsList>
            <TabsContent value="number" className="mt-3">
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Número de comprobante"
                  value={searchNumber}
                  onChange={(e) => setSearchNumber(e.target.value)}
                />
                <Button onClick={handleSearch} disabled={loading}>Buscar</Button>
              </div>
            </TabsContent>
            <TabsContent value="date" className="mt-3">
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                />
                <Button onClick={handleSearch} disabled={loading}>Buscar</Button>
              </div>
            </TabsContent>
            <TabsContent value="recent" className="mt-3">
              <Button onClick={handleSearch} disabled={loading} variant="outline" className="w-full">
                Actualizar
              </Button>
            </TabsContent>
          </Tabs>

          <div className="space-y-2 mt-3">
            {loading && <Skeleton className="h-20 w-full" />}
            {!loading && results.length === 0 && (
              <p className="text-center text-muted-foreground py-4">Sin resultados</p>
            )}
            {results.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">
                    {r.tipo_comprobante} {String(r.punto_venta).padStart(5, '0')}-{String(r.numero_comprobante).padStart(8, '0')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(r.created_at), 'dd/MM/yyyy HH:mm')} — Pedido #{r.pedidos?.numero_pedido}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{fmtCurrency(r.total)}</span>
                  <Badge variant={r.anulada ? 'destructive' : 'secondary'} className="text-xs">
                    {r.anulada ? 'Anulada' : 'CAE ' + (r.cae?.slice(-6) || '')}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={printing2 === r.id}
                    onClick={(e) => { e.stopPropagation(); handleReprint(r); }}
                    title="Reimprimir comprobante"
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Shared ───────────────────────────────────────────────────

function Row({ label, value, bold }: { label: string; value: string | number; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-bold' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

// Re-export for use in SalesHistoryPage
export { FiscalReportsPage };
