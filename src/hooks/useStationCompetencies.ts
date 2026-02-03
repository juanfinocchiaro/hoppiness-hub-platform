import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WorkStation, StationCompetency, GeneralCompetency, ManagerCompetency } from '@/types/coaching';

/**
 * Hook para obtener estaciones de trabajo
 */
export function useWorkStations() {
  return useQuery({
    queryKey: ['work-stations'],
    queryFn: async (): Promise<WorkStation[]> => {
      const { data, error } = await supabase
        .from('work_stations')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as WorkStation[];
    },
    staleTime: 1000 * 60 * 30, // 30 minutos - datos estáticos
  });
}

/**
 * Hook para obtener competencias de una estación específica
 */
export function useStationCompetencies(stationId: string | null) {
  return useQuery({
    queryKey: ['station-competencies', stationId],
    queryFn: async (): Promise<StationCompetency[]> => {
      if (!stationId) return [];
      
      const { data, error } = await supabase
        .from('station_competencies')
        .select('*')
        .eq('station_id', stationId)
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as StationCompetency[];
    },
    enabled: !!stationId,
    staleTime: 1000 * 60 * 30,
  });
}

/**
 * Hook para obtener todas las competencias de todas las estaciones
 */
export function useAllStationCompetencies() {
  return useQuery({
    queryKey: ['all-station-competencies'],
    queryFn: async (): Promise<StationCompetency[]> => {
      const { data, error } = await supabase
        .from('station_competencies')
        .select('*')
        .eq('is_active', true)
        .order('station_id')
        .order('sort_order');
      
      if (error) throw error;
      return data as StationCompetency[];
    },
    staleTime: 1000 * 60 * 30,
  });
}

/**
 * Hook para obtener competencias generales
 */
export function useGeneralCompetencies() {
  return useQuery({
    queryKey: ['general-competencies'],
    queryFn: async (): Promise<GeneralCompetency[]> => {
      const { data, error } = await supabase
        .from('general_competencies')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as GeneralCompetency[];
    },
    staleTime: 1000 * 60 * 30,
  });
}

/**
 * Hook para obtener competencias de encargado
 */
export function useManagerCompetencies() {
  return useQuery({
    queryKey: ['manager-competencies'],
    queryFn: async (): Promise<ManagerCompetency[]> => {
      const { data, error } = await supabase
        .from('manager_competencies')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as ManagerCompetency[];
    },
    staleTime: 1000 * 60 * 30,
  });
}

/**
 * Hook combinado para obtener toda la configuración de competencias
 */
export function useCompetencyConfig() {
  const stations = useWorkStations();
  const stationCompetencies = useAllStationCompetencies();
  const generalCompetencies = useGeneralCompetencies();
  const managerCompetencies = useManagerCompetencies();

  const isLoading = stations.isLoading || stationCompetencies.isLoading || 
                    generalCompetencies.isLoading || managerCompetencies.isLoading;
  
  const error = stations.error || stationCompetencies.error || 
                generalCompetencies.error || managerCompetencies.error;

  // Agrupar competencias por estación
  const competenciesByStation = stationCompetencies.data?.reduce((acc, comp) => {
    if (!acc[comp.station_id]) {
      acc[comp.station_id] = [];
    }
    acc[comp.station_id].push(comp);
    return acc;
  }, {} as Record<string, StationCompetency[]>) ?? {};

  return {
    stations: stations.data ?? [],
    stationCompetencies: stationCompetencies.data ?? [],
    competenciesByStation,
    generalCompetencies: generalCompetencies.data ?? [],
    managerCompetencies: managerCompetencies.data ?? [],
    isLoading,
    error,
  };
}
