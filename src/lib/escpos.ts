/**
 * ESC/POS Command Generator for thermal printers
 * Hoppiness Club — Sistema de tickets térmicos v2
 * 
 * Genera comandos raw para impresoras térmicas 80mm y 58mm.
 * Los bitmaps se envían como marcadores __BITMAP_B64:...:END__
 * que el Print Bridge (Node.js en localhost:3001) convierte a
 * raster ESC/POS (GS v 0).
 */

// ─── ESC/POS Commands ────────────────────────────────────────
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const CMD = {
  INIT: [ESC, 0x40],
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT: [GS, 0x21, 0x01],
  DOUBLE_WIDTH: [GS, 0x21, 0x10],
  DOUBLE_SIZE: [GS, 0x21, 0x11],
  NORMAL_SIZE: [GS, 0x21, 0x00],
  UNDERLINE_ON: [ESC, 0x2d, 0x01],
  UNDERLINE_OFF: [ESC, 0x2d, 0x00],
  CUT_PAPER: [GS, 0x56, 0x41, 0x03],
  FEED_LINES: (n: number) => [ESC, 0x64, n],
  LINE_SPACING: (n: number) => [ESC, 0x33, n],
} as const;

// ─── Logo bitmap ─────────────────────────────────────────────
// Logo Hoppiness Club invertido para impresión térmica.
// Monocromático 200x200px. Trazos en negro, fondo transparente.
// El Print Bridge convierte este PNG base64 a raster ESC/POS.
const LOGO_THERMAL_B64 = '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';

// ─── Builder ─────────────────────────────────────────────────
class EscPosBuilder {
  private buffer: number[] = [];

  init() {
    this.buffer.push(...CMD.INIT);
    return this;
  }

  text(str: string) {
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      this.buffer.push(code > 255 ? 0x3f : code);
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
  doubleWidth() { this.buffer.push(...CMD.DOUBLE_WIDTH); return this; }
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

  /**
   * Inserta un marcador de bitmap que el Print Bridge reemplaza
   * por bytes ESC/POS raster (GS v 0).
   * Si el bridge no soporta bitmaps, se ignora el marcador.
   */
  printBitmap(base64Png: string): EscPosBuilder {
    const marker = `__BITMAP_B64:${base64Png}:END__`;
    for (let i = 0; i < marker.length; i++) {
      this.buffer.push(marker.charCodeAt(i));
    }
    return this;
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

function formatDate(date: string | Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year} ${formatTime(date)}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 0 });
}

function serviceLabel(tipo: string | null): string {
  switch (tipo) {
    case 'comer_aca': return 'SALON';
    case 'delivery': return 'DELIVERY';
    default: return 'TAKEAWAY';
  }
}

