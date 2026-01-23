import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { Plus, Search, Edit, Phone, Mail, Store, Loader2, Calendar, Clock, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Supplier = Tables<'suppliers'>;

interface SupplierWithBranches extends Supplier {
  branchCount: number;
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
  order_days: number[];
  delivery_days: number[];
  lead_time_hours: number;
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
  order_days: [],
  delivery_days: [],
  lead_time_hours: 24,
};

const DAY_OPTIONS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
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
        order_days: data.order_days,
        delivery_days: data.delivery_days,
        lead_time_hours: data.lead_time_hours,
      };
      
      if (editingSupplier) {
        const { error } = await supabase
          .from('suppliers')
          .update(payload)
          .eq('id', editingSupplier.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('suppliers')
          .insert(payload);
        if (error) throw error;
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
      order_days: (supplier.order_days as number[]) || [],
      delivery_days: (supplier.delivery_days as number[]) || [],
      lead_time_hours: supplier.lead_time_hours || 24,
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

            {/* Scheduling section */}
            <div className="border-t pt-4 mt-4 space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Configuración de Pedidos
              </h4>
              
              <div className="space-y-2">
                <Label>Días para pedir (se puede pedir estos días)</Label>
                <div className="flex flex-wrap gap-2">
                  {DAY_OPTIONS.map(day => (
                    <Button
                      key={day.value}
                      type="button"
                      variant={formData.order_days.includes(day.value) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        const newDays = formData.order_days.includes(day.value)
                          ? formData.order_days.filter(d => d !== day.value)
                          : [...formData.order_days, day.value].sort();
                        setFormData({ ...formData, order_days: newDays });
                      }}
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Si no seleccionás ninguno, se puede pedir cualquier día</p>
              </div>

              <div className="space-y-2">
                <Label>Días de entrega (el proveedor entrega estos días)</Label>
                <div className="flex flex-wrap gap-2">
                  {DAY_OPTIONS.map(day => (
                    <Button
                      key={day.value}
                      type="button"
                      variant={formData.delivery_days.includes(day.value) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        const newDays = formData.delivery_days.includes(day.value)
                          ? formData.delivery_days.filter(d => d !== day.value)
                          : [...formData.delivery_days, day.value].sort();
                        setFormData({ ...formData, delivery_days: newDays });
                      }}
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead_time" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Anticipación mínima (horas)
                </Label>
                <Input
                  id="lead_time"
                  type="number"
                  min="0"
                  value={formData.lead_time_hours}
                  onChange={(e) => setFormData({ ...formData, lead_time_hours: parseInt(e.target.value) || 24 })}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">Horas de anticipación requeridas para hacer un pedido</p>
              </div>
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
