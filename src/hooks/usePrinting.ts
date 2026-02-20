/**
 * usePrinting - Hook de impresión directa via Print Bridge
 *
 * Envía datos ESC/POS a impresoras térmicas vía Print Bridge (HTTP localhost:3001).
 * Print Bridge abre conexión TCP directa a la impresora en la red local.
 */
import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { printRawBase64, detectPrintBridge } from '@/lib/qz-print';
import {
  generateComandaCompleta,
  generateComandaEstacion,
  generateComandaDelivery,
  generateTicketCliente,
  generateTestPage,
  generateTicketFiscal,
  type PrintableOrder,
  type PrintableItem,
  type FiscalTicketData,
} from '@/lib/escpos';
import type { BranchPrinter } from '@/hooks/useBranchPrinters';
import type { PrintConfig } from '@/hooks/usePrintConfig';
import { buildPrintJobs } from '@/lib/print-router';

export type PrintBridgeStatus = 'checking' | 'connected' | 'not_available';

interface PrintJobInput {
  branchId: string;
  printer: BranchPrinter;
  jobType: string;
  pedidoId?: string;
  dataBase64: string;
}

async function sendToPrinter(printer: BranchPrinter, dataBase64: string): Promise<boolean> {
  if (!printer.ip_address) {
    throw new Error('La impresora no tiene IP configurada');
  }

  try {
    await printRawBase64(printer.ip_address, printer.port, dataBase64);
    return true;
  } catch (error: any) {
    const msg = error?.message || '';
    if (msg.includes('Print Bridge no disponible') || msg.includes('Failed to fetch')) {
      throw new Error('Sistema de impresión no detectado. Andá a Configuración > Impresoras para instalarlo.');
    }
    throw new Error(
      `No se pudo conectar a ${printer.ip_address}:${printer.port} — ${msg || 'verificá que la impresora esté encendida y en la misma red.'}`
    );
  }
}

export function usePrinting(branchId: string) {
  const [bridgeStatus, setBridgeStatus] = useState<PrintBridgeStatus>('checking');

  useEffect(() => {
    detectPrintBridge().then((result) => {
      setBridgeStatus(result.available ? 'connected' : 'not_available');
    });
  }, []);

  const printMutation = useMutation({
    mutationFn: async ({ printer, jobType, pedidoId, dataBase64 }: PrintJobInput) => {
      // Record print job
      await supabase.from('print_jobs').insert({
        branch_id: branchId,
        printer_id: printer.id,
        job_type: jobType,
        pedido_id: pedidoId || null,
        payload: { data_base64: dataBase64 },
        status: 'printing',
      });

      const success = await sendToPrinter(printer, dataBase64);

      if (!success) {
        throw new Error('No se pudo imprimir');
      }
    },
    onSuccess: () => {
      toast.success('Impreso correctamente');
    },
    onError: (err, variables) => {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      const printerName = variables?.printer?.name || 'Impresora';
      const printerIp = variables?.printer?.ip_address || '';

      if (msg.includes('Sistema de impresión')) {
        toast.error('Sistema de impresión no detectado', {
          description: 'Andá a Configuración > Impresoras para instalar el sistema de impresión.',
          duration: 10000,
        });
      } else {
        toast.error(`Error al imprimir en ${printerName}`, {
          description: printerIp
            ? `No se pudo conectar a ${printerIp}. Verificá que esté encendida y en la misma red.`
            : msg,
          duration: 8000,
        });
      }
    },
  });

  const printComandaCompleta = (order: PrintableOrder, printer: BranchPrinter) => {
    const data = generateComandaCompleta(order, printer.paper_width);
    printMutation.mutate({
      branchId,
      printer,
      jobType: 'comanda_completa',
      pedidoId: undefined,
      dataBase64: data,
    });
  };

  const printComandaEstacion = (
    order: PrintableOrder,
    stationName: string,
    stationItems: PrintableItem[],
    printer: BranchPrinter
  ) => {
    const data = generateComandaEstacion(order, stationName, stationItems, printer.paper_width);
    printMutation.mutate({
      branchId,
      printer,
      jobType: 'comanda_estacion',
      dataBase64: data,
    });
  };

  const printTicket = (
    order: PrintableOrder & {
      items: (PrintableItem & { precio_unitario?: number; subtotal?: number })[];
      total?: number;
      descuento?: number;
    },
    branchName: string,
    printer: BranchPrinter
  ) => {
    const data = generateTicketCliente(order, branchName, printer.paper_width);
    printMutation.mutate({
      branchId,
      printer,
      jobType: 'ticket',
      dataBase64: data,
    });
  };

  const printDelivery = (
    order: PrintableOrder & { cliente_telefono?: string | null; cliente_direccion?: string | null },
    printer: BranchPrinter
  ) => {
    const data = generateComandaDelivery(order, printer.paper_width);
    printMutation.mutate({
      branchId,
      printer,
      jobType: 'delivery',
      dataBase64: data,
    });
  };

  const printTest = (printer: BranchPrinter) => {
    const data = generateTestPage(printer.name, printer.paper_width);
    printMutation.mutate({
      branchId,
      printer,
      jobType: 'test',
      dataBase64: data,
    });
  };

  const printFiscalTicket = async (fiscalData: FiscalTicketData, printer: BranchPrinter) => {
    const data = generateTicketFiscal(fiscalData, printer.paper_width);
    try {
      await sendToPrinter(printer, data);
      await supabase.from('print_jobs').insert({
        branch_id: branchId,
        printer_id: printer.id,
        job_type: 'ticket_fiscal',
        payload: { data_base64: data },
        status: 'completed',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error('Error al imprimir comprobante fiscal', { description: msg });
      await supabase.from('print_jobs').insert({
        branch_id: branchId,
        printer_id: printer.id,
        job_type: 'ticket_fiscal',
        payload: { data_base64: data },
        status: 'error',
        error_message: msg,
      });
    }
  };

  /**
   * Print order using the routing system (by category tipo_impresion)
   */
  const printOrder = async (
    order: PrintableOrder & { items: (PrintableItem & { categoria_carta_id?: string | null; precio_unitario?: number; subtotal?: number })[]; total?: number; descuento?: number },
    config: PrintConfig,
    allPrinters: BranchPrinter[],
    categorias: { id: string; nombre: string; tipo_impresion: string }[],
    branchName: string,
    esSalon: boolean
  ) => {
    const jobs = buildPrintJobs(
      order,
      config,
      allPrinters,
      categorias as any,
      branchName,
      esSalon
    );

    for (const job of jobs) {
      const printer = allPrinters.find(p => p.id === job.printerId);
      if (printer) {
        try {
          await sendToPrinter(printer, job.dataBase64);
          // Record in print_jobs
          await supabase.from('print_jobs').insert({
            branch_id: branchId,
            printer_id: printer.id,
            job_type: job.type,
            payload: { data_base64: job.dataBase64 },
            status: 'completed',
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          toast.error(`Error al imprimir ${job.label}`, { description: msg });
          // Record failed job
          await supabase.from('print_jobs').insert({
            branch_id: branchId,
            printer_id: printer.id,
            job_type: job.type,
            payload: { data_base64: job.dataBase64 },
            status: 'error',
            error_message: msg,
          });
        }
      }
    }
  };

  return {
    printComandaCompleta,
    printComandaEstacion,
    printTicket,
    printDelivery,
    printTest,
    printFiscalTicket,
    printOrder,
    isPrinting: printMutation.isPending,
    bridgeStatus,
  };
}
