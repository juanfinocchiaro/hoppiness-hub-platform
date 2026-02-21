/**
 * Print Router - Genera print jobs según categoría y canal de venta
 */
import type { BranchPrinter } from '@/hooks/useBranchPrinters';
import type { PrintConfig } from '@/hooks/usePrintConfig';
import {
  generateTicketCliente,
  generateComandaCompleta,
  generateVale,
  type PrintableOrder,
  type PrintableItem,
  type TicketClienteData,
} from '@/lib/escpos';

interface MenuCategoria {
  id: string;
  nombre: string;
  tipo_impresion: 'comanda' | 'vale' | 'no_imprimir';
}

interface OrderItemWithCategoria extends PrintableItem {
  categoria_carta_id?: string | null;
  precio_unitario?: number;
  subtotal?: number;
}

export interface PrintJob {
  type: 'ticket' | 'vale' | 'comanda';
  printerId: string;
  dataBase64: string;
  label: string;
}

/**
 * Genera todos los print jobs para una venta.
 */
export function buildPrintJobs(
  order: PrintableOrder & {
    items: OrderItemWithCategoria[];
    total?: number;
    descuento?: number;
  },
  config: PrintConfig & {
    comanda_printer_id?: string | null;
    vale_printer_id?: string | null;
    salon_vales_enabled?: boolean;
    no_salon_todo_en_comanda?: boolean;
  },
  printers: BranchPrinter[],
  categorias: MenuCategoria[],
  branchName: string,
  esSalon: boolean
): PrintJob[] {
  const jobs: PrintJob[] = [];

  const findPrinter = (id: string | null | undefined) =>
    id ? printers.find(p => p.id === id && p.is_active) : undefined;

  const getTipoImpresion = (item: OrderItemWithCategoria): 'comanda' | 'vale' | 'no_imprimir' => {
    if (!item.categoria_carta_id) return 'comanda';
    const cat = categorias.find(c => c.id === item.categoria_carta_id);
    return (cat?.tipo_impresion as any) || 'comanda';
  };

  // 1. TICKET CLIENTE
  if (config.ticket_enabled && config.ticket_printer_id) {
    const printer = findPrinter(config.ticket_printer_id);
    if (printer) {
      const ticketData: TicketClienteData = {
        order,
        branchName,
      };
      const data = generateTicketCliente(ticketData, printer.paper_width);
      jobs.push({
        type: 'ticket',
        printerId: printer.id,
        dataBase64: data,
        label: 'Ticket cliente',
      });
    }
  }

  // 2. VALES (mostrador: siempre que esté habilitado; apps/delivery: según config)
  if (config.salon_vales_enabled !== false && config.vale_printer_id) {
    const printer = findPrinter(config.vale_printer_id);
    if (printer) {
      for (const item of order.items) {
        if (getTipoImpresion(item) === 'vale') {
          for (let i = 0; i < item.cantidad; i++) {
            const data = generateVale(
              item.nombre || 'Producto',
              order.numero_pedido,
              order.created_at,
              order.canal_venta || undefined,
              order.numero_llamador,
              printer.paper_width
            );
            jobs.push({
              type: 'vale',
              printerId: printer.id,
              dataBase64: data,
              label: `Vale: ${item.nombre}`,
            });
          }
        }
      }
    }
  }

  // 3. COMANDA DE COCINA
  if (config.comanda_printer_id) {
    const printer = findPrinter(config.comanda_printer_id);
    if (printer) {
      let comandaItems: PrintableItem[];

      if (esSalon) {
        comandaItems = order.items.filter(item => getTipoImpresion(item) === 'comanda');
      } else if (config.no_salon_todo_en_comanda !== false) {
        comandaItems = order.items.filter(item => getTipoImpresion(item) !== 'no_imprimir');
      } else {
        comandaItems = order.items.filter(item => getTipoImpresion(item) === 'comanda');
      }

      if (comandaItems.length > 0) {
        const comandaOrder = { ...order, items: comandaItems };
        const data = generateComandaCompleta(comandaOrder, branchName, printer.paper_width);
        jobs.push({
          type: 'comanda',
          printerId: printer.id,
          dataBase64: data,
          label: 'Comanda cocina',
        });
      }
    }
  }

  return jobs;
}
