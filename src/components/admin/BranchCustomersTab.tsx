import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Search, Star, RefreshCw, AlertTriangle, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface BranchCustomersTabProps {
  branchId: string;
}

type CustomerSegment = 'all' | 'vip' | 'frequent' | 'at_risk' | 'new';

export default function BranchCustomersTab({ branchId }: BranchCustomersTabProps) {
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState<CustomerSegment>('all');

  const { data: customers, isLoading } = useQuery({
    queryKey: ['branch-customers', branchId, segment],
    queryFn: async () => {
      let query = supabase
        .from('customer_preferences')
        .select(`
          *,
          customer:customers(id, full_name, phone, email)
        `)
        .eq('branch_id', branchId)
        .order('total_spent', { ascending: false })
        .limit(50);

      // Filter by segment
      if (segment === 'vip') {
        query = query.gte('total_spent', 100000);
      } else if (segment === 'frequent') {
        query = query.gte('visit_count', 5);
      } else if (segment === 'new') {
        query = query.eq('visit_count', 1);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const filteredCustomers = customers?.filter((cp) => {
    if (!search) return true;
    const customer = cp.customer as any;
    const searchLower = search.toLowerCase();
    return (
      customer?.full_name?.toLowerCase().includes(searchLower) ||
      customer?.phone?.includes(search) ||
      customer?.email?.toLowerCase().includes(searchLower)
    );
  });

  const getSegmentBadge = (cp: any) => {
    if (cp.total_spent >= 100000) {
      return <Badge variant="default" className="bg-amber-500/10 text-amber-600">⭐ VIP</Badge>;
    }
    if (cp.visit_count >= 5) {
      return <Badge variant="secondary">🔄 Frecuente</Badge>;
    }
    if (cp.visit_count === 1) {
      return <Badge variant="outline">🆕 Nuevo</Badge>;
    }
    return null;
  };

  const getInitials = (name: string | null, phone: string) => {
    if (name) {
      return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return phone.slice(-2);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Clientes de esta sucursal ({filteredCustomers?.length || 0})
          </CardTitle>
          <div className="flex gap-2">
            <Select value={segment} onValueChange={(v) => setSegment(v as CustomerSegment)}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="vip">⭐ VIP</SelectItem>
                <SelectItem value="frequent">🔄 Frecuente</SelectItem>
                <SelectItem value="new">🆕 Nuevo</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 w-48"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : filteredCustomers?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay clientes registrados en esta sucursal</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCustomers?.map((cp) => {
              const customer = cp.customer as any;
              return (
                <div
                  key={cp.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {getInitials(customer?.full_name, customer?.phone || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {customer?.full_name || customer?.phone || 'Sin datos'}
                      </p>
                      {customer?.email && (
                        <p className="text-sm text-muted-foreground">{customer.email}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {getSegmentBadge(cp)}
                        <span className="text-xs text-muted-foreground">
                          {cp.visit_count} pedido{cp.visit_count !== 1 ? 's' : ''} · {formatCurrency(cp.total_spent || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      Último pedido:{' '}
                      {cp.last_order_at
                        ? formatDistanceToNow(new Date(cp.last_order_at), {
                            addSuffix: true,
                            locale: es,
                          })
                        : 'N/A'}
                    </p>
                    <Button variant="ghost" size="sm" className="mt-1">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Ver
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
