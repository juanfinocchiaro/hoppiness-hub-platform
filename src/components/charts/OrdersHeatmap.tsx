import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CalendarDays, Filter } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface OrdersHeatmapProps {
  branchId?: string; // If not provided, shows all branches
  title?: string;
  description?: string;
  daysToShow?: number;
  showBranchSelector?: boolean; // Show multi-select for branches
  availableBranches?: { id: string; name: string }[]; // Available branches for selector
}

interface HeatmapCell {
  day: string;
  dayLabel: string;
  timeSlot: string;
  count: number;
}

// Time slots every hour (24 slots)
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  return `${i.toString().padStart(2, '0')}:00`;
});

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function OrdersHeatmap({ 
  branchId, 
  title = 'Pedidos por horario (canal propio)',
  description = 'Distribución de pedidos en intervalos de 30 minutos',
  daysToShow = 7,
  showBranchSelector = false,
  availableBranches = []
}: OrdersHeatmapProps) {
  const [data, setData] = useState<Map<string, number>>(new Map());
  const [days, setDays] = useState<{ date: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxCount, setMaxCount] = useState(0);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  // Initialize selected branches
  useEffect(() => {
    if (showBranchSelector && availableBranches.length > 0 && selectedBranches.length === 0) {
      setSelectedBranches(availableBranches.map(b => b.id));
    }
  }, [availableBranches, showBranchSelector]);

  const toggleBranch = (id: string) => {
    setSelectedBranches(prev => 
      prev.includes(id) 
        ? prev.filter(b => b !== id) 
        : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedBranches.length === availableBranches.length) {
      setSelectedBranches([]);
    } else {
      setSelectedBranches(availableBranches.map(b => b.id));
    }
  };

  useEffect(() => {
    async function fetchOrders() {
      // Don't fetch if branch selector is on but no branches selected
      if (showBranchSelector && selectedBranches.length === 0) {
        setData(new Map());
        setMaxCount(0);
        setLoading(false);
        return;
      }

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
        .select('created_at, sales_channel, branch_id')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .in('status', ['delivered', 'ready', 'preparing', 'confirmed', 'pending']);

      // Apply branch filter
      if (branchId) {
        query = query.eq('branch_id', branchId);
      } else if (showBranchSelector && selectedBranches.length > 0) {
        query = query.in('branch_id', selectedBranches);
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
        // Use local time consistently for both date and time
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const hours = date.getHours().toString().padStart(2, '0');
        const timeSlot = `${hours}:00`; // Round to the hour
        
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
  }, [branchId, daysToShow, showBranchSelector, selectedBranches]);

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

  // Show all time slots in ascending order (00:00 at top, 23:00 at bottom)
  const relevantTimeSlots = TIME_SLOTS;

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

  const getSelectedBranchesLabel = () => {
    if (selectedBranches.length === 0) return 'Ninguna sucursal';
    if (selectedBranches.length === availableBranches.length) return 'Todas las sucursales';
    if (selectedBranches.length === 1) {
      return availableBranches.find(b => b.id === selectedBranches[0])?.name || '1 sucursal';
    }
    return `${selectedBranches.length} sucursales`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          
          {showBranchSelector && availableBranches.length > 0 && (
            <Collapsible open={filterOpen} onOpenChange={setFilterOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md border bg-background hover:bg-muted">
                  <Filter className="w-4 h-4" />
                  <span>{getSelectedBranchesLabel()}</span>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="absolute right-0 mt-2 z-10 bg-card border rounded-lg shadow-lg p-4 min-w-[200px]">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Checkbox 
                      id="all-branches"
                      checked={selectedBranches.length === availableBranches.length}
                      onCheckedChange={toggleAll}
                    />
                    <Label htmlFor="all-branches" className="font-medium cursor-pointer">
                      Todas las sucursales
                    </Label>
                  </div>
                  {availableBranches.map(branch => (
                    <div key={branch.id} className="flex items-center gap-2">
                      <Checkbox 
                        id={`branch-${branch.id}`}
                        checked={selectedBranches.includes(branch.id)}
                        onCheckedChange={() => toggleBranch(branch.id)}
                      />
                      <Label htmlFor={`branch-${branch.id}`} className="cursor-pointer">
                        {branch.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
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
