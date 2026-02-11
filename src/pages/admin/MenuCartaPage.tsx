import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { DataToolbar } from '@/components/ui/data-table-pro';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/states';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, ChevronUp, ChevronDown } from 'lucide-react';
import { useItemsCarta } from '@/hooks/useItemsCarta';
import { useMenuCategorias } from '@/hooks/useMenu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);

export default function MenuCartaPage() {
  const { data: items, isLoading: loadingItems } = useItemsCarta();
  const { data: categorias, isLoading: loadingCats } = useMenuCategorias();

  const [search, setSearch] = useState('');
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());

  const toggleCat = (catId: string) => {
    setCollapsedCats(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  // Group items by category
  const itemsByCategory = useMemo(() => {
    const map: Record<string, any[]> = {};
    const filtered = (items || []).filter((item: any) => {
      if (!search) return true;
      return item.nombre.toLowerCase().includes(search.toLowerCase());
    });
    for (const item of filtered) {
      const catId = item.categoria_carta_id || 'sin-categoria';
      if (!map[catId]) map[catId] = [];
      map[catId].push(item);
    }
    return map;
  }, [items, search]);

  const uncategorized = itemsByCategory['sin-categoria'] || [];
  const isLoading = loadingItems || loadingCats;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Carta" subtitle="Capa 3 — Lo que ve y compra el cliente (solo lectura)" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Carta" subtitle="Capa 3 — Lo que ve y compra el cliente · Para editar, usá Centro de Costos" />

      <DataToolbar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Buscar item..." />

      {(!categorias || categorias.length === 0) && uncategorized.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <EmptyState icon={BookOpen} title="Carta vacía" description="Creá items desde el Centro de Costos" />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {categorias?.map((cat: any) => {
            const catItems = itemsByCategory[cat.id] || [];
            const isOpen = !collapsedCats.has(cat.id);

            return (
              <Collapsible key={cat.id} open={isOpen} onOpenChange={() => toggleCat(cat.id)}>
                <Card className="overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-2 px-4 py-3 bg-muted/40 border-b w-full text-left">
                      <span className="font-semibold text-sm">{cat.nombre}</span>
                      <Badge variant="secondary" className="text-xs font-normal">
                        {catItems.length} {catItems.length === 1 ? 'item' : 'items'}
                      </Badge>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground ml-auto" /> : <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {catItems.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-muted-foreground">Sin items en esta categoría</div>
                    ) : (
                      <div className="divide-y">
                        {catItems.map((item: any) => (
                          <div key={item.id} className="flex items-center justify-between px-4 py-3">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm">{item.nombre}</p>
                              {item.descripcion && <p className="text-xs text-muted-foreground truncate max-w-[350px]">{item.descripcion}</p>}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="font-mono font-medium text-sm">{formatCurrency(item.precio_base)}</span>
                              {item.fc_actual != null && (
                                <Badge variant={item.fc_actual <= 32 ? 'default' : item.fc_actual <= 40 ? 'secondary' : 'destructive'} className="text-xs">
                                  FC {item.fc_actual.toFixed(1)}%
                                </Badge>
                              )}
                              {item.disponible_delivery && (
                                <Badge variant="outline" className="text-xs">Delivery</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}

          {uncategorized.length > 0 && (
            <Card className="overflow-hidden border-dashed">
              <div className="flex items-center gap-2 px-4 py-3 bg-muted/20 border-b">
                <span className="font-semibold text-sm text-muted-foreground">Sin categoría</span>
                <Badge variant="secondary" className="text-xs">{uncategorized.length}</Badge>
              </div>
              <div className="divide-y">
                {uncategorized.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between px-4 py-3">
                    <p className="font-medium text-sm">{item.nombre}</p>
                    <span className="font-mono font-medium text-sm">{formatCurrency(item.precio_base)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
