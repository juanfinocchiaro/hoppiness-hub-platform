/**
 * AccountPanel - Panel de cuenta con items + pagos ordenados cronológicamente + saldo
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { POSAlertDialogContent } from './POSDialog';
import { usePOSPortal } from './POSPortalContext';
import { Minus, Plus, Trash2, ShoppingBag, MessageSquare, X, Banknote, CreditCard, QrCode, ArrowRightLeft, ChefHat, PlusCircle, Pencil, ChevronRight, Store, Bike, Loader2, Check, CircleDot } from 'lucide-react';
import type { CartItem } from './ProductGrid';
import type { LocalPayment, MetodoPago, OrderConfig } from '@/types/pos';
import { cn } from '@/lib/utils';

const METODO_ICONS: Record<MetodoPago, React.ComponentType<{ className?: string }>> = {
  efectivo: Banknote,
  tarjeta_debito: CreditCard,
  tarjeta_credito: CreditCard,
  mercadopago_qr: QrCode,
  transferencia: ArrowRightLeft,
};

const METODO_LABELS: Record<MetodoPago, string> = {
  efectivo: 'Efectivo',
  tarjeta_debito: 'Débito',
  tarjeta_credito: 'Crédito',
  mercadopago_qr: 'QR MP',
  transferencia: 'Transf.',
};

const PAYMENT_STYLES: Record<MetodoPago, string> = {
  efectivo: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700',
  tarjeta_debito: 'bg-blue-500/10 border-blue-500/20 text-blue-700',
  tarjeta_credito: 'bg-violet-500/10 border-violet-500/20 text-violet-700',
  mercadopago_qr: 'bg-sky-500/10 border-sky-500/20 text-sky-700',
  transferencia: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-700',
};

const PAYMENT_ICON_STYLES: Record<MetodoPago, string> = {
  efectivo: 'text-emerald-600',
  tarjeta_debito: 'text-blue-600',
  tarjeta_credito: 'text-violet-600',
  mercadopago_qr: 'text-sky-600',
  transferencia: 'text-indigo-600',
};

type TimelineEntry =
  | { type: 'item'; index: number; item: CartItem; ts: number }
  | { type: 'payment'; payment: LocalPayment; ts: number };

type SendingStage = 'creating' | 'invoicing' | 'printing' | 'done';

const APP_LABELS: Record<string, string> = {
  rappi: 'Rappi',
  pedidos_ya: 'PedidosYa',
  mp_delivery: 'MP Delivery',
};

interface AccountPanelProps {
  items: CartItem[];
  payments: LocalPayment[];
  onUpdateQty: (index: number, delta: number) => void;
  onRemove: (index: number) => void;
  onUpdateNotes?: (index: number, notes: string) => void;
  onCancelOrder?: () => void;
  onRegisterPayment: () => void;
  onRemovePayment: (paymentId: string) => void;
  onSendToKitchen: (onProgress?: (stage: string) => void) => Promise<void>;
  onSendComplete: () => void;
  willInvoice: boolean;
  willPrint: boolean;
  disabled?: boolean;
  orderConfig?: OrderConfig;
  onEditConfig?: () => void;
  onUpdateOrderConfig?: (partial: Partial<OrderConfig>) => void;
}

/* ── Config Summary Header ─────────────────────────── */
function ConfigHeader({ config, onEdit }: { config: OrderConfig; onEdit?: () => void }) {
  const parts: string[] = [];
  if (config.canalVenta === 'mostrador') {
    parts.push('Mostrador');
    if (config.tipoServicio === 'takeaway') parts.push('Para llevar');
    else if (config.tipoServicio === 'comer_aca') parts.push('Comer acá');
    else if (config.tipoServicio === 'delivery') parts.push('Delivery');
  } else {
    parts.push('Apps');
    if (config.canalApp === 'rappi') parts.push('Rappi');
    else if (config.canalApp === 'pedidos_ya') parts.push('PedidosYa');
    else if (config.canalApp === 'mp_delivery') parts.push('MP Delivery');
  }

  const detail = config.numeroLlamador
    ? `#${config.numeroLlamador}`
    : config.clienteNombre || '';

  const Icon = config.canalVenta === 'mostrador' ? Store : Bike;

  return (
    <div className="px-3 py-2 border-b bg-slate-50 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="flex items-center gap-1 text-sm font-medium truncate">
          {parts.map((p, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />}
              <span>{p}</span>
            </span>
          ))}
        </span>
        {detail && (
          <span className="text-xs text-muted-foreground truncate ml-1">· {detail}</span>
        )}
      </div>
      {onEdit && (
        <Button variant="ghost" size="sm" className="shrink-0 h-7 text-xs gap-1" onClick={onEdit}>
          <Pencil className="h-3 w-3" />
          Editar
        </Button>
      )}
    </div>
  );
}

