import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, Package, Truck, Check, AlertTriangle } from 'lucide-react';

interface Ingredient {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
}

interface Supplier {
  id: string;
  name: string;
}

interface IngredientSupplier {
  id: string;
  ingredient_id: string;
  supplier_id: string;
  is_primary: boolean;
  price_per_unit: number | null;
}

export default function IngredientSupplierAssignment() {
  const [search, setSearch] = useState('');
  const [filterUnassigned, setFilterUnassigned] = useState(false);
  const queryClient = useQueryClient();

  // Fetch ingredients
  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients-for-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ingredients')
        .select('id, name, category, unit')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Ingredient[];
    },
  });

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-for-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Supplier[];
    },
  });

  // Fetch assignments
  const { data: assignments = [] } = useQuery({
    queryKey: ['ingredient-supplier-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ingredient_suppliers')
        .select('id, ingredient_id, supplier_id, is_primary, price_per_unit');
      if (error) throw error;
      return data as IngredientSupplier[];
    },
  });

  // Assignment mutation
  const assignMutation = useMutation({
    mutationFn: async ({ ingredientId, supplierId }: { ingredientId: string; supplierId: string | null }) => {
      // Delete existing primary assignment
      await supabase
        .from('ingredient_suppliers')
        .delete()
        .eq('ingredient_id', ingredientId)
        .eq('is_primary', true);

      // Insert new if supplier selected
      if (supplierId) {
        const { error } = await supabase
          .from('ingredient_suppliers')
          .upsert({
            ingredient_id: ingredientId,
            supplier_id: supplierId,
            is_primary: true,
          }, { onConflict: 'ingredient_id,supplier_id' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient-supplier-assignments'] });
      toast.success('Proveedor asignado');
    },
    onError: () => {
      toast.error('Error al asignar proveedor');
    },
  });

  // Get primary supplier for an ingredient
  const getPrimarySupplier = (ingredientId: string): string | null => {
    const assignment = assignments.find(a => a.ingredient_id === ingredientId && a.is_primary);
    return assignment?.supplier_id || null;
  };

  // Filter ingredients
  const filteredIngredients = ingredients.filter(ing => {
    const matchesSearch = ing.name.toLowerCase().includes(search.toLowerCase()) ||
      ing.category?.toLowerCase().includes(search.toLowerCase());
    
    if (filterUnassigned) {
      const hasAssignment = getPrimarySupplier(ing.id) !== null;
      return matchesSearch && !hasAssignment;
    }
    
    return matchesSearch;
  });

  // Stats
  const assignedCount = ingredients.filter(ing => getPrimarySupplier(ing.id) !== null).length;
  const unassignedCount = ingredients.length - assignedCount;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-6 w-6" />
          Asignar Proveedores a Ingredientes
        </h1>
        <p className="text-muted-foreground">
          Define qué proveedor provee cada ingrediente para las compras inteligentes
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Ingredientes</p>
                <p className="text-2xl font-bold">{ingredients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Con Proveedor</p>
                <p className="text-2xl font-bold">{assignedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={unassignedCount > 0 ? 'border-amber-500' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${unassignedCount > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
              <div>
                <p className="text-sm text-muted-foreground">Sin Proveedor</p>
                <p className="text-2xl font-bold">{unassignedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ingrediente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={filterUnassigned ? 'default' : 'outline'}
          onClick={() => setFilterUnassigned(!filterUnassigned)}
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Sin Proveedor ({unassignedCount})
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ingredientes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ingrediente</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead>Proveedor Principal</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIngredients.map(ing => {
                const supplierId = getPrimarySupplier(ing.id);
                const supplierName = suppliers.find(s => s.id === supplierId)?.name;
                
                return (
                  <TableRow key={ing.id}>
                    <TableCell className="font-medium">{ing.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{ing.category || 'Sin categoría'}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{ing.unit || '-'}</TableCell>
                    <TableCell>
                      <Select
                        value={supplierId || 'none'}
                        onValueChange={(v) => assignMutation.mutate({ 
                          ingredientId: ing.id, 
                          supplierId: v === 'none' ? null : v 
                        })}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Seleccionar...">
                            {supplierName || (
                              <span className="text-muted-foreground">Sin asignar</span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            <span className="text-muted-foreground">Sin asignar</span>
                          </SelectItem>
                          {suppliers.map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              <span className="flex items-center gap-2">
                                <Truck className="h-4 w-4" />
                                {s.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {supplierId ? (
                        <Badge variant="default" className="gap-1">
                          <Check className="h-3 w-3" />
                          Asignado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                          <AlertTriangle className="h-3 w-3" />
                          Pendiente
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredIngredients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No se encontraron ingredientes
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
