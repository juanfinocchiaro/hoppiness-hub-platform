import { useState } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Search, Package, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface ComboProduct {
  product_id: string;
  product_name: string;
  quantity: number;
  is_available: boolean;
}

interface Combo {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
  products: ComboProduct[];
  status: 'available' | 'incomplete' | 'disabled';
}

export default function LocalMenuCombos() {
  const { branchId } = useParams();
  const { branch } = useOutletContext<{ branch: Branch }>();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch combos (products marked as combo)
  const { data: combos, isLoading } = useQuery({
    queryKey: ['branch-combos', branchId],
    queryFn: async () => {
      // Get products that are combos
      const { data: comboProducts, error: comboError } = await supabase
        .from('products')
        .select('id, name, price, is_available')
        .eq('is_combo', true)
        .order('name');
      
      if (comboError) throw comboError;
      
      // Get branch-specific availability
      const { data: branchProducts } = await supabase
        .from('branch_products')
        .select('product_id, is_available')
        .eq('branch_id', branchId);
      
      const branchAvailability = new Map(
        branchProducts?.map(bp => [bp.product_id, bp.is_available]) || []
      );
      
      // Process combos - simplified without combo_items relation
      const processedCombos: Combo[] = (comboProducts || []).map(combo => {
        const comboAvailable = branchAvailability.get(combo.id) !== false && combo.is_available;
        
        return {
          id: combo.id,
          name: combo.name,
          price: combo.price,
          is_available: comboAvailable,
          products: [], // Would need combo_items table properly set up
          status: comboAvailable ? 'available' : 'disabled' as const,
        };
      });
      
      return processedCombos;
    },
    enabled: !!branchId,
  });

  // Toggle combo availability
  const toggleMutation = useMutation({
    mutationFn: async ({ comboId, isAvailable }: { comboId: string; isAvailable: boolean }) => {
      const { error } = await supabase
        .from('branch_products')
        .upsert({
          branch_id: branchId,
          product_id: comboId,
          is_available: isAvailable,
        }, {
          onConflict: 'branch_id,product_id',
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-combos'] });
      toast.success('Disponibilidad actualizada');
    },
    onError: () => {
      toast.error('Error al actualizar');
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: Combo['status']) => {
    switch (status) {
      case 'available':
        return (
          <Badge className="bg-primary/10 text-primary border-0">
            <CheckCircle className="h-3 w-3 mr-1" />
            Disponible
          </Badge>
        );
      case 'incomplete':
        return (
          <Badge variant="outline" className="border-warning text-warning">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Incompleto
          </Badge>
        );
      case 'disabled':
        return (
          <Badge variant="secondary">
            <XCircle className="h-3 w-3 mr-1" />
            Desactivado
          </Badge>
        );
    }
  };

  // Filter combos
  const filteredCombos = combos?.filter(combo => {
    if (!searchQuery) return true;
    return combo.name.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  // Stats
  const availableCount = combos?.filter(c => c.status === 'available').length || 0;
  const incompleteCount = combos?.filter(c => c.status === 'incomplete').length || 0;
  const disabledCount = combos?.filter(c => c.status === 'disabled').length || 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Disponibilidad de Combos</h1>
        <p className="text-muted-foreground">{branch?.name}</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar combo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Combos List */}
      <div className="space-y-4">
        {filteredCombos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay combos configurados</p>
            </CardContent>
          </Card>
        ) : (
          filteredCombos.map(combo => (
            <Card key={combo.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Package className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-bold">{combo.name}</h3>
                      {getStatusBadge(combo.status)}
                    </div>
                    
                    <div className="ml-8 space-y-1 mb-3">
                      <p className="text-sm text-muted-foreground mb-2">Incluye:</p>
                      {combo.products.map((product, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          {product.is_available ? (
                            <CheckCircle className="h-4 w-4 text-primary" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                          <span className={!product.is_available ? 'line-through text-muted-foreground' : ''}>
                            {product.quantity > 1 && `${product.quantity}x `}
                            {product.product_name}
                          </span>
                          {!product.is_available && (
                            <Badge variant="destructive" className="text-xs">
                              SIN STOCK
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <div className="ml-8">
                      <p className="text-sm font-medium">
                        Precio: {formatCurrency(combo.price)}
                      </p>
                    </div>
                    
                    {combo.status === 'incomplete' && (
                      <div className="ml-8 mt-3 p-3 rounded-lg bg-warning/10 text-warning text-sm">
                        <AlertTriangle className="h-4 w-4 inline mr-2" />
                        Este combo tiene productos no disponibles
                      </div>
                    )}
                    
                    {combo.status === 'disabled' && (
                      <div className="ml-8 mt-3 p-3 rounded-lg bg-muted text-muted-foreground text-sm">
                        <XCircle className="h-4 w-4 inline mr-2" />
                        Desactivado manualmente
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end gap-3">
                    <Switch
                      checked={combo.is_available}
                      onCheckedChange={(checked) => 
                        toggleMutation.mutate({ comboId: combo.id, isAvailable: checked })
                      }
                    />
                    <span className="text-xs text-muted-foreground">
                      {combo.is_available ? 'Activo' : 'Inactivo'}
                    </span>
                    
                    {combo.status === 'incomplete' && combo.is_available && (
                      <div className="flex gap-2 mt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => toggleMutation.mutate({ comboId: combo.id, isAvailable: false })}
                        >
                          Desactivar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Summary */}
      <div className="p-4 border rounded-lg bg-muted/30 text-sm text-muted-foreground">
        Resumen: {combos?.length || 0} combos · {availableCount} disponibles · {incompleteCount} incompletos · {disabledCount} desactivados
      </div>
    </div>
  );
}
