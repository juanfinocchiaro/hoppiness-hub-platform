/**
 * AccountPanel - Panel de cuenta con items + pagos ordenados cronológicamente + saldo
 */
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Minus, Plus, Trash2, ShoppingBag, MessageSquare, X, Banknote, CreditCard, QrCode, ArrowRightLeft, ChefHat, PlusCircle } from 'lucide-react';
import type { CartItem } from './ProductGrid';
import type { LocalPayment, MetodoPago } from '@/types/pos';
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

type TimelineEntry =
  | { type: 'item'; index: number; item: CartItem; ts: number }
  | { type: 'payment'; payment: LocalPayment; ts: number };

interface AccountPanelProps {
  items: CartItem[];
  payments: LocalPayment[];
  onUpdateQty: (index: number, delta: number) => void;
  onRemove: (index: number) => void;
  onUpdateNotes?: (index: number, notes: string) => void;
  onCancelOrder?: () => void;
  onRegisterPayment: () => void;
  onRemovePayment: (paymentId: string) => void;
  onSendToKitchen: () => void;
  disabled?: boolean;
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
  disabled,
}: AccountPanelProps) {
  const totalItems = items.reduce((s, i) => s + i.subtotal, 0);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const saldo = totalItems - totalPaid;
  const canSend = saldo === 0 && items.length > 0;

  const [editingNoteIdx, setEditingNoteIdx] = useState<number | null>(null);

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
  let sendLabel = 'Agrega productos';
  let sendDisabled = true;
  if (items.length > 0 && payments.length === 0) {
    sendLabel = `Cobra $ ${totalItems.toLocaleString('es-AR')} para enviar`;
    sendDisabled = true;
  } else if (items.length > 0 && saldo > 0) {
    sendLabel = `Faltan $ ${saldo.toLocaleString('es-AR')} por cobrar`;
    sendDisabled = true;
  } else if (canSend) {
    sendLabel = `Enviar a cocina · $ ${totalItems.toLocaleString('es-AR')}`;
    sendDisabled = false;
  }

  return (
    <div className="flex flex-col h-full border rounded-lg">
      {/* Header */}
      <div className="p-3 border-b font-medium flex items-center justify-between">
        <span>Cuenta</span>
        {(items.length > 0 || payments.length > 0) && onCancelOrder && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive h-7 text-xs">
                <X className="h-3.5 w-3.5 mr-1" />
                Cancelar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Cancelar pedido?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se eliminarán todos los productos y pagos registrados. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Volver</AlertDialogCancel>
                <AlertDialogAction onClick={onCancelOrder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Sí, cancelar pedido
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
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
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total pedido</span>
              <span className="font-medium tabular-nums">$ {totalItems.toLocaleString('es-AR')}</span>
            </div>
            {payments.length > 0 && (
              <>
                <div className="flex justify-between text-green-600">
                  <span>Pagado</span>
                  <span className="font-medium tabular-nums">- $ {totalPaid.toLocaleString('es-AR')}</span>
                </div>
                <div className={cn('flex justify-between text-base font-bold', saldo > 0 ? 'text-destructive' : 'text-green-600')}>
                  <span>Saldo</span>
                  <span className="tabular-nums">$ {saldo.toLocaleString('es-AR')}</span>
                </div>
              </>
            )}
          </div>
        )}

        {items.length > 0 && saldo > 0 && (
          <Button variant="outline" className="w-full" onClick={onRegisterPayment} disabled={disabled}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Registrar pago
          </Button>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              className={cn('w-full hidden lg:flex', canSend && 'bg-green-600 hover:bg-green-700 text-white')}
              size="lg"
              disabled={sendDisabled || disabled}
            >
              <ChefHat className="h-4 w-4 mr-2" />
              {sendLabel}
            </Button>
          </AlertDialogTrigger>
          {canSend && (
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Enviar pedido a cocina?</AlertDialogTitle>
                <AlertDialogDescription>
                  {items.reduce((s, i) => s + i.cantidad, 0)} items · $ {totalItems.toLocaleString('es-AR')}
                  <br />
                  Una vez enviado no se podrán agregar más items.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Volver</AlertDialogCancel>
                <AlertDialogAction onClick={onSendToKitchen} className="bg-green-600 hover:bg-green-700">
                  Sí, enviar a cocina
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          )}
        </AlertDialog>
      </div>
    </div>
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
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/10 border border-green-500/20">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-green-600" />
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