function canalLabel(canal: string | null, tipo: string | null): string {
  switch (canal) {
    case 'rappi': return 'RAPPI';
    case 'pedidosya': return 'PEDIDOSYA';
    case 'masdelivery': return 'MASDELIVERY';
    case 'webapp': return 'WEBAPP';
    default: return serviceLabel(tipo);
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

/**
 * Imprime logo + nombre del local.
 * 
 * IMPORTANTE: El logo YA contiene "HOPPINESS CLUB" en su diseño.
 * NO imprimir ese texto. Solo el nombre del local debajo.
 */
function printBrandHeader(b: EscPosBuilder, branchName: string): void {
  b.alignCenter();
  b.printBitmap(LOGO_THERMAL_B64);
  b.feed(1);
  // Solo el nombre del local — NO "HOPPINESS CLUB"
  b.boldOn().line(branchName.toUpperCase()).boldOff();
}

/**
 * Imprime modificadores de un item.
 * "SIN" siempre en BOLD + UPPERCASE (error costoso si se pierde).
 */
function printMods(b: EscPosBuilder, item: PrintableItem): void {
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

/**
 * Footer de marketing — solo para documentos que toca el CLIENTE.
 */
function printMarketingFooter(b: EscPosBuilder): void {
  b.feed(1)
    .alignCenter()
    .line('Gracias por elegirnos!')
    .feed(1)
    .boldOn().line('Pedi por hoppinessclub.com').boldOff()
    .line('y accede a precios exclusivos')
    .feed(1)
    .line('Seguinos en @hoppinessclub');
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

export interface TicketClienteData {
  order: PrintableOrder & {
    items: (PrintableItem & { precio_unitario?: number; subtotal?: number })[];
    total?: number;
    descuento?: number;
    descuento_porcentaje?: number;
  };
  branchName: string;
  metodo_pago?: string;
  tarjeta_marca?: string;
  monto_recibido?: number;
  vuelto?: number;
  factura?: {
    tipo: 'A' | 'B' | 'C';
    codigo: string;
    numero: string;
    fecha: string;
    emisor: {
      razon_social: string;
      cuit: string;
      iibb: string;
      condicion_iva: string;
      domicilio: string;
      inicio_actividades: string;
    };
    receptor: {
      nombre?: string;
      documento_tipo?: string;
      documento_numero?: string;
      condicion_iva: string;
    };
    neto_gravado: number;
    iva: number;
    otros_tributos: number;
    iva_contenido: number;
    otros_imp_nacionales: number;
    cae: string;
    cae_vto: string;
  } | null;
}

// Legacy type kept for backward compatibility
export interface FiscalTicketData {
  razon_social: string;
  cuit: string;
  direccion_fiscal: string;
  punto_venta: number;
  tipo_comprobante: string;
  numero_comprobante: number;
  cae: string;
  cae_vencimiento: string;
  fecha_emision: string;
  neto: number;
  iva: number;
  total: number;
  numero_pedido?: number;
  items?: { descripcion: string; cantidad: number; precio_unitario: number }[];
  branchName?: string;
}

// ═════════════════════════════════════════════════════════════
// GENERADORES
// ═════════════════════════════════════════════════════════════

// ─── 1. COMANDA COMPLETA (cocina) ────────────────────────────

export function generateComandaCompleta(
  order: PrintableOrder,
  branchName: string,
  paperWidth: number = 80
): string {
  const cols = paperWidth === 80 ? 42 : 32;
  const b = new EscPosBuilder();

  b.init();
  printBrandHeader(b, branchName);

  b.alignCenter()
    .feed(1)
    .boldOn().line('C O M A N D A').boldOff()
    .feed(1);

  // Número de pedido — LO MÁS GRANDE
  b.doubleSize().boldOn()
    .line(`# ${order.numero_pedido}`)
    .normalSize().boldOff();

  // Canal
  b.boldOn().line(canalLabel(order.canal_venta, order.tipo_servicio)).boldOff();

  // Llamador — UNA SOLA VEZ
  if (order.numero_llamador) {
    b.doubleHeight().boldOn()
      .line(`LLAMADOR #${order.numero_llamador}`)
      .normalSize().boldOff();
  }

  // Cliente
  if (order.cliente_nombre) {
    b.line(order.cliente_nombre);
  }

  // Hora
  b.feed(1).alignLeft();
  b.line(formatTime(order.created_at));
  b.separator('=', cols);

  // Items — doble alto, sin precios
  for (const item of order.items) {
    b.boldOn().doubleHeight()
      .line(`${item.cantidad}x ${item.nombre || 'Producto'}`)
      .normalSize().boldOff();

    printMods(b, item);
    b.separator('-', cols);
  }

  // Conteo
  b.alignCenter()
    .line(`Items: ${order.items.reduce((s, i) => s + i.cantidad, 0)}`)
    .feed(1).cut();

  return b.toBase64();
}

// ─── 2. COMANDA POR ESTACIÓN ─────────────────────────────────

export function generateComandaEstacion(
  order: PrintableOrder,
  stationName: string,
  stationItems: PrintableItem[],
  branchName: string,
  paperWidth: number = 80
): string {
  const cols = paperWidth === 80 ? 42 : 32;
  const b = new EscPosBuilder();

  b.init();
  printBrandHeader(b, branchName);

  b.alignCenter()
    .feed(1)
    .boldOn().line('C O M A N D A').boldOff()
    .boldOn().line(`--- ${stationName.toUpperCase()} ---`).boldOff()
    .feed(1);

  b.doubleSize().boldOn()
    .line(`# ${order.numero_pedido}`)
    .normalSize().boldOff();

  b.boldOn().line(canalLabel(order.canal_venta, order.tipo_servicio)).boldOff();

  if (order.numero_llamador) {
    b.doubleHeight().boldOn()
      .line(`LLAMADOR #${order.numero_llamador}`)
      .normalSize().boldOff();
  }

  if (order.cliente_nombre) {
    b.line(order.cliente_nombre);
  }

  b.alignLeft()
    .line(formatTime(order.created_at))
    .separator('=', cols);

  for (const item of stationItems) {
    b.boldOn().doubleHeight()
      .line(`${item.cantidad}x ${item.nombre || 'Producto'}`)
      .normalSize().boldOff();

    printMods(b, item);
    b.separator('-', cols);
  }

  b.alignCenter()
    .line(`Items estacion: ${stationItems.reduce((s, i) => s + i.cantidad, 0)}`)
    .feed(1).cut();

  return b.toBase64();
}

// ─── 3. COMANDA DELIVERY ─────────────────────────────────────

export function generateComandaDelivery(
  order: PrintableOrder & {
    cliente_telefono?: string | null;
    cliente_direccion?: string | null;
    hora_entrega?: string | null;
    referencia_app?: string | null;
  },
  branchName: string,
  paperWidth: number = 80
): string {
  const cols = paperWidth === 80 ? 42 : 32;
  const b = new EscPosBuilder();

  b.init();
  printBrandHeader(b, branchName);

  b.alignCenter()
    .feed(1)
    .boldOn().line('C O M A N D A').boldOff()
    .feed(1);

  b.doubleSize().boldOn()
    .line(`# ${order.numero_pedido}`)
    .normalSize().boldOff();

  b.boldOn().line(canalLabel(order.canal_venta, order.tipo_servicio)).boldOff();

  if (order.referencia_app) {
    b.line(order.referencia_app);
  }

  // Bloque datos entrega
  b.alignLeft().separator('=', cols);
  if (order.cliente_nombre) {
    b.boldOn().line(order.cliente_nombre).boldOff();
  }
  if (order.cliente_direccion) {
    b.line(order.cliente_direccion);
  }
  if (order.cliente_telefono) {
    b.line(`Tel: ${order.cliente_telefono}`);
  }
  if (order.hora_entrega) {
    b.boldOn().line(`Entrega: ${order.hora_entrega}`).boldOff();
  }
  b.separator('=', cols);

  b.line(formatTime(order.created_at));
  b.separator('=', cols);

  for (const item of order.items) {
    b.boldOn().doubleHeight()
      .line(`${item.cantidad}x ${item.nombre || 'Producto'}`)
      .normalSize().boldOff();

    printMods(b, item);
    b.separator('-', cols);
  }

  b.alignCenter()
    .line(`Items: ${order.items.reduce((s, i) => s + i.cantidad, 0)}`)
    .feed(1).cut();

  return b.toBase64();
}

// ─── 4. TICKET CLIENTE (con/sin factura) ─────────────────────

export function generateTicketCliente(
  data: TicketClienteData,
  paperWidth: number = 80
): string {
  const cols = paperWidth === 80 ? 42 : 32;
  const { order, branchName, metodo_pago, tarjeta_marca, monto_recibido, vuelto, factura } = data;
  const b = new EscPosBuilder();

  b.init();
  printBrandHeader(b, branchName);

  // Datos del pedido
  b.alignLeft().separator('-', cols);
  b.columns(`Pedido #${order.numero_pedido}`, formatDate(order.created_at), cols);

  const canal = canalLabel(order.canal_venta, order.tipo_servicio);
  if (order.numero_llamador) {
    b.columns(canal, `Llamador: #${order.numero_llamador}`, cols);
  } else {
    b.line(canal);
  }

  if (order.cliente_nombre) {
    b.line(`Cliente: ${order.cliente_nombre}`);
  }
  b.separator('-', cols);

  b.feed(1);

  // Items con precios
  for (const item of order.items) {
    const price = item.subtotal != null ? `$${formatNumber(item.subtotal)}` : '';
    b.columns(`${item.cantidad}x ${item.nombre || 'Producto'}`, price, cols);

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
  }

  b.separator('=', cols);

  // Subtotal y descuento
  if (order.descuento && order.descuento > 0) {
    const subtotal = (order.total || 0) + order.descuento;
    b.columns('Subtotal', `$${formatNumber(subtotal)}`, cols);
    const descLabel = order.descuento_porcentaje
      ? `Desc. ${order.descuento_porcentaje}%`
      : 'Descuento';
    b.columns(descLabel, `-$${formatNumber(order.descuento)}`, cols);
  }

  // TOTAL
  if (order.total != null) {
    b.feed(1)
      .alignCenter()
      .boldOn().line('T O T A L')
      .doubleSize()
      .line(`$ ${formatNumber(order.total)}`)
      .normalSize().boldOff()
      .alignLeft();
  }

  b.feed(1);

  // Pago
  if (metodo_pago) {
    b.columns(`Pago: ${metodo_pago}`, tarjeta_marca || '', cols);
  }
  if (monto_recibido && vuelto !== undefined) {
    b.columns(
      `Recibido: $${formatNumber(monto_recibido)}`,
      `Vuelto: $${formatNumber(vuelto)}`,
      cols
    );
  }

  b.separator('-', cols);

  // Sección fiscal o no fiscal
  if (factura) {
    printSeccionFiscal(b, factura, cols);
  } else {
    b.feed(1)
      .alignCenter()
      .boldOn().line('*** NO VALIDO COMO FACTURA ***').boldOff();
  }

  // Marketing footer — solo documentos que toca el CLIENTE
  printMarketingFooter(b);
  b.feed(2).cut();

  return b.toBase64();
}

// ─── 5. VALE DE CANJE ───────────────────────────────────────

export function generateVale(
  productName: string,
  orderNumber: number,
  orderTime: string,
  canal?: string,
  llamador?: number | null,
  paperWidth: number = 80
): string {
  const cols = paperWidth === 80 ? 42 : 32;
  const b = new EscPosBuilder();

  // Sin logo — el vale es cortito y se diferencia del ticket
  b.init()
    .separator('=', cols)
    .alignCenter()
    .feed(1)
    .doubleSize().boldOn()
    .line('V A L E')
    .normalSize().boldOff()
    .feed(1)
    .doubleSize().boldOn()
    .line(productName)
    .normalSize().boldOff()
    .feed(1)
    .separator('=', cols)
    .line(`Pedido #${orderNumber} - ${formatTime(orderTime)}`);

  if (canal || llamador) {
    const parts: string[] = [];
    if (canal) parts.push(canal);
    if (llamador) parts.push(`Llamador #${llamador}`);
    b.line(parts.join(' - '));
  }

  b.feed(1)
    .line('@hoppinessclub')
    .feed(1).cut();

  return b.toBase64();
}

// ─── 6. TEST PAGE ────────────────────────────────────────────

export function generateTestPage(
  printerName: string,
  branchName: string,
  paperWidth: number = 80
): string {
  const cols = paperWidth === 80 ? 42 : 32;
  const b = new EscPosBuilder();

  b.init();
  printBrandHeader(b, branchName);

  b.separator('=', cols)
    .alignCenter()
    .boldOn().line('TEST DE IMPRESORA').boldOff()
    .separator('-', cols)
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
    .line('Logo + texto = impresora lista')
    .feed(2).cut();

  return b.toBase64();
}

// ─── SECCION FISCAL (helper interno) ─────────────────────────
//
// Orden ARCA correcto:
// 1. "ORIGINAL"
// 2. Datos emisor (razón social, CUIT, IIBB, cond. IVA, domicilio)
// 3. Tipo factura (A/B/C) grande + número + fecha
// 4. Datos receptor (nombre, DNI, cond. IVA)
// 5. Totales
// 6. Transparencia fiscal Ley 27.743
// 7. QR + CAE + "Comprobante Autorizado"

function printSeccionFiscal(
  b: EscPosBuilder,
  f: NonNullable<TicketClienteData['factura']>,
  cols: number
): void {
  b.separator('=', cols)
    .alignCenter();

  // 1. ORIGINAL
  b.boldOn().line('O R I G I N A L').boldOff()
    .feed(1);

  // 2. Datos del emisor
  b.boldOn().line(f.emisor.razon_social).boldOff();
  b.line(`CUIT: ${f.emisor.cuit}`);
  b.line(`IIBB: ${f.emisor.iibb}`);
  b.line(f.emisor.condicion_iva);
  b.line(f.emisor.domicilio);
  b.line(`Inicio Act.: ${f.emisor.inicio_actividades}`);

  b.separator('-', cols);

  // 3. Tipo de factura + número
  b.doubleSize().boldOn()
    .line(f.tipo)
    .normalSize().boldOff();
  b.boldOn().line(`FACTURA (Cod. ${f.codigo})`).boldOff();
  b.boldOn().line(`N° ${f.numero}`).boldOff();
  b.line(`Fecha: ${f.fecha}`);

  b.separator('-', cols);

  // 4. Datos del receptor
  b.alignLeft();
  b.boldOn().line(`A ${f.receptor.condicion_iva.toUpperCase()}`).boldOff();
  if (f.receptor.nombre) {
    b.line(`Nombre: ${f.receptor.nombre}`);
  }
  if (f.receptor.documento_numero) {
    b.line(`${f.receptor.documento_tipo || 'DNI'}: ${f.receptor.documento_numero}`);
  }

  b.separator('-', cols);

  // 5. Totales
  const total = f.neto_gravado + f.iva + f.otros_tributos;
  b.columns('Subtotal:', `$${formatNumber(f.neto_gravado + f.iva)}`, cols);
  if (f.otros_tributos > 0) {
    b.columns('Otros tributos:', `$${formatNumber(f.otros_tributos)}`, cols);
  }
  b.boldOn()
    .columns('Total:', `$${formatNumber(total)}`, cols)
    .boldOff();

  b.separator('-', cols);

  // 6. Transparencia Fiscal (Ley 27.743)
  b.alignCenter()
    .line('Reg. Transparencia Fiscal')
    .line('al Consumidor (Ley 27.743)')
    .alignLeft();
  b.columns('IVA Contenido:', `$${formatNumber(f.iva_contenido)}`, cols);
  b.columns('Otros Imp. Nac.:', `$${formatNumber(f.otros_imp_nacionales)}`, cols);

  b.separator('=', cols);

  // 7. QR + CAE
  b.alignCenter();
  b.line('[QR ARCA]');  // El Print Bridge reemplaza por QR bitmap
  b.feed(1)
    .boldOn().line('Comprobante Autorizado').boldOff();
  b.columns(`CAE: ${f.cae}`, `Vto: ${f.cae_vto}`, cols);
}

// ─── LEGACY: generateValeBebida ──────────────────────────────
/** @deprecated Use generateVale instead */
export function generateValeBebida(
  order: { numero_pedido: number; created_at: string },
  itemNombre: string,
  paperWidth: number = 80
): string {
  return generateVale(itemNombre, order.numero_pedido, order.created_at, undefined, undefined, paperWidth);
}

// ─── LEGACY: generateTicketFiscal ────────────────────────────
/**
 * Legacy generateTicketFiscal — kept for backward compatibility.
 * Prefer generateTicketCliente with factura data for new code.
 */
export function generateTicketFiscal(
  data: FiscalTicketData,
  paperWidth: number = 80
): string {
  const cols = paperWidth === 80 ? 42 : 32;
  const b = new EscPosBuilder();

  const pvStr = String(data.punto_venta).padStart(5, '0');
  const numStr = String(data.numero_comprobante).padStart(8, '0');
  const comprobante = `${pvStr}-${numStr}`;

  const fmtDateStr = (d: string) => {
    if (!d) return '';
    const clean = d.replace(/-/g, '');
    if (clean.length === 8) return `${clean.slice(6)}/${clean.slice(4,6)}/${clean.slice(0,4)}`;
    return d;
  };

  b.init();
  printBrandHeader(b, data.branchName || '');

  b.separator('-', cols)
    .boldOn()
    .line(`FACTURA ${data.tipo_comprobante}`)
    .boldOff()
    .line(`N° ${comprobante}`)
    .separator('-', cols)
    .alignLeft()
    .line(`CUIT: ${data.cuit}`)
    .line(data.razon_social)
    .line(data.direccion_fiscal.length > cols
      ? data.direccion_fiscal.substring(0, cols)
      : data.direccion_fiscal);

  if (data.direccion_fiscal.length > cols) {
    b.line(data.direccion_fiscal.substring(cols));
  }

  b.line(`Fecha: ${fmtDateStr(data.fecha_emision)}`)
    .separator('=', cols);

  if (data.items?.length) {
    for (const item of data.items) {
      const price = `$${item.precio_unitario.toLocaleString()}`;
      b.columns(
        `${item.cantidad}x ${item.descripcion.substring(0, cols - price.length - 5)}`,
        price,
        cols
      );
    }
    b.separator('-', cols);
  }

  if (data.tipo_comprobante === 'A' && data.iva > 0) {
    b.columns('Neto', `$${data.neto.toLocaleString()}`, cols)
      .columns('IVA 21%', `$${data.iva.toLocaleString()}`, cols);
  }

  b.boldOn()
    .doubleHeight()
    .columns('TOTAL', `$${data.total.toLocaleString()}`, cols)
    .normalSize()
    .boldOff()
    .separator('=', cols);

  b.alignCenter()
    .boldOn()
    .line(`CAE: ${data.cae}`)
    .boldOff()
    .line(`Vto CAE: ${fmtDateStr(data.cae_vencimiento)}`)
    .separator('-', cols)
    .line('Comprobante no valido como factura')
    .feed(2)
    .cut();

  return b.toBase64();
}
