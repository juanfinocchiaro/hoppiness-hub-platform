import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, ChevronRight } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

export default function CuentaPedidos() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  // Fetch all user orders
  const { data: orders, isLoading } = useQuery({
    queryKey: ['user-orders-all', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          total,
          created_at,
          order_type,
          tracking_token,
          branches:branch_id (name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      confirmed: 'Confirmado',
      preparing: 'Preparando',
      ready: 'Listo',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      confirmed: 'secondary',
      preparing: 'secondary',
      ready: 'default',
      delivered: 'outline',
      cancelled: 'destructive',
    };
    return variants[status] || 'outline';
  };

  const getOrderTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      delivery: 'Delivery',
      takeaway: 'Retiro',
      dine_in: 'En local',
    };
    return labels[type] || type;
  };

  const filteredOrders = orders?.filter(order => 
    order.id.toLowerCase().includes(search.toLowerCase()) ||
    (order.branches as any)?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <PublicHeader />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Link to="/cuenta">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Mis Pedidos</h1>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por #pedido o sucursal..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Orders List */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-16 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredOrders?.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {search ? 'No se encontraron pedidos' : 'Aún no tenés pedidos'}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredOrders?.map(order => (
                <Link 
                  key={order.id} 
                  to={order.status === 'delivered' || order.status === 'cancelled' 
                    ? `/cuenta/pedidos/${order.id}` 
                    : `/pedido/${order.tracking_token}`
                  }
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium">
                              #{order.id.slice(0, 8).toUpperCase()}
                            </span>
                            <Badge variant={getStatusVariant(order.status)}>
                              {getStatusLabel(order.status)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {(order.branches as any)?.name} · {getOrderTypeLabel(order.order_type)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(order.created_at), "d 'de' MMMM, HH:mm", { locale: es })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">{formatCurrency(order.total)}</span>
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      
      <PublicFooter />
    </div>
  );
}