export function AccountPanel({
  items,
  payments,
  onUpdateQty,
  onRemove,
  onUpdateNotes,
  onCancelOrder,
  onRegisterPayment,
  onRemovePayment,
  onSendToKitchen,
  onSendComplete,
  willInvoice,
  willPrint,
  disabled,
  orderConfig,
  onEditConfig,
  onUpdateOrderConfig,
}: AccountPanelProps) {
  const subtotalItems = items.reduce((s, i) => s + i.subtotal, 0);
  const isApps = orderConfig?.canalVenta === 'apps';
  const isDelivery = orderConfig?.tipoServicio === 'delivery';
  const costoEnvio = (isApps || isDelivery) ? (orderConfig?.costoDelivery ?? 0) : 0;
  const descPlataforma = orderConfig?.descuentoPlataforma ?? 0;
  const descRestaurante = orderConfig?.descuentoRestaurante ?? 0;
  const totalDescuentos = descPlataforma + descRestaurante;
  const totalItems = subtotalItems + costoEnvio - totalDescuentos;
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const saldo = isApps ? 0 : totalItems - totalPaid;
  const canSend = isApps ? items.length > 0 : (Math.abs(totalItems - totalPaid) < 0.01 && items.length > 0);

  const [editingNoteIdx, setEditingNoteIdx] = useState<number | null>(null);

  // Send dialog state
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendPhase, setSendPhase] = useState<'confirm' | 'progress'>('confirm');
  const [currentStage, setCurrentStage] = useState<SendingStage | null>(null);
  const sendInFlightRef = useRef(false);

  const handleConfirmSend = useCallback(async () => {
    if (sendInFlightRef.current) return;
    sendInFlightRef.current = true;
    setSendPhase('progress');
    try {
      await onSendToKitchen((stage) => setCurrentStage(stage as SendingStage));
      setCurrentStage('done');
      setTimeout(() => {
        setSendDialogOpen(false);
        setSendPhase('confirm');
        setCurrentStage(null);
        sendInFlightRef.current = false;
        onSendComplete();
      }, 800);
    } catch (e: any) {
      setSendDialogOpen(false);
      setSendPhase('confirm');
      setCurrentStage(null);
      sendInFlightRef.current = false;
      const { toast } = await import('sonner');
      toast.error(e?.message ?? 'Error al registrar pedido');
    }
  }, [onSendToKitchen, onSendComplete]);

  // Build chronological timeline
  const timeline = useMemo<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = [];
    items.forEach((item, index) => {
      entries.push({ type: 'item', index, item, ts: item.createdAt ?? 0 });
    });
    payments.forEach((payment) => {
      entries.push({ type: 'payment', payment, ts: payment.createdAt });
    });
    entries.sort((a, b) => a.ts - b.ts);
    return entries;
  }, [items, payments]);

  // Determine send button state
  const totalQty = items.reduce((s, i) => s + i.cantidad, 0);
  let sendLabel = 'Agrega productos';
  let sendDisabled = true;
  if (isApps && items.length > 0) {
    sendLabel = 'Enviar a cocina';
    sendDisabled = false;
  } else if (items.length > 0 && payments.length === 0) {
    sendLabel = `Cobra $ ${totalItems.toLocaleString('es-AR')} para enviar`;
    sendDisabled = true;
  } else if (items.length > 0 && saldo > 0) {
    sendLabel = `Faltan $ ${saldo.toLocaleString('es-AR')} por cobrar`;
    sendDisabled = true;
  } else if (canSend) {
    sendLabel = 'Enviar a cocina';
    sendDisabled = false;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Config summary header */}
      {orderConfig && <ConfigHeader config={orderConfig} onEdit={onEditConfig} />}

      {/* Header */}
      <div className="px-3 py-2.5 border-b font-medium flex items-center justify-between">
        <span className="text-sm">Cuenta</span>
        {onCancelOrder && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive h-7 text-xs">
                <X className="h-3.5 w-3.5 mr-1" />
                {items.length > 0 || payments.length > 0 ? 'Cancelar' : 'Nueva venta'}
              </Button>
            </AlertDialogTrigger>
            <POSAlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {items.length > 0 || payments.length > 0
                    ? '¿Cancelar pedido?'
                    : '¿Volver a la pantalla inicial?'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {items.length > 0 || payments.length > 0
                    ? 'Se eliminarán todos los productos y pagos registrados. Esta acción no se puede deshacer.'
                    : 'Se descartará la configuración actual y volverás a la pantalla inicial del POS.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Volver</AlertDialogCancel>
                <AlertDialogAction onClick={onCancelOrder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {items.length > 0 || payments.length > 0 ? 'Sí, cancelar pedido' : 'Sí, reiniciar'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </POSAlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Scrollable content: chronological timeline */}
      <ScrollArea className="flex-1 min-h-0">
        {timeline.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/60 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Agregá productos para empezar</p>
            <p className="text-xs text-muted-foreground mt-1">Elegí items del menú y sumalos al pedido</p>
          </div>
        ) : (
          <div className="p-2 space-y-1.5">
            {timeline.map((entry, i) => {
              if (entry.type === 'item') {
                return (
                  <ItemRow
                    key={`item-${entry.index}-${entry.item.item_carta_id}`}
                    item={entry.item}
                    index={entry.index}
                    editingNoteIdx={editingNoteIdx}
                    setEditingNoteIdx={setEditingNoteIdx}
                    onUpdateQty={onUpdateQty}
                    onRemove={onRemove}
                    onUpdateNotes={onUpdateNotes}
                  />
                );
              }
              return (
                <PaymentRow
                  key={`pay-${entry.payment.id}`}
                  payment={entry.payment}
                  onRemovePayment={onRemovePayment}
                />
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Footer: summary + actions */}
      <div className="p-3 border-t space-y-2">
        {items.length > 0 && (
          <>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{(costoEnvio > 0 || totalDescuentos > 0 || isApps) ? 'Subtotal' : 'Total pedido'}</span>
                <span className="font-medium tabular-nums">$ {subtotalItems.toLocaleString('es-AR')}</span>
              </div>

              {/* Editable delivery amounts for apps */}
              {isApps && onUpdateOrderConfig && (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground text-xs shrink-0">Envío</span>
                    <Input
                      type="number"
                      min={0}
                      step={100}
                      value={orderConfig?.costoDelivery ?? 0}
                      onChange={(e) => onUpdateOrderConfig({ costoDelivery: Math.max(0, Number(e.target.value) || 0) })}
                      className="h-7 w-28 text-xs text-right tabular-nums"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-orange-600 text-xs shrink-0">Desc. plataforma</span>
                    <Input
                      type="number"
                      min={0}
                      step={100}
                      value={orderConfig?.descuentoPlataforma ?? 0}
                      onChange={(e) => onUpdateOrderConfig({ descuentoPlataforma: Math.max(0, Number(e.target.value) || 0) })}
                      className="h-7 w-28 text-xs text-right tabular-nums"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-orange-600 text-xs shrink-0">Desc. restaurante</span>
                    <Input
                      type="number"
                      min={0}
                      step={100}
                      value={orderConfig?.descuentoRestaurante ?? 0}
                      onChange={(e) => onUpdateOrderConfig({ descuentoRestaurante: Math.max(0, Number(e.target.value) || 0) })}
                      className="h-7 w-28 text-xs text-right tabular-nums"
                    />
                  </div>
                </>
              )}

              {/* Static delivery amounts for non-apps */}
              {!isApps && costoEnvio > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Envío</span>
                  <span className="font-medium tabular-nums">$ {costoEnvio.toLocaleString('es-AR')}</span>
                </div>
              )}
              {!isApps && descPlataforma > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Desc. plataforma</span>
                  <span className="font-medium tabular-nums">- $ {descPlataforma.toLocaleString('es-AR')}</span>
                </div>
              )}
              {!isApps && descRestaurante > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Desc. restaurante</span>
                  <span className="font-medium tabular-nums">- $ {descRestaurante.toLocaleString('es-AR')}</span>
                </div>
              )}

              {(costoEnvio > 0 || totalDescuentos > 0 || isApps) && (
                <div className="flex justify-between pt-0.5 border-t">
                  <span className="text-muted-foreground font-medium">Total pedido</span>
                  <span className="font-semibold tabular-nums">$ {totalItems.toLocaleString('es-AR')}</span>
                </div>
              )}

              {/* For apps: show "Cobrado por [App]" indicator */}
              {isApps && (
                <div className="rounded-lg px-3 py-2 flex justify-between items-center text-sm font-bold bg-sky-50 text-sky-800 border border-sky-200">
                  <span>Cobrado por {APP_LABELS[orderConfig?.canalApp ?? ''] ?? 'App'}</span>
                  <span className="tabular-nums">$ {totalItems.toLocaleString('es-AR')}</span>
                </div>
              )}

              {/* For non-apps: show paid amount and saldo */}
              {!isApps && payments.length > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Pagado</span>
                  <span className="font-medium tabular-nums">- $ {totalPaid.toLocaleString('es-AR')}</span>
                </div>
              )}
            </div>
            {!isApps && payments.length > 0 && (
              <div className={cn(
                'rounded-lg px-3 py-2 flex justify-between items-center text-sm font-bold',
                saldo > 0
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              )}>
                <span>{saldo > 0 ? 'Falta cobrar' : 'Cobrado'}</span>
                <span className="tabular-nums">$ {saldo.toLocaleString('es-AR')}</span>
              </div>
            )}
          </>
        )}

        {!isApps && items.length > 0 && saldo > 0 && (
          <Button variant="outline" className="w-full" onClick={onRegisterPayment} disabled={disabled}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Registrar pago
          </Button>
        )}

        <DialogPrimitive.Root
          open={sendDialogOpen}
          onOpenChange={(open) => {
            if (!open && sendPhase === 'progress') return;
            setSendDialogOpen(open);
            if (!open) { setSendPhase('confirm'); setCurrentStage(null); }
          }}
        >
          <DialogPrimitive.Trigger asChild>
            <Button
              className={cn(
                'w-full hidden lg:flex h-14 text-base',
                canSend
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : ''
              )}
              size="lg"
              disabled={sendDisabled || disabled}
            >
              <ChefHat className="h-5 w-5 mr-2" />
              <div className="flex flex-col items-start leading-tight">
                <span>{sendLabel}</span>
                {canSend && (
                  <span className="text-xs font-normal opacity-80">{totalQty} items · $ {totalItems.toLocaleString('es-AR')}</span>
                )}
              </div>
            </Button>
          </DialogPrimitive.Trigger>
          {canSend && (
            <SendDialogContent
              phase={sendPhase}
              currentStage={currentStage}
              willInvoice={willInvoice}
              willPrint={willPrint}
              totalQty={totalQty}
              totalItems={totalItems}
              onCancel={() => setSendDialogOpen(false)}
              onConfirm={handleConfirmSend}
            />
          )}
        </DialogPrimitive.Root>
      </div>
    </div>
  );
}

/* ── Send Dialog ────────────────────────────────────── */

function SendDialogContent({
  phase,
  currentStage,
  willInvoice,
  willPrint,
  totalQty,
  totalItems,
  onCancel,
  onConfirm,
}: {
  phase: 'confirm' | 'progress';
  currentStage: SendingStage | null;
  willInvoice: boolean;
  willPrint: boolean;
  totalQty: number;
  totalItems: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const containerRef = usePOSPortal();

  const stages: { key: SendingStage; label: string; doneLabel: string }[] = [
    { key: 'creating', label: 'Registrando pedido...', doneLabel: 'Pedido registrado' },
    ...(willInvoice ? [{ key: 'invoicing' as const, label: 'Facturando...', doneLabel: 'Facturado' }] : []),
    ...(willPrint ? [{ key: 'printing' as const, label: 'Imprimiendo...', doneLabel: 'Impreso' }] : []),
  ];

  const stageOrder = stages.map((s) => s.key);
  const currentIdx = currentStage === 'done'
    ? stageOrder.length
    : currentStage
      ? stageOrder.indexOf(currentStage)
      : -1;

  return (
    <DialogPrimitive.Portal container={containerRef?.current ?? undefined}>
      <DialogPrimitive.Overlay className="absolute inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        className="absolute left-[50%] top-[50%] z-50 grid w-full max-w-sm translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg"
        onPointerDownOutside={(e) => { if (phase === 'progress') e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (phase === 'progress') e.preventDefault(); }}
        onInteractOutside={(e) => { if (phase === 'progress') e.preventDefault(); }}
      >
        {phase === 'confirm' ? (
          <>
            <div className="space-y-2">
              <DialogPrimitive.Title className="text-lg font-semibold">¿Enviar pedido a cocina?</DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm text-muted-foreground">
                {totalQty} items · $ {totalItems.toLocaleString('es-AR')}
                <br />
                Una vez enviado no se podrán agregar más items.
              </DialogPrimitive.Description>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onCancel}>Volver</Button>
              <Button onClick={onConfirm} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Sí, enviar a cocina
              </Button>
            </div>
          </>
        ) : (
          <div className="py-2">
            <div className="space-y-0">
              {stages.map((stage, i) => {
                const isDone = currentIdx > i;
                const isActive = currentIdx === i;
                return (
                  <div key={stage.key} className="flex items-start gap-3">
                    {/* Vertical line + icon column */}
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        'h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-300',
                        isDone && 'bg-emerald-100 text-emerald-600',
                        isActive && 'bg-blue-100 text-blue-600',
                        !isDone && !isActive && 'bg-muted text-muted-foreground',
                      )}>
                        {isDone ? (
                          <Check className="h-4 w-4" />
                        ) : isActive ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CircleDot className="h-3.5 w-3.5" />
                        )}
                      </div>
                      {i < stages.length - 1 && (
                        <div className={cn(
                          'w-0.5 h-5 transition-colors duration-300',
                          isDone ? 'bg-emerald-300' : 'bg-muted',
                        )} />
                      )}
                    </div>
                    <span className={cn(
                      'text-sm pt-1 transition-colors duration-300',
                      isDone && 'text-emerald-700 font-medium',
                      isActive && 'text-foreground font-medium',
                      !isDone && !isActive && 'text-muted-foreground',
                    )}>
                      {isDone ? stage.doneLabel : isActive ? stage.label : stage.doneLabel}
                    </span>
                  </div>
                );
              })}
            </div>

            {currentStage === 'done' && (
              <div className="flex flex-col items-center gap-2 mt-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check className="h-6 w-6 text-emerald-600" />
                </div>
                <span className="text-base font-semibold text-emerald-700">Pedido enviado</span>
              </div>
            )}
          </div>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/* ── Sub-components ─────────────────────────────────── */

function ItemRow({
  item, index, editingNoteIdx, setEditingNoteIdx, onUpdateQty, onRemove, onUpdateNotes,
}: {
  item: CartItem; index: number;
  editingNoteIdx: number | null; setEditingNoteIdx: (v: number | null) => void;
  onUpdateQty: (i: number, d: number) => void; onRemove: (i: number) => void;
  onUpdateNotes?: (i: number, n: string) => void;
}) {
  return (
    <div className="p-2 rounded-lg bg-muted/50">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.nombre}</p>
          <p className="text-xs text-muted-foreground">
            {item.precio_referencia && item.precio_referencia > item.precio_unitario ? (
              <>
                <span className="line-through mr-1">$ {item.precio_referencia.toLocaleString('es-AR')}</span>
                <span className="text-destructive font-semibold">$ {item.precio_unitario.toLocaleString('es-AR')}</span>
                <span className="ml-1"> × {item.cantidad}</span>
              </>
            ) : (
              <>$ {item.precio_unitario.toLocaleString('es-AR')} × {item.cantidad}</>
            )}
          </p>
          {item.notas && editingNoteIdx !== index && (
            <div className="mt-0.5 space-y-0">
              {item.notas.split(/[,|]/).map((note, ni) => {
                const trimmed = note.trim();
                return trimmed ? <p key={ni} className="text-xs text-primary truncate">{trimmed}</p> : null;
              })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onUpdateQty(index, -1)} disabled={item.cantidad <= 1}>
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="text-sm font-medium w-6 text-center">{item.cantidad}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onUpdateQty(index, 1)}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
          {onUpdateNotes && (
            <Button
              variant="ghost" size="icon"
              className={`h-8 w-8 ${item.notas ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={() => setEditingNoteIdx(editingNoteIdx === index ? null : index)}
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onRemove(index)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {editingNoteIdx === index && onUpdateNotes && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <Input
            placeholder="Ej: sin lechuga, bien cocida..."
            value={item.notas || ''}
            onChange={(e) => onUpdateNotes(index, e.target.value)}
            className="h-8 text-xs flex-1"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') setEditingNoteIdx(null); }}
          />
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setEditingNoteIdx(null)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

function PaymentRow({ payment, onRemovePayment }: { payment: LocalPayment; onRemovePayment: (id: string) => void }) {
  const Icon = METODO_ICONS[payment.method];
  const style = PAYMENT_STYLES[payment.method];
  const iconStyle = PAYMENT_ICON_STYLES[payment.method];
  return (
    <div className={cn('flex items-center justify-between p-2 rounded-lg border', style)}>
      <div className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4', iconStyle)} />
        <span className="text-sm font-medium">{METODO_LABELS[payment.method]}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold tabular-nums">$ {payment.amount.toLocaleString('es-AR')}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onRemovePayment(payment.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
