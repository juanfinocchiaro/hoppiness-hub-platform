import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Types
export interface NucleoProductMapping {
  id: string;
  nucleo_code: string;
  product_name: string;
  product_type: 'burger' | 'combo' | 'extra' | 'side' | 'drink' | 'other';
  smash_panes: number;
  smash_bolitas_90: number;
  smash_bolitas_45: number;
  smash_papas: number;
  parrilla_panes: number;
  parrilla_medallones_110: number;
  parrilla_papas: number;
  is_active: boolean;
}

export interface SalesImport {
  id: string;
  branch_id: string;
  date_from: string;
  date_to: string;
  file_name: string | null;
  records_count: number;
  total_sales: number;
  total_orders: number;
  sales_salon: number;
  sales_mostrador: number;
  sales_delivery: number;
  consumed_panes: number;
  consumed_bolitas_90: number;
  consumed_bolitas_45: number;
  consumed_medallones_110: number;
  consumed_papas: number;
  consumed_carne_kg: number;
  unknown_products: Array<{ codigo: string; nombre: string; cantidad: number }>;
  imported_by: string | null;
  created_at: string;
}

export interface ParsedExcelRow {
  fecha: Date | null;
  n_pedido: string;
  codigo: string;
  nombre: string;
  cantidad: number;
  total: number;
  rubro: string;
  subrubro: string;
  tipo_pedido: string;
  sector: string;
}

export interface ProcessedSalesResult {
  summary: {
    totalSales: number;
    totalOrders: number;
    salesSalon: number;
    salesMostrador: number;
    salesDelivery: number;
    consumedPanes: number;
    consumedBolitas90: number;
    consumedBolitas45: number;
    consumedMedallones110: number;
    consumedPapas: number;
    consumedCarneKg: number;
  };
  details: Array<ParsedExcelRow & {
    calc_panes: number;
    calc_bolitas_90: number;
    calc_bolitas_45: number;
    calc_medallones_110: number;
    calc_papas: number;
  }>;
  unknownProducts: Array<{ codigo: string; nombre: string; cantidad: number }>;
  dateFrom: Date | null;
  dateTo: Date | null;
  recordsCount: number;
}

