/**
 * useHolidays - Hook for global holidays CRUD
 * 
 * Uses special_days table with branch_id = NULL for global holidays
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';

export interface Holiday {
  id: string;
  day_date: string;
  day_type: 'holiday' | 'special_event';
  description: string;
  created_at: string;
  created_by: string | null;
}

export interface CreateHolidayInput {
  day_date: string;
  description: string;
  day_type?: 'holiday' | 'special_event';
}

/**
 * Fetch holidays for a specific month/year or range
 */
export function useHolidays(month: number, year: number) {
  return useQuery({
    queryKey: ['holidays', year, month],
    queryFn: async () => {
      const startDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('special_days')
        .select('*')
        .is('branch_id', null) // Global holidays only
        .gte('day_date', startDate)
        .lte('day_date', endDate)
        .order('day_date', { ascending: true });
      
      if (error) throw error;
      return (data || []) as Holiday[];
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch holidays for a date range (useful for calendar views)
 */
export function useHolidaysRange(startDate: Date, endDate: Date) {
  const start = format(startDate, 'yyyy-MM-dd');
  const end = format(endDate, 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['holidays-range', start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('special_days')
        .select('*')
        .is('branch_id', null)
        .gte('day_date', start)
        .lte('day_date', end)
        .order('day_date', { ascending: true });
      
      if (error) throw error;
      return (data || []) as Holiday[];
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Create a new global holiday
 */
export function useCreateHoliday() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (input: CreateHolidayInput) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('special_days')
        .insert({
          branch_id: null, // Global
          day_date: input.day_date,
          day_type: input.day_type || 'holiday',
          description: input.description,
          created_by: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Holiday;
    },
    onSuccess: () => {
      // Invalidate all holiday queries
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      queryClient.invalidateQueries({ queryKey: ['holidays-range'] });
    },
  });
}

/**
 * Delete a holiday
 */
export function useDeleteHoliday() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (holidayId: string) => {
      const { error } = await supabase
        .from('special_days')
        .delete()
        .eq('id', holidayId)
        .is('branch_id', null); // Safety: only delete global holidays
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      queryClient.invalidateQueries({ queryKey: ['holidays-range'] });
    },
  });
}

/**
 * Bulk create holidays (for importing national holidays)
 */
export function useCreateHolidaysBulk() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (holidays: CreateHolidayInput[]) => {
      if (!user) throw new Error('Not authenticated');
      
      // First, get existing global holidays to avoid duplicates
      const dates = holidays.map(h => h.day_date);
      const { data: existing } = await supabase
        .from('special_days')
        .select('day_date')
        .is('branch_id', null)
        .in('day_date', dates);
      
      const existingDates = new Set(existing?.map(e => e.day_date) || []);
      
      // Filter out holidays that already exist
      const newHolidays = holidays.filter(h => !existingDates.has(h.day_date));
      
      if (newHolidays.length === 0) {
        return []; // All holidays already exist
      }
      
      const records = newHolidays.map(h => ({
        branch_id: null,
        day_date: h.day_date,
        day_type: h.day_type || 'holiday',
        description: h.description,
        created_by: user.id,
      }));
      
      const { data, error } = await supabase
        .from('special_days')
        .insert(records)
        .select();
      
      if (error) throw error;
      return data as Holiday[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      queryClient.invalidateQueries({ queryKey: ['holidays-range'] });
    },
  });
}

/**
 * Get Argentina's official holidays for a year
 * Can be used to pre-populate holidays
 */
export function getArgentinaHolidays(year: number): CreateHolidayInput[] {
  return [
    { day_date: `${year}-01-01`, description: 'Año Nuevo' },
    { day_date: `${year}-02-12`, description: 'Carnaval' },
    { day_date: `${year}-02-13`, description: 'Carnaval' },
    { day_date: `${year}-03-24`, description: 'Día de la Memoria' },
    { day_date: `${year}-04-02`, description: 'Día del Veterano y Caídos en Malvinas' },
    // Semana Santa varies each year - would need calculation
    { day_date: `${year}-05-01`, description: 'Día del Trabajador' },
    { day_date: `${year}-05-25`, description: 'Día de la Revolución de Mayo' },
    { day_date: `${year}-06-17`, description: 'Paso a la Inmortalidad del Gral. Martín Miguel de Güemes' },
    { day_date: `${year}-06-20`, description: 'Paso a la Inmortalidad del Gral. Manuel Belgrano' },
    { day_date: `${year}-07-09`, description: 'Día de la Independencia' },
    { day_date: `${year}-08-17`, description: 'Paso a la Inmortalidad del Gral. José de San Martín' },
    { day_date: `${year}-10-12`, description: 'Día del Respeto a la Diversidad Cultural' },
    { day_date: `${year}-11-20`, description: 'Día de la Soberanía Nacional' },
    { day_date: `${year}-12-08`, description: 'Inmaculada Concepción de María' },
    { day_date: `${year}-12-25`, description: 'Navidad' },
  ];
}
