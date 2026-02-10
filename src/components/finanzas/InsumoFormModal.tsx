import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FormLayout, FormRow, FormSection } from '@/components/ui/forms-pro';
import { StickyActions } from '@/components/ui/forms-pro';
import { Package, Shield, BarChart3 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { LoadingButton } from '@/components/ui/loading-button';
import { useInsumoMutations, useCategoriasInsumo } from '@/hooks/useInsumos';
import { useProveedores } from '@/hooks/useProveedores';
import { UNIDAD_OPTIONS } from '@/types/financial';
import { TIPO_ITEM_OPTIONS } from '@/types/rdo';
import { RdoCategorySelector } from '@/components/rdo/RdoCategorySelector';
import type { Insumo, InsumoFormData } from '@/types/financial';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insumo?: Insumo | null;
  context?: 'brand' | 'local';
  /** When set, hides type dropdown and uses this value */
  fixedType?: 'ingrediente' | 'insumo';
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
  tipo_item: 'insumo',
  tracks_stock: false,
};

const NIVEL_LABELS = {
  obligatorio: { label: '🔒 Obligatorio', desc: 'Proveedor fijo definido por la marca' },
  semi_libre: { label: '🟡 Semi-libre', desc: 'Especificación fija, proveedor flexible' },
  libre: { label: '🟢 Libre', desc: 'Sin restricciones, cualquier marca/proveedor' },
};

