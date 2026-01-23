import { useAuth } from '@/hooks/useAuth';
import { usePermissionsV2 } from '@/hooks/usePermissionsV2';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Banknote, TrendingUp, TrendingDown, CheckCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface CashClosing {
  shift_id: string;
  branch_id: string;
  expected_amount: number;
  actual_amount: number;
  discrepancy: number;
  shift_date: string;
  notes: string | null;
  branch?: { name: string };
}

export default function MyCashClosingsCard() {
  const { user } = useAuth();
  const { localRole } = usePermissionsV2();
  
  // Only show for cajero or encargado roles
  const isCashier = localRole === 'cajero' || localRole === 'encargado';
  
  // Get cash closing history for current user
  const { data: closings, isLoading } = useQuery({
    queryKey: ['my-cash-closings', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('cashier_discrepancy_history')
        .select(`
          shift_id,
          branch_id,
          expected_amount,
          actual_amount,
          discrepancy,
          shift_date,
          notes,
          branches:branch_id(name)
        `)
        .eq('user_id', user.id)
        .order('shift_date', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as unknown as CashClosing[];
    },
    enabled: !!user && isCashier,
  });

  // Calculate stats
  const stats = closings?.reduce((acc, c) => {
    acc.totalShifts++;
    if (c.discrepancy === 0) acc.perfectShifts++;
    acc.totalDiscrepancy += c.discrepancy;
    if (c.discrepancy > 0) acc.totalSurplus += c.discrepancy;
    if (c.discrepancy < 0) acc.totalShortage += Math.abs(c.discrepancy);
    return acc;
  }, {
    totalShifts: 0,
    perfectShifts: 0,
    totalDiscrepancy: 0,
    totalSurplus: 0,
    totalShortage: 0,
  });

  const precisionRate = stats && stats.totalShifts > 0 
    ? Math.round((stats.perfectShifts / stats.totalShifts) * 100) 
    : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Don't show if not a cashier role
  if (!isCashier) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Don't show if no closings
  if (!closings || closings.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Banknote className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Mis Cierres de Caja</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 bg-muted rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Cierres</p>
            <p className="text-lg font-bold">{stats?.totalShifts || 0}</p>
          </div>
          <div className="p-2 bg-green-50 border border-green-200 rounded-lg text-center">
            <p className="text-xs text-green-700">Precisión</p>
            <p className="text-lg font-bold text-green-700">{precisionRate}%</p>
          </div>
          <div className={`p-2 rounded-lg text-center ${
            (stats?.totalDiscrepancy || 0) >= 0 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <p className={`text-xs ${(stats?.totalDiscrepancy || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              Balance
            </p>
            <p className={`text-lg font-bold ${(stats?.totalDiscrepancy || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatCurrency(stats?.totalDiscrepancy || 0)}
            </p>
          </div>
        </div>

        {/* Recent closings */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            Últimos cierres
          </h4>
          <div className="space-y-1">
            {closings.slice(0, 5).map((closing) => {
              const isPositive = closing.discrepancy > 0;
              const isNegative = closing.discrepancy < 0;
              const isPerfect = closing.discrepancy === 0;

              return (
                <div 
                  key={closing.shift_id} 
                  className="flex items-center justify-between text-sm p-2 rounded hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-20">
                      {format(new Date(closing.shift_date), "d MMM", { locale: es })}
                    </span>
                    <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                      {(closing.branch as any)?.name || ''}
                    </span>
                  </div>
                  
                  {isPerfect ? (
                    <Badge className="bg-green-500 gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Exacto
                    </Badge>
                  ) : isPositive ? (
                    <Badge variant="outline" className="border-green-500 text-green-600 gap-1">
                      <TrendingUp className="w-3 h-3" />
                      +{formatCurrency(closing.discrepancy)}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-red-500 text-red-600 gap-1">
                      <TrendingDown className="w-3 h-3" />
                      {formatCurrency(closing.discrepancy)}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
