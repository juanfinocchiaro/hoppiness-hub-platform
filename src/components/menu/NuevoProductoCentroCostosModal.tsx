import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormRow, FormSection } from '@/components/ui/forms-pro';
import { StickyActions } from '@/components/ui/forms-pro';
import { ChefHat, DollarSign, Tag, Eye } from 'lucide-react';
import { LoadingButton } from '@/components/ui/loading-button';
import { useInsumos } from '@/hooks/useInsumos';
import { useRdoCategories } from '@/hooks/useRdoCategories';
import { useMenuProductoMutations, useCambiarPrecioMutation } from '@/hooks/useMenu';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);

export function NuevoProductoCentroCostosModal({ open, onOpenChange }: Props) {
  const { data: insumos } = useInsumos();
  const { data: rdoCategories } = useRdoCategories();
  const { create } = useMenuProductoMutations();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const productosTerminados = useMemo(() => {
    return insumos?.filter((i: any) => i.tipo_item === 'producto') || [];
  }, [insumos]);

  const [form, setForm] = useState({
    nombre: '',
    tipo: 'elaborado' as 'elaborado' | 'terminado',
    insumo_id: '',
    rdo_category_code: '',
    precio_venta: 0,
    fc_objetivo: 32,
    visible_en_carta: true,
  });

  useEffect(() => {
    if (open) {
      setForm({
        nombre: '', tipo: 'elaborado', insumo_id: '',
        rdo_category_code: '', precio_venta: 0, fc_objetivo: 32,
        visible_en_carta: true,
      });
    }
  }, [open]);

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const costoInsumo = useMemo(() => {
    if (form.tipo === 'terminado' && form.insumo_id) {
      const insumo = productosTerminados.find((i: any) => i.id === form.insumo_id);
      return insumo?.costo_por_unidad_base || 0;
    }
    return 0;
  }, [form.tipo, form.insumo_id, productosTerminados]);

  const fcActual = form.precio_venta > 0 && costoInsumo > 0
    ? (costoInsumo / form.precio_venta * 100)
    : null;

  const precioSugerido = costoInsumo > 0 && form.fc_objetivo > 0
    ? Math.round(costoInsumo / (form.fc_objetivo / 100))
    : null;

  const handleSubmit = async () => {
    if (!form.nombre.trim() || !form.rdo_category_code || !form.precio_venta) return;
    if (form.tipo === 'terminado' && !form.insumo_id) return;

    setLoading(true);
    try {
      // 1. Create product
      const { data: producto, error: errProd } = await supabase
        .from('menu_productos')
        .insert({
          nombre: form.nombre,
          tipo: form.tipo,
          insumo_id: form.tipo === 'terminado' ? form.insumo_id : null,
          rdo_category_code: form.rdo_category_code,
          visible_en_carta: form.visible_en_carta,
        } as any)
        .select()
        .single();

      if (errProd) throw errProd;

      // 2. Create price
      const { error: errPrecio } = await supabase
        .from('menu_precios')
        .insert({
          menu_producto_id: producto.id,
          precio_base: form.precio_venta,
          fc_objetivo: form.fc_objetivo,
        } as any);

      if (errPrecio) throw errPrecio;

      queryClient.invalidateQueries({ queryKey: ['centro-costos'] });
      queryClient.invalidateQueries({ queryKey: ['menu-productos'] });
      toast.success('Producto creado');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const cmvCategories = useMemo(() => {
    return rdoCategories?.filter((c: any) => 
      c.parent_code === 'CMV' || c.code?.startsWith('cmv')
    ) || [];
  }, [rdoCategories]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Producto</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <FormRow label="Nombre del producto" required>
            <Input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Ej: Hamburguesa Clásica" />
          </FormRow>

          <FormSection title="Tipo de producto" icon={ChefHat}>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => set('tipo', 'elaborado')}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${form.tipo === 'elaborado' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                <p className="font-medium">Elaborado</p>
                <p className="text-xs text-muted-foreground">Tiene receta (hamburguesa)</p>
              </button>
              <button type="button" onClick={() => set('tipo', 'terminado')}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${form.tipo === 'terminado' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                <p className="font-medium">Terminado</p>
                <p className="text-xs text-muted-foreground">Se vende como viene (bebidas)</p>
              </button>
            </div>

            {form.tipo === 'terminado' && (
              <FormRow label="Producto del catálogo" required className="mt-4">
                <Select value={form.insumo_id || 'none'} onValueChange={(v) => set('insumo_id', v === 'none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar producto..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seleccionar...</SelectItem>
                    {productosTerminados.map((i: any) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.nombre} - {formatCurrency(i.costo_por_unidad_base || 0)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormRow>
            )}

            {form.tipo === 'elaborado' && (
              <p className="text-sm text-muted-foreground mt-4 p-3 bg-muted/50 rounded-lg">
                💡 Después de crear el producto, podrás agregar la ficha técnica desde la Carta.
              </p>
            )}
          </FormSection>

          <FormSection title="Clasificación" icon={Tag}>
            <FormRow label="Categoría RDO" required>
              <Select value={form.rdo_category_code || 'none'} onValueChange={(v) => set('rdo_category_code', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar categoría..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seleccionar...</SelectItem>
                  {cmvCategories.map((c: any) => (
                    <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>
          </FormSection>

          <FormSection title="Precio de venta" icon={DollarSign}>
            <div className="grid grid-cols-2 gap-4">
              <FormRow label="Precio de venta ($)" required>
                <Input type="number" step="1" value={form.precio_venta || ''} onChange={(e) => set('precio_venta', Number(e.target.value))} placeholder="Ej: 4500" />
              </FormRow>
              <FormRow label="FC objetivo (%)">
                <Input type="number" step="1" value={form.fc_objetivo || ''} onChange={(e) => set('fc_objetivo', Number(e.target.value))} placeholder="32" />
              </FormRow>
            </div>

            {form.tipo === 'terminado' && costoInsumo > 0 && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Costo:</span>
                  <span className="font-mono">{formatCurrency(costoInsumo)}</span>
                </div>
                {fcActual !== null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">FC actual:</span>
                    <Badge variant={fcActual <= 32 ? 'default' : fcActual <= 40 ? 'secondary' : 'destructive'}>
                      {fcActual.toFixed(1)}%
                    </Badge>
                  </div>
                )}
                {precioSugerido !== null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Precio sugerido (FC {form.fc_objetivo}%):</span>
                    <span className="font-mono font-medium text-primary">{formatCurrency(precioSugerido)}</span>
                  </div>
                )}
              </div>
            )}
          </FormSection>

          {/* VISIBILIDAD */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm">Visible en la carta</span>
              <Switch checked={form.visible_en_carta} onCheckedChange={(v) => set('visible_en_carta', v)} />
            </div>
            <p className="text-xs text-muted-foreground">
              Desactivá para productos base que solo se usan en combos
            </p>
          </div>

          <StickyActions>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <LoadingButton
              loading={loading}
              onClick={handleSubmit}
              disabled={!form.nombre || !form.rdo_category_code || !form.precio_venta || (form.tipo === 'terminado' && !form.insumo_id)}
            >
              Crear Producto
            </LoadingButton>
          </StickyActions>
        </div>
      </DialogContent>
    </Dialog>
  );
}
