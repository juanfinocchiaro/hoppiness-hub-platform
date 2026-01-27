/**
 * BrandAlertsCard - Tarjeta de alertas para el dashboard de Mi Marca
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, MessageSquare, Package, Users, ChevronRight, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AlertItem {
  id: string;
  type: 'contact' | 'stock' | 'purchase' | 'communication';
  title: string;
  description: string;
  date: Date;
  link?: string;
  priority: 'low' | 'medium' | 'high';
}

export function BrandAlertsCard() {
  // Fetch unread contact messages
  const { data: contactMessages } = useQuery({
    queryKey: ['unread-contact-messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('id, name, subject, employment_position, order_issue, created_at')
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    staleTime: 30000,
  });

  // Fetch unseen purchase alerts
  const { data: purchaseAlerts } = useQuery({
    queryKey: ['unseen-purchase-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_purchase_alerts')
        .select('id, alert_type, branch_id, created_at, branches:branch_id(name)')
        .is('seen_at', null)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    staleTime: 30000,
  });

  // Build alert items - detect category by which fields are filled
  const alerts: AlertItem[] = [
    ...(contactMessages || []).map((msg): AlertItem => {
      const isEmployment = !!msg.employment_position;
      const isOrderIssue = !!msg.order_issue;
      const isFranchise = msg.subject?.toLowerCase().includes('franquicia');
      
      return {
        id: `contact-${msg.id}`,
        type: 'contact',
        title: `Mensaje de ${msg.name}`,
        description: isEmployment ? 'Solicitud de empleo' : 
                     isFranchise ? 'Consulta de franquicia' :
                     isOrderIssue ? 'Problema con pedido' :
                     msg.subject || 'Consulta general',
        date: new Date(msg.created_at),
        link: '/admin/mensajes',
        priority: isFranchise ? 'high' : 'medium',
      };
    }),
    ...(purchaseAlerts || []).map((alert): AlertItem => ({
      id: `purchase-${alert.id}`,
      type: 'purchase',
      title: alert.alert_type === 'backup_supplier' ? 'Proveedor alternativo usado' :
             alert.alert_type === 'ingredient_conversion' ? 'Conversión de ingrediente' :
             'Alerta de compras',
      description: `en ${(alert.branches as any)?.name || 'sucursal'}`,
      date: new Date(alert.created_at),
      link: '/admin/alertas-compras',
      priority: 'medium',
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 6);

  const getIcon = (type: AlertItem['type']) => {
    switch (type) {
      case 'contact': return <MessageSquare className="w-4 h-4" />;
      case 'stock': return <Package className="w-4 h-4" />;
      case 'purchase': return <AlertTriangle className="w-4 h-4" />;
      case 'communication': return <Users className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: AlertItem['priority']) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Alertas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay alertas pendientes 🎉
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Alertas
            <Badge variant="destructive" className="ml-2">
              {alerts.length}
            </Badge>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                {getIcon(alert.type)}
              </div>
              <div>
                <p className="text-sm font-medium">{alert.title}</p>
                <p className="text-xs text-muted-foreground">
                  {alert.description} · {format(alert.date, 'd MMM', { locale: es })}
                </p>
              </div>
            </div>
            {alert.link && (
              <Link to={alert.link}>
                <Button variant="ghost" size="icon">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
