import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Search, Edit, Phone, Mail, Store, Loader2, Calendar, Clock, MessageCircle, ArrowRight, Trash2, Info } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Supplier = Tables<'suppliers'>;

interface SupplierWithBranches extends Supplier {
  branchCount: number;
}

interface OrderRule {
  id?: string;
  order_shift_day: number;
  delivery_day: number;
  delivery_time: string;
  is_active: boolean;
}

interface SupplierFormData {
  name: string;
  contact_name: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  notes: string;
  is_active: boolean;
  order_rules: OrderRule[];
}

const defaultFormData: SupplierFormData = {
  name: '',
  contact_name: '',
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
  notes: '',
  is_active: true,
  order_rules: [],
};

const DAY_OPTIONS = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miércoles', short: 'Mié' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
];

const TIME_OPTIONS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
];

export default function Suppliers() {
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<SupplierFormData>(defaultFormData);
  
  const queryClient = useQueryClient();

  // Fetch suppliers with branch count
  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['admin-suppliers'],
    queryFn: async () => {
      const { data: suppliersData, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');

      if (error) throw error;
      if (!suppliersData) return [];

      // Get branch counts
      const suppliersWithBranches = await Promise.all(
        suppliersData.map(async (supplier) => {
          const { count } = await supabase
            .from('branch_suppliers')
            .select('id', { count: 'exact', head: true })
            .eq('supplier_id', supplier.id);

          return {
            ...supplier,
            branchCount: count || 0,
          } as SupplierWithBranches;
        })
      );

      return suppliersWithBranches;
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: SupplierFormData) => {
      const payload = {
        name: data.name,
        contact_name: data.contact_name || null,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        email: data.email || null,
        address: data.address || null,
        notes: data.notes || null,
        is_active: data.is_active,
      };
      
      let supplierId: string;
      
      if (editingSupplier) {
        const { error } = await supabase
          .from('suppliers')
          .update(payload)
          .eq('id', editingSupplier.id);
        if (error) throw error;
        supplierId = editingSupplier.id;
        
        // Delete existing rules and recreate
        await supabase
          .from('supplier_order_rules')
          .delete()
          .eq('supplier_id', supplierId);
      } else {
        const { data: newSupplier, error } = await supabase
          .from('suppliers')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        supplierId = newSupplier.id;
      }
      
      // Insert order rules
      if (data.order_rules.length > 0) {
        const rules = data.order_rules.map(rule => ({
          supplier_id: supplierId,
          order_shift_day: rule.order_shift_day,
          delivery_day: rule.delivery_day,
          delivery_time: rule.delivery_time,
          is_active: true,
        }));
        
        const { error: rulesError } = await supabase
          .from('supplier_order_rules')
          .insert(rules);
        if (rulesError) throw rulesError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-suppliers'] });
      toast.success(editingSupplier ? 'Proveedor actualizado' : 'Proveedor creado');
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al guardar proveedor');
    },
  });

  // Load order rules when editing
  useEffect(() => {
    async function loadRules() {
      if (!editingSupplier) return;
      
      const { data } = await supabase
        .from('supplier_order_rules')
        .select('*')
        .eq('supplier_id', editingSupplier.id)
        .order('order_shift_day');
      
      if (data) {
        setFormData(prev => ({
          ...prev,
          order_rules: data.map(r => ({
            id: r.id,
            order_shift_day: r.order_shift_day,
            delivery_day: r.delivery_day,
            delivery_time: r.delivery_time || '12:00',
            is_active: r.is_active,
          })),
        }));
      }
    }
    loadRules();
  }, [editingSupplier]);

  const handleOpenCreate = () => {
    setEditingSupplier(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact_name: supplier.contact_name || '',
      phone: supplier.phone || '',
      whatsapp: supplier.whatsapp || '',
      email: supplier.email || '',
      address: supplier.address || '',
      notes: supplier.notes || '',
      is_active: supplier.is_active,
      order_rules: [], // Will be loaded by useEffect
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSupplier(null);
    setFormData(defaultFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    saveMutation.mutate(formData);
  };
  
  const addOrderRule = () => {
    // Find next available shift day
    const usedDays = formData.order_rules.map(r => r.order_shift_day);
    const nextDay = DAY_OPTIONS.find(d => !usedDays.includes(d.value))?.value ?? 0;
    const deliveryDay = (nextDay + 1) % 7; // Default to next day
    
    setFormData({
      ...formData,
      order_rules: [...formData.order_rules, {
        order_shift_day: nextDay,
        delivery_day: deliveryDay,
        delivery_time: '12:00',
        is_active: true,
      }],
    });
  };
  
  const removeOrderRule = (index: number) => {
    setFormData({
      ...formData,
      order_rules: formData.order_rules.filter((_, i) => i !== index),
    });
  };
  
  const updateOrderRule = (index: number, field: keyof OrderRule, value: number | string) => {
    const newRules = [...formData.order_rules];
    newRules[index] = { ...newRules[index], [field]: value };
    setFormData({ ...formData, order_rules: newRules });
  };

  const filteredSuppliers = suppliers.filter((supplier) =>
    supplier.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Proveedores</h1>
          <p className="text-muted-foreground">Gestión de proveedores de la marca</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Proveedor
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar proveedores..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filteredSuppliers.length} proveedor{filteredSuppliers.length !== 1 ? 'es' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No hay proveedores registrados</p>
              <Button onClick={handleOpenCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar Proveedor
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Sucursales</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{supplier.name}</p>
                        {supplier.contact_name && (
                          <p className="text-sm text-muted-foreground">
                            {supplier.contact_name}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {supplier.phone && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            {supplier.phone}
                          </div>
                        )}
                        {supplier.email && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            {supplier.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        <Store className="w-3 h-3 mr-1" />
                        {supplier.branchCount} sucursal{supplier.branchCount !== 1 ? 'es' : ''}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={supplier.is_active ? 'default' : 'secondary'}>
                        {supplier.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleOpenEdit(supplier)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nombre del proveedor"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_name">Contacto</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  placeholder="Nombre del contacto"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+54 11 1234-5678"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp" className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </Label>
                <Input
                  id="whatsapp"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="+54 9 351 1234567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@proveedor.com"
                />
              </div>
            </div>

            {/* Shift-based Order Rules */}
            <div className="border-t pt-4 mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Reglas de Pedido
                </h4>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={addOrderRule}
                  disabled={formData.order_rules.length >= 7}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar Regla
                </Button>
              </div>
              
              <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm">
                <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <p className="text-muted-foreground">
                  El "día de turno" considera turnos que cruzan medianoche. Si el local abre a las 11:00 y es Lunes 02:00 AM, 
                  todavía se considera turno del <strong>Domingo</strong>.
                </p>
              </div>
              
              {formData.order_rules.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sin reglas configuradas. Se podrá pedir cualquier día.
                </p>
              ) : (
                <div className="space-y-3">
                  {formData.order_rules.map((rule, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                      <div className="flex-1 grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Pedido al cierre del turno</Label>
                          <Select
                            value={String(rule.order_shift_day)}
                            onValueChange={(v) => updateOrderRule(index, 'order_shift_day', parseInt(v))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DAY_OPTIONS.map(day => (
                                <SelectItem key={day.value} value={String(day.value)}>
                                  {day.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <ArrowRight className="h-4 w-4 text-muted-foreground mt-5" />
                        
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Entrega el</Label>
                          <Select
                            value={String(rule.delivery_day)}
                            onValueChange={(v) => updateOrderRule(index, 'delivery_day', parseInt(v))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DAY_OPTIONS.map(day => (
                                <SelectItem key={day.value} value={String(day.value)}>
                                  {day.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Hora</Label>
                          <Select
                            value={rule.delivery_time}
                            onValueChange={(v) => updateOrderRule(index, 'delivery_time', v)}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_OPTIONS.map(time => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOrderRule(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Dirección del proveedor"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionales..."
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Activo</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingSupplier ? 'Guardar Cambios' : 'Crear Proveedor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
