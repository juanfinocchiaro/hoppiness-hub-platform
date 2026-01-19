import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Filter, 
  CalendarIcon, 
  Store, 
  Users, 
  Truck, 
  Bike, 
  ShoppingBag,
  Receipt,
  MessageCircle,
  Globe,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  useDashboardFilters, 
  SalesChannelFilter, 
  PeriodPreset,
  channelLabels,
  periodLabels 
} from '@/contexts/DashboardFilterContext';

const channelIcons: Record<SalesChannelFilter, React.ReactNode> = {
  all: <Store className="w-4 h-4" />,
  atencion_presencial: <Users className="w-4 h-4" />,
  pos_local: <Receipt className="w-4 h-4" />,
  whatsapp: <MessageCircle className="w-4 h-4" />,
  web_app: <Globe className="w-4 h-4" />,
  pedidos_ya: <Bike className="w-4 h-4" />,
  rappi: <Bike className="w-4 h-4" />,
  mercadopago_delivery: <Truck className="w-4 h-4" />,
  mas_delivery: <Truck className="w-4 h-4" />,
};

const channelOptions: SalesChannelFilter[] = [
  'all',
  'atencion_presencial',
  'pos_local',
  'whatsapp',
  'web_app',
  'pedidos_ya',
  'rappi',
  'mercadopago_delivery',
  'mas_delivery',
];

const periodOptions: PeriodPreset[] = [
  'today',
  'yesterday',
  'week',
  'month',
  'year',
  'custom',
];

export default function DashboardFilterBar() {
  const { 
    filters, 
    setChannel, 
    setPeriod, 
    setCustomRange,
    dateRange,
    isFiltered 
  } = useDashboardFilters();

  const handleResetFilters = () => {
    setChannel('all');
    setPeriod('today');
  };

  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="flex flex-wrap items-center gap-3 p-4">
        {/* Filter Icon & Label */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium hidden sm:inline">Filtros:</span>
        </div>

        {/* Channel Filter */}
        <Select 
          value={filters.channel} 
          onValueChange={(v) => setChannel(v as SalesChannelFilter)}
        >
          <SelectTrigger className="w-[200px] bg-background">
            <div className="flex items-center gap-2">
              {channelIcons[filters.channel]}
              <SelectValue placeholder="Canal de venta" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {channelOptions.map(channel => (
              <SelectItem key={channel} value={channel}>
                <div className="flex items-center gap-2">
                  {channelIcons[channel]}
                  <span>{channelLabels[channel]}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Period Filter */}
        <Select 
          value={filters.period} 
          onValueChange={(v) => setPeriod(v as PeriodPreset)}
        >
          <SelectTrigger className="w-[160px] bg-background">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              <SelectValue placeholder="Período" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map(period => (
              <SelectItem key={period} value={period}>
                {periodLabels[period]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Custom Date Range Picker */}
        {filters.period === 'custom' && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 bg-background">
                <CalendarIcon className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {format(dateRange.from, 'dd MMM', { locale: es })} - {format(dateRange.to, 'dd MMM', { locale: es })}
                </span>
                <span className="sm:hidden">
                  {format(dateRange.from, 'dd/MM')} - {format(dateRange.to, 'dd/MM')}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{ from: filters.customRange.from, to: filters.customRange.to }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setCustomRange({ from: range.from, to: range.to });
                  }
                }}
                locale={es}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        )}

        {/* Active Filter Indicator & Reset */}
        {isFiltered && (
          <div className="flex items-center gap-2 ml-auto">
            <Badge variant="secondary" className="gap-1">
              Filtro activo
            </Badge>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleResetFilters}
              className="h-8 px-2"
            >
              <X className="w-4 h-4 mr-1" />
              Limpiar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
