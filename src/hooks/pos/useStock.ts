/**
 * useStock - Stock completo con todos los hooks necesarios
 * Reescritura completa según plan de rediseño
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// ===== TYPES =====
export type StockEstado = 'ok' | 'bajo' | 'critico' | 'sin_stock';

export interface StockItem {
  insumo_id: string;
  nombre: string;
  unidad: string;
  categoria: string | null;
  cantidad: number;
  stock_minimo: number | null;
  stock_critico: number | null;
  stock_minimo_local: number | null;
  stock_critico_local: number | null;
  estado: StockEstado;
  costo_unitario: number;
  ultimo_movimiento: string | null;
  tiene_stock_actual: boolean;
}

export interface StockResumen {
  total: number;
  ok: number;
  bajo: number;
  critico: number;
  sin_stock: number;
}

function calcularEstado(
  cantidad: number,
  minimo: number | null,
  critico: number | null,
  minimoLocal: number | null,
  criticoLocal: number | null,
): StockEstado {
  const min = minimoLocal ?? minimo;
  const crit = criticoLocal ?? critico;
  if (cantidad <= 0) return 'sin_stock';
  if (crit != null && cantidad <= crit) return 'critico';
  if (min != null && cantidad <= min) return 'bajo';
  return 'ok';
}

// ===== 1. STOCK COMPLETO =====
export function useStockCompleto(branchId: string) {
  return useQuery({
    queryKey: ['stock-completo', branchId],
    queryFn: async () => {
      // Fetch all active insumos
      const { data: insumos, error: errIns } = await supabase
        .from('insumos')
        .select('id, nombre, unidad_base, categoria_id, costo_por_unidad_base, categorias_insumo:categorias_insumo!insumos_categoria_id_fkey(nombre)')
        .is('deleted_at', null)
        .neq('activo', false)
        .order('nombre');
      if (errIns) throw errIns;

      // Fetch stock_actual for this branch
      const { data: stockActual, error: errSa } = await supabase
        .from('stock_actual')
        .select('*')
        .eq('branch_id', branchId);
      if (errSa) throw errSa;

      // Fetch latest movement per insumo
      const { data: movimientos, error: errMov } = await supabase
        .from('stock_movimientos')
        .select('insumo_id, created_at, tipo, motivo')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false });
      if (errMov) throw errMov;

      // Build maps
      const stockMap = new Map(
        (stockActual ?? []).map(s => [s.insumo_id, s])
      );
      const lastMovMap = new Map<string, string>();
      (movimientos ?? []).forEach(m => {
        if (!lastMovMap.has(m.insumo_id)) {
          lastMovMap.set(m.insumo_id, m.created_at ?? '');
        }
      });

      const items: StockItem[] = (insumos ?? []).map(ins => {
        const sa = stockMap.get(ins.id);
        const cantidad = sa ? Number(sa.cantidad) : 0;
        const cat = ins.categorias_insumo as any;
        return {
          insumo_id: ins.id,
          nombre: ins.nombre,
          unidad: ins.unidad_base ?? 'un',
          categoria: cat?.nombre ?? null,
          cantidad,
          stock_minimo: sa?.stock_minimo != null ? Number(sa.stock_minimo) : null,
          stock_critico: sa?.stock_critico != null ? Number(sa.stock_critico) : null,
          stock_minimo_local: sa?.stock_minimo_local != null ? Number(sa.stock_minimo_local) : null,
          stock_critico_local: sa?.stock_critico_local != null ? Number(sa.stock_critico_local) : null,
          estado: calcularEstado(
            cantidad,
            sa?.stock_minimo != null ? Number(sa.stock_minimo) : null,
            sa?.stock_critico != null ? Number(sa.stock_critico) : null,
            sa?.stock_minimo_local != null ? Number(sa.stock_minimo_local) : null,
            sa?.stock_critico_local != null ? Number(sa.stock_critico_local) : null,
          ),
          costo_unitario: Number(ins.costo_por_unidad_base ?? 0),
          ultimo_movimiento: lastMovMap.get(ins.id) ?? null,
          tiene_stock_actual: !!sa,
        };
      });

      return items;
    },
    enabled: !!branchId,
  });
}

// ===== 2. STOCK RESUMEN =====
export function useStockResumen(branchId: string) {
  const { data: items } = useStockCompleto(branchId);

  const resumen: StockResumen = {
    total: items?.length ?? 0,
    ok: items?.filter(i => i.estado === 'ok').length ?? 0,
    bajo: items?.filter(i => i.estado === 'bajo').length ?? 0,
    critico: items?.filter(i => i.estado === 'critico').length ?? 0,
    sin_stock: items?.filter(i => i.estado === 'sin_stock').length ?? 0,
  };

  return resumen;
}

// ===== 3. STOCK INICIAL MASIVO =====
export type StockInicialItem = { insumo_id: string; cantidad: number };

export function useStockInicialMasivo(branchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: StockInicialItem[]) => {
      if (!branchId || items.length === 0) return;
      const nonZero = items.filter(i => i.cantidad > 0);
      if (nonZero.length === 0) return;

      for (const it of nonZero) {
        const { data: insumo } = await supabase
          .from('insumos')
          .select('unidad_base')
          .eq('id', it.insumo_id)
          .single();
        const unidad = insumo?.unidad_base ?? 'un';

        const { error: errUpsert } = await supabase
          .from('stock_actual')
          .upsert(
            { branch_id: branchId, insumo_id: it.insumo_id, cantidad: it.cantidad, unidad },
            { onConflict: 'branch_id,insumo_id' }
          );
        if (errUpsert) throw errUpsert;

        await supabase.from('stock_movimientos').insert({
          branch_id: branchId,
          insumo_id: it.insumo_id,
          tipo: 'stock_inicial',
          cantidad: it.cantidad,
          cantidad_anterior: 0,
          cantidad_nueva: it.cantidad,
          motivo: 'Carga inicial de stock',
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-completo', branchId] });
      toast.success('Stock inicial cargado correctamente');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ===== 4. AJUSTE INLINE =====
export function useAjusteInline(branchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      insumo_id: string;
      cantidad_nueva: number;
      motivo: string;
      nota?: string;
    }) => {
      const { data: insumo } = await supabase
        .from('insumos')
        .select('unidad_base')
        .eq('id', p.insumo_id)
        .single();
      const unidad = insumo?.unidad_base ?? 'un';

      const { data: row } = await supabase
        .from('stock_actual')
        .select('cantidad')
        .eq('branch_id', branchId)
        .eq('insumo_id', p.insumo_id)
        .maybeSingle();
      const cantidadAnterior = Number(row?.cantidad ?? 0);

      const { error: errUpsert } = await supabase.from('stock_actual').upsert(
        { branch_id: branchId, insumo_id: p.insumo_id, cantidad: p.cantidad_nueva, unidad },
        { onConflict: 'branch_id,insumo_id' }
      );
      if (errUpsert) throw errUpsert;

      const { error: errMov } = await supabase.from('stock_movimientos').insert({
        branch_id: branchId,
        insumo_id: p.insumo_id,
        tipo: 'ajuste',
        cantidad: Math.abs(p.cantidad_nueva - cantidadAnterior),
        cantidad_anterior: cantidadAnterior,
        cantidad_nueva: p.cantidad_nueva,
        motivo: p.motivo || 'Ajuste manual',
        nota: p.nota || null,
      });
      if (errMov) throw errMov;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-completo', branchId] });
      toast.success('Stock ajustado');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ===== 5. MOVIMIENTOS POR INSUMO =====
export function useStockMovimientos(branchId: string, insumoId: string | null) {
  return useQuery({
    queryKey: ['stock-movimientos', branchId, insumoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_movimientos')
        .select('*')
        .eq('branch_id', branchId)
        .eq('insumo_id', insumoId!)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!branchId && !!insumoId,
  });
}

// ===== 6. CONTEO FISICO =====
export function useStockConteo(branchId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const crearBorrador = useMutation({
    mutationFn: async (params: { fecha: string; periodo?: string; nota_general?: string }) => {
      const { data, error } = await supabase
        .from('stock_conteos')
        .insert({
          branch_id: branchId,
          fecha: params.fecha,
          periodo: params.periodo,
          nota_general: params.nota_general,
          status: 'borrador',
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-conteos', branchId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const guardarItems = useMutation({
    mutationFn: async (params: {
      conteo_id: string;
      items: Array<{
        insumo_id: string;
        stock_teorico: number;
        stock_real: number | null;
        costo_unitario: number;
      }>;
    }) => {
      // Delete existing items first
      await supabase
        .from('stock_conteo_items')
        .delete()
        .eq('conteo_id', params.conteo_id);

      const { error } = await supabase.from('stock_conteo_items').insert(
        params.items.map(it => ({
          conteo_id: params.conteo_id,
          insumo_id: it.insumo_id,
          stock_teorico: it.stock_teorico,
          stock_real: it.stock_real,
          costo_unitario: it.costo_unitario,
        }))
      );
      if (error) throw error;
    },
    onSuccess: () => toast.success('Progreso guardado'),
    onError: (e: Error) => toast.error(e.message),
  });

  const confirmarConteo = useMutation({
    mutationFn: async (params: {
      conteo_id: string;
      items: Array<{
        insumo_id: string;
        stock_teorico: number;
        stock_real: number;
        costo_unitario: number;
      }>;
      nota_general?: string;
    }) => {
      // Save items
      await supabase
        .from('stock_conteo_items')
        .delete()
        .eq('conteo_id', params.conteo_id);

      await supabase.from('stock_conteo_items').insert(
        params.items.map(it => ({
          conteo_id: params.conteo_id,
          insumo_id: it.insumo_id,
          stock_teorico: it.stock_teorico,
          stock_real: it.stock_real,
          costo_unitario: it.costo_unitario,
        }))
      );

      // Adjust stock for each item
      for (const it of params.items) {
        if (it.stock_real !== it.stock_teorico) {
          const { data: insumo } = await supabase
            .from('insumos')
            .select('unidad_base')
            .eq('id', it.insumo_id)
            .single();

          await supabase.from('stock_actual').upsert(
            {
              branch_id: branchId,
              insumo_id: it.insumo_id,
              cantidad: it.stock_real,
              unidad: insumo?.unidad_base ?? 'un',
            },
            { onConflict: 'branch_id,insumo_id' }
          );

          await supabase.from('stock_movimientos').insert({
            branch_id: branchId,
            insumo_id: it.insumo_id,
            tipo: 'conteo_fisico',
            cantidad: Math.abs(it.stock_real - it.stock_teorico),
            cantidad_anterior: it.stock_teorico,
            cantidad_nueva: it.stock_real,
            motivo: 'Conteo físico',
          });
        }
      }

      // Calculate resumen
      const conDiferencia = params.items.filter(i => i.stock_real !== i.stock_teorico);
      const valorDiferencias = conDiferencia.reduce(
        (sum, i) => sum + Math.abs((i.stock_real - i.stock_teorico) * i.costo_unitario), 0
      );

      // Mark conteo as confirmed
      await supabase.from('stock_conteos').update({
        status: 'confirmado',
        confirmed_at: new Date().toISOString(),
        nota_general: params.nota_general,
        resumen: {
          total_insumos: params.items.length,
          con_diferencia: conDiferencia.length,
          sin_diferencia: params.items.length - conDiferencia.length,
          valor_diferencias: valorDiferencias,
        },
      }).eq('id', params.conteo_id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-completo', branchId] });
      qc.invalidateQueries({ queryKey: ['stock-conteos', branchId] });
      toast.success('Conteo confirmado y stock ajustado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { crearBorrador, guardarItems, confirmarConteo };
}

// ===== 7. ACTUALIZAR UMBRALES =====
export function useUpdateUmbrales(branchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      insumo_id: string;
      stock_minimo_local: number | null;
      stock_critico_local: number | null;
    }) => {
      const { data: existing } = await supabase
        .from('stock_actual')
        .select('id')
        .eq('branch_id', branchId)
        .eq('insumo_id', p.insumo_id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('stock_actual')
          .update({
            stock_minimo_local: p.stock_minimo_local,
            stock_critico_local: p.stock_critico_local,
          })
          .eq('branch_id', branchId)
          .eq('insumo_id', p.insumo_id);
        if (error) throw error;
      } else {
        const { data: insumo } = await supabase
          .from('insumos')
          .select('unidad_base')
          .eq('id', p.insumo_id)
          .single();
        const { error } = await supabase.from('stock_actual').insert({
          branch_id: branchId,
          insumo_id: p.insumo_id,
          cantidad: 0,
          unidad: insumo?.unidad_base ?? 'un',
          stock_minimo_local: p.stock_minimo_local,
          stock_critico_local: p.stock_critico_local,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-completo', branchId] });
      toast.success('Umbrales actualizados');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
