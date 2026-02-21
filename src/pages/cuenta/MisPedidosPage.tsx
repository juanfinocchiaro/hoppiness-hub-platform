/**
 * MisPedidosPage - Historial de pedidos del cliente
 */
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Package, Eye, RotateCcw, Loader2, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const estadoLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pendiente: { label: 'Pendiente', variant: 'outline' },
  confirmado: { label: 'Confirmado', variant: 'secondary' },
  en_preparacion: { label: 'Preparando', variant: 'default' },
  listo: { label: 'Listo', variant: 'default' },
  en_camino: { label: 'En camino', variant: 'default' },
  entregado: { label: 'Entregado', variant: 'secondary' },
  cancelado: { label: 'Cancelado', variant: 'destructive' },
  rechazado: { label: 'Rechazado', variant: 'destructive' },
};

const activeStates = ['pendiente', 'confirmado', 'en_preparacion', 'listo', 'en_camino'];

export default function MisPedidosPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['my-orders', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          id, numero_pedido, estado, tipo_servicio,
          total, created_at, webapp_tracking_code,
          branch_id,
          pedido_items(nombre, cantidad, precio_unitario, subtotal)
        `)
        .eq('cliente_user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch branch names for the orders
  const branchIds = [...new Set((orders || []).map(o => o.branch_id).filter(Boolean))];
  const { data: branches } = useQuery({
    queryKey: ['branches-names-slugs', branchIds],
    queryFn: async () => {
      if (branchIds.length === 0) return {};
      const { data } = await supabase
        .from('branches')
        .select('id, name, slug')
        .in('id', branchIds);
      const map: Record<string, { name: string; slug: string | null }> = {};
      data?.forEach(b => { map[b.id] = { name: b.name, slug: b.slug }; });
      return map;
    },
    enabled: branchIds.length > 0,
  });

  const handleReorder = (order: any) => {
    const branchInfo = branches?.[order.branch_id];
    if (!branchInfo?.slug) return;
    const items = (order.pedido_items || []);
    // Store reorder items in localStorage for the cart to pick up
    const reorderItems = items.map((i: any) => ({
      cartId: crypto.randomUUID(),
      itemId: '', // Will be matched by name in the menu
      nombre: i.nombre,
      imagen_url: null,
      precioUnitario: i.precio_unitario ?? 0,
      cantidad: i.cantidad,
      extras: [],
      removidos: [],
      notas: '',
    }));
    localStorage.setItem('hoppiness_reorder', JSON.stringify(reorderItems));
    navigate(`/pedir/${branchInfo.slug}`);
  };

  const activeOrders = (orders || []).filter(o => activeStates.includes(o.estado));
  const pastOrders = (orders || []).filter(o => !activeStates.includes(o.estado));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Mis Pedidos" subtitle="Tu historial de pedidos en Hoppiness" />

      {(!orders || orders.length === 0) ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-medium">Aún no tenés pedidos</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Cuando hagas tu primer pedido desde la webapp, aparecerá acá.
            </p>
            <Button className="mt-4" onClick={() => navigate('/pedir')}>
              Pedir ahora
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Active orders */}
          {activeOrders.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Pedidos en curso
              </h3>
              {activeOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  branchName={branches?.[order.branch_id]?.name || ''}
                  branchSlug={branches?.[order.branch_id]?.slug || undefined}
                  isActive
                  onTrack={() => navigate(`/pedido/${order.webapp_tracking_code}`)}
                />
              ))}
            </div>
          )}

          {/* Past orders */}
          {pastOrders.length > 0 && (
            <div className="space-y-3">
              {activeOrders.length > 0 && (
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Anteriores
                </h3>
              )}
              {pastOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  branchName={branches?.[order.branch_id]?.name || ''}
                  branchSlug={branches?.[order.branch_id]?.slug || undefined}
                  onTrack={() => navigate(`/pedido/${order.webapp_tracking_code}`)}
                  onReorder={() => handleReorder(order)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function OrderCard({ order, branchName, branchSlug, isActive, onTrack, onReorder }: {
  order: any;
  branchName: string;
  branchSlug?: string;
  isActive?: boolean;
  onTrack: () => void;
  onReorder?: () => void;
}) {
  const estado = estadoLabels[order.estado] || { label: order.estado, variant: 'outline' as const };
  const items = order.pedido_items || [];
  const itemsSummary = items.slice(0, 3).map((i: any) => `${i.cantidad}x ${i.nombre}`).join(' · ');
  const moreItems = items.length > 3 ? ` +${items.length - 3} más` : '';
  const canReorder = !isActive && branchSlug && items.length > 0;

  return (
    <Card className={isActive ? 'border-primary/50 bg-primary/5' : ''}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">#{order.numero_pedido}</span>
            {branchName && <span className="text-xs text-muted-foreground">· {branchName}</span>}
          </div>
          <Badge variant={estado.variant}>{estado.label}</Badge>
        </div>

        <p className="text-xs text-muted-foreground">
          {format(new Date(order.created_at), "d MMM yyyy · HH:mm", { locale: es })}
        </p>

        <p className="text-sm text-muted-foreground truncate">
          {itemsSummary}{moreItems}
        </p>

        <Separator />

        <div className="flex items-center justify-between">
          <span className="font-bold text-sm">
            ${order.total?.toLocaleString('es-AR')}
          </span>
          <div className="flex gap-2">
            {canReorder && (
              <Button variant="outline" size="sm" onClick={onReorder}>
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Repetir
              </Button>
            )}
            {order.webapp_tracking_code && (
              <Button variant="outline" size="sm" onClick={onTrack}>
                <Eye className="w-3.5 h-3.5 mr-1" />
                {isActive ? 'Ver tracking' : 'Ver detalle'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
