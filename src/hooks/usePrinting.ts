/**
 * usePrinting - Hook de impresión que genera ESC/POS y envía a impresoras de red
 *
 * Estrategia dual:
 * 1. Intenta imprimir directamente desde el navegador (LAN, mismo segmento de red)
 * 2. Fallback a Edge Function (impresoras con IP pública)
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  generateComandaCompleta,
  generateComandaEstacion,
  generateComandaDelivery,
  generateTicketCliente,
  generateTestPage,
  type PrintableOrder,
  type PrintableItem,
} from '@/lib/escpos';
import type { BranchPrinter } from '@/hooks/useBranchPrinters';

interface PrintJobInput {
  branchId: string;
  printer: BranchPrinter;
  jobType: string;
  pedidoId?: string;
  dataBase64: string;
}

async function sendToPrinter(printer: BranchPrinter, dataBase64: string): Promise<boolean> {
  // Strategy 1: Direct LAN via raw TCP (only works via Edge Function since browsers can't do raw TCP)
  // We always use the Edge Function approach
  const { data, error } = await supabase.functions.invoke('print-to-network', {
    body: {
      printer_ip: printer.ip_address,
      printer_port: printer.port,
      data_base64: dataBase64,
    },
  });

  if (error) {
    console.error('Print error:', error);
    return false;
  }

  return data?.success === true;
}

export function usePrinting(branchId: string) {
  const qc = useQueryClient();

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

      // Update job status
      if (!success) {
        throw new Error('No se pudo imprimir');
      }
    },
    onError: (err) => {
      toast.error(`Error de impresión: ${err instanceof Error ? err.message : 'desconocido'}`);
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
    toast.info(`Enviando página de prueba a ${printer.name}...`);
  };

  return {
    printComandaCompleta,
    printComandaEstacion,
    printTicket,
    printDelivery,
    printTest,
    isPrinting: printMutation.isPending,
  };
}
