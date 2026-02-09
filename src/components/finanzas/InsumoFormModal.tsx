import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormLayout, FormRow, FormSection } from '@/components/ui/forms-pro';
import { StickyActions } from '@/components/ui/forms-pro';
import { Package } from 'lucide-react';
import { LoadingButton } from '@/components/ui/loading-button';
import { useInsumoMutations, useCategoriasInsumo } from '@/hooks/useInsumos';
import { useProveedores } from '@/hooks/useProveedores';
import { UNIDAD_OPTIONS } from '@/types/financial';
import type { Insumo, InsumoFormData } from '@/types/financial';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insumo?: Insumo | null;
}

const EMPTY: InsumoFormData = {
  nombre: '',
  unidad_base: 'kg',
};

export function InsumoFormModal({ open, onOpenChange, insumo }: Props) {
  const { create, update } = useInsumoMutations();
  const { data: categorias } = useCategoriasInsumo();
  const { data: proveedores } = useProveedores();
  const isEdit = !!insumo;

  const [form, setForm] = useState<InsumoFormData>(EMPTY);

  useEffect(() => {
    if (insumo) {
      setForm({
        nombre: insumo.nombre,
        categoria_id: insumo.categoria_id || undefined,
        unidad_base: insumo.unidad_base,
        categoria_pl: insumo.categoria_pl || undefined,
        precio_referencia: insumo.precio_referencia || undefined,
        proveedor_sugerido_id: insumo.proveedor_sugerido_id || undefined,
        descripcion: insumo.descripcion || undefined,
      });
    } else {
      setForm(EMPTY);
    }
  }, [insumo, open]);

  const set = (key: keyof InsumoFormData, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.nombre.trim()) return;

    if (isEdit) {
      await update.mutateAsync({ id: insumo!.id, data: form });
    } else {
      await create.mutateAsync(form);
    }
    onOpenChange(false);
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Insumo' : 'Nuevo Insumo'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <FormSection title="Datos del Insumo" icon={Package}>
            <FormLayout columns={1}>
              <FormRow label="Nombre" required>
                <Input
                  value={form.nombre}
                  onChange={(e) => set('nombre', e.target.value)}
                  placeholder="Nombre del insumo"
                />
              </FormRow>
              <FormLayout columns={2}>
                <FormRow label="Categoría">
                  <Select value={form.categoria_id || 'none'} onValueChange={(v) => set('categoria_id', v === 'none' ? undefined : v)}>
                    <SelectTrigger><SelectValue placeholder="Sin categoría" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin categoría</SelectItem>
                      {categorias?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormRow>
                <FormRow label="Unidad base" required>
                  <Select value={form.unidad_base} onValueChange={(v) => set('unidad_base', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UNIDAD_OPTIONS.map((u) => (
                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormRow>
              </FormLayout>
              <FormLayout columns={2}>
                <FormRow label="Precio referencia ($)">
                  <Input
                    type="number"
                    step="0.01"
                    value={form.precio_referencia ?? ''}
                    onChange={(e) => set('precio_referencia', e.target.value ? Number(e.target.value) : undefined)}
                  />
                </FormRow>
                <FormRow label="Proveedor sugerido">
                  <Select value={form.proveedor_sugerido_id || 'none'} onValueChange={(v) => set('proveedor_sugerido_id', v === 'none' ? undefined : v)}>
                    <SelectTrigger><SelectValue placeholder="Ninguno" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ninguno</SelectItem>
                      {proveedores?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.razon_social}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormRow>
              </FormLayout>
              <FormRow label="Categoría P&L" hint="Para reportes financieros (ej: materia_prima, descartables)">
                <Input value={form.categoria_pl || ''} onChange={(e) => set('categoria_pl', e.target.value)} />
              </FormRow>
              <FormRow label="Descripción">
                <Textarea
                  value={form.descripcion || ''}
                  onChange={(e) => set('descripcion', e.target.value)}
                  rows={2}
                />
              </FormRow>
            </FormLayout>
          </FormSection>

          <StickyActions>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <LoadingButton loading={isPending} onClick={handleSubmit}>
              {isEdit ? 'Guardar' : 'Crear Insumo'}
            </LoadingButton>
          </StickyActions>
        </div>
      </DialogContent>
    </Dialog>
  );
}
