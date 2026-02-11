import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormRow, FormSection } from '@/components/ui/forms-pro';
import { StickyActions } from '@/components/ui/forms-pro';
import { ChefHat } from 'lucide-react';
import { LoadingButton } from '@/components/ui/loading-button';
import { useMenuCategorias, useMenuProductoMutations } from '@/hooks/useMenu';
import { useInsumos } from '@/hooks/useInsumos';
import { Switch } from '@/components/ui/switch';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  producto?: any;
  preselectedCategoriaId?: string | null;
}

export function MenuProductoFormModal({ open, onOpenChange, producto, preselectedCategoriaId }: Props) {
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
        disponible_delivery: producto.disponible_delivery ?? true,
      });
    } else {
      setForm({
        nombre: '', nombre_corto: '', descripcion: '',
        tipo: 'elaborado', categoria_id: preselectedCategoriaId || '', insumo_id: '',
        disponible_delivery: true,
      });
    }
  }, [producto, open, preselectedCategoriaId]);

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

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
