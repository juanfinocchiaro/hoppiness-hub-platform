import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Send, Loader2, Info, AlertTriangle, AlertCircle, PartyPopper } from 'lucide-react';
import { useCreateCommunication } from '@/hooks/useCommunications';

const TYPES = [
  { value: 'info', label: 'Información', icon: Info },
  { value: 'warning', label: 'Aviso', icon: AlertTriangle },
  { value: 'urgent', label: 'Urgente', icon: AlertCircle },
  { value: 'celebration', label: 'Celebración', icon: PartyPopper },
];

const ROLES = [
  { value: 'franquiciado', label: 'Franquiciados' },
  { value: 'encargado', label: 'Encargados' },
  { value: 'contador_local', label: 'Contadores' },
  { value: 'cajero', label: 'Cajeros' },
  { value: 'empleado', label: 'Empleados' },
];

export default function CommunicationSend() {
  const navigate = useNavigate();
  const createMutation = useCreateCommunication();
  
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<'info' | 'warning' | 'urgent' | 'celebration'>('info');
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [allBranches, setAllBranches] = useState(true);
  const [allRoles, setAllRoles] = useState(true);

  const { data: branches } = useQuery({
    queryKey: ['branches-for-comms'],
    queryFn: async () => {
      const { data } = await supabase
        .from('branches')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !body.trim()) {
      toast.error('Título y mensaje son requeridos');
      return;
    }

    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        body: body.trim(),
        type,
        target_branch_ids: allBranches ? undefined : selectedBranches,
        target_roles: allRoles ? undefined : selectedRoles,
      });
      
      toast.success('Comunicado enviado exitosamente');
      navigate('/admin/comunicacion/historial');
    } catch (error) {
      toast.error('Error al enviar comunicado');
    }
  };

  const toggleBranch = (branchId: string) => {
    setSelectedBranches(prev => 
      prev.includes(branchId) 
        ? prev.filter(id => id !== branchId)
        : [...prev, branchId]
    );
  };

  const toggleRole = (role: string) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Enviar Comunicado</h1>
        <p className="text-muted-foreground">
          Envía un mensaje a todo el equipo o a grupos específicos
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Nuevo Comunicado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Type */}
            <div className="space-y-2">
              <Label>Tipo de comunicado</Label>
              <Select value={type} onValueChange={(v: typeof type) => setType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <t.icon className="w-4 h-4" />
                        {t.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Nuevo procedimiento de cierre"
                required
                minLength={3}
              />
            </div>

            {/* Body */}
            <div className="space-y-2">
              <Label>Mensaje</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Escribe el contenido del comunicado..."
                rows={6}
                required
              />
            </div>

            {/* Target Branches */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="all-branches"
                  checked={allBranches}
                  onCheckedChange={(c) => setAllBranches(!!c)}
                />
                <Label htmlFor="all-branches" className="font-medium">
                  Todas las sucursales
                </Label>
              </div>
              
              {!allBranches && (
                <div className="grid grid-cols-2 gap-2 pl-6">
                  {branches?.map(branch => (
                    <div key={branch.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`branch-${branch.id}`}
                        checked={selectedBranches.includes(branch.id)}
                        onCheckedChange={() => toggleBranch(branch.id)}
                      />
                      <Label htmlFor={`branch-${branch.id}`} className="text-sm">
                        {branch.name}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Target Roles */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="all-roles"
                  checked={allRoles}
                  onCheckedChange={(c) => setAllRoles(!!c)}
                />
                <Label htmlFor="all-roles" className="font-medium">
                  Todos los roles
                </Label>
              </div>
              
              {!allRoles && (
                <div className="grid grid-cols-2 gap-2 pl-6">
                  {ROLES.map(role => (
                    <div key={role.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`role-${role.value}`}
                        checked={selectedRoles.includes(role.value)}
                        onCheckedChange={() => toggleRole(role.value)}
                      />
                      <Label htmlFor={`role-${role.value}`} className="text-sm">
                        {role.label}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/admin/comunicacion/historial')}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Send className="w-4 h-4 mr-2" />
                Enviar Comunicado
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
