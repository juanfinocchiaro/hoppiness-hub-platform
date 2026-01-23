/**
 * Alertas de Compras
 * Muestra alertas cuando un local usa proveedor backup o no autorizado
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHelp } from '@/components/shared/PageHelp';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  AlertTriangle, 
  ShieldAlert, 
  XCircle, 
  CheckCircle,
  Eye,
  Search,
  Filter
} from 'lucide-react';

interface PurchaseAlert {
  id: string;
  branch_id: string;
  alert_type: 'backup_used' | 'unauthorized_supplier' | 'wrong_supplier';
  mandatory_product_id: string | null;
  supplier_used_id: string | null;
  details: Record<string, any> | null;
  seen_by: string | null;
  seen_at: string | null;
  created_at: string;
  branch?: { id: string; name: string };
  mandatory_product?: { id: string; product_name: string };
  supplier_used?: { id: string; name: string };
}

interface Branch {
  id: string;
  name: string;
}

const ALERT_TYPES = {
  backup_used: {
    label: 'Backup Usado',
    icon: AlertTriangle,
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    description: 'Se usó un proveedor de backup',
  },
  unauthorized_supplier: {
    label: 'Proveedor No Autorizado',
    icon: ShieldAlert,
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    description: 'Se intentó usar un proveedor no autorizado',
  },
  wrong_supplier: {
    label: 'Proveedor Incorrecto',
    icon: XCircle,
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    description: 'Se cargó factura con proveedor incorrecto',
  },
};

export default function PurchaseAlerts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('pending');

  // Queries
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['purchase-alerts', filterType, filterBranch, filterStatus],
    queryFn: async () => {
      let query = supabase
        .from('brand_purchase_alerts')
        .select(`
          *,
          branch:branches(id, name),
          mandatory_product:brand_mandatory_products(id, product_name),
          supplier_used:suppliers(id, name)
        `)
        .order('created_at', { ascending: false });

      if (filterType !== 'all') {
        query = query.eq('alert_type', filterType);
      }
      if (filterBranch !== 'all') {
        query = query.eq('branch_id', filterBranch);
      }
      if (filterStatus === 'pending') {
        query = query.is('seen_at', null);
      } else if (filterStatus === 'seen') {
        query = query.not('seen_at', 'is', null);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as PurchaseAlert[];
    },
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Branch[];
    },
  });

  // Mark as seen mutation
  const markSeenMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('brand_purchase_alerts')
        .update({ seen_by: user?.id, seen_at: new Date().toISOString() })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-alerts'] });
      toast.success('Alerta marcada como vista');
    },
    onError: () => toast.error('Error al marcar alerta'),
  });

  const markAllSeenMutation = useMutation({
    mutationFn: async () => {
      const pendingIds = alerts.filter(a => !a.seen_at).map(a => a.id);
      if (pendingIds.length === 0) return;
      
      const { error } = await supabase
        .from('brand_purchase_alerts')
        .update({ seen_by: user?.id, seen_at: new Date().toISOString() })
        .in('id', pendingIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-alerts'] });
      toast.success('Todas las alertas marcadas como vistas');
    },
    onError: () => toast.error('Error al marcar alertas'),
  });

  // Filter alerts by search
  const filteredAlerts = alerts.filter(alert => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      alert.branch?.name?.toLowerCase().includes(searchLower) ||
      alert.mandatory_product?.product_name?.toLowerCase().includes(searchLower) ||
      alert.supplier_used?.name?.toLowerCase().includes(searchLower)
    );
  });

  const pendingCount = alerts.filter(a => !a.seen_at).length;

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "d 'de' MMMM, HH:mm", { locale: es });
  };

  const renderAlertDetails = (alert: PurchaseAlert) => {
    if (!alert.details) return null;
    
    const details = alert.details;
    
    if (alert.alert_type === 'backup_used' && details.motivo) {
      return (
        <div className="mt-2 text-xs bg-muted/50 rounded p-2">
          <p><strong>Motivo:</strong> {details.motivo}</p>
          {details.stock_actual !== undefined && (
            <p>Stock actual: {details.stock_actual} | Consumo diario: {details.consumo_diario}</p>
          )}
          {details.dias_stock !== undefined && (
            <p>Días de stock: {details.dias_stock.toFixed(1)} | Próxima entrega en: {details.dias_hasta_entrega} días</p>
          )}
        </div>
      );
    }
    
    return null;
  };

  if (isLoading) {
    return <div className="p-6">Cargando alertas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alertas de Compras</h1>
          <p className="text-muted-foreground">
            Monitoreo de compras a proveedores no autorizados o backups
          </p>
        </div>
        {pendingCount > 0 && (
          <Button variant="outline" onClick={() => markAllSeenMutation.mutate()}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Marcar todas como vistas ({pendingCount})
          </Button>
        )}
      </div>

      <PageHelp
        id="purchase-alerts"
        description="Acá ves todas las alertas cuando un local compra productos obligatorios a un proveedor backup o intenta comprar a un proveedor no autorizado."
        features={[
          "Ver qué local compró qué producto a qué proveedor",
          "Filtrar por tipo de alerta, local o fecha",
          "Marcar alertas como revisadas",
          "Ver el motivo de uso del backup (ej: stock insuficiente)",
        ]}
        tips={[
          "Una alerta no significa que algo esté mal, puede ser una emergencia legítima",
          "Si un local usa backup muy seguido, quizás necesita ajustar sus pedidos al proveedor principal",
          "Las alertas sin revisar aparecen en el dashboard de Mi Marca",
        ]}
        defaultCollapsed
      />

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por local, producto o proveedor..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="backup_used">Backup usado</SelectItem>
                <SelectItem value="unauthorized_supplier">No autorizado</SelectItem>
                <SelectItem value="wrong_supplier">Proveedor incorrecto</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterBranch} onValueChange={setFilterBranch}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Local" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los locales</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="pending">Sin revisar</SelectItem>
                <SelectItem value="seen">Revisadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      {filteredAlerts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
            <p className="text-muted-foreground">
              {filterStatus === 'pending' 
                ? 'No hay alertas pendientes de revisar'
                : 'No se encontraron alertas con los filtros seleccionados'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => {
            const typeInfo = ALERT_TYPES[alert.alert_type];
            const Icon = typeInfo.icon;
            
            return (
              <Card key={alert.id} className={alert.seen_at ? 'opacity-60' : ''}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{alert.branch?.name}</Badge>
                          <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
                          {alert.seen_at && (
                            <Badge variant="secondary" className="text-xs">
                              <Eye className="w-3 h-3 mr-1" />
                              Vista
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm">
                          {alert.mandatory_product?.product_name && (
                            <span className="font-medium">{alert.mandatory_product.product_name}</span>
                          )}
                          {alert.supplier_used?.name && (
                            <span> → comprado a <strong>{alert.supplier_used.name}</strong></span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(alert.created_at)}
                        </p>
                        {renderAlertDetails(alert)}
                      </div>
                    </div>
                    {!alert.seen_at && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => markSeenMutation.mutate(alert.id)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Marcar vista
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
