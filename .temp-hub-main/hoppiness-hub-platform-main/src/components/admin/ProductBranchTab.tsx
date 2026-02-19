import { useState, useEffect } from 'react';
import { useProductBranchExclusions, useUpdateProductBranchExclusions } from '@/hooks/useProductChannels';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Check, X, Store, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ProductBranchTabProps {
  productId: string;
  isAvailableAllBranches: boolean;
  onUpdateAllBranches: (value: boolean) => void;
}

export function ProductBranchTab({ 
  productId, 
  isAvailableAllBranches,
  onUpdateAllBranches,
}: ProductBranchTabProps) {
  const { data: exclusions, isLoading: exclusionsLoading } = useProductBranchExclusions(productId);
  const updateExclusions = useUpdateProductBranchExclusions();
  
  const [localExclusions, setLocalExclusions] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);

  // Get all active branches
  const { data: branches, isLoading: branchesLoading } = useQuery({
    queryKey: ['branches-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, city, address')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Sync local state with fetched exclusions
  useEffect(() => {
    if (exclusions) {
      setLocalExclusions(new Set(exclusions));
      setHasChanges(false);
    }
  }, [exclusions]);

  const handleToggleBranch = (branchId: string) => {
    setLocalExclusions(prev => {
      const next = new Set(prev);
      if (next.has(branchId)) {
        next.delete(branchId);
      } else {
        next.add(branchId);
      }
      return next;
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    await updateExclusions.mutateAsync({
      productId,
      excludedBranchIds: Array.from(localExclusions),
    });
    setHasChanges(false);
    toast.success('Exclusiones guardadas');
  };

  const handleReset = () => {
    if (exclusions) {
      setLocalExclusions(new Set(exclusions));
      setHasChanges(false);
    }
  };

  const isLoading = exclusionsLoading || branchesLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  // Determine which branches are enabled based on mode
  const getIsEnabledForBranch = (branchId: string) => {
    if (isAvailableAllBranches) {
      // All branches except those in exclusions
      return !localExclusions.has(branchId);
    } else {
      // Only branches in exclusions (inverted logic)
      return localExclusions.has(branchId);
    }
  };

  const enabledCount = branches?.filter(b => getIsEnabledForBranch(b.id)).length || 0;
  const totalCount = branches?.length || 0;

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <div className="space-y-4">
        <Label className="text-base font-medium">Disponibilidad por Sucursal</Label>
        
        <RadioGroup 
          value={isAvailableAllBranches ? 'all' : 'selected'}
          onValueChange={(v) => onUpdateAllBranches(v === 'all')}
          className="space-y-3"
        >
          <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
            <RadioGroupItem value="all" id="all" />
            <Label htmlFor="all" className="flex-1 cursor-pointer">
              <div className="font-medium">Disponible en TODAS las sucursales</div>
              <div className="text-sm text-muted-foreground">
                Exceptuando las que marques abajo
              </div>
            </Label>
          </div>
          
          <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
            <RadioGroupItem value="selected" id="selected" />
            <Label htmlFor="selected" className="flex-1 cursor-pointer">
              <div className="font-medium">Solo en sucursales seleccionadas</div>
              <div className="text-sm text-muted-foreground">
                Solo disponible en las que marques abajo
              </div>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Branch List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">
            {isAvailableAllBranches ? 'Excluir de:' : 'Incluir en:'}
          </Label>
          <Badge variant="secondary">
            {enabledCount} de {totalCount} sucursales
          </Badge>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sucursal</TableHead>
              <TableHead>Ciudad</TableHead>
              <TableHead className="text-center w-[100px]">
                {isAvailableAllBranches ? 'Excluir' : 'Incluir'}
              </TableHead>
              <TableHead className="text-center w-[100px]">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {branches?.map(branch => {
              const isExcluded = localExclusions.has(branch.id);
              const isEnabled = getIsEnabledForBranch(branch.id);
              
              return (
                <TableRow key={branch.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{branch.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {branch.city}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch 
                      checked={isExcluded}
                      onCheckedChange={() => handleToggleBranch(branch.id)}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    {isEnabled ? (
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">
                        <Check className="w-3 h-3 mr-1" />
                        Activo
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-destructive/10 text-destructive">
                        <X className="w-3 h-3 mr-1" />
                        Excluido
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Warning */}
      {localExclusions.size > 0 && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong>
              {isAvailableAllBranches 
                ? `Este producto NO estará disponible en ${localExclusions.size} sucursal(es).`
                : `Este producto SOLO estará disponible en ${localExclusions.size} sucursal(es).`
              }
            </strong>
            <br />
            Los locales no podrán activarlo en las sucursales excluidas.
          </div>
        </div>
      )}

      {/* Save Actions */}
      {hasChanges && (
        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleReset}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={updateExclusions.isPending}
          >
            Guardar Cambios
          </Button>
        </div>
      )}
    </div>
  );
}