// Fetch product mappings
export function useNucleoProductMappings() {
  return useQuery({
    queryKey: ['nucleo-product-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nucleo_product_mappings')
        .select('*')
        .eq('is_active', true)
        .order('product_name');
      
      if (error) throw error;
      return data as NucleoProductMapping[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Fetch branch kitchen type
export function useBranchKitchenType(branchId: string | undefined) {
  return useQuery({
    queryKey: ['branch-kitchen-type', branchId],
    queryFn: async () => {
      if (!branchId) return 'smash';
      
      const { data, error } = await supabase
        .from('branches')
        .select('kitchen_type')
        .eq('id', branchId)
        .single();
      
      if (error) throw error;
      return (data?.kitchen_type || 'smash') as 'smash' | 'parrilla';
    },
    enabled: !!branchId,
    staleTime: 1000 * 60 * 10,
  });
}

// Fetch sales imports for a branch
export function useSalesImports(branchId: string | undefined) {
  return useQuery({
    queryKey: ['sales-imports', branchId],
    queryFn: async () => {
      if (!branchId) return [];
      
      const { data, error } = await supabase
        .from('sales_imports')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as SalesImport[];
    },
    enabled: !!branchId,
    staleTime: 30000,
  });
}

// Process Excel data
export function processNucleoCheckData(
  rows: ParsedExcelRow[],
  mappings: NucleoProductMapping[],
  kitchenType: 'smash' | 'parrilla'
): ProcessedSalesResult {
  const totals = {
    sales: 0,
    orders: new Set<string>(),
    salesSalon: 0,
    salesMostrador: 0,
    salesDelivery: 0,
    panes: 0,
    bolitas90: 0,
    bolitas45: 0,
    medallones110: 0,
    papas: 0,
  };

  const details: ProcessedSalesResult['details'] = [];
  const unknownProducts: Map<string, { codigo: string; nombre: string; cantidad: number }> = new Map();
  let dateFrom: Date | null = null;
  let dateTo: Date | null = null;

  for (const row of rows) {
    // Skip modifiers (contain "-->")
    if (row.nombre?.includes('-->')) continue;

    const codigo = row.codigo?.toString().trim();
    const cantidad = row.cantidad || 0;
    const total = row.total || 0;

    // Update date range
    if (row.fecha) {
      const rowDate = row.fecha;
      if (!dateFrom || rowDate < dateFrom) dateFrom = rowDate;
      if (!dateTo || rowDate > dateTo) dateTo = rowDate;
    }

    // Sum sales by channel
    totals.sales += total;
    if (row.n_pedido) totals.orders.add(row.n_pedido);

    const tipoPedido = row.tipo_pedido?.toLowerCase() || '';
    if (tipoPedido.includes('salón') || tipoPedido.includes('salon')) {
      totals.salesSalon += total;
    } else if (tipoPedido.includes('mostrador')) {
      totals.salesMostrador += total;
    } else if (tipoPedido.includes('delivery')) {
      totals.salesDelivery += total;
    }

    // Find recipe mapping
    const mapping = mappings.find(m => m.nucleo_code === codigo);

    let calc = {
      calc_panes: 0,
      calc_bolitas_90: 0,
      calc_bolitas_45: 0,
      calc_medallones_110: 0,
      calc_papas: 0,
    };

    if (mapping) {
      if (kitchenType === 'smash') {
        calc.calc_panes = mapping.smash_panes * cantidad;
        calc.calc_bolitas_90 = mapping.smash_bolitas_90 * cantidad;
        calc.calc_bolitas_45 = mapping.smash_bolitas_45 * cantidad;
        calc.calc_papas = mapping.smash_papas * cantidad;
      } else {
        calc.calc_panes = mapping.parrilla_panes * cantidad;
        calc.calc_medallones_110 = mapping.parrilla_medallones_110 * cantidad;
        calc.calc_papas = mapping.parrilla_papas * cantidad;
      }

      totals.panes += calc.calc_panes;
      totals.bolitas90 += calc.calc_bolitas_90;
      totals.bolitas45 += calc.calc_bolitas_45;
      totals.medallones110 += calc.calc_medallones_110;
      totals.papas += calc.calc_papas;

      details.push({ ...row, ...calc });
    } else if (row.rubro?.toUpperCase() === 'BURGERS' || row.rubro?.toUpperCase() === 'COMBOS') {
      // Unknown product that should have a recipe
      if (codigo && !unknownProducts.has(codigo)) {
        unknownProducts.set(codigo, { codigo, nombre: row.nombre || '', cantidad: 0 });
      }
      if (codigo) {
        const existing = unknownProducts.get(codigo)!;
        existing.cantidad += cantidad;
      }
      details.push({ ...row, ...calc });
    } else {
      // Other products (drinks, etc) - just add without ingredient calculation
      details.push({ ...row, ...calc });
    }
  }

  // Calculate kg of meat
  const carneKg = (
    totals.bolitas90 * 90 +
    totals.bolitas45 * 45 +
    totals.medallones110 * 110
  ) / 1000;

  return {
    summary: {
      totalSales: totals.sales,
      totalOrders: totals.orders.size,
      salesSalon: totals.salesSalon,
      salesMostrador: totals.salesMostrador,
      salesDelivery: totals.salesDelivery,
      consumedPanes: totals.panes,
      consumedBolitas90: totals.bolitas90,
      consumedBolitas45: totals.bolitas45,
      consumedMedallones110: totals.medallones110,
      consumedPapas: totals.papas,
      consumedCarneKg: carneKg,
    },
    details,
    unknownProducts: Array.from(unknownProducts.values()),
    dateFrom,
    dateTo,
    recordsCount: details.length,
  };
}

// Save import to database
export function useSaveSalesImport() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      branchId,
      fileName,
      result,
    }: {
      branchId: string;
      fileName: string;
      result: ProcessedSalesResult;
    }) => {
      if (!user) throw new Error('No autenticado');
      if (!result.dateFrom || !result.dateTo) throw new Error('No se pudo determinar el rango de fechas');

      // Insert import header
      const { data: importData, error: importError } = await supabase
        .from('sales_imports')
        .insert({
          branch_id: branchId,
          date_from: result.dateFrom.toISOString().split('T')[0],
          date_to: result.dateTo.toISOString().split('T')[0],
          file_name: fileName,
          records_count: result.recordsCount,
          total_sales: result.summary.totalSales,
          total_orders: result.summary.totalOrders,
          sales_salon: result.summary.salesSalon,
          sales_mostrador: result.summary.salesMostrador,
          sales_delivery: result.summary.salesDelivery,
          consumed_panes: result.summary.consumedPanes,
          consumed_bolitas_90: result.summary.consumedBolitas90,
          consumed_bolitas_45: result.summary.consumedBolitas45,
          consumed_medallones_110: result.summary.consumedMedallones110,
          consumed_papas: result.summary.consumedPapas,
          consumed_carne_kg: result.summary.consumedCarneKg,
          unknown_products: result.unknownProducts,
          imported_by: user.id,
        })
        .select()
        .single();

      if (importError) throw importError;

      // Insert details in batches of 500
      const batchSize = 500;
      for (let i = 0; i < result.details.length; i += batchSize) {
        const batch = result.details.slice(i, i + batchSize).map(d => ({
          import_id: importData.id,
          fecha: d.fecha?.toISOString() || null,
          n_pedido: d.n_pedido,
          codigo: d.codigo,
          nombre: d.nombre,
          cantidad: d.cantidad,
          total: d.total,
          rubro: d.rubro,
          subrubro: d.subrubro,
          tipo_pedido: d.tipo_pedido,
          sector: d.sector,
          calc_panes: d.calc_panes,
          calc_bolitas_90: d.calc_bolitas_90,
          calc_bolitas_45: d.calc_bolitas_45,
          calc_medallones_110: d.calc_medallones_110,
          calc_papas: d.calc_papas,
        }));

        const { error: detailError } = await supabase
          .from('sales_import_details')
          .insert(batch);

        if (detailError) throw detailError;
      }

      return importData;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales-imports', variables.branchId] });
    },
  });
}

// Delete import
export function useDeleteSalesImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ importId, branchId }: { importId: string; branchId: string }) => {
      const { error } = await supabase
        .from('sales_imports')
        .delete()
        .eq('id', importId);

      if (error) throw error;
      return { branchId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['sales-imports', result.branchId] });
    },
  });
}

// Get latest consumption stats for a branch
export function useBranchConsumptionStats(branchId: string | undefined) {
  return useQuery({
    queryKey: ['branch-consumption-stats', branchId],
    queryFn: async () => {
      if (!branchId) return null;

      const { data, error } = await supabase
        .from('sales_imports')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as SalesImport | null;
    },
    enabled: !!branchId,
    staleTime: 30000,
  });
}
