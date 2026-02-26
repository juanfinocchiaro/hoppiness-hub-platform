/**
 * useClosureConfig - Configuration hooks for shift closures
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ClosureConfigItem, BranchClosureConfig, ConfigTipo } from '@/types/shiftClosure';

// Helper to cast DB row to typed item
function toClosureConfigItem(row: any): ClosureConfigItem {
  return {
    id: row.id,
    tipo: row.tipo as ConfigTipo,
    clave: row.clave,
    etiqueta: row.etiqueta,
    categoria_padre: row.categoria_padre,
    orden: row.orden,
    activo: row.activo,
  };
}

/**
 * Get brand-wide closure configuration (categories, types, extras, apps)
 */
export function useBrandClosureConfig() {
  return useQuery({
    queryKey: ['brand-closure-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_closure_config')
        .select('*')
        .eq('activo', true)
        .order('orden');

      if (error) throw error;

      // Group by type
      const config = {
        categorias: [] as ClosureConfigItem[],
        tipos: [] as ClosureConfigItem[],
        extras: [] as ClosureConfigItem[],
        apps: [] as ClosureConfigItem[],
        all: [] as ClosureConfigItem[],
      };

      (data || []).forEach((row) => {
        const item = toClosureConfigItem(row);
        config.all.push(item);
        switch (item.tipo) {
          case 'categoria_hamburguesa':
            config.categorias.push(item);
            break;
          case 'tipo_hamburguesa':
            config.tipos.push(item);
            break;
          case 'extra':
            config.extras.push(item);
            break;
          case 'app_delivery':
            config.apps.push(item);
            break;
        }
      });

      return config;
    },
  });
}

/**
 * Get branch-specific configuration (which apps are enabled)
 */
export function useBranchClosureConfig(branchId: string) {
  return useQuery({
    queryKey: ['branch-closure-config', branchId],
    queryFn: async () => {
      // Get branch config
      const { data: branchConfig, error: configError } = await supabase
        .from('branch_closure_config')
        .select('*, brand_closure_config(*)')
        .eq('branch_id', branchId);

      if (configError) throw configError;

      // Get all apps from brand config
      const { data: brandApps, error: appsError } = await supabase
        .from('brand_closure_config')
        .select('*')
        .eq('tipo', 'app_delivery')
        .eq('activo', true)
        .order('orden');

      if (appsError) throw appsError;

      // Build enabled apps map
      const enabledApps = new Map<string, boolean>();

      // Default: all apps enabled
      (brandApps || []).forEach((row) => {
        enabledApps.set(row.clave, true);
      });

      // Override with branch-specific config
      (branchConfig || []).forEach((bc) => {
        const raw = bc.brand_closure_config as any;
        if (raw && raw.tipo === 'app_delivery') {
          enabledApps.set(raw.clave, bc.habilitado);
        }
      });

      return {
        branchConfig: branchConfig as (BranchClosureConfig & {
          brand_closure_config: ClosureConfigItem;
        })[],
        brandApps: (brandApps || []).map(toClosureConfigItem),
        enabledApps,
      };
    },
    enabled: !!branchId,
  });
}

/**
 * Update branch closure config (enable/disable apps)
 */
export function useUpdateBranchClosureConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      branchId,
      configId,
      habilitado,
    }: {
      branchId: string;
      configId: string;
      habilitado: boolean;
    }) => {
      // Upsert
      const { data, error } = await supabase
        .from('branch_closure_config')
        .upsert(
          {
            branch_id: branchId,
            config_id: configId,
            habilitado,
          },
          {
            onConflict: 'branch_id,config_id',
          },
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['branch-closure-config', variables.branchId],
      });
      toast.success('Configuración actualizada');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

/**
 * Get apps that are enabled for a branch (for display in closure modal)
 */
export function useEnabledApps(branchId: string) {
  const { data: config } = useBranchClosureConfig(branchId);

  if (!config) return [];

  return config.brandApps.filter((app) => config.enabledApps.get(app.clave) !== false);
}
