import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package, ClipboardCheck, FileText, MessageSquare, ArrowRight } from 'lucide-react';

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  icon: React.ReactNode;
  message: string;
  link?: string;
  linkLabel?: string;
  count?: number;
}

interface DashboardAlertsProps {
  branchId: string;
  variant?: 'local' | 'brand';
}

export function DashboardAlerts({ branchId, variant = 'local' }: DashboardAlertsProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, [branchId]);

  async function fetchAlerts() {
    setLoading(true);
    const newAlerts: Alert[] = [];

    try {
      // 1. Check low stock ingredients
      const { data: lowStock } = await supabase
        .from('branch_ingredients')
        .select(`
          id,
          current_stock,
          min_stock_override,
          ingredient:ingredients(name, min_stock)
        `)
        .eq('branch_id', branchId);

      const lowStockCount = (lowStock || []).filter(item => {
        const minStock = item.min_stock_override ?? item.ingredient?.min_stock ?? 0;
        return item.current_stock < minStock;
      }).length;

      if (lowStockCount > 0) {
        newAlerts.push({
          id: 'low-stock',
          type: 'error',
          icon: <Package className="h-4 w-4" />,
          message: `${lowStockCount} ingrediente${lowStockCount > 1 ? 's' : ''} con stock bajo`,
          link: `/local/${branchId}/stock`,
          linkLabel: 'Ver',
          count: lowStockCount
        });
      }

      // 2. Check last inventory count
      const { data: lastCount } = await supabase
        .from('inventory_counts')
        .select('created_at')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (lastCount && lastCount.length > 0) {
        const lastCountDate = new Date(lastCount[0].created_at);
        const daysSince = Math.floor((Date.now() - lastCountDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSince > 30) {
          newAlerts.push({
            id: 'inventory-count',
            type: 'warning',
            icon: <ClipboardCheck className="h-4 w-4" />,
            message: `Hace ${daysSince} días del último conteo de inventario`,
            link: `/local/${branchId}/stock/conteo`,
            linkLabel: 'Hacer conteo'
          });
        }
      } else {
        // No inventory count ever done
        newAlerts.push({
          id: 'inventory-count',
          type: 'warning',
          icon: <ClipboardCheck className="h-4 w-4" />,
          message: 'Nunca se hizo conteo de inventario',
          link: `/local/${branchId}/stock/conteo`,
          linkLabel: 'Hacer conteo'
        });
      }

      // 3. Check orders without invoice (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { count: uninvoicedCount } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('branch_id', branchId)
        .eq('status', 'delivered')
        .is('invoice_id', null)
        .gte('created_at', weekAgo.toISOString());

      if (uninvoicedCount && uninvoicedCount > 5) {
        newAlerts.push({
          id: 'uninvoiced',
          type: 'info',
          icon: <FileText className="h-4 w-4" />,
          message: `${uninvoicedCount} pedidos sin facturar esta semana`,
          link: `/local/${branchId}/finanzas/facturas`,
          linkLabel: 'Ver'
        });
      }

      // 4. Check unread contact messages (only for brand panel)
      if (variant === 'brand') {
        const { count: unreadMessages } = await supabase
          .from('contact_messages')
          .select('id', { count: 'exact', head: true })
          .is('read_at', null);

        if (unreadMessages && unreadMessages > 0) {
          newAlerts.push({
            id: 'messages',
            type: 'info',
            icon: <MessageSquare className="h-4 w-4" />,
            message: `${unreadMessages} mensaje${unreadMessages > 1 ? 's' : ''} de contacto sin leer`,
            link: '/admin/mensajes',
            linkLabel: 'Ver'
          });
        }
      }

      setAlerts(newAlerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return null;
  }

  if (alerts.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Alertas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map(alert => (
          <div 
            key={alert.id} 
            className={`flex items-center justify-between p-2 rounded-lg ${
              alert.type === 'error' ? 'bg-destructive/10' :
              alert.type === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30' :
              'bg-blue-50 dark:bg-blue-900/20'
            }`}
          >
            <div className="flex items-center gap-2">
              <Badge 
                variant={alert.type === 'error' ? 'destructive' : 'outline'}
                className={`p-1 ${
                  alert.type === 'error' ? '' :
                  alert.type === 'warning' ? 'border-amber-500 text-amber-700' :
                  'border-blue-500 text-blue-700'
                }`}
              >
                {alert.icon}
              </Badge>
              <span className="text-sm">{alert.message}</span>
            </div>
            {alert.link && (
              <Link to={alert.link}>
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  {alert.linkLabel}
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Brand-level alerts component
interface BrandAlertsProps {
  branches: Array<{ id: string; name: string }>;
}

export function BrandAlerts({ branches }: BrandAlertsProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, [branches]);

  async function fetchAlerts() {
    if (branches.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const newAlerts: Alert[] = [];

    try {
      const branchIds = branches.map(b => b.id);

      // 1. Check low stock per branch
      const { data: allStock } = await supabase
        .from('branch_ingredients')
        .select(`
          branch_id,
          current_stock,
          min_stock_override,
          ingredient:ingredients(min_stock)
        `)
        .in('branch_id', branchIds);

      const stockByBranch = new Map<string, number>();
      (allStock || []).forEach(item => {
        const minStock = item.min_stock_override ?? item.ingredient?.min_stock ?? 0;
        if (item.current_stock < minStock) {
          stockByBranch.set(item.branch_id, (stockByBranch.get(item.branch_id) || 0) + 1);
        }
      });

      stockByBranch.forEach((count, branchId) => {
        const branch = branches.find(b => b.id === branchId);
        if (count > 0 && branch) {
          newAlerts.push({
            id: `stock-${branchId}`,
            type: 'error',
            icon: <Package className="h-4 w-4" />,
            message: `${branch.name}: ${count} ingrediente${count > 1 ? 's' : ''} con stock crítico`,
            link: `/local/${branchId}/stock`,
            linkLabel: 'Ver'
          });
        }
      });

      // 2. Check last inventory counts per branch
      const { data: lastCounts } = await supabase
        .from('inventory_counts')
        .select('branch_id, created_at')
        .in('branch_id', branchIds)
        .order('created_at', { ascending: false });

      const countByBranch = new Map<string, Date>();
      (lastCounts || []).forEach(item => {
        if (!countByBranch.has(item.branch_id)) {
          countByBranch.set(item.branch_id, new Date(item.created_at));
        }
      });

      branches.forEach(branch => {
        const lastCount = countByBranch.get(branch.id);
        if (lastCount) {
          const daysSince = Math.floor((Date.now() - lastCount.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSince > 30) {
            newAlerts.push({
              id: `count-${branch.id}`,
              type: 'warning',
              icon: <ClipboardCheck className="h-4 w-4" />,
              message: `${branch.name}: Sin conteo hace ${daysSince} días`,
              link: `/local/${branch.id}/stock/conteo`,
              linkLabel: 'Ver'
            });
          }
        }
      });

      // 3. Check unread contact messages
      const { count: unreadMessages } = await supabase
        .from('contact_messages')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null);

      if (unreadMessages && unreadMessages > 0) {
        newAlerts.push({
          id: 'messages',
          type: 'info',
          icon: <MessageSquare className="h-4 w-4" />,
          message: `${unreadMessages} mensaje${unreadMessages > 1 ? 's' : ''} de contacto sin leer`,
          link: '/admin/mensajes',
          linkLabel: 'Ver'
        });
      }

      setAlerts(newAlerts);
    } catch (error) {
      console.error('Error fetching brand alerts:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading || alerts.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Alertas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-64 overflow-y-auto">
        {alerts.map(alert => (
          <div 
            key={alert.id} 
            className={`flex items-center justify-between p-2 rounded-lg ${
              alert.type === 'error' ? 'bg-destructive/10' :
              alert.type === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30' :
              'bg-blue-50 dark:bg-blue-900/20'
            }`}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Badge 
                variant={alert.type === 'error' ? 'destructive' : 'outline'}
                className={`p-1 shrink-0 ${
                  alert.type === 'error' ? '' :
                  alert.type === 'warning' ? 'border-amber-500 text-amber-700' :
                  'border-blue-500 text-blue-700'
                }`}
              >
                {alert.icon}
              </Badge>
              <span className="text-sm truncate">{alert.message}</span>
            </div>
            {alert.link && (
              <Link to={alert.link}>
                <Button variant="ghost" size="sm" className="gap-1 text-xs shrink-0">
                  {alert.linkLabel}
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
