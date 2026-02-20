/**
 * ESC/POS Command Generator for thermal printers
 * Generates raw byte arrays for 80mm and 58mm thermal printers
 */

// ─── ESC/POS Commands ────────────────────────────────────────
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const CMD = {
  INIT: [ESC, 0x40],                    // Initialize printer
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT: [GS, 0x21, 0x01],      // Double height
  DOUBLE_WIDTH: [GS, 0x21, 0x10],       // Double width
  DOUBLE_SIZE: [GS, 0x21, 0x11],        // Double width + height
  NORMAL_SIZE: [GS, 0x21, 0x00],        // Normal
  UNDERLINE_ON: [ESC, 0x2d, 0x01],
  UNDERLINE_OFF: [ESC, 0x2d, 0x00],
  CUT_PAPER: [GS, 0x56, 0x41, 0x03],    // Partial cut
  FEED_LINES: (n: number) => [ESC, 0x64, n],
  LINE_SPACING: (n: number) => [ESC, 0x33, n],
} as const;

// ─── Encoder ─────────────────────────────────────────────────
class EscPosBuilder {
  private buffer: number[] = [];

  init() {
    this.buffer.push(...CMD.INIT);
    return this;
  }

  text(str: string) {
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      this.buffer.push(code > 255 ? 0x3f : code); // Replace non-ASCII with ?
    }
    return this;
  }

  line(str: string = '') {
    return this.text(str + '\n');
  }

  alignLeft() { this.buffer.push(...CMD.ALIGN_LEFT); return this; }
  alignCenter() { this.buffer.push(...CMD.ALIGN_CENTER); return this; }
  alignRight() { this.buffer.push(...CMD.ALIGN_RIGHT); return this; }
  boldOn() { this.buffer.push(...CMD.BOLD_ON); return this; }
  boldOff() { this.buffer.push(...CMD.BOLD_OFF); return this; }
  doubleSize() { this.buffer.push(...CMD.DOUBLE_SIZE); return this; }
  doubleHeight() { this.buffer.push(...CMD.DOUBLE_HEIGHT); return this; }
  normalSize() { this.buffer.push(...CMD.NORMAL_SIZE); return this; }
  underlineOn() { this.buffer.push(...CMD.UNDERLINE_ON); return this; }
  underlineOff() { this.buffer.push(...CMD.UNDERLINE_OFF); return this; }

  feed(lines: number = 1) {
    this.buffer.push(...CMD.FEED_LINES(lines));
    return this;
  }

  cut() {
    this.feed(3);
    this.buffer.push(...CMD.CUT_PAPER);
    return this;
  }

  separator(char = '-', width = 42) {
    return this.line(char.repeat(width));
  }

  columns(left: string, right: string, width = 42) {
    const space = width - left.length - right.length;
    const padding = space > 0 ? ' '.repeat(space) : ' ';
    return this.line(left + padding + right);
  }

  toBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  toBase64(): string {
    const bytes = this.toBytes();
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

// ─── Helpers ─────────────────────────────────────────────────
function formatTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function serviceLabel(tipo: string | null): string {
  switch (tipo) {
    case 'comer_aca': return 'SALON';
    case 'delivery': return 'DELIVERY';
    default: return 'TAKEAWAY';
  }
}

function modPrefix(tipo: string): string {
  switch (tipo) {
    case 'sin': return 'SIN ';
    case 'extra': return '+ ';
    case 'cambio': return '> ';
    default: return '';
  }
}

// ─── Types ───────────────────────────────────────────────────
export interface PrintableItem {
  nombre: string | null;
  cantidad: number;
  notas: string | null;
  estacion: string | null;
  modificadores?: Array<{
    descripcion: string;
    tipo: string;
  }>;
}

export interface PrintableOrder {
  numero_pedido: number;
  tipo_servicio: string | null;
  numero_llamador: number | null;
  canal_venta: string | null;
  cliente_nombre: string | null;
  created_at: string;
  items: PrintableItem[];
}

// ─── Generators ──────────────────────────────────────────────

/**
 * Comanda de cocina completa (todos los items)
 */
export function generateComandaCompleta(order: PrintableOrder, paperWidth: number = 80): string {
  const cols = paperWidth === 80 ? 42 : 32;
  const b = new EscPosBuilder();

  b.init()
    .alignCenter()
    .doubleSize()
    .boldOn()
    .line(`#${order.numero_pedido}`)
    .normalSize()
    .boldOn()
    .line(serviceLabel(order.tipo_servicio))
    .boldOff();

  if (order.numero_llamador) {
    b.doubleHeight().boldOn().line(`LLAMADOR #${order.numero_llamador}`).normalSize().boldOff();
  }
  if (order.cliente_nombre) {
    b.line(order.cliente_nombre);
  }

  b.alignLeft()
    .line(formatTime(order.created_at))
    .separator('=', cols);

  for (const item of order.items) {
    b.boldOn()
      .doubleHeight()
      .line(`${item.cantidad}x ${item.nombre || 'Producto'}`)
      .normalSize()
      .boldOff();

    if (item.modificadores?.length) {
      for (const mod of item.modificadores) {
        const prefix = modPrefix(mod.tipo);
        if (mod.tipo === 'sin') {
          b.boldOn().line(`   ${prefix}${mod.descripcion.toUpperCase()}`).boldOff();
        } else {
          b.line(`   ${prefix}${mod.descripcion}`);
        }
      }
    }

    if (item.notas) {
      b.line(`   * ${item.notas}`);
    }

    b.separator('-', cols);
  }

  b.feed(1).cut();
  return b.toBase64();
}

/**
 * Comanda por estación (solo items de esa estación)
 */
export function generateComandaEstacion(
  order: PrintableOrder,
  stationName: string,
  stationItems: PrintableItem[],
  paperWidth: number = 80
): string {
  const cols = paperWidth === 80 ? 42 : 32;
  const b = new EscPosBuilder();

  b.init()
    .alignCenter()
    .boldOn()
    .line(`--- ${stationName.toUpperCase()} ---`)
    .doubleSize()
    .line(`#${order.numero_pedido}`)
    .normalSize()
    .line(serviceLabel(order.tipo_servicio))
    .boldOff();

  if (order.numero_llamador) {
    b.line(`LLAMADOR #${order.numero_llamador}`);
  }

  b.alignLeft().separator('=', cols);

  for (const item of stationItems) {
    b.boldOn()
      .doubleHeight()
      .line(`${item.cantidad}x ${item.nombre || 'Producto'}`)
      .normalSize()
      .boldOff();

    if (item.modificadores?.length) {
      for (const mod of item.modificadores) {
        const prefix = modPrefix(mod.tipo);
        if (mod.tipo === 'sin') {
          b.boldOn().line(`   ${prefix}${mod.descripcion.toUpperCase()}`).boldOff();
        } else {
          b.line(`   ${prefix}${mod.descripcion}`);
        }
      }
    }

    if (item.notas) {
      b.line(`   * ${item.notas}`);
    }

    b.separator('-', cols);
  }

  b.alignCenter()
    .line(formatTime(order.created_at))
    .feed(1)
    .cut();

  return b.toBase64();
}

/**
 * Ticket de cliente (con precios)
 */
export function generateTicketCliente(
  order: PrintableOrder & {
    items: (PrintableItem & { precio_unitario?: number; subtotal?: number })[];
    total?: number;
    descuento?: number;
  },
  branchName: string,
  paperWidth: number = 80
): string {
  const cols = paperWidth === 80 ? 42 : 32;
  const b = new EscPosBuilder();

  b.init()
    .alignCenter()
    .doubleSize()
    .boldOn()
    .line('HOPPINESS')
    .normalSize()
    .boldOff()
    .line(branchName)
    .separator('-', cols)
    .alignLeft()
    .columns(`Pedido #${order.numero_pedido}`, formatTime(order.created_at), cols)
    .line(serviceLabel(order.tipo_servicio));

  if (order.numero_llamador) {
    b.boldOn().line(`Llamador: #${order.numero_llamador}`).boldOff();
  }

  b.separator('=', cols);

  for (const item of order.items) {
    const price = item.subtotal != null ? `$${item.subtotal.toLocaleString()}` : '';
    b.columns(`${item.cantidad}x ${item.nombre || 'Producto'}`, price, cols);

    if (item.modificadores?.length) {
      for (const mod of item.modificadores) {
        b.line(`   ${modPrefix(mod.tipo)}${mod.descripcion}`);
      }
    }
  }

  b.separator('=', cols);

  if (order.descuento && order.descuento > 0) {
    b.columns('Descuento', `-$${order.descuento.toLocaleString()}`, cols);
  }

  if (order.total != null) {
    b.boldOn()
      .doubleHeight()
      .columns('TOTAL', `$${order.total.toLocaleString()}`, cols)
      .normalSize()
      .boldOff();
  }

  b.separator('-', cols)
    .alignCenter()
    .line('Gracias por tu compra!')
    .line('www.hoppinessclub.com')
    .feed(2)
    .cut();

  return b.toBase64();
}

/**
 * Comanda de delivery (con datos del cliente)
 */
export function generateComandaDelivery(
  order: PrintableOrder & {
    cliente_telefono?: string | null;
    cliente_direccion?: string | null;
  },
  paperWidth: number = 80
): string {
  const cols = paperWidth === 80 ? 42 : 32;
  const b = new EscPosBuilder();

  b.init()
    .alignCenter()
    .doubleSize()
    .boldOn()
    .line('DELIVERY')
    .line(`#${order.numero_pedido}`)
    .normalSize()
    .boldOff()
    .separator('=', cols)
    .alignLeft();

  if (order.cliente_nombre) {
    b.boldOn().line(`Cliente: ${order.cliente_nombre}`).boldOff();
  }
  if (order.cliente_telefono) {
    b.line(`Tel: ${order.cliente_telefono}`);
  }
  if (order.cliente_direccion) {
    b.boldOn().line(`Dir: ${order.cliente_direccion}`).boldOff();
  }

  b.separator('-', cols);

  for (const item of order.items) {
    b.boldOn()
      .line(`${item.cantidad}x ${item.nombre || 'Producto'}`)
      .boldOff();

    if (item.modificadores?.length) {
      for (const mod of item.modificadores) {
        const prefix = modPrefix(mod.tipo);
        if (mod.tipo === 'sin') {
          b.boldOn().line(`   ${prefix}${mod.descripcion.toUpperCase()}`).boldOff();
        } else {
          b.line(`   ${prefix}${mod.descripcion}`);
        }
      }
    }

    if (item.notas) {
      b.line(`   * ${item.notas}`);
    }
  }

  b.separator('=', cols)
    .alignCenter()
    .line(formatTime(order.created_at))
    .feed(2)
    .cut();

  return b.toBase64();
}

/**
 * Vale individual de bebida/producto (1 por unidad)
 */
export function generateValeBebida(
  order: { numero_pedido: number; created_at: string },
  itemNombre: string,
  paperWidth: number = 80
): string {
  const cols = paperWidth === 80 ? 42 : 32;
  const b = new EscPosBuilder();

  b.init()
    .alignCenter()
    .separator('=', cols)
    .boldOn()
    .line('VALE')
    .boldOff()
    .separator('=', cols)
    .feed(1)
    .doubleSize()
    .boldOn()
    .line(itemNombre)
    .normalSize()
    .boldOff()
    .feed(1)
    .separator('-', cols)
    .line(`Pedido #${order.numero_pedido}`)
    .line(formatTime(order.created_at))
    .separator('=', cols)
    .feed(1)
    .cut();

  return b.toBase64();
}

/**
 * Test page for printer verification
 */
export function generateTestPage(printerName: string, paperWidth: number = 80): string {
  const cols = paperWidth === 80 ? 42 : 32;
  const b = new EscPosBuilder();

  b.init()
    .alignCenter()
    .doubleSize()
    .boldOn()
    .line('TEST DE IMPRESORA')
    .normalSize()
    .boldOff()
    .separator('=', cols)
    .line(`Impresora: ${printerName}`)
    .line(`Ancho: ${paperWidth}mm`)
    .line(`Fecha: ${new Date().toLocaleString('es-AR')}`)
    .separator('-', cols)
    .alignLeft()
    .boldOn().line('Texto en negrita').boldOff()
    .doubleHeight().line('Texto doble alto').normalSize()
    .doubleSize().line('Texto grande').normalSize()
    .separator('=', cols)
    .alignCenter()
    .line('Si ves esto, funciona OK!')
    .feed(2)
    .cut();

  return b.toBase64();
}