export function InsumoFormModal({ open, onOpenChange, insumo, context = 'brand', fixedType }: Props) {
  const { create, update } = useInsumoMutations();
  const { data: categorias } = useCategoriasInsumo();
  const { data: proveedores } = useProveedores();
  const isEdit = !!insumo;
  const isBrand = context === 'brand';
  const isLocal = context === 'local';

  const defaultNivel = isBrand ? 'obligatorio' : 'libre';

  const [form, setForm] = useState<ExtendedFormData>({ ...EMPTY, nivel_control: defaultNivel, tipo_item: fixedType || 'insumo' });

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
        nivel_control: (insumo as any).nivel_control || defaultNivel,
        proveedor_obligatorio_id: (insumo as any).proveedor_obligatorio_id || undefined,
        precio_maximo_sugerido: (insumo as any).precio_maximo_sugerido || undefined,
        motivo_control: (insumo as any).motivo_control || undefined,
        tipo_item: (insumo as any).tipo_item || 'insumo',
        rdo_category_code: (insumo as any).rdo_category_code || undefined,
        tracks_stock: (insumo as any).tracks_stock || false,
      });
    } else {
      setForm({ ...EMPTY, nivel_control: defaultNivel, tipo_item: fixedType || 'insumo' });
    }
  }, [insumo, open, defaultNivel, fixedType]);

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
      nivel_control: isBrand ? 'obligatorio' : isLocal ? 'libre' : form.nivel_control,
      motivo_control: form.motivo_control || null,
      precio_maximo_sugerido: form.precio_maximo_sugerido || null,
      proveedor_obligatorio_id: isBrand ? (form.proveedor_obligatorio_id || null) : null,
      proveedor_sugerido_id: form.nivel_control === 'semi_libre' ? (form.proveedor_sugerido_id || null) :
                              form.nivel_control === 'obligatorio' ? null :
                              (form.proveedor_sugerido_id || null),
      tipo_item: fixedType || form.tipo_item || 'insumo',
      rdo_category_code: form.rdo_category_code || null,
      tracks_stock: form.tracks_stock || false,
    };

    if (isEdit) {
      await update.mutateAsync({ id: insumo!.id, data: payload });
    } else {
      await create.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const isPending = create.isPending || update.isPending;

  const typeLabel = fixedType === 'ingrediente' ? 'Ingrediente' : 'Insumo';
  const title = isEdit
    ? `Editar ${typeLabel}`
    : isBrand
      ? `Nuevo ${typeLabel} Obligatorio`
      : `Nuevo ${typeLabel} Local`;

  // ── Brand context: compact form ──
  if (isBrand) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <FormRow label="Nombre" required>
              <Input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Ej: Bolsa FastFood Hoppiness x1000" />
            </FormRow>

            <FormLayout columns={fixedType ? 1 : 2}>
              {!fixedType && (
                <FormRow label="Tipo" required>
                  <Select value={form.tipo_item || 'insumo'} onValueChange={(v) => set('tipo_item', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIPO_ITEM_OPTIONS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormRow>
              )}
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
              <FormRow label="Categoría interna">
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
              <FormRow label="Proveedor Obligatorio" required>
                <Select value={form.proveedor_obligatorio_id || ''} onValueChange={(v) => set('proveedor_obligatorio_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {proveedores?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.razon_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormRow>
            </FormLayout>

            <FormRow label="Precio de referencia inicial ($)" hint="Se actualizará automáticamente con las compras de los locales">
              <Input
                type="number"
                step="0.01"
                value={form.precio_referencia ?? ''}
                onChange={(e) => set('precio_referencia', e.target.value ? Number(e.target.value) : undefined)}
              />
            </FormRow>

            <FormRow label="Motivo del control">
              <Input value={form.motivo_control || ''} onChange={(e) => set('motivo_control', e.target.value)} placeholder="Ej: Insumo con impresiones de la marca" />
            </FormRow>

            <FormRow label="Descripción">
              <Textarea value={form.descripcion || ''} onChange={(e) => set('descripcion', e.target.value)} rows={2} placeholder="Opcional" />
            </FormRow>

            <StickyActions>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <LoadingButton loading={isPending} onClick={handleSubmit}>
                {isEdit ? 'Guardar' : `Crear ${typeLabel}`}
              </LoadingButton>
            </StickyActions>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Local context: minimal form ──
  if (isLocal) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <FormRow label="Nombre" required>
              <Input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Nombre del insumo" />
            </FormRow>

            <FormLayout columns={2}>
              <FormRow label="Tipo" required>
                <Select value={form.tipo_item || 'insumo'} onValueChange={(v) => set('tipo_item', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPO_ITEM_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
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

            <FormRow label="Descripción">
              <Textarea value={form.descripcion || ''} onChange={(e) => set('descripcion', e.target.value)} rows={2} placeholder="Opcional" />
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

  // ── Full form (fallback, not currently used) ──
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
                <Input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Nombre del insumo" />
              </FormRow>
              <FormLayout columns={2}>
                <FormRow label="Tipo" required>
                  <Select value={form.tipo_item || 'insumo'} onValueChange={(v) => set('tipo_item', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIPO_ITEM_OPTIONS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
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
              <FormRow label="Categoría interna">
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
            </FormLayout>
          </FormSection>

          <FormSection title="Clasificación RDO" icon={BarChart3}>
            <FormLayout columns={1}>
              <FormRow label="Categoría RDO" hint="Para el Estado de Resultados">
                <RdoCategorySelector value={form.rdo_category_code} onChange={(code) => set('rdo_category_code', code)} itemType={form.tipo_item} />
              </FormRow>
              <FormRow label="Trackea Stock">
                <div className="flex items-center gap-2 pt-1">
                  <Switch checked={form.tracks_stock || false} onCheckedChange={(v) => set('tracks_stock', v)} />
                  <span className="text-sm text-muted-foreground">{form.tracks_stock ? 'Sí, controlar stock' : 'No'}</span>
                </div>
              </FormRow>
            </FormLayout>
          </FormSection>

          <FormSection title="Nivel de Control" icon={Shield}>
            <RadioGroup value={form.nivel_control} onValueChange={(v) => set('nivel_control', v)} className="space-y-2">
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
                <Input type="number" step="0.01" value={form.precio_referencia ?? ''} onChange={(e) => set('precio_referencia', e.target.value ? Number(e.target.value) : undefined)} />
              </FormRow>
              <FormRow label="Precio máximo sugerido ($)">
                <Input type="number" step="0.01" value={form.precio_maximo_sugerido ?? ''} onChange={(e) => set('precio_maximo_sugerido', e.target.value ? Number(e.target.value) : undefined)} />
              </FormRow>
            </FormLayout>
          </FormSection>

          <FormRow label="Descripción">
            <Textarea value={form.descripcion || ''} onChange={(e) => set('descripcion', e.target.value)} rows={2} />
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
