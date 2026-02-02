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
import { Loader2, Mail, UserPlus, CheckCircle } from 'lucide-react';

type LocalRole = 'encargado' | 'cajero' | 'empleado';

interface InviteStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  branchName: string;
  onSuccess?: () => void;
}

const INVITABLE_ROLES: { value: LocalRole; label: string }[] = [
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
  const [role, setRole] = useState<LocalRole>('cajero');
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
        throw new Error(response.error.message || 'Error al procesar solicitud');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      // Differentiate message based on action
      const action = response.data?.action;
      if (action === 'added') {
        toast.success(response.data.message || `Colaborador agregado al equipo`, {
          icon: <CheckCircle className="h-4 w-4 text-green-500" />,
        });
      } else {
        toast.success(response.data.message || `Invitación enviada a ${email}`);
      }

      setEmail('');
      setRole('cajero');
      onOpenChange(false);
      onSuccess?.();

    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast.error(error.message || 'Error al procesar la solicitud');
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
            Agregar Colaborador
          </DialogTitle>
          <DialogDescription>
            Ingresá el email del colaborador para agregarlo al equipo de <strong>{branchName}</strong>.
            Si ya tiene cuenta, se agregará automáticamente. Si no, recibirá una invitación por email.
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
            <Select value={role} onValueChange={(v) => setRole(v as LocalRole)}>
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
                  Procesando...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Agregar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
