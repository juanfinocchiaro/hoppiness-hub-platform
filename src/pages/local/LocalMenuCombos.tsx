import { useState } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBranchCombos } from '@/hooks/useCombos';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import { toast } from 'sonner';
import { Search, Package, CheckCircle, AlertTriangle, XCircle, Percent } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

export default function LocalMenuCombos() {
  const { branchId } = useParams();
  const { branch } = useOutletContext<{ branch: Branch }>();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch combos using the new hook
  const { data: combos, isLoading } = useBranchCombos(branchId || null);

  // Toggle combo availability (we'll store in a branch_combos table or use a different approach)
  // For now, since combos are global, we'll just show the status
  const toggleMutation = useMutation({
    mutationFn: async ({ comboId, isAvailable }: { comboId: string; isAvailable: boolean }) => {
      // For future: implement branch_combos table for per-branch availability
      // For now, just show a message
      toast.info('La disponibilidad de combos se controla desde Mi Marca');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-combos'] });
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
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
      default:
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <HoppinessLoader size="md" text="Cargando combos" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Combos Disponibles</h1>
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
              <p className="text-sm mt-2">Los combos se crean desde Mi Marca → Combos</p>
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
                    
                    {combo.description && (
                      <p className="text-sm text-muted-foreground ml-8 mb-3">
                        {combo.description}
                      </p>
                    )}
                    
                    <div className="ml-8 space-y-1 mb-3">
                      <p className="text-sm text-muted-foreground mb-2">Incluye:</p>
                      {combo.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          {item.is_available ? (
                            <CheckCircle className="h-4 w-4 text-primary" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                          <span className={!item.is_available ? 'line-through text-muted-foreground' : ''}>
                            {item.quantity > 1 && `${item.quantity}x `}
                            {item.product_name}
                          </span>
                          {!item.is_available && (
                            <Badge variant="destructive" className="text-xs">
                              NO DISPONIBLE
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <div className="ml-8">
                      <p className="text-lg font-bold text-primary">
                        {formatCurrency(combo.base_price)}
                      </p>
                    </div>
                    
                    {combo.status === 'incomplete' && (
                      <div className="ml-8 mt-3 p-3 rounded-lg bg-warning/10 text-warning text-sm">
                        <AlertTriangle className="h-4 w-4 inline mr-2" />
                        Este combo tiene productos no disponibles en tu sucursal
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline">
                      <Percent className="h-3 w-3 mr-1" />
                      Combo
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Summary */}
      <div className="p-4 border rounded-lg bg-muted/30 text-sm text-muted-foreground">
        Resumen: {combos?.length || 0} combos · {availableCount} disponibles · {incompleteCount} con productos faltantes
      </div>
    </div>
  );
}
