import { useState, useEffect } from 'react';
import { useProductBranchAuthorization, useUpdateProductBranchAuthorization } from '@/hooks/useProductChannels';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Check, X, Store } from 'lucide-react';
import { toast } from 'sonner';

interface ProductBranchTabProps {
  productId: string;
  isAvailableAllBranches?: boolean;
  onUpdateAllBranches?: (value: boolean) => void;
}

export function ProductBranchTab({ 
  productId,
}: ProductBranchTabProps) {
  const { data: authorizations, isLoading: authLoading } = useProductBranchAuthorization(productId);
  const updateAuthorization = useUpdateProductBranchAuthorization();
  
  // Map of branchId -> isEnabled
  const [localAuth, setLocalAuth] = useState<Map<string, boolean>>(new Map());
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

  // Sync local state with fetched authorizations
  useEffect(() => {
    if (authorizations && branches) {
      const authMap = new Map<string, boolean>();
      
      // Initialize all branches as enabled (for new products)
      branches.forEach(b => authMap.set(b.id, true));
      
      // Override with actual values from DB
      authorizations.forEach(a => {
        authMap.set(a.branch_id, a.is_enabled_by_brand);
      });
      
      setLocalAuth(authMap);
      setHasChanges(false);
    }
  }, [authorizations, branches]);

  const handleToggleBranch = (branchId: string) => {
    setLocalAuth(prev => {
      const next = new Map(prev);
      next.set(branchId, !prev.get(branchId));
      return next;
    });
    setHasChanges(true);
  };

  const handleSelectAll = () => {
    setLocalAuth(prev => {
      const next = new Map(prev);
      branches?.forEach(b => next.set(b.id, true));
      return next;
    });
    setHasChanges(true);
  };

  const handleSelectNone = () => {
    setLocalAuth(prev => {
      const next = new Map(prev);
      branches?.forEach(b => next.set(b.id, false));
      return next;
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    const branchAuthorizations = Array.from(localAuth.entries()).map(([branchId, isEnabled]) => ({
      branchId,
      isEnabled,
    }));
    
    await updateAuthorization.mutateAsync({
      productId,
      branchAuthorizations,
    });
    setHasChanges(false);
  };

  const handleReset = () => {
    if (authorizations && branches) {
      const authMap = new Map<string, boolean>();
      branches.forEach(b => authMap.set(b.id, true));
      authorizations.forEach(a => {
        authMap.set(a.branch_id, a.is_enabled_by_brand);
      });
      setLocalAuth(authMap);
      setHasChanges(false);
    }
  };

  const isLoading = authLoading || branchesLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const enabledCount = Array.from(localAuth.values()).filter(Boolean).length;
  const totalCount = branches?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-medium">Autorización por Sucursal</Label>
          <p className="text-sm text-muted-foreground">
            Seleccioná en qué sucursales estará disponible este producto
          </p>
        </div>
        <Badge variant="secondary">
          {enabledCount} de {totalCount} sucursales
        </Badge>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleSelectAll}>
          Seleccionar todas
        </Button>
        <Button variant="outline" size="sm" onClick={handleSelectNone}>
          Deseleccionar todas
        </Button>
      </div>

      {/* Branch List */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sucursal</TableHead>
            <TableHead>Ciudad</TableHead>
            <TableHead className="text-center w-[100px]">Autorizado</TableHead>
            <TableHead className="text-center w-[100px]">Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {branches?.map(branch => {
            const isEnabled = localAuth.get(branch.id) ?? true;
            
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
                    checked={isEnabled}
                    onCheckedChange={() => handleToggleBranch(branch.id)}
                  />
                </TableCell>
                <TableCell className="text-center">
                  {isEnabled ? (
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">
                      <Check className="w-3 h-3 mr-1" />
                      Autorizado
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-muted text-muted-foreground">
                      <X className="w-3 h-3 mr-1" />
                      No disponible
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Info */}
      {enabledCount < totalCount && (
        <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
          <strong>Nota:</strong> Los locales no autorizados no verán este producto en su panel.
          Para que un producto esté a la venta, el local además debe activarlo manualmente.
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
            disabled={updateAuthorization.isPending}
          >
            Guardar Cambios
          </Button>
        </div>
      )}
    </div>
  );
}
