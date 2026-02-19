import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { UserWithStats, Branch } from './types';
import type { BrandRole, LocalRole } from '@/hooks/usePermissionsV2';

interface UserRoleModalProps {
  user: UserWithStats;
  branches: Branch[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const BRAND_ROLES: { value: BrandRole; label: string }[] = [
  { value: 'superadmin', label: 'Superadmin' },
  { value: 'coordinador', label: 'Coordinador' },
  { value: 'contador_marca', label: 'Contador Marca' },
  { value: 'informes', label: 'Informes' },
];

const LOCAL_ROLES: { value: LocalRole; label: string }[] = [
  { value: 'franquiciado', label: 'Franquiciado' },
  { value: 'encargado', label: 'Encargado' },
  { value: 'contador_local', label: 'Contador Local' },
  { value: 'cajero', label: 'Cajero' },
  { value: 'empleado', label: 'Empleado' },
];

export function UserRoleModal({ user, branches, open, onOpenChange, onSuccess }: UserRoleModalProps) {
  const queryClient = useQueryClient();
  
  const [hasBrandAccess, setHasBrandAccess] = useState(!!user.brand_role);
  const [brandRole, setBrandRole] = useState<BrandRole>(user.brand_role || 'coordinador');
  
  const [hasLocalAccess, setHasLocalAccess] = useState(!!user.local_role);
  const [localRole, setLocalRole] = useState<LocalRole>(user.local_role || 'empleado');
  const [selectedBranches, setSelectedBranches] = useState<string[]>(user.branch_ids || []);
  
  const [pin, setPin] = useState('');

  const needsPin = hasLocalAccess && (localRole === 'franquiciado' || localRole === 'encargado');

  const saveMutation = useMutation({
    mutationFn: async () => {
      const finalBrandRole = hasBrandAccess ? brandRole : null;
      const finalLocalRole = hasLocalAccess ? localRole : null;
      const finalBranchIds = hasLocalAccess ? selectedBranches : [];
      
      // Hash PIN if provided
      let pinHash = null;
      if (needsPin && pin) {
        // Simple hash for demo - in production use proper bcrypt
        pinHash = btoa(pin);
      }

      if (user.role_id) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles_v2')
          .update({
            brand_role: finalBrandRole,
            local_role: finalLocalRole,
            branch_ids: finalBranchIds,
            authorization_pin_hash: pinHash || undefined,
          })
          .eq('id', user.role_id);
        
        if (error) throw error;
      } else {
        // Insert new role - use user_id (auth.users id), not profile id
        if (!user.user_id) {
          throw new Error('El usuario no tiene cuenta vinculada');
        }
        const { error } = await supabase
          .from('user_roles_v2')
          .insert({
            user_id: user.user_id,
            brand_role: finalBrandRole,
            local_role: finalLocalRole,
            branch_ids: finalBranchIds,
            authorization_pin_hash: pinHash,
            is_active: true,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Roles actualizados');
      queryClient.invalidateQueries({ queryKey: ['admin-users-full'] });
      onSuccess();
    },
    onError: (error) => {
      toast.error('Error al guardar');
      console.error(error);
    },
  });

  const toggleBranch = (branchId: string) => {
    setSelectedBranches(prev => 
      prev.includes(branchId) 
        ? prev.filter(id => id !== branchId)
        : [...prev, branchId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar roles de {user.full_name || user.email}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Brand Access */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-medium">Acceso a Mi Marca</Label>
              <Switch checked={hasBrandAccess} onCheckedChange={setHasBrandAccess} />
            </div>
            
            {hasBrandAccess && (
              <Select value={brandRole || ''} onValueChange={(v) => setBrandRole(v as BrandRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {BRAND_ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value!}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Local Access */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-medium">Acceso a Mi Local</Label>
              <Switch checked={hasLocalAccess} onCheckedChange={setHasLocalAccess} />
            </div>
            
            {hasLocalAccess && (
              <>
                <Select value={localRole || ''} onValueChange={(v) => setLocalRole(v as LocalRole)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCAL_ROLES.map(r => (
                      <SelectItem key={r.value} value={r.value!}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Sucursales</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {branches.map(branch => (
                      <label key={branch.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox 
                          checked={selectedBranches.includes(branch.id)}
                          onCheckedChange={() => toggleBranch(branch.id)}
                        />
                        {branch.name}
                      </label>
                    ))}
                  </div>
                </div>

                {needsPin && (
                  <div className="space-y-1">
                    <Label className="text-sm">PIN de autorización (4 dígitos)</Label>
                    <Input 
                      type="password"
                      maxLength={4}
                      placeholder="••••"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
