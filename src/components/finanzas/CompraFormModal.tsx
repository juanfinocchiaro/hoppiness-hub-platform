import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2 } from 'lucide-react';
import { useFacturaMutations } from '@/hooks/useCompras';
import { useProveedores } from '@/hooks/useProveedores';
import { useInsumos } from '@/hooks/useInsumos';
import { CONDICION_PAGO_OPTIONS, FACTURA_TIPO_OPTIONS, getCurrentPeriodo } from '@/types/compra';
import { UNIDAD_OPTIONS } from '@/types/financial';
import { FormSection } from '@/components/ui/forms-pro';
import type { ItemFacturaFormData } from '@/types/compra';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
}

const emptyItem = (): ItemFacturaFormData => ({
  insumo_id: '',
  cantidad: 0,
  unidad: 'kg',
  precio_unitario: 0,
  subtotal: 0,
  afecta_costo_base: true,
});

export function CompraFormModal({ open, onOpenChange, branchId }: Props) {
  const { create } = useFacturaMutations();
  const { data: proveedores } = useProveedores(branchId);
  const { data: insumos } = useInsumos();

  const [form, setForm] = useState({
    proveedor_id: '',
    factura_tipo: '',
    factura_numero: '',
    factura_fecha: new Date().toISOString().slice(0, 10),
    condicion_pago: 'contado',
    fecha_vencimiento: '',
    iva: '',
    otros_impuestos: '',
    tipo: 'normal',
    motivo_extraordinaria: '',
    observaciones: '',
  });

  const [items, setItems] = useState<ItemFacturaFormData[]>([emptyItem()]);

  useEffect(() => {
    if (open) {
      setForm(f => ({ ...f, proveedor_id: '', factura_numero: '', observaciones: '', iva: '', otros_impuestos: '' }));
      setItems([emptyItem()]);
    }
  }, [open]);

  const updateItem = (idx: number, field: string, value: string | number | boolean) => {
    setItems(prev => {
      const updated = [...prev];
      const item = { ...updated[idx], [field]: value };
      if (field === 'cantidad' || field === 'precio_unitario') {
        item.subtotal = Number(item.cantidad) * Number(item.precio_unitario);
      }
      if (field === 'insumo_id' && insumos) {
        const ins = insumos.find(i => i.id === value);
        if (ins) item.unidad = ins.unidad_base;
      }
      updated[idx] = item;
      return updated;
    });
  };

  const subtotalItems = items.reduce((s, i) => s + (i.subtotal || 0), 0);
  const ivaNum = parseFloat(form.iva) || 0;
  const otrosNum = parseFloat(form.otros_impuestos) || 0;
  const total = subtotalItems + ivaNum + otrosNum;

  const handleSubmit = async () => {
    const validItems = items.filter(i => i.insumo_id && i.cantidad > 0);
    if (!form.proveedor_id || !form.factura_numero || validItems.length === 0) return;

    await create.mutateAsync({
      branch_id: branchId,
      proveedor_id: form.proveedor_id,
      factura_tipo: form.factura_tipo || undefined,
      factura_numero: form.factura_numero,
      factura_fecha: form.factura_fecha,
      condicion_pago: form.condicion_pago,
      fecha_vencimiento: form.fecha_vencimiento || undefined,
      iva: ivaNum,
      otros_impuestos: otrosNum,
      tipo: form.tipo,
      motivo_extraordinaria: form.tipo === 'extraordinaria' ? form.motivo_extraordinaria : undefined,
      periodo: getCurrentPeriodo(),
      observaciones: form.observaciones || undefined,
      items: validItems,
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
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    {idx === 0 && <Label className="text-xs">Insumo</Label>}
                    <Select value={item.insumo_id} onValueChange={v => updateItem(idx, 'insumo_id', v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Insumo..." /></SelectTrigger>
                      <SelectContent>
                        {insumos?.map(i => (
                          <SelectItem key={i.id} value={i.id}>{i.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <Label className="text-xs">Cant.</Label>}
                    <Input type="number" step="0.01" className="h-9" value={item.cantidad || ''} onChange={e => updateItem(idx, 'cantidad', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="col-span-1">
                    {idx === 0 && <Label className="text-xs">Ud.</Label>}
                    <Select value={item.unidad} onValueChange={v => updateItem(idx, 'unidad', v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {UNIDAD_OPTIONS.map(u => (
                          <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <Label className="text-xs">P.Unit</Label>}
                    <Input type="number" step="0.01" className="h-9" value={item.precio_unitario || ''} onChange={e => updateItem(idx, 'precio_unitario', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <Label className="text-xs">Subtotal</Label>}
                    <Input className="h-9 font-mono" value={`$ ${item.subtotal.toLocaleString('es-AR')}`} disabled />
                  </div>
                  <div className="col-span-1">
                    {idx === 0 && <Label className="text-xs">&nbsp;</Label>}
                    {items.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setItems(prev => [...prev, emptyItem()])}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Agregar item
              </Button>
            </div>
          </FormSection>

          <FormSection title="Totales">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Subtotal</Label>
                <Input className="font-mono" value={`$ ${subtotalItems.toLocaleString('es-AR')}`} disabled />
              </div>
              <div>
                <Label className="text-xs">IVA</Label>
                <Input type="number" step="0.01" value={form.iva} onChange={e => set('iva', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Otros Imp.</Label>
                <Input type="number" step="0.01" value={form.otros_impuestos} onChange={e => set('otros_impuestos', e.target.value)} />
              </div>
            </div>
            <div className="mt-2 text-right">
              <span className="text-sm text-muted-foreground mr-2">Total:</span>
              <span className="text-lg font-bold font-mono">$ {total.toLocaleString('es-AR')}</span>
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
                  <Label>Vencimiento</Label>
                  <Input type="date" value={form.fecha_vencimiento} onChange={e => set('fecha_vencimiento', e.target.value)} />
                </div>
              )}
            </div>
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
