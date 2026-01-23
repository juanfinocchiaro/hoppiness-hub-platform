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
import { PageHelp } from '@/components/shared/PageHelp';
import { toast } from 'sonner';
import { Plus, Building2, Store, Search, Phone, Pencil, Trash2, Lock, MessageCircle } from 'lucide-react';
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
  notes: string | null;
  scope: string;
  branch_id: string | null;
  category: string | null;
}

interface BrandSupplierWithProducts extends Supplier {
  products: string[];
}

const SUPPLIER_CATEGORIES = [
  'Bebidas y gaseosas',
  'Verduras y frutas',
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
    notes: '',
  });

  // Fetch brand suppliers (from mandatory products)
  const { data: brandSuppliersData = [], isLoading: loadingBrand } = useQuery({
    queryKey: ['brand-suppliers-with-products'],
    queryFn: async () => {
      // Get all mandatory products with their suppliers
      const { data: mandatoryProducts, error: mpError } = await supabase
        .from('brand_mandatory_products')
        .select(`
          product_name,
          primary_supplier:suppliers!brand_mandatory_products_primary_supplier_id_fkey(id, name, phone, whatsapp, email, address, cuit, notes),
          backup_supplier:suppliers!brand_mandatory_products_backup_supplier_id_fkey(id, name, phone, whatsapp, email, address, cuit, notes),
          category:brand_mandatory_categories(name)
        `)
        .eq('is_active', true);
      
      if (mpError) throw mpError;

      // Group products by supplier
      const supplierMap = new Map<string, BrandSupplierWithProducts>();
      
      mandatoryProducts?.forEach((mp: any) => {
        // Primary supplier
        if (mp.primary_supplier) {
          const existing = supplierMap.get(mp.primary_supplier.id);
          if (existing) {
            existing.products.push(mp.category?.name || mp.product_name);
          } else {
            supplierMap.set(mp.primary_supplier.id, {
              ...mp.primary_supplier,
              scope: 'brand',
              branch_id: null,
              contact_name: null,
              category: null,
              products: [mp.category?.name || mp.product_name],
            });
          }
        }
        // Backup supplier
        if (mp.backup_supplier) {
          const existing = supplierMap.get(mp.backup_supplier.id);
          if (existing) {
            if (!existing.products.includes('(backup)')) {
              existing.products.push('(backup)');
            }
          } else {
            supplierMap.set(mp.backup_supplier.id, {
              ...mp.backup_supplier,
              scope: 'brand',
              branch_id: null,
              contact_name: null,
              category: null,
              products: [`${mp.category?.name || mp.product_name} (backup)`],
            });
          }
        }
      });

      // Remove duplicates from products array
      supplierMap.forEach((supplier) => {
        supplier.products = [...new Set(supplier.products)];
      });

      return Array.from(supplierMap.values());
    },
  });

  // Fetch local suppliers
  const { data: localSuppliers = [], isLoading: loadingLocal } = useQuery({
    queryKey: ['local-suppliers', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('scope', 'local')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return (data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        contact_name: s.contact_name,
        phone: s.phone,
        whatsapp: s.whatsapp,
        email: s.email,
        address: s.address,
        cuit: s.cuit,
        notes: s.notes,
        scope: 'local',
        branch_id: s.branch_id,
        category: s.category,
      })) as Supplier[];
    },
    enabled: !!branchId,
  });

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

  const openWhatsApp = (phone: string | null) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('54') ? cleanPhone : `54${cleanPhone}`;
    window.open(`https://wa.me/${fullPhone}`, '_blank');
  };

  // Apply search filter
  const filterBrandSuppliers = (list: BrandSupplierWithProducts[]) => {
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(s => 
      s.name.toLowerCase().includes(q) ||
      s.products?.some(p => p.toLowerCase().includes(q))
    );
  };

  const filterLocalSuppliers = (list: Supplier[]) => {
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(s => 
      s.name.toLowerCase().includes(q) ||
      s.category?.toLowerCase().includes(q)
    );
  };

  const isLoading = loadingBrand || loadingLocal;

  if (isLoading) {
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
          Agregar Proveedor
        </Button>
      </div>

      <PageHelp
        id="local-suppliers"
        description="Acá ves todos los proveedores con los que trabajás. Los de marca son obligatorios y no se pueden modificar. Los tuyos los podés agregar, editar o eliminar."
        features={[
          "Ver proveedores obligatorios de marca con su contacto",
          "Agregar proveedores propios para productos libres",
          "Contactar rápido por WhatsApp",
        ]}
        tips={[
          "Los proveedores de marca los define la central de Hoppiness",
          "Para productos como gaseosas, verduras o limpieza, agregá tus propios proveedores",
          "No podés cargar facturas de productos obligatorios si el proveedor no coincide",
        ]}
        defaultCollapsed
      />

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
            <CardTitle className="text-lg">Proveedores de Marca</CardTitle>
          </div>
          <CardDescription>
            Estos proveedores son obligatorios para productos de marca. No podés modificarlos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {filterBrandSuppliers(brandSuppliersData).length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              No hay proveedores de marca configurados
            </p>
          ) : (
            filterBrandSuppliers(brandSuppliersData).map((supplier) => (
              <div 
                key={supplier.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{supplier.name}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {supplier.products.map((product, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {product}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    {supplier.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {supplier.phone}
                      </span>
                    )}
                  </div>
                </div>
                {supplier.whatsapp && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openWhatsApp(supplier.whatsapp)}
                    className="shrink-0"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                )}
              </div>
            ))
          )}
          <p className="text-xs text-muted-foreground text-center pt-2">
            ⓘ No podés editar ni eliminar estos proveedores. Son definidos por la marca.
          </p>
        </CardContent>
      </Card>

      {/* Local Suppliers Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Mis Proveedores</CardTitle>
            </div>
            <Button size="sm" onClick={() => setShowNewDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar
            </Button>
          </div>
          <CardDescription>Proveedores que agregaste para tu local</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {filterLocalSuppliers(localSuppliers).length === 0 ? (
            <div className="text-center py-8">
              <Store className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No tenés proveedores locales todavía</p>
              <Button variant="link" onClick={() => setShowNewDialog(true)}>
                Agregar tu primer proveedor
              </Button>
            </div>
          ) : (
            filterLocalSuppliers(localSuppliers).map(supplier => (
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
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {supplier.whatsapp && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => openWhatsApp(supplier.whatsapp)}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  )}
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
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

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
                  Este proveedor será exclusivo de tu local.
                  Para productos obligatorios (carne, pan, salsas), usá los proveedores de marca.
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
                placeholder="Ej: Distribuidora Norte"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Rubro / Categoría</Label>
              <Select
                value={formData.category || '__none__'}
                onValueChange={(value) => setFormData({ ...formData, category: value === '__none__' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin categoría</SelectItem>
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
              <Label htmlFor="cuit">CUIT</Label>
              <Input
                id="cuit"
                value={formData.cuit}
                onChange={(e) => setFormData({ ...formData, cuit: e.target.value })}
                placeholder="XX-XXXXXXXX-X"
              />
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
              {(createMutation.isPending || updateMutation.isPending) ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
