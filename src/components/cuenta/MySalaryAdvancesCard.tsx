import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingDown } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface SalaryAdvance {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  reason: string | null;
  paid_at: string | null;
  created_at: string;
}

export default function MySalaryAdvancesCard() {
  const { user } = useAuth();
  
  // Query salary advances directly by user_id (V2 approach)
  const { data: advances, isLoading } = useQuery({
    queryKey: ['my-salary-advances-v2', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('salary_advances')
        .select('id, amount, status, payment_method, reason, paid_at, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.warn('Could not fetch salary advances:', error.message);
        return [];
      }
      return data as SalaryAdvance[];
    },
    enabled: !!user,
  });

  // Calculate totals
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  
  const thisMonthAdvances = advances?.filter(a => {
    const date = new Date(a.created_at);
    return date >= monthStart && date <= monthEnd;
  }) || [];

  const pendingTotal = advances?.reduce((acc, a) => 
    a.status === 'pending_transfer' ? acc + Number(a.amount) : acc, 0) || 0;
  
  const thisMonthTotal = thisMonthAdvances.reduce((acc, a) => 
    acc + Number(a.amount), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default">Pagado</Badge>;
      case 'pending_transfer':
        return <Badge variant="outline">Pendiente</Badge>;
      case 'transferred':
        return <Badge variant="secondary">Transferido</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Don't show card if no advances ever
  if (!advances || advances.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Mis Adelantos</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">Este mes</p>
            <p className="text-lg font-bold">{formatCurrency(thisMonthTotal)}</p>
          </div>
          {pendingTotal > 0 && (
            <div className="p-3 bg-accent/10 border border-accent/30 rounded-lg">
              <p className="text-xs text-muted-foreground">Pend. transferencia</p>
              <p className="text-lg font-bold">{formatCurrency(pendingTotal)}</p>
            </div>
          )}
        </div>

        {/* Recent advances */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
            <TrendingDown className="w-4 h-4" />
            Historial de adelantos
          </h4>
          <div className="space-y-1">
            {advances.slice(0, 5).map((advance) => (
              <div 
                key={advance.id} 
                className="flex items-center justify-between text-sm p-2 rounded hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-20">
                    {format(new Date(advance.created_at), "d MMM", { locale: es })}
                  </span>
                  <span className="font-medium">{formatCurrency(advance.amount)}</span>
                </div>
                {getStatusBadge(advance.status)}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
