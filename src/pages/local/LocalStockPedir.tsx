import { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Truck, ArrowLeft, MessageCircle, Copy, Phone, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
}

interface IngredientStock {
  id: string;
  name: string;
  current_stock: number;
  min_stock: number | null;
  purchase_unit: string | null;
  supplier_id: string | null;
}

interface OrderItem {
  ingredient_id: string;
  ingredient_name: string;
  current_stock: number;
  min_stock: number;
  suggested_quantity: number;
  order_quantity: number;
  unit: string;
  selected: boolean;
}

export default function LocalStockPedir() {
  const { branch } = useOutletContext<{ branch: Branch }>();
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [ingredientStock, setIngredientStock] = useState<IngredientStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    fetchData();
  }, [branch.id]);

  async function fetchData() {
    setLoading(true);
    try {
      const [suppliersRes, ingredientsRes, stockRes] = await Promise.all([
        supabase.from('suppliers').select('id, name, phone, whatsapp').eq('is_active', true).order('name'),
        supabase.from('ingredients').select('id, name, min_stock, purchase_unit').eq('is_active', true),
        supabase.from('branch_ingredients').select('ingredient_id, current_stock, min_stock_override').eq('branch_id', branch.id)
      ]);

      if (suppliersRes.data) setSuppliers(suppliersRes.data);
      
      if (ingredientsRes.data && stockRes.data) {
        const stockMap = new Map(stockRes.data.map(s => [s.ingredient_id, s]));
        
        const combined = ingredientsRes.data.map(ing => {
          const branchStock = stockMap.get(ing.id);
          return {
            id: ing.id,
            name: ing.name,
            current_stock: branchStock?.current_stock || 0,
            min_stock: branchStock?.min_stock_override ?? ing.min_stock,
            purchase_unit: ing.purchase_unit,
            supplier_id: null
          };
        });
        
        setIngredientStock(combined);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Update items when supplier changes
  useEffect(() => {
    if (!supplierId) {
      setItems([]);
      return;
    }

    // Filter ingredients that need restocking
    const lowStockItems = ingredientStock
      .filter(ing => {
        const minStock = ing.min_stock || 0;
        return ing.current_stock < minStock;
      })
      .map(ing => {
        const minStock = ing.min_stock || 0;
        const deficit = minStock - ing.current_stock;
        // Suggest ordering to reach min_stock + 50% buffer
        const suggested = Math.ceil(deficit + (minStock * 0.5));
        
        return {
          ingredient_id: ing.id,
          ingredient_name: ing.name,
          current_stock: ing.current_stock,
          min_stock: minStock,
          suggested_quantity: suggested,
          order_quantity: suggested,
          unit: ing.purchase_unit || 'un',
          selected: true
        };
      });

    setItems(lowStockItems);
  }, [supplierId, ingredientStock]);

  const selectedSupplier = useMemo(() => 
    suppliers.find(s => s.id === supplierId),
    [suppliers, supplierId]
  );

  const hasWhatsApp = selectedSupplier?.whatsapp || selectedSupplier?.phone;

  function toggleItem(index: number) {
    const newItems = [...items];
    newItems[index].selected = !newItems[index].selected;
    setItems(newItems);
  }

  function updateQuantity(index: number, quantity: number) {
    const newItems = [...items];
    newItems[index].order_quantity = quantity;
    setItems(newItems);
  }

  function addManualItem() {
    // Show all ingredients that aren't already in the list
    const existingIds = new Set(items.map(i => i.ingredient_id));
    const availableIngredients = ingredientStock.filter(i => !existingIds.has(i.id));
    
    if (availableIngredients.length === 0) {
      toast.info('Todos los ingredientes ya están en la lista');
      return;
    }

    const firstAvailable = availableIngredients[0];
    setItems([...items, {
      ingredient_id: firstAvailable.id,
      ingredient_name: firstAvailable.name,
      current_stock: firstAvailable.current_stock,
      min_stock: firstAvailable.min_stock || 0,
      suggested_quantity: 0,
      order_quantity: 0,
      unit: firstAvailable.purchase_unit || 'un',
      selected: true
    }]);
  }

  function generateMessage() {
    const selectedItems = items.filter(i => i.selected && i.order_quantity > 0);
    
    if (selectedItems.length === 0) {
      return '';
    }

    const lines = [
      `🍔 PEDIDO - ${branch.name}`,
      `Fecha: ${new Date().toLocaleDateString('es-AR')}`,
      '',
      'Por favor enviarnos:',
      ...selectedItems.map(item => `• ${item.ingredient_name}: ${item.order_quantity} ${item.unit}`),
      '',
      `📍 Dirección: ${branch.address}`,
      branch.phone ? `📞 Contacto: ${branch.phone}` : '',
      notes ? `\nNota: ${notes}` : '',
      '',
      '¡Gracias!'
    ].filter(Boolean);

    return lines.join('\n');
  }

  const message = useMemo(() => generateMessage(), [items, branch, notes]);

  function copyToClipboard() {
    navigator.clipboard.writeText(message);
    toast.success('Mensaje copiado al portapapeles');
  }

  async function sendWhatsApp() {
    const phone = (selectedSupplier?.whatsapp || selectedSupplier?.phone || '').replace(/[^0-9]/g, '');
    
    if (!phone) {
      toast.error('El proveedor no tiene teléfono configurado');
      return;
    }

    // Save order to database
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const selectedItems = items.filter(i => i.selected && i.order_quantity > 0);
      
      const { error } = await supabase.from('supplier_orders').insert({
        branch_id: branch.id,
        supplier_id: supplierId,
        status: 'sent',
        items: selectedItems.map(i => ({
          ingredient_id: i.ingredient_id,
          ingredient_name: i.ingredient_name,
          quantity: i.order_quantity,
          unit: i.unit,
          suggested_quantity: i.suggested_quantity
        })),
        notes: notes || null,
        sent_at: new Date().toISOString(),
        sent_via: 'whatsapp',
        created_by: user?.id
      });

      if (error) throw error;

      // Open WhatsApp
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
      
      toast.success('Pedido registrado y WhatsApp abierto');
      
    } catch (error: any) {
      console.error('Error saving order:', error);
      toast.error('Error al guardar el pedido');
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

  const lowStockCount = ingredientStock.filter(i => {
    const min = i.min_stock || 0;
    return i.current_stock < min;
  }).length;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to={`/local/${branch.id}/stock`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6" />
            Pedir a Proveedor
          </h1>
          <p className="text-muted-foreground">Generar pedido y enviar por WhatsApp</p>
        </div>
        {lowStockCount > 0 && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {lowStockCount} con stock bajo
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Seleccionar Proveedor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

          {selectedSupplier && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {hasWhatsApp ? (
                <>
                  <Phone className="h-4 w-4" />
                  <span>{selectedSupplier.whatsapp || selectedSupplier.phone}</span>
                  <Badge variant="secondary" className="gap-1">
                    <MessageCircle className="h-3 w-3" />
                    WhatsApp disponible
                  </Badge>
                </>
              ) : (
                <span className="text-destructive">Sin teléfono configurado</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {supplierId && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Items a Pedir</CardTitle>
                <Button variant="outline" size="sm" onClick={addManualItem}>
                  + Agregar item
                </Button>
              </div>
              {items.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Sugeridos automáticamente según stock bajo
                </p>
              )}
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay ingredientes con stock bajo para este proveedor.
                  <br />
                  <Button variant="link" onClick={addManualItem}>
                    Agregar manualmente
                  </Button>
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
                    <div className="col-span-1"></div>
                    <div className="col-span-4">Ingrediente</div>
                    <div className="col-span-2 text-right">Stock</div>
                    <div className="col-span-2 text-right">Mín.</div>
                    <div className="col-span-3">Pedir</div>
                  </div>
                  
                  {items.map((item, index) => (
                    <div key={item.ingredient_id} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-1">
                        <Checkbox
                          checked={item.selected}
                          onCheckedChange={() => toggleItem(index)}
                        />
                      </div>
                      <div className="col-span-4 font-medium truncate">
                        {item.ingredient_name}
                      </div>
                      <div className={`col-span-2 text-right ${item.current_stock < item.min_stock ? 'text-destructive font-medium' : ''}`}>
                        {item.current_stock} {item.unit}
                      </div>
                      <div className="col-span-2 text-right text-muted-foreground">
                        {item.min_stock} {item.unit}
                      </div>
                      <div className="col-span-3 flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          value={item.order_quantity || ''}
                          onChange={e => updateQuantity(index, Number(e.target.value))}
                          className="h-8"
                          disabled={!item.selected}
                        />
                        <span className="text-xs text-muted-foreground w-8">{item.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notas para el proveedor</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ej: Entregar mañana antes de las 10am"
                rows={2}
              />
            </CardContent>
          </Card>

          {message && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vista previa del mensaje</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap font-mono">
                  {message}
                </pre>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-4">
            <Link to={`/local/${branch.id}/stock`} className="flex-1">
              <Button variant="outline" className="w-full">
                Cancelar
              </Button>
            </Link>
            <Button variant="outline" onClick={copyToClipboard} disabled={!message}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar Texto
            </Button>
            <Button 
              onClick={sendWhatsApp} 
              disabled={!hasWhatsApp || !message || saving}
              className="flex-1"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {saving ? 'Enviando...' : 'Enviar WhatsApp'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
