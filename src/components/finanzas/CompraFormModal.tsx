import { useEffect, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Trash2, Lock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useFacturaMutations } from '@/hooks/useCompras';
import { useProveedores } from '@/hooks/useProveedores';
import { useInsumos } from '@/hooks/useInsumos';
import { useConceptosServicio } from '@/hooks/useConceptosServicio';
import { CONDICION_PAGO_OPTIONS, FACTURA_TIPO_OPTIONS, IVA_OPTIONS, getCurrentPeriodo } from '@/types/compra';
import { UNIDAD_OPTIONS } from '@/types/financial';
import { FormSection } from '@/components/ui/forms-pro';
import type { ItemFacturaFormData } from '@/types/compra';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
}

interface ItemFormState extends ItemFacturaFormData {
  tipo_item: 'insumo' | 'servicio';
  concepto_servicio_id?: string;
}

const emptyItem = (): ItemFormState => ({
  tipo_item: 'insumo',
  insumo_id: '',
  cantidad: 0,
  unidad: 'kg',
  precio_unitario: 0,
  subtotal: 0,
  afecta_costo_base: true,
  alicuota_iva: 21,
  iva_monto: 0,
  precio_unitario_bruto: 0,
});

/** Recalculate IVA fields based on neto + alicuota */
function recalcIva(item: ItemFormState): ItemFormState {
  const neto = Number(item.precio_unitario) || 0;
  const alicuota = item.alicuota_iva != null ? Number(item.alicuota_iva) : 0;
  const ivaMonto = neto * (alicuota / 100);
  const bruto = neto + ivaMonto;
  const qty = item.tipo_item === 'servicio' ? 1 : (Number(item.cantidad) || 0);
  return {
    ...item,
    iva_monto: Math.round(ivaMonto * 100) / 100,
    precio_unitario_bruto: Math.round(bruto * 100) / 100,
    subtotal: Math.round(bruto * qty * 100) / 100,
  };
}

