/**
 * usePrinting - Hook de impresión directa via QZ Tray
 *
 * Envía datos ESC/POS a impresoras térmicas vía QZ Tray (WebSocket local).
 * QZ Tray abre conexión TCP directa a la impresora en la red local.
 */
import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { printRawBase64, detectQZ } from '@/lib/qz-print';
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

export type QZStatus = 'checking' | 'connected' | 'not_available';

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
    if (error.message === 'QZ_NOT_AVAILABLE') {
      throw new Error('Sistema de impresión no detectado. Andá a Configuración > Impresoras para instalarlo.');
    }
    throw new Error(
      `No se pudo conectar a ${printer.ip_address}:${printer.port} — verificá que la impresora esté encendida y en la misma red.`
    );
  }
}

export function usePrinting(branchId: string) {
  const [qzStatus, setQzStatus] = useState<QZStatus>('checking');

  useEffect(() => {
    detectQZ().then((result) => {
      setQzStatus(result.available ? 'connected' : 'not_available');
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
    onError: (err) => {
      toast.error(`Error de impresión`, {
        description: err instanceof Error ? err.message : 'Error desconocido',
        duration: 8000,
      });
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

  return {
    printComandaCompleta,
    printComandaEstacion,
    printTicket,
    printDelivery,
    printTest,
    isPrinting: printMutation.isPending,
    qzStatus,
  };
}
