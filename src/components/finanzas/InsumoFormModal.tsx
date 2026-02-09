import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FormLayout, FormRow, FormSection } from '@/components/ui/forms-pro';
import { StickyActions } from '@/components/ui/forms-pro';
import { Package, Shield, AlertTriangle } from 'lucide-react';
import { Label } from '@/components/ui/label';
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

interface ExtendedFormData extends InsumoFormData {
  nivel_control: 'obligatorio' | 'semi_libre' | 'libre';
  proveedor_obligatorio_id?: string;
  precio_maximo_sugerido?: number;
  motivo_control?: string;
}

const EMPTY: ExtendedFormData = {
  nombre: '',
  unidad_base: 'kg',
  nivel_control: 'libre',
};

const NIVEL_LABELS = {
  obligatorio: { label: '🔒 Obligatorio', desc: 'Proveedor fijo definido por la marca' },
  semi_libre: { label: '🟡 Semi-libre', desc: 'Especificación fija, proveedor flexible' },
  libre: { label: '🟢 Libre', desc: 'Sin restricciones, cualquier marca/proveedor' },
};

export function InsumoFormModal({ open, onOpenChange, insumo }: Props) {
  const { create, update } = useInsumoMutations();
  const { data: categorias } = useCategoriasInsumo();
  const { data: proveedores } = useProveedores();
  const isEdit = !!insumo;

  const [form, setForm] = useState<ExtendedFormData>(EMPTY);

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
        nivel_control: (insumo as any).nivel_control || 'libre',
        proveedor_obligatorio_id: (insumo as any).proveedor_obligatorio_id || undefined,
        precio_maximo_sugerido: (insumo as any).precio_maximo_sugerido || undefined,
        motivo_control: (insumo as any).motivo_control || undefined,
      });
    } else {
      setForm(EMPTY);
    }
  }, [insumo, open]);

  const set = (key: keyof ExtendedFormData, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.nombre.trim()) return;

    const payload: any = {
      nombre: form.nombre,
      categoria_id: form.categoria_id || null,
      unidad_base: form.unidad_base,
      categoria_pl: form.categoria_pl || null,
      precio_referencia: form.precio_referencia || null,
      descripcion: form.descripcion || null,
      nivel_control: form.nivel_control,
      motivo_control: form.motivo_control || null,
      precio_maximo_sugerido: form.precio_maximo_sugerido || null,
      proveedor_obligatorio_id: form.nivel_control === 'obligatorio' ? (form.proveedor_obligatorio_id || null) : null,
      proveedor_sugerido_id: form.nivel_control === 'semi_libre' ? (form.proveedor_sugerido_id || null) :
                              form.nivel_control === 'obligatorio' ? null :
                              (form.proveedor_sugerido_id || null),
    };

    if (isEdit) {
      await update.mutateAsync({ id: insumo!.id, data: payload });
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
            </FormLayout>
          </FormSection>

          <FormSection title="Nivel de Control" icon={Shield}>
            <RadioGroup
              value={form.nivel_control}
              onValueChange={(v) => set('nivel_control', v)}
              className="space-y-2"
            >
              {(Object.entries(NIVEL_LABELS) as [string, { label: string; desc: string }][]).map(([value, { label, desc }]) => (
                <div key={value} className={`flex items-start gap-3 p-3 rounded-lg border ${form.nivel_control === value ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <RadioGroupItem value={value} id={`nivel-${value}`} className="mt-0.5" />
                  <div>
                    <Label htmlFor={`nivel-${value}`} className="font-medium cursor-pointer">{label}</Label>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>

            {form.nivel_control === 'obligatorio' && (
              <div className="mt-3 space-y-3 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                <FormRow label="Proveedor Obligatorio" required>
                  <Select value={form.proveedor_obligatorio_id || ''} onValueChange={(v) => set('proveedor_obligatorio_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar proveedor fijo..." /></SelectTrigger>
                    <SelectContent>
                      {proveedores?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.razon_social}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormRow>
              </div>
            )}

            {form.nivel_control === 'semi_libre' && (
              <div className="mt-3 space-y-3 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                <FormRow label="Proveedor Sugerido">
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
              </div>
            )}

            <FormRow label="Motivo del control" className="mt-3">
              <Input value={form.motivo_control || ''} onChange={(e) => set('motivo_control', e.target.value)} placeholder="Por qué se controla este insumo" />
            </FormRow>
          </FormSection>

          <FormSection title="Precios">
            <FormLayout columns={2}>
              <FormRow label="Precio referencia ($)">
                <Input
                  type="number"
                  step="0.01"
                  value={form.precio_referencia ?? ''}
                  onChange={(e) => set('precio_referencia', e.target.value ? Number(e.target.value) : undefined)}
                />
              </FormRow>
              <FormRow label="Precio máximo sugerido ($)">
                <Input
                  type="number"
                  step="0.01"
                  value={form.precio_maximo_sugerido ?? ''}
                  onChange={(e) => set('precio_maximo_sugerido', e.target.value ? Number(e.target.value) : undefined)}
                />
              </FormRow>
            </FormLayout>
            <FormRow label="Categoría P&L" hint="Para reportes financieros">
              <Input value={form.categoria_pl || ''} onChange={(e) => set('categoria_pl', e.target.value)} />
            </FormRow>
          </FormSection>

          <FormRow label="Descripción">
            <Textarea
              value={form.descripcion || ''}
              onChange={(e) => set('descripcion', e.target.value)}
              rows={2}
            />
          </FormRow>

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
