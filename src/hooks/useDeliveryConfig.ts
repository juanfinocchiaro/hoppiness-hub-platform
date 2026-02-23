import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ─── Pricing Config (brand-level, single row) ───────────────

export function useDeliveryPricingConfig() {
  return useQuery({
    queryKey: ['delivery-pricing-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_pricing_config')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateDeliveryPricingConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      base_distance_km?: number;
      base_price?: number;
      price_per_extra_km?: number;
      max_allowed_radius_km?: number;
      estimated_speed_kmh?: number;
      prep_time_minutes?: number;
      time_disclaimer?: string | null;
    }) => {
      const { data: existing } = await supabase
        .from('delivery_pricing_config')
        .select('id')
        .limit(1)
        .single();
      if (!existing) throw new Error('No pricing config found');

      const { error } = await supabase
        .from('delivery_pricing_config')
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivery-pricing-config'] });
      toast.success('Configuración de pricing actualizada');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Branch Delivery Config ─────────────────────────────────

export function useBranchDeliveryConfig(branchId: string | undefined) {
  return useQuery({
    queryKey: ['branch-delivery-config', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branch_delivery_config')
        .select('*')
        .eq('branch_id', branchId!)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data ?? null;
    },
    enabled: !!branchId,
  });
}

export function useAllBranchDeliveryConfigs() {
  return useQuery({
    queryKey: ['branch-delivery-configs-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branch_delivery_config')
        .select('*, branches!inner(id, name, slug, latitude, longitude, is_active)');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpdateBranchDeliveryConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ branchId, values }: {
      branchId: string;
      values: {
        default_radius_km?: number;
        delivery_enabled?: boolean;
        radius_override_km?: number | null;
        radius_override_until?: string | null;
        radius_override_by?: string | null;
      };
    }) => {
      const { error } = await supabase
        .from('branch_delivery_config')
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('branch_id', branchId);
      if (error) throw error;
    },
    onSuccess: (_, { branchId }) => {
      qc.invalidateQueries({ queryKey: ['branch-delivery-config', branchId] });
      qc.invalidateQueries({ queryKey: ['branch-delivery-configs-all'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Neighborhoods ──────────────────────────────────────────

export function useCityNeighborhoods() {
  return useQuery({
    queryKey: ['city-neighborhoods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('city_neighborhoods')
        .select('*')
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBranchNeighborhoods(branchId: string | undefined) {
  return useQuery({
    queryKey: ['branch-neighborhoods', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branch_delivery_neighborhoods')
        .select('*, city_neighborhoods(*)')
        .eq('branch_id', branchId!)
        .order('distance_km');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!branchId,
  });
}

export function useUpdateNeighborhoodStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, blockReason }: {
      id: string;
      status: 'enabled' | 'blocked_security' | 'blocked_conflict';
      blockReason?: string;
    }) => {
      const { error } = await supabase
        .from('branch_delivery_neighborhoods')
        .update({
          status,
          block_reason: blockReason ?? null,
          decided_by: 'brand_admin',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branch-neighborhoods'] });
      toast.success('Estado del barrio actualizado');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRegenerateBranchNeighborhoods() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ branchId, branchLat, branchLng, radiusKm }: {
      branchId: string;
      branchLat: number;
      branchLng: number;
      radiusKm: number;
    }) => {
      const [{ data: neighborhoods }, { data: existing }] = await Promise.all([
        supabase.from('city_neighborhoods').select('*'),
        supabase
          .from('branch_delivery_neighborhoods')
          .select('id, neighborhood_id, distance_km')
          .eq('branch_id', branchId),
      ]);
      if (!neighborhoods) return { added: 0, updated: 0 };

      const withinRadius = neighborhoods.filter((n) => {
        const dist = haversineDistance(branchLat, branchLng, Number(n.centroid_lat), Number(n.centroid_lng));
        return dist <= radiusKm;
      });

      const existingByNeighborhood = new Map((existing ?? []).map((r) => [r.neighborhood_id, r]));
      const toInsert: Array<{ branch_id: string; neighborhood_id: string; status: 'enabled'; distance_km: number; decided_by: 'auto' }> = [];
      const toUpdateDistance: Array<{ id: string; distance_km: number }> = [];

      for (const n of withinRadius) {
        const distance_km = Math.round(
          haversineDistance(branchLat, branchLng, Number(n.centroid_lat), Number(n.centroid_lng)) * 100
        ) / 100;
        const row = existingByNeighborhood.get(n.id);
        if (!row) {
          toInsert.push({
            branch_id: branchId,
            neighborhood_id: n.id,
            status: 'enabled',
            distance_km,
            decided_by: 'auto',
          });
        } else if (Number(row.distance_km) !== distance_km) {
          toUpdateDistance.push({ id: row.id, distance_km });
        }
      }

      if (toInsert.length > 0) {
        const { error } = await supabase
          .from('branch_delivery_neighborhoods')
          .insert(toInsert);
        if (error) throw error;
      }

      for (const { id, distance_km } of toUpdateDistance) {
        const { error } = await supabase
          .from('branch_delivery_neighborhoods')
          .update({ distance_km })
          .eq('id', id);
        if (error) throw error;
      }

      return { added: toInsert.length, updated: toUpdateDistance.length };
    },
    onSuccess: (result, { branchId }) => {
      qc.invalidateQueries({ queryKey: ['branch-neighborhoods', branchId] });
      const { added = 0, updated = 0 } = result ?? {};
      if (added === 0 && updated === 0) {
        toast.success('No hay barrios nuevos que cargar');
      } else {
        const parts = [];
        if (added) parts.push(`${added} nuevo(s)`);
        if (updated) parts.push(`${updated} distancia(s) actualizada(s)`);
        toast.success(`Barrios actualizados: ${parts.join(', ')}`);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Radius Override Log ────────────────────────────────────

export function useDeliveryRadiusOverride() {
  const qc = useQueryClient();
  const updateConfig = useUpdateBranchDeliveryConfig();

  return useMutation({
    mutationFn: async ({ branchId, newRadiusKm, previousKm, action }: {
      branchId: string;
      newRadiusKm: number | null;
      previousKm: number | null;
      action: 'reduce' | 'restore';
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const overrideUntil = newRadiusKm != null
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        : null;

      await updateConfig.mutateAsync({
        branchId,
        values: {
          radius_override_km: newRadiusKm,
          radius_override_until: overrideUntil,
          radius_override_by: user?.id ?? null,
        },
      });

      await supabase.from('delivery_radius_overrides_log').insert({
        branch_id: branchId,
        previous_km: previousKm,
        new_km: newRadiusKm,
        action,
        performed_by: user?.id ?? null,
      });
    },
    onSuccess: (_, { branchId }) => {
      qc.invalidateQueries({ queryKey: ['branch-delivery-config', branchId] });
      toast.success('Radio de delivery actualizado');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Calculate Delivery (client-side call) ──────────────────

export function useCalculateDelivery() {
  return useMutation({
    mutationFn: async (params: {
      branch_id: string;
      customer_lat: number;
      customer_lng: number;
      neighborhood_name?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('calculate-delivery', {
        body: params,
      });
      if (error) throw error;
      return data as {
        available: boolean;
        cost: number | null;
        distance_km: number | null;
        duration_min: number | null;
        estimated_delivery_min: number | null;
        disclaimer: string | null;
        reason?: 'out_of_radius' | 'blocked_zone' | 'delivery_disabled';
      };
    },
  });
}

// ─── Helpers ────────────────────────────────────────────────

function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
