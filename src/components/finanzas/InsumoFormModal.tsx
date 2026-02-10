import { useEffect, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormLayout, FormRow, FormSection } from '@/components/ui/forms-pro';
import { StickyActions } from '@/components/ui/forms-pro';
import { Package, Shield, BarChart3 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { LoadingButton } from '@/components/ui/loading-button';
import { useInsumoMutations } from '@/hooks/useInsumos';
import { useProveedores } from '@/hooks/useProveedores';
import { UNIDAD_OPTIONS, PRESENTACION_OPTIONS, UNIDAD_BASE_OPTIONS } from '@/types/financial';
import { TIPO_ITEM_OPTIONS } from '@/types/rdo';
import { RdoCategorySelector } from '@/components/rdo/RdoCategorySelector';
import type { Insumo, InsumoFormData } from '@/types/financial';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insumo?: Insumo | null;
  context?: 'brand' | 'local';
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
  unidad_base: 'g',
  nivel_control: 'libre',
  tipo_item: 'insumo',
  tracks_stock: false,
  unidad_compra: 'kg',
  unidad_compra_contenido: 1000,
  default_alicuota_iva: 21,
};

const NIVEL_LABELS = {
  obligatorio: { label: '🔒 Obligatorio', desc: 'Proveedor fijo definido por la marca' },
  semi_libre: { label: '🟡 Semi-libre', desc: 'Especificación fija, proveedor flexible' },
  libre: { label: '🟢 Libre', desc: 'Sin restricciones, cualquier marca/proveedor' },
};

