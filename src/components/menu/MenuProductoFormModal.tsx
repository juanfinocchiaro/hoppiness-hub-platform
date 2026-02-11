import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormRow, FormSection } from '@/components/ui/forms-pro';
import { StickyActions } from '@/components/ui/forms-pro';
import { ChefHat, DollarSign } from 'lucide-react';
import { LoadingButton } from '@/components/ui/loading-button';
import { useMenuCategorias, useMenuProductoMutations } from '@/hooks/useMenu';
import { useInsumos } from '@/hooks/useInsumos';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  producto?: any;
}

export function MenuProductoFormModal({ open, onOpenChange, producto }: Props) {
  const { create, update } = useMenuProductoMutations();
  const { data: categorias } = useMenuCategorias();
  const { data: insumos } = useInsumos();
  const isEdit = !!producto;

  const productosTerminados = useMemo(() => {
    return insumos?.filter((i: any) => i.tipo_item === 'producto') || [];
  }, [insumos]);

  const [form, setForm] = useState({
    nombre: '',
    nombre_corto: '',
    descripcion: '',
    tipo: 'elaborado' as 'elaborado' | 'terminado',
    categoria_id: '',
    insumo_id: '',
    precio_base: 0,
    fc_objetivo: 32,
    disponible_delivery: true,
  });

  useEffect(() => {
    if (producto) {
      setForm({
        nombre: producto.nombre || '',
        nombre_corto: producto.nombre_corto || '',
        descripcion: producto.descripcion || '',
        tipo: producto.tipo || 'elaborado',
        categoria_id: producto.categoria_id || '',
        insumo_id: producto.insumo_id || '',
        precio_base: producto.menu_precios?.precio_base || 0,
        fc_objetivo: producto.menu_precios?.fc_objetivo || 32,
        disponible_delivery: producto.disponible_delivery ?? true,
      });
    } else {
      setForm({
        nombre: '', nombre_corto: '', descripcion: '',
        tipo: 'elaborado', categoria_id: '', insumo_id: '',
        precio_base: 0, fc_objetivo: 32, disponible_delivery: true,
      });
    }
  }, [producto, open]);

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const costoTerminado = useMemo(() => {
    if (form.tipo === 'terminado' && form.insumo_id) {
      const insumo = productosTerminados.find((i: any) => i.id === form.insumo_id);
      return insumo?.costo_por_unidad_base || 0;
    }
    return 0;
  }, [form.tipo, form.insumo_id, productosTerminados]);

  const fcActual = form.precio_base > 0 && costoTerminado > 0
    ? (costoTerminado / form.precio_base * 100)
    : null;

  const precioSugerido = costoTerminado > 0 && form.fc_objetivo > 0
    ? Math.round(costoTerminado / (form.fc_objetivo / 100))
    : null;

  const handleSubmit = async () => {
    if (!form.nombre.trim()) return;
    if (form.tipo === 'terminado' && !form.insumo_id) return;

    const payload = {
      nombre: form.nombre,
      nombre_corto: form.nombre_corto || null,
      descripcion: form.descripcion || null,
      tipo: form.tipo,
      categoria_id: form.categoria_id || null,
      insumo_id: form.tipo === 'terminado' ? form.insumo_id : null,
      disponible_delivery: form.disponible_delivery,
      precio_base: form.precio_base,
      fc_objetivo: form.fc_objetivo,
    };

    if (isEdit) {
      await update.mutateAsync({ id: producto.id, data: payload });
    } else {
      await create.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar' : 'Nuevo'} Producto</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <FormRow label="Nombre del producto" required>
            <Input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Ej: Hamburguesa Clásica" />
          </FormRow>

          <div className="grid grid-cols-2 gap-3">
            <FormRow label="Nombre corto" hint="Para tickets">
              <Input value={form.nombre_corto} onChange={(e) => set('nombre_corto', e.target.value)} placeholder="Ej: H. Clásica" />
            </FormRow>
            <FormRow label="Categoría">
              <Select value={form.categoria_id || 'none'} onValueChange={(v) => set('categoria_id', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoría</SelectItem>
                  {categorias?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>
          </div>

          <FormRow label="Descripción">
            <Textarea value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} placeholder="Descripción del producto..." rows={2} />
          </FormRow>

          {/* TIPO */}
          <FormSection title="Tipo de producto" icon={ChefHat}>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => set('tipo', 'elaborado')}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${form.tipo === 'elaborado' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                <p className="font-medium">Elaborado</p>
                <p className="text-xs text-muted-foreground">Tiene ficha técnica / receta</p>
              </button>
              <button type="button" onClick={() => set('tipo', 'terminado')}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${form.tipo === 'terminado' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                <p className="font-medium">Terminado</p>
                <p className="text-xs text-muted-foreground">Se vende como viene (bebidas)</p>
              </button>
            </div>

            {form.tipo === 'terminado' && (
              <FormRow label="Producto de origen" required className="mt-4">
                <Select value={form.insumo_id || 'none'} onValueChange={(v) => set('insumo_id', v === 'none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar producto..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seleccionar...</SelectItem>
                    {productosTerminados.map((i: any) => (
                      <SelectItem key={i.id} value={i.id}>{i.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormRow>
            )}
          </FormSection>

          {/* PRECIO */}
          <FormSection title="Precio y Food Cost" icon={DollarSign}>
            <div className="grid grid-cols-2 gap-3">
              <FormRow label="Precio base ($)">
                <Input type="number" step="1" value={form.precio_base || ''} onChange={(e) => set('precio_base', Number(e.target.value))} placeholder="0" />
              </FormRow>
              <FormRow label="FC objetivo (%)" hint="Default: 32%">
                <Input type="number" step="1" value={form.fc_objetivo || ''} onChange={(e) => set('fc_objetivo', Number(e.target.value))} placeholder="32" />
              </FormRow>
            </div>

            {form.tipo === 'terminado' && costoTerminado > 0 && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Costo:</span>
                  <span className="font-mono">${costoTerminado.toLocaleString('es-AR')}</span>
                </div>
                {fcActual !== null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">FC actual:</span>
                    <Badge variant={fcActual <= 32 ? 'default' : fcActual <= 40 ? 'secondary' : 'destructive'}>{fcActual.toFixed(1)}%</Badge>
                  </div>
                )}
                {precioSugerido !== null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Precio sugerido (FC {form.fc_objetivo}%):</span>
                    <span className="font-mono font-medium text-primary">${precioSugerido.toLocaleString('es-AR')}</span>
                  </div>
                )}
              </div>
            )}
          </FormSection>

          {/* DELIVERY */}
          <div className="flex items-center justify-between">
            <span className="text-sm">Disponible para delivery</span>
            <Switch checked={form.disponible_delivery} onCheckedChange={(v) => set('disponible_delivery', v)} />
          </div>

          <StickyActions>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <LoadingButton loading={isPending} onClick={handleSubmit} disabled={!form.nombre || (form.tipo === 'terminado' && !form.insumo_id)}>
              {isEdit ? 'Guardar' : 'Crear Producto'}
            </LoadingButton>
          </StickyActions>
        </div>
      </DialogContent>
    </Dialog>
  );
}
