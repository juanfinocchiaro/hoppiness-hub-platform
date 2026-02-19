import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Shield, 
  ShieldCheck, 
  ShieldOff, 
  Plus, 
  Trash2, 
  Star,
  Building2,
  Package,
  Search
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type SupplierControl = Database['public']['Enums']['supplier_control_type'];

interface Ingredient {
  id: string;
  name: string;
  supplier_control: SupplierControl;
  category: string | null;
}

interface Supplier {
  id: string;
  name: string;
  is_brand_supplier: boolean;
}

interface ApprovedSupplier {
  id: string;
  ingredient_id: string;
  supplier_id: string;
  is_primary: boolean;
  negotiated_price: number | null;
  notes: string | null;
  supplier: Supplier;
}

const CONTROL_LABELS: Record<SupplierControl, { label: string; description: string; icon: React.ReactNode; color: string }> = {
  brand_only: { 
    label: 'Solo Marca', 
    description: 'Solo proveedores aprobados por la marca',
    icon: <ShieldCheck className="w-4 h-4" />,
    color: 'bg-red-100 text-red-800 border-red-200'
  },
  brand_preferred: { 
    label: 'Preferido Marca', 
    description: 'Proveedores de marca preferidos, pero sucursales pueden usar otros',
    icon: <Shield className="w-4 h-4" />,
    color: 'bg-amber-100 text-amber-800 border-amber-200'
  },
  free: { 
    label: 'Libre', 
    description: 'Cada sucursal elige su proveedor',
    icon: <ShieldOff className="w-4 h-4" />,
    color: 'bg-green-100 text-green-800 border-green-200'
  },
};

