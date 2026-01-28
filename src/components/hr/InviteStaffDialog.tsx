import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Mail, UserPlus } from 'lucide-react';
import type { Enums } from '@/integrations/supabase/types';

type AppRole = Enums<'app_role'>;

interface InviteStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  branchName: string;
  onSuccess?: () => void;
}

const INVITABLE_ROLES: { value: AppRole; label: string }[] = [
  { value: 'encargado', label: 'Encargado' },
  { value: 'cajero', label: 'Cajero' },
  { value: 'empleado', label: 'Colaborador' },
];

export function InviteStaffDialog({
  open,
  onOpenChange,
  branchId,
  branchName,
  onSuccess,
}: InviteStaffDialogProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AppRole>('cajero');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Ingresá un email válido');
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const response = await supabase.functions.invoke('send-staff-invitation', {
        body: {
          email: email.toLowerCase().trim(),
          role,
          branch_id: branchId,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Error al enviar invitación');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast.success(`Invitación enviada a ${email}`);
      setEmail('');
      setRole('cajero');
      onOpenChange(false);
      onSuccess?.();

    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast.error(error.message || 'Error al enviar la invitación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invitar Colaborador
          </DialogTitle>
          <DialogDescription>
            Enviá una invitación por email para que se una al equipo de <strong>{branchName}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email del colaborador</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="ejemplo@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rol</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVITABLE_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {role === 'encargado' && 'Gestiona equipo, horarios, comunicados y operación diaria'}
              {role === 'cajero' && 'Carga ventas, fichaje y visualiza horarios'}
              {role === 'empleado' && 'Fichaje y visualiza horarios y comunicados'}
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar Invitación
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
