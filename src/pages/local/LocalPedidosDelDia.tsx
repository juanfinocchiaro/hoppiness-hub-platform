import { useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Truck,
  AlertTriangle,
  Clock,
  Phone,
  MessageCircle,
  Copy,
  Calendar,
  TrendingDown,
  Package,
  CheckCircle2,
} from 'lucide-react';
import { useTodayOrders, formatDaysList, getCurrentShiftDay } from '@/hooks/useSmartPurchasing';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

interface OrderItem {
  ingredient_id: string;
  ingredient_name: string;
  current_stock: number;
  suggested_quantity: number;
  order_quantity: number;
  unit: string;
  selected: boolean;
}

export default function LocalPedidosDelDia() {
  const { branch } = useOutletContext<{ branch: Branch }>();
  const openingTime = branch.opening_time || '11:00';
  const currentShiftDay = getCurrentShiftDay(openingTime);
  const { data: todayOrders, isLoading } = useTodayOrders(branch.id, openingTime);
  
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<(typeof todayOrders)[number] | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);

  const openOrderDialog = (order: (typeof todayOrders)[number]) => {
    setSelectedSupplier(order);
    setOrderItems(
      order.ingredients.map(ing => ({
        ingredient_id: ing.id,
        ingredient_name: ing.name,
        current_stock: ing.current_stock,
        suggested_quantity: ing.suggested_quantity,
        order_quantity: ing.suggested_quantity,
        unit: ing.unit,
        selected: true,
      }))
    );
    setNotes('');
    setOrderDialogOpen(true);
  };

  const toggleItem = (index: number) => {
    const newItems = [...orderItems];
    newItems[index].selected = !newItems[index].selected;
    setOrderItems(newItems);
  };

  const updateQuantity = (index: number, qty: number) => {
    const newItems = [...orderItems];
    newItems[index].order_quantity = qty;
    setOrderItems(newItems);
  };

  const generateMessage = () => {
    const selectedItems = orderItems.filter(i => i.selected && i.order_quantity > 0);
    if (selectedItems.length === 0) return '';

    const lines = [
      `🍔 PEDIDO - ${branch.name}`,
      `Fecha: ${new Date().toLocaleDateString('es-AR')}`,
      '',
      'Por favor enviarnos:',
      ...selectedItems.map(item => `• ${item.ingredient_name}: ${item.order_quantity} ${item.unit}`),
      '',
      `📍 Dirección: ${branch.address}`,
      branch.phone ? `📞 Contacto: ${branch.phone}` : '',
      notes ? `\nNota: ${notes}` : '',
      '',
      '¡Gracias!',
    ].filter(Boolean);

    return lines.join('\n');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateMessage());
    toast.success('Mensaje copiado');
  };

  const sendWhatsApp = async () => {
    if (!selectedSupplier) return;
    
    const phone = (selectedSupplier.supplier.whatsapp || selectedSupplier.supplier.phone || '').replace(/[^0-9]/g, '');
    if (!phone) {
      toast.error('El proveedor no tiene teléfono configurado');
      return;
    }

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const selectedItems = orderItems.filter(i => i.selected && i.order_quantity > 0);

      const { error } = await supabase.from('supplier_orders').insert({
        branch_id: branch.id,
        supplier_id: selectedSupplier.supplier.id,
        status: 'sent',
        items: selectedItems.map(i => ({
          ingredient_id: i.ingredient_id,
          ingredient_name: i.ingredient_name,
          quantity: i.order_quantity,
          unit: i.unit,
          suggested_quantity: i.suggested_quantity,
        })),
        notes: notes || null,
        sent_at: new Date().toISOString(),
        sent_via: 'whatsapp',
        created_by: user?.id,
      });

      if (error) throw error;

      const url = `https://wa.me/${phone}?text=${encodeURIComponent(generateMessage())}`;
      window.open(url, '_blank');

      toast.success('Pedido registrado');
      setOrderDialogOpen(false);
    } catch (error) {
      console.error('Error saving order:', error);
      toast.error('Error al guardar el pedido');
    } finally {
      setSending(false);
    }
  };

  const urgencyConfig = {
    critical: { color: 'bg-destructive text-destructive-foreground', icon: AlertTriangle, label: 'Urgente' },
    warning: { color: 'bg-amber-500 text-white dark:bg-amber-600', icon: Clock, label: 'Pronto' },
    normal: { color: 'bg-primary text-primary-foreground', icon: Package, label: 'Normal' },
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  const hasCriticalOrders = todayOrders?.some(o => o.urgency === 'critical');
  const hasOrders = (todayOrders?.length || 0) > 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6" />
            Pedidos del Día
          </h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
            <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded">
              Turno: {DAY_NAMES[currentShiftDay]}
            </span>
          </p>
        </div>
        <Link to={`/local/${branch.id}/stock/pedir`}>
          <Button variant="outline">Ver todos los proveedores</Button>
        </Link>
      </div>

      {/* Alert Banner */}
      {hasCriticalOrders && (
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <div>
            <p className="font-medium text-destructive">¡Atención! Hay ingredientes críticos</p>
            <p className="text-sm text-muted-foreground">
              Algunos ingredientes se agotarán en menos de 2 días. Realizá los pedidos urgentes primero.
            </p>
          </div>
        </div>
      )}

      {/* No orders state */}
      {!hasOrders && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">¡Todo en orden!</h3>
            <p className="text-muted-foreground mb-4">
              No hay pedidos pendientes para hoy. Tu stock está en buen estado.
            </p>
            <Link to={`/local/${branch.id}/stock`}>
              <Button variant="outline">Ver inventario completo</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Today's Orders */}
      <div className="grid gap-4">
        {todayOrders?.map((order) => {
          const config = urgencyConfig[order.urgency];
          const UrgencyIcon = config.icon;
          const hasWhatsApp = order.supplier.whatsapp || order.supplier.phone;

          return (
            <Card key={order.supplier.id} className={order.urgency === 'critical' ? 'border-destructive' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">{order.supplier.name}</CardTitle>
                      <Badge className={config.color}>
                        <UrgencyIcon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                    </div>
                    <CardDescription className="flex flex-wrap gap-3">
                      {order.supplier.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {order.supplier.phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Entrega: {order.delivery_date} {order.delivery_time && `a las ${order.delivery_time}`}
                      </span>
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => openOrderDialog(order)}
                    disabled={!hasWhatsApp}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Pedir
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {order.ingredients.slice(0, 5).map((ing) => (
                    <div 
                      key={ing.id} 
                      className="flex items-center justify-between text-sm p-2 rounded bg-muted/50"
                    >
                      <span className="font-medium">{ing.name}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-muted-foreground">
                          Stock: {ing.current_stock} {ing.unit}
                        </span>
                        {ing.days_until_stockout <= 7 && (
                          <Badge variant="outline" className="text-destructive border-destructive">
                            <TrendingDown className="h-3 w-3 mr-1" />
                            {ing.days_until_stockout} días
                          </Badge>
                        )}
                        <span className="font-medium text-primary">
                          +{ing.suggested_quantity} {ing.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                  {order.ingredients.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      +{order.ingredients.length - 5} ingredientes más
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Order Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pedir a {selectedSupplier?.supplier.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Items */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Items a pedir</p>
              {orderItems.map((item, index) => (
                <div key={item.ingredient_id} className="flex items-center gap-3 p-2 rounded border">
                  <Checkbox
                    checked={item.selected}
                    onCheckedChange={() => toggleItem(index)}
                  />
                  <span className="flex-1 text-sm">{item.ingredient_name}</span>
                  <Input
                    type="number"
                    min="0"
                    value={item.order_quantity || ''}
                    onChange={(e) => updateQuantity(index, Number(e.target.value))}
                    className="w-20 h-8"
                    disabled={!item.selected}
                  />
                  <span className="text-xs text-muted-foreground w-8">{item.unit}</span>
                </div>
              ))}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Notas (opcional)</p>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Entregar antes de las 10am"
                rows={2}
              />
            </div>

            {/* Preview */}
            {generateMessage() && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Vista previa</p>
                <pre className="bg-muted p-3 rounded text-xs whitespace-pre-wrap font-mono">
                  {generateMessage()}
                </pre>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={copyToClipboard} disabled={!generateMessage()}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar
            </Button>
            <Button onClick={sendWhatsApp} disabled={sending || !generateMessage()}>
              <MessageCircle className="h-4 w-4 mr-2" />
              {sending ? 'Enviando...' : 'Enviar WhatsApp'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