export default function IngredientSupplierControl() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [approvedSuppliers, setApprovedSuppliers] = useState<ApprovedSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [controlFilter, setControlFilter] = useState<string>('all');
  
  // Dialog state
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [negotiatedPrice, setNegotiatedPrice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    const [ingredientsRes, suppliersRes, approvedRes] = await Promise.all([
      supabase.from('ingredients').select('id, name, supplier_control, category').eq('is_active', true).order('name'),
      supabase.from('suppliers').select('id, name, is_brand_supplier').eq('is_active', true).order('name'),
      supabase.from('ingredient_approved_suppliers').select(`
        id, ingredient_id, supplier_id, is_primary, negotiated_price, notes,
        supplier:suppliers(id, name, is_brand_supplier)
      `)
    ]);

    if (ingredientsRes.data) setIngredients(ingredientsRes.data);
    if (suppliersRes.data) setSuppliers(suppliersRes.data);
    if (approvedRes.data) {
      setApprovedSuppliers(approvedRes.data.map(a => ({
        ...a,
        supplier: a.supplier as unknown as Supplier
      })));
    }
    
    setLoading(false);
  };

  const handleControlChange = async (ingredientId: string, control: SupplierControl) => {
    const { error } = await supabase
      .from('ingredients')
      .update({ supplier_control: control })
      .eq('id', ingredientId);

    if (error) {
      toast.error('Error al actualizar control');
    } else {
      toast.success('Control actualizado');
      setIngredients(prev => 
        prev.map(i => i.id === ingredientId ? { ...i, supplier_control: control } : i)
      );
    }
  };

  const handleAddApprovedSupplier = async () => {
    if (!selectedIngredient || !selectedSupplierId) return;

    setSaving(true);
    const { error } = await supabase
      .from('ingredient_approved_suppliers')
      .insert({
        ingredient_id: selectedIngredient.id,
        supplier_id: selectedSupplierId,
        is_primary: isPrimary,
        negotiated_price: negotiatedPrice ? parseFloat(negotiatedPrice) : null,
      });

    if (error) {
      if (error.code === '23505') {
        toast.error('Este proveedor ya está aprobado para este ingrediente');
      } else {
        toast.error('Error al agregar proveedor');
      }
    } else {
      toast.success('Proveedor aprobado agregado');
      setShowAddDialog(false);
      resetDialogForm();
      fetchData();
    }
    setSaving(false);
  };

  const handleRemoveApprovedSupplier = async (approvalId: string) => {
    const { error } = await supabase
      .from('ingredient_approved_suppliers')
      .delete()
      .eq('id', approvalId);

    if (error) {
      toast.error('Error al eliminar');
    } else {
      toast.success('Proveedor removido');
      setApprovedSuppliers(prev => prev.filter(a => a.id !== approvalId));
    }
  };

  const handleSetPrimary = async (approvalId: string, ingredientId: string) => {
    // First, unset all as primary for this ingredient
    await supabase
      .from('ingredient_approved_suppliers')
      .update({ is_primary: false })
      .eq('ingredient_id', ingredientId);

    // Then set the selected one as primary
    const { error } = await supabase
      .from('ingredient_approved_suppliers')
      .update({ is_primary: true })
      .eq('id', approvalId);

    if (error) {
      toast.error('Error al actualizar');
    } else {
      toast.success('Proveedor primario actualizado');
      fetchData();
    }
  };

  const resetDialogForm = () => {
    setSelectedSupplierId('');
    setIsPrimary(false);
    setNegotiatedPrice('');
  };

  const openAddDialog = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    resetDialogForm();
    setShowAddDialog(true);
  };

  const getApprovedForIngredient = (ingredientId: string) => {
    return approvedSuppliers.filter(a => a.ingredient_id === ingredientId);
  };

  const getAvailableSuppliers = (ingredientId: string) => {
    const approved = getApprovedForIngredient(ingredientId).map(a => a.supplier_id);
    return suppliers.filter(s => !approved.includes(s.id));
  };

  const filteredIngredients = ingredients.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase());
    const matchesControl = controlFilter === 'all' || i.supplier_control === controlFilter;
    return matchesSearch && matchesControl;
  });

  const formatPrice = (price: number | null) => {
    if (!price) return '-';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(price);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Control de Proveedores</h1>
        <p className="text-muted-foreground">
          Configura qué proveedores puede usar cada sucursal para cada ingrediente
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {Object.entries(CONTROL_LABELS).map(([key, { label, description, icon, color }]) => (
          <Card key={key} className="flex-1 min-w-[200px]">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={color}>
                  {icon}
                  <span className="ml-1">{label}</span>
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ingrediente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={controlFilter} onValueChange={setControlFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tipo de control" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="brand_only">Solo Marca</SelectItem>
            <SelectItem value="brand_preferred">Preferido Marca</SelectItem>
            <SelectItem value="free">Libre</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Ingredientes ({filteredIngredients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Ingrediente</TableHead>
                  <TableHead className="w-[180px]">Control</TableHead>
                  <TableHead>Proveedores Aprobados</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : filteredIngredients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                      No se encontraron ingredientes
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIngredients.map((ingredient) => {
                    const approved = getApprovedForIngredient(ingredient.id);
                    const controlInfo = CONTROL_LABELS[ingredient.supplier_control];
                    
                    return (
                      <TableRow key={ingredient.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{ingredient.name}</p>
                            {ingredient.category && (
                              <p className="text-xs text-muted-foreground">{ingredient.category}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={ingredient.supplier_control}
                            onValueChange={(v) => handleControlChange(ingredient.id, v as SupplierControl)}
                          >
                            <SelectTrigger className="w-[160px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(CONTROL_LABELS).map(([key, { label, icon }]) => (
                                <SelectItem key={key} value={key}>
                                  <div className="flex items-center gap-2">
                                    {icon}
                                    {label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {approved.length === 0 ? (
                            <span className="text-muted-foreground text-sm">
                              {ingredient.supplier_control === 'free' 
                                ? 'No aplica - libre elección'
                                : 'Sin proveedores aprobados'}
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {approved.map((a) => (
                                <Badge 
                                  key={a.id} 
                                  variant={a.is_primary ? 'default' : 'outline'}
                                  className="flex items-center gap-1"
                                >
                                  {a.is_primary && <Star className="w-3 h-3" />}
                                  {a.supplier.is_brand_supplier && <Building2 className="w-3 h-3" />}
                                  {a.supplier.name}
                                  {a.negotiated_price && (
                                    <span className="ml-1 text-xs opacity-75">
                                      ({formatPrice(a.negotiated_price)})
                                    </span>
                                  )}
                                  <button 
                                    onClick={() => handleRemoveApprovedSupplier(a.id)}
                                    className="ml-1 hover:text-destructive"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {ingredient.supplier_control !== 'free' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openAddDialog(ingredient)}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Add Supplier Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Proveedor Aprobado</DialogTitle>
            <DialogDescription>
              {selectedIngredient?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Proveedor</Label>
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proveedor..." />
                </SelectTrigger>
                <SelectContent>
                  {selectedIngredient && getAvailableSuppliers(selectedIngredient.id).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        {s.is_brand_supplier && <Building2 className="w-4 h-4 text-primary" />}
                        {s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Precio Negociado (opcional)</Label>
              <div className="flex items-center gap-2">
                <span>$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={negotiatedPrice}
                  onChange={(e) => setNegotiatedPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="primary"
                checked={isPrimary}
                onCheckedChange={(checked) => setIsPrimary(!!checked)}
              />
              <Label htmlFor="primary" className="cursor-pointer">
                Marcar como proveedor primario
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddApprovedSupplier} disabled={!selectedSupplierId || saving}>
              {saving ? 'Guardando...' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
