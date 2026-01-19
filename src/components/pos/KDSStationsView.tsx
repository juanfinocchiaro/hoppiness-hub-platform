import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChefHat,
  Timer,
  Volume2,
  VolumeX,
  RefreshCw,
  CheckCircle2,
  Flame,
  Sandwich,
  UtensilsCrossed,
  Package
} from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  notes: string | null;
  product: {
    id: string;
    name: string;
  };
  order: {
    id: string;
    caller_number: number | null;
    customer_name: string;
    order_type: string;
    created_at: string;
    status: string;
  };
  station_status?: string;
}

interface Station {
  id: string;
  name: string;
  station_type: string;
  color: string;
  display_order: number;
  is_active: boolean;
}

interface KDSStationsViewProps {
  branch: Branch;
}

const STATION_ICONS: Record<string, React.ReactNode> = {
  armado: <Sandwich className="w-5 h-5" />,
  plancha: <Flame className="w-5 h-5" />,
  freidora: <UtensilsCrossed className="w-5 h-5" />,
  ensamblado: <ChefHat className="w-5 h-5" />,
  entrega: <Package className="w-5 h-5" />,
};

export default function KDSStationsView({ branch }: KDSStationsViewProps) {
  const [stations, setStations] = useState<Station[]>([]);
  const [itemsByStation, setItemsByStation] = useState<Map<string, OrderItem[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchStations = async () => {
    const { data, error } = await supabase
      .from('kds_stations')
      .select('*')
      .eq('branch_id', branch.id)
      .eq('is_active', true)
      .order('display_order');

    if (error) {
      console.error('Error fetching stations:', error);
      return;
    }

    setStations(data || []);
  };

  const fetchOrderItems = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch active orders with items
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        caller_number,
        customer_name,
        order_type,
        created_at,
        status,
        order_items(
          id,
          order_id,
          product_id,
          quantity,
          notes,
          products(id, name)
        )
      `)
      .eq('branch_id', branch.id)
      .in('status', ['confirmed', 'preparing'])
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: true });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return;
    }

    // Fetch station progress for all items
    const allItemIds = orders?.flatMap(o => o.order_items?.map((i: any) => i.id) || []) || [];
    
    let stationProgress: any[] = [];
    if (allItemIds.length > 0) {
      const { data: progress } = await supabase
        .from('order_item_stations')
        .select('*')
        .in('order_item_id', allItemIds);
      stationProgress = progress || [];
    }

    // Build map of items by station
    const stationMap = new Map<string, OrderItem[]>();
    stations.forEach(s => stationMap.set(s.station_type, []));

    orders?.forEach(order => {
      order.order_items?.forEach((item: any) => {
        // For now, send all items to all active stations (can be refined with product_station_assignments later)
        stations.forEach(station => {
          const progress = stationProgress.find(
            p => p.order_item_id === item.id && p.station_type === station.station_type
          );
          
          // Only show if not done at this station
          if (!progress || progress.status !== 'done') {
            const existingItems = stationMap.get(station.station_type) || [];
            existingItems.push({
              ...item,
              product: item.products,
              order: {
                id: order.id,
                caller_number: order.caller_number,
                customer_name: order.customer_name,
                order_type: order.order_type,
                created_at: order.created_at,
                status: order.status,
              },
              station_status: progress?.status || 'pending',
            });
            stationMap.set(station.station_type, existingItems);
          }
        });
      });
    });

    setItemsByStation(stationMap);
    setLoading(false);
  };

  useEffect(() => {
    fetchStations();
  }, [branch.id]);

  useEffect(() => {
    if (stations.length > 0) {
      fetchOrderItems();

      // Set up realtime
      const channel = supabase
        .channel(`kds-stations-${branch.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `branch_id=eq.${branch.id}` }, () => {
          if (soundEnabled) playNotificationSound();
          fetchOrderItems();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'order_item_stations' }, () => {
          fetchOrderItems();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [stations, branch.id, soundEnabled]);

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  const markItemDone = async (itemId: string, stationType: string) => {
    const { error } = await supabase
      .from('order_item_stations')
      .upsert({
        order_item_id: itemId,
        station_type: stationType,
        status: 'done',
        completed_at: new Date().toISOString(),
      }, { onConflict: 'order_item_id,station_type' });

    if (error) {
      toast.error('Error al marcar item');
      return;
    }

    toast.success('Item completado');
    fetchOrderItems();
  };

  const getTimeSinceOrder = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h${minutes % 60}m`;
  };

  const getTimeColorClass = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 10) return 'text-green-500';
    if (minutes < 20) return 'text-yellow-500';
    return 'text-red-500';
  };

  const totalItems = Array.from(itemsByStation.values()).reduce((sum, items) => sum + items.length, 0);

  if (loading) {
    return (
      <div className="h-[calc(100vh-120px)] -m-6 p-4 bg-sidebar">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 h-full">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-12 w-full bg-sidebar-accent" />
              <Skeleton className="h-32 w-full bg-sidebar-accent" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] -m-6 bg-sidebar text-sidebar-foreground flex flex-col">
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVxTu+/11rpWLx9Ik8bZx31YVJ/p+uC9YUA7aL/v6K5jQQAQaKr12r9xXHCf6vfbpF5DIluX2+rXrl5Lb7T16MFpUEMxYKbt5bpmUV+C0fDhtmNJMS9mtPLkuGpWh8/v376+//7" type="audio/wav" />
      </audio>

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Cocina por Estaciones - {branch.name}</h1>
            <p className="text-sidebar-foreground/60 text-sm">Vista multi-estación</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchOrderItems()}
            className="border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`border-sidebar-border ${soundEnabled ? 'text-green-500' : 'text-sidebar-foreground/50'} hover:bg-sidebar-accent`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          <Badge className="bg-accent text-accent-foreground px-3 py-1">
            {totalItems} items activos
          </Badge>
        </div>
      </div>

      {/* Stations Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 p-4 overflow-hidden">
        {stations.map(station => {
          const items = itemsByStation.get(station.station_type) || [];

          return (
            <div key={station.id} className="flex flex-col h-full">
              <div 
                className="p-3 rounded-t-lg flex items-center gap-2 justify-center"
                style={{ backgroundColor: station.color + '30', borderColor: station.color, borderWidth: 2 }}
              >
                {STATION_ICONS[station.station_type]}
                <h2 className="font-bold text-center">
                  {station.name} ({items.length})
                </h2>
              </div>

              <ScrollArea className="flex-1 bg-sidebar-accent rounded-b-lg border border-t-0 border-sidebar-border">
                <div className="p-2 space-y-2">
                  {items.length === 0 ? (
                    <p className="text-center text-sidebar-foreground/50 py-8 text-sm">Vacío</p>
                  ) : (
                    items.map((item, idx) => (
                      <Card 
                        key={`${item.id}-${idx}`} 
                        className="border-l-4"
                        style={{ borderLeftColor: station.color }}
                      >
                        <CardHeader className="py-2 px-3">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">
                              #{item.order.caller_number || item.order.id.slice(-4)}
                            </Badge>
                            <div className={`flex items-center gap-1 ${getTimeColorClass(item.order.created_at)}`}>
                              <Timer className="w-3 h-3" />
                              <span className="font-mono text-xs font-bold">
                                {getTimeSinceOrder(item.order.created_at)}
                              </span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="py-2 px-3">
                          <div className="flex items-start gap-2 text-sm mb-2">
                            <span className="font-bold text-accent">{item.quantity}x</span>
                            <span className="flex-1 font-medium">{item.product?.name}</span>
                          </div>
                          {item.notes && (
                            <p className="text-xs text-muted-foreground italic bg-muted/50 p-1 rounded mb-2">
                              📝 {item.notes}
                            </p>
                          )}
                          <Button
                            className="w-full"
                            size="sm"
                            variant="outline"
                            onClick={() => markItemDone(item.id, station.station_type)}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Listo
                          </Button>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>
    </div>
  );
}
