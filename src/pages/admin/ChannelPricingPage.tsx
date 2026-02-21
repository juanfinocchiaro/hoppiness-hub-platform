/**
 * ChannelPricingPage — Precios por Canal de Venta
 * 
 * Gestión de listas de precios por canal desde Mi Marca.
 * Mostrador y WebApp usan precio predeterminado por defecto.
 * Rappi, Pedidos Ya y MP Delivery tienen listas independientes.
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Check, Copy, Link2, Unlink, RefreshCw, Save, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  usePriceLists,
  usePriceListItems,
  useBulkUpdatePriceList,
  useUnifyPrices,
  useInitializePriceLists,
  CHANNELS,
  type Channel,
  type PriceList,
} from '@/hooks/useChannelPricing';

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(v);

export default function ChannelPricingPage() {
  const { data: priceLists, isLoading: loadingLists } = usePriceLists();
  const initLists = useInitializePriceLists();
  const [activeChannel, setActiveChannel] = useState<Channel>('rappi');
  const [unifyDialogOpen, setUnifyDialogOpen] = useState(false);

  useEffect(() => {
    if (!loadingLists && priceLists && priceLists.length < CHANNELS.length) {
      initLists.mutate();
    }
  }, [loadingLists, priceLists]);

  const activeList = priceLists?.find(l => l.channel === activeChannel);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Precios por Canal"
        subtitle="Gestioná listas de precios distintas según el canal de venta"
        breadcrumb={[
          { label: 'Mi Marca', href: '/mimarca' },
          { label: 'Precios por Canal' },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setUnifyDialogOpen(true)}>
              <Link2 className="h-4 w-4 mr-2" />
              Unificar precios
            </Button>
          </div>
        }
      />

      <ChannelOverview priceLists={priceLists || []} />

      {loadingLists ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <Tabs value={activeChannel} onValueChange={(v) => setActiveChannel(v as Channel)}>
          <TabsList className="w-full flex-wrap h-auto gap-1">
            {CHANNELS.map(ch => {
              const list = priceLists?.find(l => l.channel === ch.value);
              const isDefault = ch.value === 'mostrador' || ch.value === 'webapp';
              return (
                <TabsTrigger key={ch.value} value={ch.value} className="gap-1.5">
                  {ch.label}
                  {isDefault && <Badge variant="outline" className="text-[10px] px-1">Base</Badge>}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {CHANNELS.map(ch => (
            <TabsContent key={ch.value} value={ch.value}>
              {ch.value === 'mostrador' || ch.value === 'webapp' ? (
                <DefaultPriceInfo channel={ch.value} />
              ) : (
                <ChannelPriceEditor
                  priceList={priceLists?.find(l => l.channel === ch.value)}
                  channel={ch.value}
                  channelLabel={ch.label}
                />
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      <UnifyPricesDialog
        open={unifyDialogOpen}
        onOpenChange={setUnifyDialogOpen}
        priceLists={priceLists || []}
      />
    </div>
  );
}

function ChannelOverview({ priceLists }: { priceLists: PriceList[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {CHANNELS.map(ch => {
        const list = priceLists.find(l => l.channel === ch.value);
        const isDefault = ch.value === 'mostrador' || ch.value === 'webapp';
        return (
          <Card key={ch.value} className="text-center">
            <CardContent className="py-4">
              <div className="font-medium text-sm">{ch.label}</div>
              <Badge variant={isDefault ? 'secondary' : 'outline'} className="mt-1 text-xs">
                {isDefault ? 'Precio base' : list ? 'Lista propia' : 'Sin configurar'}
              </Badge>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function DefaultPriceInfo({ channel }: { channel: Channel }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {channel === 'mostrador' ? 'Mostrador' : 'WebApp'} — Precio Base
        </CardTitle>
        <CardDescription>
          Este canal usa el precio base de cada producto (campo "precio_base" en la carta).
          Para modificar los precios, editá los productos desde la sección Carta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" asChild>
          <a href="/mimarca/carta">Ir a la Carta</a>
        </Button>
      </CardContent>
    </Card>
  );
}

function ChannelPriceEditor({ priceList, channel, channelLabel }: {
  priceList?: PriceList;
  channel: Channel;
  channelLabel: string;
}) {
  const { data: menuItems, isLoading: loadingMenu } = useQuery({
    queryKey: ['menu-items-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items_carta')
        .select('id, nombre, precio_base, activo, categoria_carta_id, menu_categorias(nombre)')
        .eq('activo', true)
        .order('nombre');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: priceItems, isLoading: loadingPrices } = usePriceListItems(priceList?.id);
  const bulkUpdate = useBulkUpdatePriceList();
  const [search, setSearch] = useState('');
  const [editedPrices, setEditedPrices] = useState<Record<string, number>>({});
  const [copyFromBase, setCopyFromBase] = useState(false);

  const priceMap = useMemo(() => {
    const map: Record<string, number> = {};
    priceItems?.forEach(p => { map[p.item_carta_id] = p.precio; });
    return map;
  }, [priceItems]);

  const filteredItems = useMemo(() => {
    if (!menuItems) return [];
    if (!search) return menuItems;
    const q = search.toLowerCase();
    return menuItems.filter(i =>
      i.nombre.toLowerCase().includes(q) ||
      (i as any).menu_categorias?.nombre?.toLowerCase().includes(q)
    );
  }, [menuItems, search]);

  const getPrice = useCallback((itemId: string, basePrice: number): number => {
    if (editedPrices[itemId] !== undefined) return editedPrices[itemId];
    if (priceMap[itemId] !== undefined) return priceMap[itemId];
    return basePrice;
  }, [editedPrices, priceMap]);

  const handlePriceChange = (itemId: string, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      setEditedPrices(prev => ({ ...prev, [itemId]: num }));
    }
  };

  const handleCopyFromBase = () => {
    if (!menuItems) return;
    const newPrices: Record<string, number> = {};
    menuItems.forEach(i => { newPrices[i.id] = i.precio_base; });
    setEditedPrices(newPrices);
    toast.info('Precios copiados desde la lista base');
  };

  const handleSave = () => {
    if (!priceList || Object.keys(editedPrices).length === 0) return;
    const items = Object.entries(editedPrices).map(([itemId, precio]) => ({
      item_carta_id: itemId,
      precio,
    }));
    bulkUpdate.mutate({ price_list_id: priceList.id, items }, {
      onSuccess: () => setEditedPrices({}),
    });
  };

  const hasChanges = Object.keys(editedPrices).length > 0;

  if (loadingMenu || loadingPrices) return <Skeleton className="h-96 w-full" />;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Lista de precios — {channelLabel}</CardTitle>
            <CardDescription>
              Configurá precios específicos para {channelLabel}. Los productos sin precio personalizado usan el precio base.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyFromBase}>
              <Copy className="h-4 w-4 mr-1" />
              Copiar base
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!hasChanges || bulkUpdate.isPending}>
              <Save className="h-4 w-4 mr-1" />
              {bulkUpdate.isPending ? 'Guardando...' : `Guardar${hasChanges ? ` (${Object.keys(editedPrices).length})` : ''}`}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="border rounded-lg max-h-[60vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Precio Base</TableHead>
                <TableHead className="text-right w-40">Precio {channelLabel}</TableHead>
                <TableHead className="text-right w-24">Dif.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map(item => {
                const channelPrice = getPrice(item.id, item.precio_base);
                const diff = channelPrice - item.precio_base;
                const diffPct = item.precio_base > 0 ? (diff / item.precio_base * 100) : 0;
                const isEdited = editedPrices[item.id] !== undefined;

                return (
                  <TableRow key={item.id} className={isEdited ? 'bg-yellow-50/50' : ''}>
                    <TableCell className="font-medium">{item.nombre}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {(item as any).menu_categorias?.nombre || '-'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtCurrency(item.precio_base)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        value={channelPrice}
                        onChange={(e) => handlePriceChange(item.id, e.target.value)}
                        className="w-32 text-right tabular-nums ml-auto h-8"
                        min={0}
                        step={10}
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {diff !== 0 && (
                        <Badge variant={diff > 0 ? 'default' : 'destructive'} className="text-xs">
                          {diff > 0 ? '+' : ''}{diffPct.toFixed(0)}%
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function UnifyPricesDialog({ open, onOpenChange, priceLists }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  priceLists: PriceList[];
}) {
  const unify = useUnifyPrices();
  const [selectedChannels, setSelectedChannels] = useState<Set<Channel>>(new Set());
  const [mode, setMode] = useState<'all' | 'apps'>('all');

  const handleUnifyAll = () => {
    setSelectedChannels(new Set(CHANNELS.map(c => c.value)));
    setMode('all');
  };

  const handleUnifyApps = () => {
    setSelectedChannels(new Set(['rappi', 'pedidos_ya', 'mp_delivery']));
    setMode('apps');
  };

  const handleConfirm = () => {
    unify.mutate(
      { source: 'default', targetChannels: Array.from(selectedChannels) },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  const toggleChannel = (ch: Channel) => {
    setSelectedChannels(prev => {
      const next = new Set(prev);
      if (next.has(ch)) next.delete(ch);
      else next.add(ch);
      return next;
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unificar precios</AlertDialogTitle>
          <AlertDialogDescription>
            Copiar el precio base (Mostrador) a los canales seleccionados. Esto sobreescribirá los precios actuales.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleUnifyAll} className="flex-1">
              <Link2 className="h-4 w-4 mr-1" />
              Todos los canales
            </Button>
            <Button variant="outline" size="sm" onClick={handleUnifyApps} className="flex-1">
              <Link2 className="h-4 w-4 mr-1" />
              Solo Apps (Rappi, PY, MP)
            </Button>
          </div>
          <div className="space-y-2">
            {CHANNELS.filter(c => c.value !== 'mostrador').map(ch => (
              <label key={ch.value} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={selectedChannels.has(ch.value)}
                  onCheckedChange={() => toggleChannel(ch.value)}
                />
                <span className="text-sm">{ch.label}</span>
              </label>
            ))}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={selectedChannels.size === 0 || unify.isPending}
          >
            {unify.isPending ? 'Unificando...' : `Unificar ${selectedChannels.size} canales`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