export function CompraFormModal({ open, onOpenChange, branchId }: Props) {
  const { create } = useFacturaMutations();
  const { data: proveedores } = useProveedores(branchId);
  const { data: insumos } = useInsumos();
  const { data: conceptos } = useConceptosServicio();

  const [form, setForm] = useState({
    proveedor_id: '',
    factura_tipo: '',
    factura_numero: '',
    factura_fecha: new Date().toISOString().slice(0, 10),
    condicion_pago: 'contado',
    tipo: 'normal',
    motivo_extraordinaria: '',
    observaciones: '',
  });

  const selectedProveedor = proveedores?.find(p => p.id === form.proveedor_id);
  const computedVencimiento = (() => {
    if (form.condicion_pago !== 'cuenta_corriente' || !selectedProveedor?.dias_pago_habitual) return undefined;
    const base = new Date(form.factura_fecha);
    base.setDate(base.getDate() + selectedProveedor.dias_pago_habitual);
    return base.toISOString().slice(0, 10);
  })();

  const [items, setItems] = useState<ItemFormState[]>([emptyItem()]);

  useEffect(() => {
    if (open) {
      setForm(f => ({ ...f, proveedor_id: '', factura_numero: '', observaciones: '', condicion_pago: 'contado' }));
      setItems([emptyItem()]);
    }
  }, [open]);

  useEffect(() => {
    if (selectedProveedor?.permite_cuenta_corriente) {
      setForm(f => ({ ...f, condicion_pago: 'cuenta_corriente' }));
    } else {
      setForm(f => ({ ...f, condicion_pago: 'contado' }));
    }
  }, [form.proveedor_id, selectedProveedor]);

  const updateItem = (idx: number, field: string, value: string | number | boolean | null) => {
    setItems(prev => {
      const updated = [...prev];
      let item = { ...updated[idx], [field]: value };

      if (field === 'tipo_item') {
        if (value === 'insumo') {
          item.concepto_servicio_id = undefined;
          item.cantidad = 0;
          item.unidad = 'kg';
        } else {
          item.insumo_id = '';
          item.cantidad = 1;
          item.unidad = '';
        }
        item.precio_unitario = 0;
        item.alicuota_iva = 21;
      }

      if (field === 'insumo_id' && insumos) {
        const ins = insumos.find((i: any) => i.id === value) as any;
        if (ins) {
          item.unidad = ins.unidad_base;
          if (ins.default_alicuota_iva !== undefined) {
            item.alicuota_iva = ins.default_alicuota_iva;
          }
        }
      }

      if (field === 'tipo_item' && value === 'servicio') {
        item.cantidad = 1;
      }

      item = recalcIva(item);
      updated[idx] = item;
      return updated;
    });
  };

  // Totals calculated from items
  const totals = useMemo(() => {
    let subtotalNeto = 0;
    const ivaByRate: Record<number, number> = {};

    items.forEach(item => {
      const neto = Number(item.precio_unitario) || 0;
      const qty = item.tipo_item === 'servicio' ? 1 : (Number(item.cantidad) || 0);
      subtotalNeto += neto * qty;

      const alicuota = item.alicuota_iva != null ? Number(item.alicuota_iva) : -1;
      if (alicuota >= 0) {
        const ivaTotalItem = (neto * (alicuota / 100)) * qty;
        ivaByRate[alicuota] = (ivaByRate[alicuota] || 0) + ivaTotalItem;
      }
    });

    const totalIva = Object.values(ivaByRate).reduce((s, v) => s + v, 0);
    return {
      subtotalNeto: Math.round(subtotalNeto * 100) / 100,
      ivaByRate,
      totalIva: Math.round(totalIva * 100) / 100,
      total: Math.round((subtotalNeto + totalIva) * 100) / 100,
    };
  }, [items]);

  const handleSubmit = async () => {
    const validItems = items.filter(i =>
      i.tipo_item === 'insumo'
        ? i.insumo_id && i.cantidad > 0
        : i.concepto_servicio_id && i.precio_unitario > 0
    );
    if (!form.proveedor_id || !form.factura_numero || validItems.length === 0) return;

    await create.mutateAsync({
      branch_id: branchId,
      proveedor_id: form.proveedor_id,
      factura_tipo: form.factura_tipo || undefined,
      factura_numero: form.factura_numero,
      factura_fecha: form.factura_fecha,
      condicion_pago: form.condicion_pago,
      fecha_vencimiento: computedVencimiento,
      iva: totals.totalIva,
      otros_impuestos: 0,
      tipo: form.tipo,
      motivo_extraordinaria: form.tipo === 'extraordinaria' ? form.motivo_extraordinaria : undefined,
      periodo: getCurrentPeriodo(),
      observaciones: form.observaciones || undefined,
      items: validItems.map(item => ({
        ...item,
      })),
    });
    onOpenChange(false);
  };

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Factura de Proveedor</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <FormSection title="Datos de Factura">
            <div className="space-y-3">
              <div>
                <Label>Proveedor *</Label>
                <Select value={form.proveedor_id} onValueChange={v => set('proveedor_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {proveedores?.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.razon_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.factura_tipo} onValueChange={v => set('factura_tipo', v)}>
                    <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                    <SelectContent>
                      {FACTURA_TIPO_OPTIONS.map(f => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Número *</Label>
                  <Input value={form.factura_numero} onChange={e => set('factura_numero', e.target.value)} placeholder="0003-00012345" />
                </div>
                <div>
                  <Label>Fecha *</Label>
                  <Input type="date" value={form.factura_fecha} onChange={e => set('factura_fecha', e.target.value)} />
                </div>
              </div>
            </div>
          </FormSection>

          <FormSection title="Items de la Factura">
            <div className="space-y-4">
              {items.map((item, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <RadioGroup
                      value={item.tipo_item}
                      onValueChange={v => updateItem(idx, 'tipo_item', v)}
                      className="flex gap-4"
                    >
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem value="insumo" id={`tipo-insumo-${idx}`} />
                        <Label htmlFor={`tipo-insumo-${idx}`} className="text-sm font-normal cursor-pointer">Insumo</Label>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem value="servicio" id={`tipo-servicio-${idx}`} />
                        <Label htmlFor={`tipo-servicio-${idx}`} className="text-sm font-normal cursor-pointer">Servicio</Label>
                      </div>
                    </RadioGroup>
                    {items.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>

                  {item.tipo_item === 'insumo' ? (() => {
                    const selectedInsumo = insumos?.find((i: any) => i.id === item.insumo_id) as any;
                    const nivel = selectedInsumo?.nivel_control;
                    const precioRef = selectedInsumo?.precio_referencia ? Number(selectedInsumo.precio_referencia) : null;
                    const precioMax = selectedInsumo?.precio_maximo_sugerido ? Number(selectedInsumo.precio_maximo_sugerido) : null;
                    const isOverpriced = precioMax && item.precio_unitario > precioMax;
                    const provObligatorio = selectedInsumo?.proveedor_obligatorio;
                    const wrongProvider = nivel === 'obligatorio' && provObligatorio && form.proveedor_id && form.proveedor_id !== provObligatorio.id;

                    return (
                      <div className="space-y-2">
                        {/* Row 1: Insumo + Cantidad */}
                        <div className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-6">
                            <Label className="text-xs">Insumo *</Label>
                            <Select value={item.insumo_id} onValueChange={v => updateItem(idx, 'insumo_id', v)}>
                              <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                              <SelectContent>
                                {insumos?.filter((i: any) => i.activo !== false).map((i: any) => (
                                  <SelectItem key={i.id} value={i.id}>
                                    {i.nivel_control === 'obligatorio' ? '🔒 ' : i.nivel_control === 'semi_libre' ? '🟡 ' : '🟢 '}{i.nombre}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-3">
                            <Label className="text-xs">Cant. *</Label>
                            <Input type="number" step="0.01" className="h-9" value={item.cantidad || ''} onChange={e => updateItem(idx, 'cantidad', parseFloat(e.target.value) || 0)} />
                          </div>
                          <div className="col-span-3">
                            <Label className="text-xs">Unidad</Label>
                            <Select value={item.unidad} onValueChange={v => updateItem(idx, 'unidad', v)}>
                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {UNIDAD_OPTIONS.map(u => (
                                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {/* Row 2: P.Neto + IVA + Subtotal */}
                        <div className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-4">
                            <Label className="text-xs">P.Neto *</Label>
                            <Input type="number" step="0.01" className="h-9" value={item.precio_unitario || ''} onChange={e => updateItem(idx, 'precio_unitario', parseFloat(e.target.value) || 0)} />
                          </div>
                          <div className="col-span-4">
                            <Label className="text-xs">IVA</Label>
                            <Select
                              value={item.alicuota_iva != null ? String(item.alicuota_iva) : 'null'}
                              onValueChange={v => updateItem(idx, 'alicuota_iva', v === 'null' ? null : parseFloat(v))}
                            >
                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {IVA_OPTIONS.map(o => (
                                  <SelectItem key={String(o.value)} value={String(o.value)}>{o.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-4">
                            <Label className="text-xs">Subtotal</Label>
                            <Input className="h-9 font-mono" value={`$ ${item.subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`} disabled />
                          </div>
                        </div>
                        {/* Desglose */}
                        {item.precio_unitario > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Neto: ${Number(item.precio_unitario).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            {item.alicuota_iva != null && item.alicuota_iva > 0 && (
                              <> | IVA {item.alicuota_iva}%: ${(item.iva_monto || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</>
                            )}
                            {' '}| Bruto: ${(item.precio_unitario_bruto || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </p>
                        )}
                        {selectedInsumo && (
                          <div className="space-y-1">
                            {nivel === 'obligatorio' && (
                              <div className="flex items-center gap-2 text-xs">
                                <Badge variant="destructive" className="gap-1 text-xs"><Lock className="w-3 h-3" />Obligatorio</Badge>
                                {provObligatorio && <span className="text-muted-foreground">Proveedor fijo: {provObligatorio.razon_social}</span>}
                              </div>
                            )}
                            {nivel === 'semi_libre' && (
                              <div className="flex items-center gap-2 text-xs">
                                <Badge variant="secondary" className="gap-1 text-xs"><AlertTriangle className="w-3 h-3" />Semi-libre</Badge>
                                {selectedInsumo.proveedor_sugerido && <span className="text-muted-foreground">Sugerido: {selectedInsumo.proveedor_sugerido.razon_social}</span>}
                              </div>
                            )}
                            {wrongProvider && (
                              <p className="text-xs text-destructive font-medium">
                                ⚠️ Este insumo solo puede comprarse a {provObligatorio.razon_social}
                              </p>
                            )}
                            {precioRef && item.precio_unitario > 0 && (
                              <p className={`text-xs ${isOverpriced ? 'text-destructive' : 'text-muted-foreground'}`}>
                                Ref: ${precioRef.toLocaleString('es-AR')}{precioMax ? ` / Máx: $${precioMax.toLocaleString('es-AR')}` : ''}
                                {isOverpriced && ' ⚠️ Precio por encima del máximo'}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })() : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-5">
                          <Label className="text-xs">Concepto *</Label>
                          <Select value={item.concepto_servicio_id || ''} onValueChange={v => updateItem(idx, 'concepto_servicio_id', v)}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar concepto..." /></SelectTrigger>
                            <SelectContent>
                              {conceptos?.filter((c: any) => c.visible_local !== false).map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-3">
                          <Label className="text-xs">Monto Neto *</Label>
                          <Input type="number" step="0.01" className="h-9" value={item.precio_unitario || ''} onChange={e => updateItem(idx, 'precio_unitario', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">IVA</Label>
                          <Select
                            value={item.alicuota_iva != null ? String(item.alicuota_iva) : 'null'}
                            onValueChange={v => updateItem(idx, 'alicuota_iva', v === 'null' ? null : parseFloat(v))}
                          >
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {IVA_OPTIONS.map(o => (
                                <SelectItem key={String(o.value)} value={String(o.value)}>{o.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Subtotal</Label>
                          <Input className="h-9 font-mono" value={`$ ${item.subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`} disabled />
                        </div>
                      </div>
                      {item.precio_unitario > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Neto: ${Number(item.precio_unitario).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          {item.alicuota_iva != null && item.alicuota_iva > 0 && (
                            <> | IVA {item.alicuota_iva}%: ${(item.iva_monto || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</>
                          )}
                          {' '}| Bruto: ${(item.precio_unitario_bruto || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setItems(prev => [...prev, emptyItem()])}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Agregar item
              </Button>
            </div>
          </FormSection>

          <FormSection title="Totales">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal Neto</span>
                <span className="font-mono">$ {totals.subtotalNeto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
              {[21, 10.5, 27].map(rate => {
                const amount = totals.ivaByRate[rate] || 0;
                if (amount === 0) return null;
                return (
                  <div key={rate} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IVA {rate}%</span>
                    <span className="font-mono">$ {Math.round(amount * 100 / 100).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                  </div>
                );
              })}
              <div className="border-t pt-2 flex justify-between font-medium">
                <span>Total Factura</span>
                <span className="text-lg font-bold font-mono">$ {totals.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </FormSection>

          <FormSection title="Condición de Pago">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Condición</Label>
                <Select value={form.condicion_pago} onValueChange={v => set('condicion_pago', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDICION_PAGO_OPTIONS.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.condicion_pago === 'cuenta_corriente' && (
                <div>
                  <Label>Vencimiento (automático)</Label>
                  {computedVencimiento ? (
                    <Input value={new Date(computedVencimiento + 'T12:00:00').toLocaleDateString('es-AR')} disabled className="font-mono" />
                  ) : (
                    <p className="text-xs text-muted-foreground pt-2">
                      {selectedProveedor ? 'Configure "Días de pago" en el proveedor para calcular vencimiento automáticamente.' : 'Seleccione un proveedor.'}
                    </p>
                  )}
                </div>
              )}
            </div>
            {form.condicion_pago === 'cuenta_corriente' && selectedProveedor?.dias_pago_habitual && (
              <p className="text-xs text-muted-foreground mt-1">
                Regla: {selectedProveedor.dias_pago_habitual} días desde fecha de factura
              </p>
            )}
          </FormSection>

          <div>
            <Label>Observaciones</Label>
            <Textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)} rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={create.isPending || !form.proveedor_id || !form.factura_numero}>
              {create.isPending ? 'Guardando...' : 'Guardar Factura'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
