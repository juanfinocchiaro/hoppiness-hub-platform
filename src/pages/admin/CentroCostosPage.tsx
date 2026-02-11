import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { DataToolbar } from '@/components/ui/data-table-pro';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Percent, AlertTriangle, CheckCircle, TrendingDown, Edit, History, Plus } from 'lucide-react';
import { useCentroCostos, useCambiarPrecioMutation, useHistorialPrecios } from '@/hooks/useMenu';
import { useAuth } from '@/hooks/useAuth';
import { useRdoCategories } from '@/hooks/useRdoCategories';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingButton } from '@/components/ui/loading-button';
import { FormRow } from '@/components/ui/forms-pro';
import { NuevoProductoCentroCostosModal } from '@/components/menu/NuevoProductoCentroCostosModal';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);

export default function CentroCostosPage() {
  const { data: productos, isLoading, stats } = useCentroCostos();
  const { user } = useAuth();
  const { data: rdoCategories } = useRdoCategories();
  const cambiarPrecio = useCambiarPrecioMutation();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filterFC, setFilterFC] = useState<'all' | 'ok' | 'warning' | 'danger'>('all');
  const [precioModal, setPrecioModal] = useState<any>(null);
  const [nuevoPrecio, setNuevoPrecio] = useState(0);
  const [motivo, setMotivo] = useState('');
  const [rdoCode, setRdoCode] = useState('');
  const [historialModal, setHistorialModal] = useState<any>(null);
  const [nuevoProductoOpen, setNuevoProductoOpen] = useState(false);

  const { data: historial } = useHistorialPrecios(historialModal?.menu_producto_id);

  const cmvCategories = useMemo(() => {
    return rdoCategories?.filter((c: any) =>
      c.parent_code === 'CMV' || c.code?.startsWith('cmv')
    ) || [];
  }, [rdoCategories]);

  const filteredProductos = useMemo(() => {
    return productos?.filter((p: any) => {
      const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase());
      let matchFC = true;
      if (filterFC === 'ok') matchFC = p.fc_actual && p.fc_actual <= 32;
      else if (filterFC === 'warning') matchFC = p.fc_actual && p.fc_actual > 32 && p.fc_actual <= 40;
      else if (filterFC === 'danger') matchFC = p.fc_actual && p.fc_actual > 40;
      return matchSearch && matchFC;
    }) || [];
  }, [productos, search, filterFC]);

  const openPrecioModal = (p: any) => {
    setPrecioModal(p);
    setNuevoPrecio(p.precio_sugerido || p.precio_base);
    setRdoCode(p.rdo_category_code || '');
    setMotivo('');
  };

  const handleCambiarPrecio = async () => {
    if (!precioModal || !nuevoPrecio) return;

    // Update rdo_category_code if changed
    if (rdoCode && rdoCode !== precioModal.rdo_category_code) {
      const { error } = await supabase
        .from('menu_productos')
        .update({ rdo_category_code: rdoCode, updated_at: new Date().toISOString() } as any)
        .eq('id', precioModal.menu_producto_id);
      if (error) {
        toast.error(`Error actualizando categoría: ${error.message}`);
        return;
      }
    }

    await cambiarPrecio.mutateAsync({
      productoId: precioModal.menu_producto_id,
      precioAnterior: precioModal.precio_base,
      precioNuevo: nuevoPrecio,
      motivo: motivo || undefined,
      userId: user?.id,
    });

    queryClient.invalidateQueries({ queryKey: ['centro-costos'] });
    setPrecioModal(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Centro de Costos" subtitle="Control de rentabilidad de toda la red" />
        <Button onClick={() => setNuevoProductoOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Nuevo Producto
        </Button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Percent className="w-4 h-4" /> FC Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.fcPromedio?.toFixed(1) || '—'}%</p>
            <p className="text-xs text-muted-foreground">Objetivo: 32%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" /> OK
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-3xl font-bold text-green-600">{stats?.productosOk || 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" /> Atención
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-3xl font-bold text-yellow-600">{stats?.productosWarning || 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-500" /> Críticos
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-3xl font-bold text-red-600">{stats?.productosDanger || 0}</p></CardContent>
        </Card>
      </div>

      {/* FILTERS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <DataToolbar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Buscar producto..." />
        <div className="flex items-center gap-2">
          {(['all', 'ok', 'warning', 'danger'] as const).map((f) => (
            <Button key={f} variant={filterFC === f ? 'default' : 'outline'} size="sm" onClick={() => setFilterFC(f)}>
              {f === 'all' ? 'Todos' : f === 'ok' ? '✓ OK' : f === 'warning' ? '⚠ Atención' : '✕ Críticos'}
            </Button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Producto</TableHead>
              <TableHead>Categoría RDO</TableHead>
              <TableHead className="text-right">Costo Teórico</TableHead>
              <TableHead className="text-right">Precio Actual</TableHead>
              <TableHead className="text-right">FC%</TableHead>
              <TableHead className="text-right">Precio Sugerido</TableHead>
              <TableHead className="w-[120px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredProductos.map((p: any) => (
              <TableRow key={p.menu_producto_id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{p.nombre}</p>
                    <p className="text-xs text-muted-foreground">{p.categoria_nombre}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {p.rdo_category_name || (
                    <span className="text-muted-foreground italic">Sin categoría</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(p.costo_teorico)}</TableCell>
                <TableCell className="text-right font-mono font-medium">{formatCurrency(p.precio_base)}</TableCell>
                <TableCell className="text-right">
                  {p.fc_actual ? (
                    <Badge variant={p.fc_actual <= 32 ? 'default' : p.fc_actual <= 40 ? 'secondary' : 'destructive'}>
                      {p.fc_actual?.toFixed(1)}%
                    </Badge>
                  ) : '—'}
                </TableCell>
                <TableCell className="text-right">
                  {p.precio_sugerido && p.precio_sugerido !== p.precio_base ? (
                    <span className="font-mono text-primary font-medium">{formatCurrency(p.precio_sugerido)}</span>
                  ) : '—'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => openPrecioModal(p)}>
                      <Edit className="w-4 h-4 mr-1" /> Precio
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setHistorialModal(p)}>
                      <History className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* MODAL CAMBIAR PRECIO */}
      <Dialog open={!!precioModal} onOpenChange={() => setPrecioModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cambiar Precio: {precioModal?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Precio actual:</span><span className="font-mono">{formatCurrency(precioModal?.precio_base || 0)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Costo teórico:</span><span className="font-mono">{formatCurrency(precioModal?.costo_teorico || 0)}</span></div>
              {precioModal?.precio_sugerido && <div className="flex justify-between"><span className="text-muted-foreground">Sugerido:</span><span className="font-mono text-primary">{formatCurrency(precioModal.precio_sugerido)}</span></div>}
            </div>
            <FormRow label="Categoría RDO" required>
              <Select value={rdoCode || 'none'} onValueChange={(v) => setRdoCode(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar categoría..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seleccionar...</SelectItem>
                  {cmvCategories.map((c: any) => (
                    <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>
            <FormRow label="Nuevo precio ($)" required>
              <Input type="number" value={nuevoPrecio || ''} onChange={(e) => setNuevoPrecio(Number(e.target.value))} />
            </FormRow>
            <FormRow label="Motivo (opcional)">
              <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} placeholder="Ej: Ajuste por aumento de costos" />
            </FormRow>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPrecioModal(null)}>Cancelar</Button>
              <LoadingButton loading={cambiarPrecio.isPending} onClick={handleCambiarPrecio} disabled={!nuevoPrecio}>
                Confirmar
              </LoadingButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL HISTORIAL */}
      <Dialog open={!!historialModal} onOpenChange={() => setHistorialModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Historial: {historialModal?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {historial?.length ? historial.map((h: any) => (
              <div key={h.id} className="flex justify-between items-center p-2 border rounded text-sm">
                <div>
                  <span className="font-mono">{formatCurrency(h.precio_anterior || 0)} → {formatCurrency(h.precio_nuevo)}</span>
                  {h.motivo && <p className="text-xs text-muted-foreground">{h.motivo}</p>}
                </div>
                <span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleDateString('es-AR')}</span>
              </div>
            )) : <p className="text-sm text-muted-foreground text-center py-4">Sin historial</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL NUEVO PRODUCTO */}
      <NuevoProductoCentroCostosModal open={nuevoProductoOpen} onOpenChange={setNuevoProductoOpen} />
    </div>
  );
}
