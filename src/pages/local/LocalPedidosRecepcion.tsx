import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Truck,
  Package,
  Check,
  Clock,
  AlertTriangle,
  FileText,
  ChevronRight,
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface SupplierOrder {
  id: string;
  supplier_id: string;
  status: string;
  items: Array<{
    ingredient_id: string;
    ingredient_name: string;
    quantity: number;
    unit: string;
  }>;
  notes: string | null;
  sent_at: string | null;
  created_at: string;
  supplier: {
    id: string;
    name: string;
  } | null;
}

interface ReceivedItem {
  ingredient_id: string;
  ingredient_name: string;
  ordered_qty: number;
  received_qty: number;
  unit: string;
  received: boolean;
}

export default function LocalPedidosRecepcion() {
  const { branch } = useOutletContext<{ branch: Branch }>();
  const queryClient = useQueryClient();

  const [selectedOrder, setSelectedOrder] = useState<SupplierOrder | null>(null);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [receivedItems, setReceivedItems] = useState<ReceivedItem[]>([]);
  const [saving, setSaving] = useState(false);

  // Fetch pending orders
  const { data: pendingOrders = [], isLoading } = useQuery({
    queryKey: ['pending-supplier-orders', branch.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_orders')
        .select(`
          id, supplier_id, status, items, notes, sent_at, created_at,
          supplier:suppliers(id, name)
        `)
        .eq('branch_id', branch.id)
        .in('status', ['sent', 'confirmed'])
        .order('sent_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as SupplierOrder[];
    },
  });

  // Receive order mutation
  const receiveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrder) throw new Error('No order selected');

      const { data: { user } } = await supabase.auth.getUser();

      // Create stock movements for received items
      const stockMovements = receivedItems
        .filter(item => item.received && item.received_qty > 0)
        .map(item => ({
          branch_id: branch.id,
          ingredient_id: item.ingredient_id,
          quantity: item.received_qty,
          type: 'purchase' as const,
          reference_type: 'supplier_order',
          reference_id: selectedOrder.id,
          notes: `Recepción de pedido a ${selectedOrder.supplier?.name || 'proveedor'}`,
          created_by: user?.id,
        }));

      if (stockMovements.length > 0) {
        const { error: stockError } = await supabase
          .from('stock_movements')
          .insert(stockMovements);
        if (stockError) throw stockError;
      }

      // Update order status
      const { error: orderError } = await supabase
        .from('supplier_orders')
        .update({
          status: 'received',
          received_at: new Date().toISOString(),
        })
        .eq('id', selectedOrder.id);

      if (orderError) throw orderError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-supplier-orders'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-ingredients'] });
      toast.success('Pedido recibido y stock actualizado');
      setReceiveDialogOpen(false);
      setSelectedOrder(null);
    },
    onError: (error) => {
      console.error('Error receiving order:', error);
      toast.error('Error al procesar la recepción');
    },
  });

  const openReceiveDialog = (order: SupplierOrder) => {
    setSelectedOrder(order);
    setReceivedItems(
      order.items.map(item => ({
        ingredient_id: item.ingredient_id,
        ingredient_name: item.ingredient_name,
        ordered_qty: item.quantity,
        received_qty: item.quantity,
        unit: item.unit,
        received: true,
      }))
    );
    setReceiveDialogOpen(true);
  };

  const toggleItemReceived = (index: number) => {
    const newItems = [...receivedItems];
    newItems[index].received = !newItems[index].received;
    if (!newItems[index].received) {
      newItems[index].received_qty = 0;
    } else {
      newItems[index].received_qty = newItems[index].ordered_qty;
    }
    setReceivedItems(newItems);
  };

  const updateReceivedQty = (index: number, qty: number) => {
    const newItems = [...receivedItems];
    newItems[index].received_qty = qty;
    newItems[index].received = qty > 0;
    setReceivedItems(newItems);
  };

  const handleReceive = async () => {
    setSaving(true);
    try {
      await receiveMutation.mutateAsync();
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Enviado</Badge>;
      case 'confirmed':
        return <Badge className="bg-primary/10 text-primary gap-1"><Check className="h-3 w-3" /> Confirmado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-6 w-6" />
          Recepción de Pedidos
        </h1>
        <p className="text-muted-foreground">
          Registrar la llegada de pedidos y actualizar el stock
        </p>
      </div>

      {pendingOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Check className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay pedidos pendientes</h3>
            <p className="text-muted-foreground">
              Todos los pedidos han sido recibidos
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pendingOrders.map(order => (
            <Card key={order.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Truck className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-medium text-lg">{order.supplier?.name || 'Proveedor'}</h3>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Package className="h-4 w-4" />
                        {order.items.length} items
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Enviado: {order.sent_at ? formatDate(order.sent_at) : 'N/A'}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {order.items.slice(0, 3).map((item, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {item.ingredient_name}: {item.quantity} {item.unit}
                        </Badge>
                      ))}
                      {order.items.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{order.items.length - 3} más
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button onClick={() => openReceiveDialog(order)}>
                    Recibir
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Receive Dialog */}
      <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recibir Pedido
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedOrder.supplier?.name}</p>
                <p className="text-sm text-muted-foreground">
                  Enviado: {selectedOrder.sent_at ? formatDate(selectedOrder.sent_at) : 'N/A'}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Items del pedido</p>
                {receivedItems.map((item, index) => (
                  <div 
                    key={item.ingredient_id} 
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      item.received ? 'border-primary/30 bg-primary/5' : 'border-muted'
                    }`}
                  >
                    <Checkbox
                      checked={item.received}
                      onCheckedChange={() => toggleItemReceived(index)}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{item.ingredient_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Pedido: {item.ordered_qty} {item.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        value={item.received_qty || ''}
                        onChange={(e) => updateReceivedQty(index, Number(e.target.value))}
                        className="w-20 h-8"
                        disabled={!item.received}
                      />
                      <span className="text-sm text-muted-foreground w-8">{item.unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              {receivedItems.some(i => i.received_qty !== i.ordered_qty) && (
                <div className="p-3 bg-amber-100 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-700 dark:text-amber-400">Cantidades diferentes</p>
                    <p className="text-sm text-amber-600 dark:text-amber-500">
                      Algunas cantidades recibidas difieren de las pedidas
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleReceive} 
              disabled={saving || receivedItems.every(i => !i.received)}
            >
              <Check className="h-4 w-4 mr-2" />
              {saving ? 'Procesando...' : 'Confirmar Recepción'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
