/**
 * useWebappPendingCount — Hook con Realtime para contar pedidos webapp pendientes.
 *
 * Usa Supabase Realtime (INSERT/UPDATE en `pedidos`) para detectar
 * cambios al instante y reproduce un beep cuando el conteo sube.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseWebappPendingCountOptions {
  branchId: string | undefined;
  enabled?: boolean;
}

export function useWebappPendingCount({ branchId, enabled = true }: UseWebappPendingCountOptions) {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const prevCountRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Beep using Web Audio API (no external file needed)
  const playBeep = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // Audio not available — silently ignore
    }
  }, []);

  const fetchCount = useCallback(async () => {
    if (!branchId) return;
    const { count: c, error } = await supabase
      .from('pedidos')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', branchId)
      .eq('origen', 'webapp')
      .eq('estado', 'pendiente');

    if (!error && c !== null) {
      setCount(prev => {
        if (c > prevCountRef.current) {
          playBeep();
        }
        prevCountRef.current = c;
        return c;
      });
    }
    setIsLoading(false);
  }, [branchId, playBeep]);

  useEffect(() => {
    if (!branchId || !enabled) {
      setCount(0);
      setIsLoading(false);
      return;
    }

    // Initial fetch
    fetchCount();

    // Realtime subscription
    const channel = supabase
      .channel(`webapp-pending-${branchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pedidos',
          filter: `branch_id=eq.${branchId}`,
        },
        () => {
          // Re-fetch count on any change to pedidos for this branch
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [branchId, enabled, fetchCount]);

  return { count, isLoading };
}
