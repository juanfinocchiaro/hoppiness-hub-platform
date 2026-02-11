import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormRow, FormSection } from '@/components/ui/forms-pro';
import { StickyActions } from '@/components/ui/forms-pro';
import { Package, DollarSign } from 'lucide-react';
import { LoadingButton } from '@/components/ui/loading-button';
import { useInsumoMutations } from '@/hooks/useInsumos';
import { useProveedores } from '@/hooks/useProveedores';
import { PRESENTACION_OPTIONS, UNIDAD_BASE_OPTIONS } from '@/types/financial';
import { RdoCategorySelector } from '@/components/rdo/RdoCategorySelector';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  producto?: any;
}

export function ProductoFormModal({ open, onOpenChange, producto }: Props) {
  const { create, update } = useInsumoMutations();
  const { data: proveedores } = useProveedores();
  const isEdit = !!producto;

  const [form, setForm] = useState({
    nombre: '',
    unidad_compra: 'pack' as string,
    unidad_compra_contenido: 1,
    unidad_compra_precio: 0,
    precio_venta: 0,
    nivel_control: 'obligatorio' as string,
    proveedor_obligatorio_id: '',
    rdo_category_code: '',
    descripcion: '',
  });

  useEffect(() => {
    if (producto) {
      setForm({
        nombre: producto.nombre || '',
        unidad_compra: producto.unidad_compra || 'pack',
        unidad_compra_contenido: producto.unidad_compra_contenido || 1,
        unidad_compra_precio: producto.unidad_compra_precio || 0,
        precio_venta: producto.precio_venta || 0,
        nivel_control: producto.nivel_control || 'obligatorio',
        proveedor_obligatorio_id: producto.proveedor_obligatorio_id || producto.proveedor_sugerido_id || '',
        rdo_category_code: producto.rdo_category_code || '',
        descripcion: producto.descripcion || '',
      });
    } else {
      setForm({
        nombre: '',
        unidad_compra: 'pack',
        unidad_compra_contenido: 1,
        unidad_compra_precio: 0,
        precio_venta: 0,
        nivel_control: 'obligatorio',
        proveedor_obligatorio_id: '',
        rdo_category_code: '',
        descripcion: '',
      });
    }
  }, [producto, open]);

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const costoUnitario = useMemo(() => {
    if (form.unidad_compra_contenido > 0 && form.unidad_compra_precio > 0) {
      return form.unidad_compra_precio / form.unidad_compra_contenido;
    }
    return 0;
  }, [form.unidad_compra_contenido, form.unidad_compra_precio]);

  const cmvPorcentaje = form.precio_venta > 0 && costoUnitario > 0 ? (costoUnitario / form.precio_venta) * 100 : 0;
  const margenBruto = form.precio_venta - costoUnitario;

  const handleSubmit = async () => {
    if (!form.nombre.trim() || !form.precio_venta) return;

    const payload: any = {
      nombre: form.nombre,
      tipo_item: 'producto',
      unidad_base: 'un',
      unidad_compra: form.unidad_compra,
      unidad_compra_contenido: form.unidad_compra_contenido,
      unidad_compra_precio: form.unidad_compra_precio,
      precio_venta: form.precio_venta,
      nivel_control: form.nivel_control,
      proveedor_obligatorio_id: form.nivel_control === 'obligatorio' ? (form.proveedor_obligatorio_id || null) : null,
      proveedor_sugerido_id: form.nivel_control === 'semi_libre' ? (form.proveedor_obligatorio_id || null) : null,
      rdo_category_code: form.rdo_category_code || null,
      descripcion: form.descripcion || null,
      default_alicuota_iva: null,
    };

    if (isEdit) {
      await update.mutateAsync({ id: producto.id, data: payload });
    } else {
      await create.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const isPending = create.isPending || update.isPending;

  const cmvColor =
    cmvPorcentaje <= 30 ? 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400' :
    cmvPorcentaje <= 45 ? 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400' :
    'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <FormRow label="Nombre del producto" required>
            <Input
              value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              placeholder="Ej: Coca-Cola Lata 354ml"
            />
          </FormRow>

          <FormSection title="Presentación de compra" icon={Package}>
            <div className="grid grid-cols-3 gap-3">
              <FormRow label="Presentación" required>
                <Select value={form.unidad_compra} onValueChange={(v) => set('unidad_compra', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRESENTACION_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormRow>
              <FormRow label="Contenido" required hint="unidades">
                <Input
                  type="number"
                  value={form.unidad_compra_contenido || ''}
                  onChange={(e) => set('unidad_compra_contenido', Number(e.target.value))}
                  placeholder="Ej: 24"
                />
              </FormRow>
              <FormRow label="Costo del pack ($)" required hint="con todo incluido">
                <Input
                  type="number"
                  step="0.01"
                  value={form.unidad_compra_precio || ''}
                  onChange={(e) => set('unidad_compra_precio', Number(e.target.value))}
                  placeholder="Ej: 12000"
                />
              </FormRow>
            </div>
            {costoUnitario > 0 && (
              <div className="mt-3 rounded-md border border-border bg-muted/40 p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Costo por unidad:</span>
                  <span className="font-semibold text-primary">${costoUnitario.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}
          </FormSection>

          <FormSection title="Precio de venta" icon={DollarSign}>
            <div className="grid grid-cols-2 gap-4">
              <FormRow label="Precio de venta ($)" required>
                <Input
                  type="number"
                  step="0.01"
                  value={form.precio_venta || ''}
                  onChange={(e) => set('precio_venta', Number(e.target.value))}
                  placeholder="Ej: 1500"
                />
              </FormRow>
              <div className="space-y-2">
                <p className="text-sm font-medium">CMV</p>
                {form.precio_venta > 0 && costoUnitario > 0 ? (
                  <div className="h-9 flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cmvColor}`}>
                      {cmvPorcentaje.toFixed(1)}%
                    </span>
                    <span className="font-mono text-sm text-muted-foreground">
                      (Margen: ${margenBruto.toLocaleString('es-AR', { minimumFractionDigits: 2 })})
                    </span>
                  </div>
                ) : (
                  <p className="h-9 flex items-center text-sm text-muted-foreground">Completá los precios</p>
                )}
              </div>
            </div>

            {form.precio_venta > 0 && costoUnitario > 0 && (
              <div className="flex items-center justify-between text-sm bg-muted/50 p-3 rounded-lg mt-2">
                <span>Costo: <strong>${costoUnitario.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong></span>
                <span className="text-muted-foreground">→</span>
                <span>Venta: <strong>${form.precio_venta.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong></span>
                <span className="text-muted-foreground">→</span>
                <span className="text-green-600 dark:text-green-400">Ganás: <strong>${margenBruto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong></span>
              </div>
            )}
          </FormSection>

          <div className="grid grid-cols-3 gap-3">
            <FormRow label="Nivel de control">
              <Select value={form.nivel_control} onValueChange={(v) => set('nivel_control', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="obligatorio">Obligatorio</SelectItem>
                  <SelectItem value="semi_libre">Sugerido</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>
            <FormRow label="Categoría RDO">
              <RdoCategorySelector value={form.rdo_category_code} onChange={(code) => set('rdo_category_code', code)} itemType="producto" />
            </FormRow>
            <FormRow label="Proveedor">
              <Select value={form.proveedor_obligatorio_id || 'none'} onValueChange={(v) => set('proveedor_obligatorio_id', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin proveedor</SelectItem>
                  {proveedores?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.razon_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>
          </div>

          <FormRow label="Descripción / Notas">
            <Textarea
              value={form.descripcion || ''}
              onChange={(e) => set('descripcion', e.target.value)}
              placeholder="Observaciones sobre el producto"
              rows={2}
            />
          </FormRow>

          <StickyActions>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <LoadingButton loading={isPending} onClick={handleSubmit} disabled={!form.nombre || !form.precio_venta}>
              {isEdit ? 'Guardar' : 'Crear Producto'}
            </LoadingButton>
          </StickyActions>
        </div>
      </DialogContent>
    </Dialog>
  );
}
