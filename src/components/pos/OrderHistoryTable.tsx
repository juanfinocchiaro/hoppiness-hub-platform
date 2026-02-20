import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronDown, ChevronRight, Pencil, Printer, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { PaymentEditModal } from '@/components/pos/PaymentEditModal';
import type { PosOrder } from '@/hooks/pos/usePosOrderHistory';

interface Props {
  orders: PosOrder[];
  isLoading: boolean;
  branchId?: string;
  /** Whether there's an open cash register shift (enables edit) */
  hasOpenShift?: boolean;
  /** Callback to reprint fiscal ticket */
  onReprintInvoice?: (order: PosOrder) => void;
}

const METODO_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta_debito: 'Débito',
  tarjeta_credito: 'Crédito',
  mercadopago_qr: 'QR',
  transferencia: 'Transf.',
};

const ESTADO_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  entregado: 'default',
  listo: 'secondary',
  cancelado: 'destructive',
  pendiente: 'outline',
  en_preparacion: 'outline',
};

const CANAL_LABELS: Record<string, string> = {
  mostrador: 'Mostrador',
  apps: 'Apps',
};

const SERVICIO_LABELS: Record<string, string> = {
  takeaway: 'Takeaway',
  comer_aca: 'Comer acá',
  delivery: 'Delivery',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n);

function paymentSummary(pagos: PosOrder['pedido_pagos']) {
  if (!pagos || pagos.length === 0) return '-';
  if (pagos.length === 1) return METODO_LABELS[pagos[0].metodo] || pagos[0].metodo;
  return 'Dividido';
}

export function OrderHistoryTable({ orders, isLoading, branchId, hasOpenShift, onReprintInvoice }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<PosOrder | null>(null);
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12" />)}
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No hay pedidos en este período con los filtros seleccionados
        </CardContent>
      </Card>
    );
  }

  const toggle = (id: string) => setExpandedId(prev => prev === id ? null : id);

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>#</TableHead>
              <TableHead>Fecha</TableHead>
              {!isMobile && <TableHead>Canal</TableHead>}
              {!isMobile && <TableHead>Servicio</TableHead>}
              {!isMobile && <TableHead>Cliente</TableHead>}
              {!isMobile && <TableHead className="text-center">Items</TableHead>}
              <TableHead className="text-right">Total</TableHead>
              {!isMobile && <TableHead>Pago</TableHead>}
              <TableHead className="text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map(order => {
              const isExpanded = expandedId === order.id;
              const hasInvoice = order.facturas_emitidas?.length > 0;
              return (
                <>
                  <TableRow
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggle(order.id)}
                  >
                    <TableCell className="px-2">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </TableCell>
                    <TableCell className="font-medium tabular-nums">
                      <span className="flex items-center gap-1">
                        {order.numero_pedido}
                        {hasInvoice && <FileText className="w-3.5 h-3.5 text-primary" />}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {order.created_at
                        ? format(new Date(order.created_at), isMobile ? 'd/M HH:mm' : 'EEE d MMM HH:mm', { locale: es })
                        : '-'}
                    </TableCell>
                    {!isMobile && <TableCell className="text-sm">{CANAL_LABELS[order.canal_venta || ''] || '-'}</TableCell>}
                    {!isMobile && <TableCell className="text-sm">{SERVICIO_LABELS[order.tipo_servicio || ''] || '-'}</TableCell>}
                    {!isMobile && <TableCell className="text-sm truncate max-w-[120px]">{order.cliente_nombre || '-'}</TableCell>}
                    {!isMobile && <TableCell className="text-center tabular-nums">{order.pedido_items?.length || 0}</TableCell>}
                    <TableCell className="text-right font-medium tabular-nums">{fmt(order.total)}</TableCell>
                    {!isMobile && <TableCell className="text-sm">{paymentSummary(order.pedido_pagos)}</TableCell>}
                    <TableCell className="text-center">
                      <Badge variant={ESTADO_VARIANT[order.estado] || 'outline'} className="text-xs capitalize">
                        {order.estado}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`${order.id}-detail`}>
                      <TableCell colSpan={isMobile ? 5 : 10} className="bg-muted/30 p-4">
                        <OrderDetail
                          order={order}
                          canEdit={!!hasOpenShift && !!branchId}
                          onEdit={() => setEditingOrder(order)}
                          onReprintInvoice={onReprintInvoice}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>

        {/* Payment edit modal */}
        {editingOrder && branchId && (
          <PaymentEditModal
            open={!!editingOrder}
            onOpenChange={(v) => { if (!v) setEditingOrder(null); }}
            pedidoId={editingOrder.id}
            pedidoTotal={editingOrder.total}
            branchId={branchId}
            currentPayments={editingOrder.pedido_pagos}
          />
        )}
      </CardContent>
    </Card>
  );
}

