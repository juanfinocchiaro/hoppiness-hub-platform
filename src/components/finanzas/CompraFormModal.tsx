import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCompraMutations } from '@/hooks/useCompras';
import { useProveedores } from '@/hooks/useProveedores';
import { useInsumos } from '@/hooks/useInsumos';
import { TIPO_COMPRA_OPTIONS, CONDICION_PAGO_OPTIONS, MEDIO_PAGO_OPTIONS, FACTURA_TIPO_OPTIONS, getCurrentPeriodo } from '@/types/compra';
import { UNIDAD_OPTIONS } from '@/types/financial';
import { FormSection } from '@/components/ui/forms-pro';

interface CompraFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
}

export function CompraFormModal({ open, onOpenChange, branchId }: CompraFormModalProps) {
  const { create } = useCompraMutations();
  const { data: proveedores } = useProveedores(branchId);
  const { data: insumos } = useInsumos();

  const [form, setForm] = useState({
    proveedor_id: '',
    insumo_id: '',
    cantidad: '',
    unidad: 'kg',
    precio_unitario: '',
    fecha: new Date().toISOString().slice(0, 10),
    tipo_compra: 'regular' as 'regular' | 'extraordinaria',
    condicion_pago: 'contado',
    medio_pago: 'efectivo',
    factura_tipo: '',
    factura_numero: '',
    observaciones: '',
  });

  useEffect(() => {
    if (open) {
      setForm(f => ({ ...f, proveedor_id: '', insumo_id: '', cantidad: '', precio_unitario: '', observaciones: '', factura_numero: '' }));
    }
  }, [open]);

  useEffect(() => {
    if (form.insumo_id && insumos) {
      const insumo = insumos.find(i => i.id === form.insumo_id);
      if (insumo) setForm(f => ({ ...f, unidad: insumo.unidad_base }));
    }
  }, [form.insumo_id, insumos]);

  const subtotal = (parseFloat(form.cantidad) || 0) * (parseFloat(form.precio_unitario) || 0);

  const handleSubmit = async () => {
    if (!form.proveedor_id || !form.insumo_id || !form.cantidad || !form.precio_unitario) return;
    await create.mutateAsync({
      branch_id: branchId,
      proveedor_id: form.proveedor_id,
      insumo_id: form.insumo_id,
      cantidad: parseFloat(form.cantidad),
      unidad: form.unidad,
      precio_unitario: parseFloat(form.precio_unitario),
      fecha: form.fecha,
      periodo: getCurrentPeriodo(),
      tipo_compra: form.tipo_compra,
      condicion_pago: form.condicion_pago,
      medio_pago: form.medio_pago,
      factura_tipo: form.factura_tipo || undefined,
      factura_numero: form.factura_numero || undefined,
      observaciones: form.observaciones || undefined,
    });
    onOpenChange(false);
  };

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Compra</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <FormSection title="Datos principales">
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
              <div>
                <Label>Insumo *</Label>
                <Select value={form.insumo_id} onValueChange={v => set('insumo_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {insumos?.map(i => (
                      <SelectItem key={i.id} value={i.id}>{i.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cantidad *</Label>
                  <Input type="number" step="0.01" value={form.cantidad} onChange={e => set('cantidad', e.target.value)} />
                </div>
                <div>
                  <Label>Unidad</Label>
                  <Select value={form.unidad} onValueChange={v => set('unidad', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UNIDAD_OPTIONS.map(u => (
                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Precio Unitario *</Label>
                  <Input type="number" step="0.01" value={form.precio_unitario} onChange={e => set('precio_unitario', e.target.value)} />
                </div>
                <div>
                  <Label>Subtotal</Label>
                  <Input value={`$ ${subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`} disabled />
                </div>
              </div>
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
              </div>
            </div>
          </FormSection>

          <FormSection title="Pago y Facturación">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.tipo_compra} onValueChange={v => set('tipo_compra', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIPO_COMPRA_OPTIONS.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Medio de Pago</Label>
                  <Select value={form.medio_pago} onValueChange={v => set('medio_pago', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MEDIO_PAGO_OPTIONS.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo Factura</Label>
                  <Select value={form.factura_tipo} onValueChange={v => set('factura_tipo', v)}>
                    <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>
                      {FACTURA_TIPO_OPTIONS.map(f => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.factura_tipo && form.factura_tipo !== 'sin_factura' && (
                <div>
                  <Label>Nº Factura</Label>
                  <Input value={form.factura_numero} onChange={e => set('factura_numero', e.target.value)} />
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
            <Button onClick={handleSubmit} disabled={create.isPending || !form.proveedor_id || !form.insumo_id}>
              {create.isPending ? 'Guardando...' : 'Registrar Compra'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
