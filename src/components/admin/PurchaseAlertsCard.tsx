/**
 * PurchaseAlertsCard - Card para dashboard mostrando alertas de compras sin revisar
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PurchaseAlert {
  id: string;
  branch_id: string;
  alert_type: string;
  created_at: string;
  branch?: { name: string };
  mandatory_product?: { product_name: string };
}

export function PurchaseAlertsCard() {
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['purchase-alerts-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_purchase_alerts')
        .select(`
          id,
          branch_id,
          alert_type,
          created_at,
          branch:branches(name),
          mandatory_product:brand_mandatory_products(product_name)
        `)
        .is('seen_at', null)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as PurchaseAlert[];
    },
    staleTime: 60000, // 1 minuto
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Alertas de Compras
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No hay alertas pendientes de revisar
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Alertas de Compras
          </CardTitle>
          <Badge variant="destructive" className="text-xs">
            {alerts.length} sin revisar
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.slice(0, 3).map((alert) => (
          <div 
            key={alert.id}
            className="flex items-center justify-between text-sm py-1 border-b last:border-0"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{alert.branch?.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {alert.mandatory_product?.product_name} • {format(new Date(alert.created_at), "d MMM", { locale: es })}
              </p>
            </div>
            <Badge variant="outline" className="text-xs shrink-0">
              {alert.alert_type === 'backup_used' ? 'Backup' : 'Alerta'}
            </Badge>
          </div>
        ))}
        
        <Link to="/admin/abastecimiento/alertas">
          <Button variant="ghost" className="w-full mt-2" size="sm">
            Ver todas las alertas
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
