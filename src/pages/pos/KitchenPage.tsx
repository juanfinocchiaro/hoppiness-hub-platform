/**
 * KitchenPage - Pedidos para cocina
 */
import { useParams } from 'react-router-dom';
import { ChefHat } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { useKitchen } from '@/hooks/pos/useKitchen';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function KitchenPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const qc = useQueryClient();
  const { data: pedidos, isLoading } = useKitchen(branchId!);

  const updateItemEstado = useMutation({
    mutationFn: async ({ itemId, estado }: { itemId: string; estado: string }) => {
      const { error } = await supabase
        .from('pedido_items')
        .update({ estado })
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-kitchen', branchId] });
    },
  });

  const updatePedidoEstado = useMutation({
    mutationFn: async ({ pedidoId, estado }: { pedidoId: string; estado: string }) => {
      const { error } = await supabase.from('pedidos').update({ estado }).eq('id', pedidoId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-kitchen', branchId] });
      toast.success('Estado actualizado');
    },
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const list = pedidos ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Cocina" subtitle="Pedidos en preparación" icon={ChefHat} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((p: any) => (
          <Card key={p.id}>
            <CardContent className="pt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold">#{p.numero_pedido}</span>
                <Badge variant={p.estado === 'listo' ? 'default' : 'secondary'}>{p.estado}</Badge>
              </div>
              <ul className="space-y-1 text-sm mb-3">
                {(p.pedido_items ?? []).map((it: any) => (
                  <li key={it.id} className="flex justify-between">
                    <span>
                      {it.cantidad}× {it.nombre}
                    </span>
                    <Badge
                      variant="outline"
                      className="cursor-pointer text-xs"
                      onClick={() =>
                        updateItemEstado.mutate({
                          itemId: it.id,
                          estado:
                            it.estado === 'pendiente'
                              ? 'en_preparacion'
                              : it.estado === 'en_preparacion'
                                ? 'listo'
                                : 'pendiente',
                        })
                      }
                    >
                      {it.estado}
                    </Badge>
                  </li>
                ))}
              </ul>
              {p.estado !== 'listo' && (p.pedido_items ?? []).every((i: any) => i.estado === 'listo') && (
                <button
                  className="text-sm text-primary font-medium"
                  onClick={() => updatePedidoEstado.mutate({ pedidoId: p.id, estado: 'listo' })}
                >
                  Marcar pedido listo
                </button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {list.length === 0 && (
        <p className="text-center text-muted-foreground py-12">Sin pedidos pendientes</p>
      )}
    </div>
  );
}
