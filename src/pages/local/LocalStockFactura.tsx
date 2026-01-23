import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { FileText, Upload, Plus, Trash2, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Tables } from '@/integrations/supabase/types';
import { useMandatoryProducts, validateSupplierForIngredient, createPurchaseAlert } from '@/hooks/useMandatoryProducts';

type Branch = Tables<'branches'>;

interface InvoiceItem {
  ingredient_id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  subtotal: number;
}

interface Supplier {
  id: string;
  name: string;
}

interface Ingredient {
  id: string;
  name: string;
  purchase_unit: string | null;
}

export default function LocalStockFactura() {
  const { branch } = useOutletContext<{ branch: Branch }>();
  const { data: mandatoryProducts = [] } = useMandatoryProducts();
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Validation state
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form state
  const [supplierId, setSupplierId] = useState('');
  const [invoiceType, setInvoiceType] = useState('factura_a');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [subtotal, setSubtotal] = useState<number | ''>('');
  const [taxAmount, setTaxAmount] = useState<number | ''>('');
  const [total, setTotal] = useState<number | ''>('');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'partial'>('pending');
  const [paidAmount, setPaidAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState('transferencia');
  const [notes, setNotes] = useState('');
  const [includeItems, setIncludeItems] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>([]);

  useEffect(() => {
    fetchData();
  }, [branch.id]);

  async function fetchData() {
    setLoading(true);
    try {
      const [suppliersRes, ingredientsRes] = await Promise.all([
        supabase.from('suppliers').select('id, name').eq('is_active', true).order('name'),
        supabase.from('ingredients').select('id, name, purchase_unit').eq('is_active', true).order('name')
      ]);

      if (suppliersRes.data) setSuppliers(suppliersRes.data);
      if (ingredientsRes.data) setIngredients(ingredientsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Auto-calculate subtotal from total if tax is provided
  useEffect(() => {
    if (total && taxAmount) {
      const calculatedSubtotal = Number(total) - Number(taxAmount);
      if (calculatedSubtotal > 0) {
        setSubtotal(calculatedSubtotal);
      }
    }
  }, [total, taxAmount]);

  function addItem() {
    setItems([...items, {
      ingredient_id: '',
      ingredient_name: '',
      quantity: 0,
      unit: '',
      unit_price: 0,
      subtotal: 0
    }]);
  }

  function updateItem(index: number, field: keyof InvoiceItem, value: any) {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Update ingredient name and unit when ingredient is selected
    if (field === 'ingredient_id') {
      const ingredient = ingredients.find(i => i.id === value);
      if (ingredient) {
        newItems[index].ingredient_name = ingredient.name;
        newItems[index].unit = ingredient.purchase_unit || '';
      }
    }
    
    // Calculate subtotal
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].subtotal = newItems[index].quantity * newItems[index].unit_price;
    }
    
    setItems(newItems);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!supplierId || !total) {
      toast.error('Proveedor y total son requeridos');
      return;
    }

    // Validate mandatory products if items are included
    if (includeItems && items.length > 0 && mandatoryProducts.length > 0) {
      const validItems = items.filter(item => item.ingredient_id && item.quantity > 0);
      const alertsToCreate: Array<{ mandatoryProductId: string; details?: Record<string, any> }> = [];
      
      for (const item of validItems) {
        const validation = await validateSupplierForIngredient(
          item.ingredient_id,
          supplierId,
          branch.id,
          mandatoryProducts
        );
        
        if (!validation.isValid) {
          setValidationError(validation.blockReason || 'Proveedor no autorizado para este producto');
          return;
        }
        
        if (validation.requiresAlert && validation.mandatoryProduct) {
          alertsToCreate.push({
            mandatoryProductId: validation.mandatoryProduct.id,
            details: { ingredient_name: item.ingredient_name, quantity: item.quantity }
          });
        }
      }
      
      // Create alerts for backup usage
      for (const alert of alertsToCreate) {
        await createPurchaseAlert(
          branch.id,
          'backup_used',
          alert.mandatoryProductId,
          supplierId,
          alert.details
        );
      }
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('supplier_invoices')
        .insert({
          branch_id: branch.id,
          supplier_id: supplierId,
          invoice_type: invoiceType,
          invoice_number: invoiceNumber || null,
          invoice_date: invoiceDate,
          due_date: dueDate || null,
          subtotal: subtotal || null,
          tax_amount: taxAmount || 0,
          total: Number(total),
          status: paymentStatus,
          paid_amount: paymentStatus === 'paid' ? Number(total) : (paidAmount || 0),
          payment_method: paymentStatus !== 'pending' ? paymentMethod : null,
          paid_at: paymentStatus === 'paid' ? new Date().toISOString() : null,
          notes: notes || null,
          created_by: user?.id
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items if included
      if (includeItems && items.length > 0) {
        const validItems = items.filter(item => item.ingredient_id && item.quantity > 0);
        
        if (validItems.length > 0) {
          const { error: itemsError } = await supabase
            .from('supplier_invoice_items')
            .insert(validItems.map(item => ({
              invoice_id: invoice.id,
              ingredient_id: item.ingredient_id,
              description: item.ingredient_name,
              quantity: item.quantity,
              unit: item.unit,
              unit_price: item.unit_price,
              subtotal: item.subtotal
            })));

          if (itemsError) throw itemsError;

          // Create stock movements for each item
          for (const item of validItems) {
            await supabase.from('stock_movements').insert({
              branch_id: branch.id,
              ingredient_id: item.ingredient_id,
              quantity: item.quantity,
              type: 'purchase',
              reference_type: 'supplier_invoice',
              reference_id: invoice.id,
              unit_cost: item.unit_price,
              notes: `Factura ${invoiceNumber || invoice.id.slice(0, 8)}`
            });
          }
        }
      }

      toast.success('Factura cargada correctamente');
      
      // Reset form
      setSupplierId('');
      setInvoiceNumber('');
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setDueDate('');
      setSubtotal('');
      setTaxAmount('');
      setTotal('');
      setPaymentStatus('pending');
      setPaidAmount('');
      setNotes('');
      setItems([]);
      setIncludeItems(false);

    } catch (error: any) {
      console.error('Error saving invoice:', error);
      toast.error(error.message || 'Error al guardar la factura');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to={`/local/${branch.id}/stock`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Cargar Factura de Proveedor
          </h1>
          <p className="text-muted-foreground">Registrar compra y actualizar stock</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos del comprobante */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Datos del Comprobante</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="supplier">Proveedor *</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Comprobante *</Label>
              <Select value={invoiceType} onValueChange={setInvoiceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="factura_a">Factura A</SelectItem>
                  <SelectItem value="factura_b">Factura B</SelectItem>
                  <SelectItem value="factura_c">Factura C</SelectItem>
                  <SelectItem value="ticket">Ticket</SelectItem>
                  <SelectItem value="remito">Remito</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="number">Número de Comprobante</Label>
              <Input
                id="number"
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
                placeholder="0001-00012345"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Fecha de Factura *</Label>
              <Input
                id="date"
                type="date"
                value={invoiceDate}
                onChange={e => setInvoiceDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="dueDate">Fecha de Vencimiento</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Montos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Montos</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="subtotal">Subtotal (sin IVA)</Label>
              <Input
                id="subtotal"
                type="number"
                step="0.01"
                value={subtotal}
                onChange={e => setSubtotal(e.target.value ? Number(e.target.value) : '')}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax">IVA</Label>
              <Input
                id="tax"
                type="number"
                step="0.01"
                value={taxAmount}
                onChange={e => setTaxAmount(e.target.value ? Number(e.target.value) : '')}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total">Total *</Label>
              <Input
                id="total"
                type="number"
                step="0.01"
                value={total}
                onChange={e => setTotal(e.target.value ? Number(e.target.value) : '')}
                placeholder="0.00"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Items (opcional)</CardTitle>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="includeItems"
                  checked={includeItems}
                  onCheckedChange={(checked) => setIncludeItems(checked === true)}
                />
                <Label htmlFor="includeItems" className="text-sm font-normal">
                  Cargar detalle para actualizar stock
                </Label>
              </div>
            </div>
          </CardHeader>
          {includeItems && (
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="grid gap-2 md:grid-cols-6 items-end border-b pb-4">
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-xs">Ingrediente</Label>
                    <Select
                      value={item.ingredient_id}
                      onValueChange={v => updateItem(index, 'ingredient_id', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {ingredients.map(i => (
                          <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Cantidad</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={item.quantity || ''}
                      onChange={e => updateItem(index, 'quantity', Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Unidad</Label>
                    <Input
                      value={item.unit}
                      onChange={e => updateItem(index, 'unit', e.target.value)}
                      placeholder="kg, un, lt"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Precio U.</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unit_price || ''}
                      onChange={e => updateItem(index, 'unit_price', Number(e.target.value))}
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Subtotal</Label>
                      <Input
                        value={`$${item.subtotal.toFixed(2)}`}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addItem} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Item
              </Button>
            </CardContent>
          )}
        </Card>

        {/* Estado de pago */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estado de Pago</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={paymentStatus} onValueChange={(v: any) => setPaymentStatus(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="paid" id="paid" />
                <Label htmlFor="paid">Pagada ahora</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pending" id="pending" />
                <Label htmlFor="pending">Pendiente de pago (a cuenta corriente)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="partial" id="partial" />
                <Label htmlFor="partial">Pago parcial</Label>
              </div>
            </RadioGroup>

            {paymentStatus === 'partial' && (
              <div className="space-y-2">
                <Label>Monto pagado</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={paidAmount}
                  onChange={e => setPaidAmount(e.target.value ? Number(e.target.value) : '')}
                  placeholder="0.00"
                />
              </div>
            )}

            {paymentStatus !== 'pending' && (
              <div className="space-y-2">
                <Label>Método de pago</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notas internas</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Notas adicionales..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Link to={`/local/${branch.id}/stock`} className="flex-1">
            <Button type="button" variant="outline" className="w-full">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? 'Guardando...' : 'Guardar Factura'}
          </Button>
        </div>
      </form>

      {/* Validation Error Dialog */}
      <AlertDialog open={!!validationError} onOpenChange={() => setValidationError(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              No se puede guardar
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left whitespace-pre-line">
              {validationError}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setValidationError(null)}>
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
