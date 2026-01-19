import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays } from 'lucide-react';

interface OrdersHeatmapProps {
  branchId?: string; // If not provided, shows all branches
  title?: string;
  description?: string;
  daysToShow?: number;
}

interface HeatmapCell {
  day: string;
  dayLabel: string;
  timeSlot: string;
  count: number;
}

const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = i % 2 === 0 ? '00' : '30';
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
});

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function OrdersHeatmap({ 
  branchId, 
  title = 'Pedidos por horario (canal propio)',
  description = 'Distribución de pedidos en intervalos de 30 minutos',
  daysToShow = 7 
}: OrdersHeatmapProps) {
  const [data, setData] = useState<Map<string, number>>(new Map());
  const [days, setDays] = useState<{ date: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxCount, setMaxCount] = useState(0);

  useEffect(() => {
    async function fetchOrders() {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysToShow + 1);
      startDate.setHours(0, 0, 0, 0);

      // Generate days array
      const daysArray: { date: string; label: string }[] = [];
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const dayName = DAY_NAMES[d.getDay()];
        const dayNum = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        daysArray.push({
          date: dateStr,
          label: `${dayName} ${dayNum}-${month}`,
        });
      }
      setDays(daysArray);

      // Fetch orders
      let query = supabase
        .from('orders')
        .select('created_at, sales_channel')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .in('status', ['delivered', 'ready', 'preparing', 'confirmed', 'pending']);

      if (branchId) {
        query = query.eq('branch_id', branchId);
      }

      // Filter by "canal propio" (own channels, not aggregators)
      query = query.in('sales_channel', ['atencion_presencial', 'whatsapp', 'web_app', 'pos_local']);

      const { data: orders, error } = await query;

      if (error) {
        console.error('Error fetching orders for heatmap:', error);
        setLoading(false);
        return;
      }

      // Process orders into heatmap data
      const heatmapData = new Map<string, number>();
      let max = 0;

      orders?.forEach(order => {
        const date = new Date(order.created_at);
        const dateStr = date.toISOString().split('T')[0];
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes() < 30 ? '00' : '30';
        const timeSlot = `${hours}:${minutes}`;
        
        const key = `${dateStr}-${timeSlot}`;
        const count = (heatmapData.get(key) || 0) + 1;
        heatmapData.set(key, count);
        if (count > max) max = count;
      });

      setData(heatmapData);
      setMaxCount(max);
      setLoading(false);
    }

    fetchOrders();
  }, [branchId, daysToShow]);

  const getColor = (count: number): string => {
    if (count === 0) return 'bg-muted/30';
    if (maxCount === 0) return 'bg-muted/30';
    
    const intensity = count / maxCount;
    
    if (intensity <= 0.2) return 'bg-red-100 dark:bg-red-950/50';
    if (intensity <= 0.4) return 'bg-red-200 dark:bg-red-900/60';
    if (intensity <= 0.6) return 'bg-red-300 dark:bg-red-800/70';
    if (intensity <= 0.8) return 'bg-red-400 dark:bg-red-700/80';
    return 'bg-red-500 dark:bg-red-600';
  };

  const getTextColor = (count: number): string => {
    if (count === 0) return 'text-transparent';
    if (maxCount === 0) return 'text-transparent';
    
    const intensity = count / maxCount;
    if (intensity > 0.5) return 'text-white';
    return 'text-red-800 dark:text-red-200';
  };

  // Filter time slots to show only relevant hours (06:00 - 00:00)
  const relevantTimeSlots = TIME_SLOTS.filter(slot => {
    const hour = parseInt(slot.split(':')[0]);
    return hour >= 6 || hour === 0;
  }).reverse(); // Reverse to show latest hours at top

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Header with days */}
            <div className="flex mb-1">
              <div className="w-16 shrink-0 text-xs text-muted-foreground pr-2 text-right">
                Hora
              </div>
              {days.map(day => (
                <div 
                  key={day.date} 
                  className="flex-1 text-xs text-center text-muted-foreground font-medium px-0.5 truncate"
                  title={day.label}
                >
                  <span className="hidden sm:inline">{day.label}</span>
                  <span className="sm:hidden">{day.label.split(' ')[1]}</span>
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            <div className="space-y-0.5">
              {relevantTimeSlots.map(timeSlot => (
                <div key={timeSlot} className="flex items-center">
                  <div className="w-16 shrink-0 text-xs text-muted-foreground pr-2 text-right">
                    {timeSlot}
                  </div>
                  {days.map(day => {
                    const key = `${day.date}-${timeSlot}`;
                    const count = data.get(key) || 0;
                    
                    return (
                      <div 
                        key={key}
                        className={`flex-1 h-6 mx-0.5 rounded-sm flex items-center justify-center text-xs font-medium transition-colors ${getColor(count)} ${getTextColor(count)}`}
                        title={`${day.label} ${timeSlot}: ${count} pedidos`}
                      >
                        {count > 0 ? count : ''}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Footer with day labels */}
            <div className="flex mt-2 pt-2 border-t">
              <div className="w-16 shrink-0" />
              {days.map(day => (
                <div 
                  key={day.date} 
                  className="flex-1 text-xs text-center text-muted-foreground"
                >
                  <span className="writing-mode-vertical transform -rotate-45 inline-block origin-center">
                    {day.label.split(' ')[1]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