export function InsumoFormModal({ open, onOpenChange, insumo, context = 'brand', fixedType }: Props) {
  const { create, update } = useInsumoMutations();
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
        unidad_compra: (insumo as any).unidad_compra || 'kg',
        unidad_compra_contenido: (insumo as any).unidad_compra_contenido || undefined,
        unidad_compra_precio: (insumo as any).unidad_compra_precio || undefined,
        default_alicuota_iva: (insumo as any).default_alicuota_iva ?? 21,
      });
    } else {
      setForm({ ...EMPTY, nivel_control: defaultNivel, tipo_item: fixedType || 'insumo' });
    }
  }, [insumo, open, defaultNivel, fixedType]);

  const set = (key: keyof ExtendedFormData, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // When presentación changes, auto-suggest unidad_base and contenido
  const handlePresentacionChange = (v: string) => {
    const opt = PRESENTACION_OPTIONS.find((o) => o.value === v);
    set('unidad_compra', v);
    if (opt) {
      set('unidad_base', opt.unidadBase);
      if (opt.contenidoDefault) {
        set('unidad_compra_contenido', opt.contenidoDefault);
      }
    }
  };

  const costoUnidadBase = useMemo(() => {
    if (form.unidad_compra_contenido && form.unidad_compra_contenido > 0 && form.unidad_compra_precio) {
      return form.unidad_compra_precio / form.unidad_compra_contenido;
    }
    return null;
  }, [form.unidad_compra_contenido, form.unidad_compra_precio]);

  const costoConIva = useMemo(() => {
    if (costoUnidadBase === null) return null;
    const alicuota = form.default_alicuota_iva != null ? Number(form.default_alicuota_iva) : 0;
    return costoUnidadBase * (1 + alicuota / 100);
  }, [costoUnidadBase, form.default_alicuota_iva]);

  const unidadBaseLabel = UNIDAD_BASE_OPTIONS.find((u) => u.value === form.unidad_base)?.label || form.unidad_base;

  const handleSubmit = async () => {
    if (!form.nombre.trim()) return;

    const payload: any = {
      nombre: form.nombre,
      categoria_id: form.categoria_id || null,
      unidad_base: form.unidad_base,
      categoria_pl: form.categoria_pl || null,
      precio_referencia: costoUnidadBase || form.precio_referencia || null,
      descripcion: form.descripcion || null,
      nivel_control: isBrand ? form.nivel_control : isLocal ? 'libre' : form.nivel_control,
      motivo_control: form.motivo_control || null,
      precio_maximo_sugerido: form.precio_maximo_sugerido || null,
      proveedor_obligatorio_id: form.nivel_control === 'obligatorio' ? (form.proveedor_obligatorio_id || null) : null,
      proveedor_sugerido_id: form.nivel_control === 'semi_libre' ? (form.proveedor_sugerido_id || null) : null,
      tipo_item: fixedType || form.tipo_item || 'insumo',
      rdo_category_code: form.rdo_category_code || null,
      tracks_stock: form.tracks_stock || false,
      unidad_compra: form.unidad_compra || null,
      unidad_compra_contenido: form.unidad_compra_contenido || null,
      unidad_compra_precio: form.unidad_compra_precio || null,
      default_alicuota_iva: form.default_alicuota_iva ?? 21,
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
      ? `Nuevo ${typeLabel}`
      : `Nuevo ${typeLabel} Local`;

  // ── Brand context: compact form ──
  if (isBrand) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <FormRow label="Nombre" required>
              <Input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Ej: Salsa Hoppiness" />
            </FormRow>

            {/* Presentación de compra + IVA */}
            <FormSection title="Presentación y precio" icon={Package}>
              <div className="grid grid-cols-3 gap-3">
                <FormRow label="Presentación" required>
                  <Select value={form.unidad_compra || 'kg'} onValueChange={handlePresentacionChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRESENTACION_OPTIONS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormRow>
                <FormRow label="Contenido" required hint={form.unidad_base}>
                  <Input
                    type="number"
                    step="1"
                    value={form.unidad_compra_contenido ?? ''}
                    onChange={(e) => set('unidad_compra_contenido', e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Ej: 4000"
                  />
                </FormRow>
                <FormRow label="Precio neto ($)" required>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.unidad_compra_precio ?? ''}
                    onChange={(e) => set('unidad_compra_precio', e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Ej: 30000"
                  />
                </FormRow>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Unidad base:</span>
                  <Select value={form.unidad_base} onValueChange={(v) => set('unidad_base', v)}>
                    <SelectTrigger className="h-7 w-auto text-xs px-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIDAD_BASE_OPTIONS.map((u) => (
                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <FormRow label="IVA habitual" hint="Se precarga en facturas">
                  <Select value={form.default_alicuota_iva != null ? String(form.default_alicuota_iva) : 'null'} onValueChange={(v) => set('default_alicuota_iva', v === 'null' ? null : Number(v))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="21">21%</SelectItem>
                      <SelectItem value="10.5">10.5%</SelectItem>
                      <SelectItem value="27">27%</SelectItem>
                      <SelectItem value="0">Exento (0%)</SelectItem>
                      <SelectItem value="null">Sin factura</SelectItem>
                    </SelectContent>
                  </Select>
                </FormRow>
              </div>

              {costoUnidadBase !== null && (
                <div className="mt-3 rounded-md border border-border bg-muted/40 p-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Costo neto por {form.unidad_base}:</span>
                    <span className="font-medium">${costoUnidadBase.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                  </div>
                  {costoConIva !== null && form.default_alicuota_iva != null && form.default_alicuota_iva > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">IVA {form.default_alicuota_iva}%:</span>
                        <span>${(costoConIva - costoUnidadBase).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold border-t border-border pt-1">
                        <span>Costo final por {form.unidad_base}:</span>
                        <span className="text-primary">${costoConIva.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </FormSection>

            {/* Clasificación */}
            <div className="grid grid-cols-2 gap-3">
              <FormRow label="Categoría RDO" required>
                <RdoCategorySelector value={form.rdo_category_code} onChange={(code) => set('rdo_category_code', code)} itemType={fixedType || form.tipo_item} />
              </FormRow>

              {/* Nivel de control */}
              <FormRow label="Nivel de control" required>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => set('nivel_control', 'obligatorio')}
                    className={`flex-1 px-2 py-2 rounded-md border text-xs font-medium transition-colors ${
                      form.nivel_control === 'obligatorio'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    🔒 Obligatorio
                  </button>
                  <button
                    type="button"
                    onClick={() => set('nivel_control', 'semi_libre')}
                    className={`flex-1 px-2 py-2 rounded-md border text-xs font-medium transition-colors ${
                      form.nivel_control === 'semi_libre'
                        ? 'border-yellow-500 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    🟡 Semi-libre
                  </button>
                </div>
              </FormRow>
            </div>

            <FormRow
              label={form.nivel_control === 'obligatorio' ? 'Proveedor Obligatorio' : 'Proveedor Sugerido'}
              required={form.nivel_control === 'obligatorio'}
            >
              <Select
                value={
                  form.nivel_control === 'obligatorio'
                    ? (form.proveedor_obligatorio_id || '')
                    : (form.proveedor_sugerido_id || 'none')
                }
                onValueChange={(v) => {
                  if (form.nivel_control === 'obligatorio') {
                    set('proveedor_obligatorio_id', v);
                  } else {
                    set('proveedor_sugerido_id', v === 'none' ? undefined : v);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {form.nivel_control === 'semi_libre' && <SelectItem value="none">Ninguno</SelectItem>}
                  {proveedores?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.razon_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>

            <FormRow label="Descripción / Notas">
              <Textarea
                value={form.descripcion || ''}
                onChange={(e) => set('descripcion', e.target.value)}
                placeholder="Observaciones sobre el ingrediente, especificaciones, etc."
                rows={3}
              />
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

  // ── Full form (fallback) ──
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
            </FormLayout>
          </FormSection>

          <FormSection title="Categoría" icon={BarChart3}>
            <FormLayout columns={1}>
              <FormRow label="Categoría" required hint="Para el Estado de Resultados">
                <RdoCategorySelector value={form.rdo_category_code} onChange={(code) => set('rdo_category_code', code)} itemType={form.tipo_item} />
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
