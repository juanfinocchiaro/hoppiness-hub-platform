import { useState } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Building2, Store, Search, Phone, Pencil, Trash2, DollarSign, ChevronRight } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  cuit: string | null;
  tax_condition: string | null;
  notes: string | null;
  scope: string;
  branch_id: string | null;
  category: string | null;
}

interface SupplierBalance {
  supplier_id: string;
  balance: number;
}

const SUPPLIER_CATEGORIES = [
  'Artículos de limpieza',
  'Descartables',
  'Mantenimiento',
  'Servicios',
  'Insumos generales',
  'Otro',
];

export default function LocalComprasProveedores() {
  const { branchId } = useParams();
  const { branch } = useOutletContext<{ branch: Branch }>();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    cuit: '',
    tax_condition: '',
    notes: '',
  });

  // Fetch suppliers
  const { data: suppliers, isLoading: loadingSuppliers } = useQuery({
    queryKey: ['local-suppliers', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .or(`scope.eq.brand,and(scope.eq.local,branch_id.eq.${branchId})`)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return (data || []).map(s => ({
        ...s,
        tax_condition: s.tax_condition || null,
      })) as Supplier[];
    },
    enabled: !!branchId,
  });

  // Balances - simplified since table may not exist
  const balances: SupplierBalance[] = [];

  // Create supplier
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('suppliers').insert({
        name: data.name,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        email: data.email || null,
        address: data.address || null,
        cuit: data.cuit || null,
        tax_condition: data.tax_condition || null,
        notes: data.notes || null,
        category: data.category || null,
        scope: 'local',
        branch_id: branchId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local-suppliers'] });
      toast.success('Proveedor creado');
      setShowNewDialog(false);
      resetForm();
    },
    onError: () => {
      toast.error('Error al crear proveedor');
    },
  });

  // Update supplier
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase.from('suppliers').update({
        name: data.name,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        email: data.email || null,
        address: data.address || null,
        cuit: data.cuit || null,
        tax_condition: data.tax_condition || null,
        notes: data.notes || null,
        category: data.category || null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local-suppliers'] });
      toast.success('Proveedor actualizado');
      setEditingSupplier(null);
      resetForm();
    },
    onError: () => {
      toast.error('Error al actualizar proveedor');
    },
  });

  // Delete supplier
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('suppliers')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local-suppliers'] });
      toast.success('Proveedor eliminado');
    },
    onError: () => {
      toast.error('Error al eliminar proveedor');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      phone: '',
      whatsapp: '',
      email: '',
      address: '',
      cuit: '',
      tax_condition: '',
      notes: '',
    });
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      category: supplier.category || '',
      phone: supplier.phone || '',
      whatsapp: supplier.whatsapp || '',
      email: supplier.email || '',
      address: supplier.address || '',
      cuit: supplier.cuit || '',
      tax_condition: supplier.tax_condition || '',
      notes: supplier.notes || '',
    });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getBalance = (supplierId: string): number => {
    return balances?.find(b => b.supplier_id === supplierId)?.balance || 0;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Split suppliers by scope
  const brandSuppliers = suppliers?.filter(s => s.scope === 'brand') || [];
  const localSuppliers = suppliers?.filter(s => s.scope === 'local') || [];
  
  // Apply search filter
  const filterSuppliers = (list: Supplier[]) => {
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(s => 
      s.name.toLowerCase().includes(q) ||
      s.category?.toLowerCase().includes(q)
    );
  };

  const totalDebt = suppliers?.reduce((sum, s) => sum + getBalance(s.id), 0) || 0;

  if (loadingSuppliers) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Proveedores</h1>
          <p className="text-muted-foreground">{branch?.name}</p>
        </div>
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Proveedor
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar proveedor..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Brand Suppliers Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Proveedores de Ingredientes</CardTitle>
          </div>
          <CardDescription>Definidos por la marca · Solo lectura</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {filterSuppliers(brandSuppliers).length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              No hay proveedores de marca
            </p>
          ) : (
            filterSuppliers(brandSuppliers).map(supplier => (
              <div 
                key={supplier.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{supplier.name}</span>
                    {supplier.category && (
                      <Badge variant="secondary" className="text-xs">
                        {supplier.category}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    {supplier.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {supplier.phone}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Saldo: {formatCurrency(getBalance(supplier.id))}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Local Suppliers Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Proveedores del Local</CardTitle>
          </div>
          <CardDescription>Agregados por este local · Editables</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {filterSuppliers(localSuppliers).length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              No hay proveedores locales
            </p>
          ) : (
            filterSuppliers(localSuppliers).map(supplier => (
              <div 
                key={supplier.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{supplier.name}</span>
                    {supplier.category && (
                      <Badge variant="secondary" className="text-xs">
                        {supplier.category}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    {supplier.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {supplier.phone}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Saldo: {formatCurrency(getBalance(supplier.id))}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleEdit(supplier)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => deleteMutation.mutate(supplier.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="p-4 border rounded-lg bg-muted/30">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Total a pagar:</span>
          <span className="text-xl font-bold">{formatCurrency(totalDebt)}</span>
        </div>
      </div>

      {/* New/Edit Supplier Dialog */}
      <Dialog 
        open={showNewDialog || !!editingSupplier} 
        onOpenChange={(open) => {
          if (!open) {
            setShowNewDialog(false);
            setEditingSupplier(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
            </DialogTitle>
            <DialogDescription>
              {!editingSupplier && (
                <>
                  Este proveedor será exclusivo de este local.
                  Para proveedores de ingredientes, contactá a la marca.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del proveedor *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Limpieza Total"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Rubro / Categoría</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPLIER_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="351-5551234"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="351-5551234"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="proveedor@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cuit">CUIT</Label>
                <Input
                  id="cuit"
                  value={formData.cuit}
                  onChange={(e) => setFormData({ ...formData, cuit: e.target.value })}
                  placeholder="XX-XXXXXXXX-X"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax_condition">Condición IVA</Label>
                <Select
                  value={formData.tax_condition}
                  onValueChange={(value) => setFormData({ ...formData, tax_condition: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="responsable_inscripto">Resp. Inscripto</SelectItem>
                    <SelectItem value="monotributista">Monotributista</SelectItem>
                    <SelectItem value="exento">Exento</SelectItem>
                    <SelectItem value="consumidor_final">Consumidor Final</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionales..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowNewDialog(false);
                setEditingSupplier(null);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingSupplier ? 'Guardar Cambios' : 'Crear Proveedor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
