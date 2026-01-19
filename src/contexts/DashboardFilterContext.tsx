import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from 'date-fns';

// Canales de venta unificados: Delivery, TakeAway, Mostrador, Rappi, PedidosYa, MP Delivery
export type SalesChannelFilter = 
  | 'all' 
  | 'delivery' 
  | 'takeaway'
  | 'mostrador' 
  | 'rappi' 
  | 'pedidos_ya' 
  | 'mercadopago_delivery';

export type PeriodPreset = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface DashboardFilters {
  channel: SalesChannelFilter;
  period: PeriodPreset;
  customRange: DateRange;
}

export interface DashboardFilterContextValue {
  filters: DashboardFilters;
  setChannel: (channel: SalesChannelFilter) => void;
  setPeriod: (period: PeriodPreset) => void;
  setCustomRange: (range: DateRange) => void;
  dateRange: DateRange;
  channelLabel: string;
  periodLabel: string;
  isFiltered: boolean;
}

const channelLabels: Record<SalesChannelFilter, string> = {
  all: 'Todos los canales',
  delivery: 'Delivery',
  takeaway: 'Take Away',
  mostrador: 'Mostrador',
  rappi: 'Rappi',
  pedidos_ya: 'PedidosYa',
  mercadopago_delivery: 'MP Delivery',
};

const periodLabels: Record<PeriodPreset, string> = {
  today: 'Hoy',
  yesterday: 'Ayer',
  week: 'Esta Semana',
  month: 'Este Mes',
  year: 'Este Año',
  custom: 'Personalizado',
};

const DashboardFilterContext = createContext<DashboardFilterContextValue | null>(null);

export function DashboardFilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<DashboardFilters>({
    channel: 'all',
    period: 'today',
    customRange: {
      from: subDays(new Date(), 7),
      to: new Date(),
    },
  });

  const setChannel = (channel: SalesChannelFilter) => {
    setFilters(prev => ({ ...prev, channel }));
  };

  const setPeriod = (period: PeriodPreset) => {
    setFilters(prev => ({ ...prev, period }));
  };

  const setCustomRange = (range: DateRange) => {
    setFilters(prev => ({ ...prev, customRange: range, period: 'custom' }));
  };

  const dateRange = useMemo((): DateRange => {
    const now = new Date();

    switch (filters.period) {
      case 'today':
        return { from: startOfDay(now), to: endOfDay(now) };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
      case 'week':
        return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'month':
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case 'year':
        return { from: startOfYear(now), to: endOfYear(now) };
      case 'custom':
        return { 
          from: startOfDay(filters.customRange.from), 
          to: endOfDay(filters.customRange.to) 
        };
      default:
        return { from: startOfDay(now), to: endOfDay(now) };
    }
  }, [filters.period, filters.customRange]);

  const isFiltered = filters.channel !== 'all' || filters.period !== 'today';

  const value: DashboardFilterContextValue = {
    filters,
    setChannel,
    setPeriod,
    setCustomRange,
    dateRange,
    channelLabel: channelLabels[filters.channel],
    periodLabel: periodLabels[filters.period],
    isFiltered,
  };

  return (
    <DashboardFilterContext.Provider value={value}>
      {children}
    </DashboardFilterContext.Provider>
  );
}

export function useDashboardFilters() {
  const context = useContext(DashboardFilterContext);
  if (!context) {
    throw new Error('useDashboardFilters must be used within a DashboardFilterProvider');
  }
  return context;
}

export { channelLabels, periodLabels };