function OrderDetail({ order, canEdit, onEdit, onReprintInvoice }: {
  order: PosOrder;
  canEdit?: boolean;
  onEdit?: () => void;
  onReprintInvoice?: (order: PosOrder) => void;
}) {
  const factura = order.facturas_emitidas?.[0];
  const pvStr = factura ? String(factura.punto_venta).padStart(5, '0') : '';
  const numStr = factura ? String(factura.numero_comprobante).padStart(8, '0') : '';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
      {/* Items */}
      <div>
        <p className="font-medium mb-1">Items</p>
        <ul className="space-y-0.5">
          {order.pedido_items?.map(item => (
            <li key={item.id} className="flex justify-between">
              <span>{item.nombre} x{item.cantidad}</span>
              <span className="tabular-nums">{fmt(item.subtotal)}</span>
            </li>
          ))}
        </ul>
        {order.descuento && order.descuento > 0 && (
          <div className="flex justify-between mt-1 text-destructive">
            <span>Descuento</span>
            <span>-{fmt(order.descuento)}</span>
          </div>
        )}
        <div className="flex justify-between mt-1 font-medium border-t pt-1">
          <span>Total</span>
          <span>{fmt(order.total)}</span>
        </div>
      </div>

      {/* Payments + Invoice */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="font-medium">Pagos</p>
          {canEdit && onEdit && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onEdit}>
              <Pencil className="h-3 w-3 mr-1" />
              Editar pago
            </Button>
          )}
        </div>
        <ul className="space-y-0.5">
          {order.pedido_pagos?.map(pago => (
            <li key={pago.id} className="flex justify-between">
              <span>{METODO_LABELS[pago.metodo] || pago.metodo}</span>
              <span className="tabular-nums">{fmt(pago.monto)}</span>
            </li>
          ))}
        </ul>

        {/* Invoice info */}
        {factura && (
          <div className="mt-3 pt-2 border-t space-y-1">
            <div className="flex items-center justify-between">
              <p className="font-medium flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-primary" />
                Factura {factura.tipo_comprobante}
              </p>
              {onReprintInvoice && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => { e.stopPropagation(); onReprintInvoice(order); }}
                >
                  <Printer className="h-3 w-3 mr-1" />
                  Reimprimir
                </Button>
              )}
            </div>
            <p className="text-muted-foreground">N° {pvStr}-{numStr}</p>
            {factura.cae && <p className="text-muted-foreground text-xs">CAE: {factura.cae}</p>}
            <p className="font-medium">{fmt(factura.total)}</p>
          </div>
        )}

        {isMobileInfo(order) && (
          <div className="mt-2 text-muted-foreground space-y-0.5">
            {order.canal_venta && <p>Canal: {CANAL_LABELS[order.canal_venta] || order.canal_venta}</p>}
            {order.tipo_servicio && <p>Servicio: {SERVICIO_LABELS[order.tipo_servicio] || order.tipo_servicio}</p>}
            {order.cliente_nombre && <p>Cliente: {order.cliente_nombre}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function isMobileInfo(order: PosOrder) {
  return typeof window !== 'undefined' && window.innerWidth < 768;
}
