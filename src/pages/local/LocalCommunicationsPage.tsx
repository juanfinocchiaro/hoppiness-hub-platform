import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Plus, 
  Trash2, 
  Send,
  Bell,
  AlertTriangle,
  PartyPopper,
  Info,
  MessageSquare,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

const TYPES = [
  { value: 'info', label: 'Información', icon: Info, color: 'bg-blue-500/10 text-blue-600' },
  { value: 'warning', label: 'Aviso', icon: AlertTriangle, color: 'bg-yellow-500/10 text-yellow-600' },
  { value: 'urgent', label: 'Urgente', icon: Bell, color: 'bg-red-500/10 text-red-600' },
  { value: 'celebration', label: 'Celebración', icon: PartyPopper, color: 'bg-green-500/10 text-green-600' },
];

export default function LocalCommunicationsPage() {
  const { branchId } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    type: 'info' as 'info' | 'warning' | 'urgent' | 'celebration',
  });

  const { data: branch } = useQuery({
    queryKey: ['branch', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .eq('id', branchId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!branchId,
  });

  const { data: communications, isLoading } = useQuery({
    queryKey: ['local-communications', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communications')
        .select('*, communication_reads(user_id)')
        .eq('source_type', 'local')
        .eq('source_branch_id', branchId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!branchId,
    staleTime: 30000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user || !branchId) throw new Error('No autenticado');

      const { error } = await supabase.from('communications').insert({
        title: formData.title,
        body: formData.body,
        type: formData.type,
        tag: 'operativo',
        source_type: 'local',
        source_branch_id: branchId,
        created_by: user.id,
        is_published: true,
        published_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local-communications', branchId] });
      toast.success('Comunicado enviado al equipo');
      setOpen(false);
      setFormData({ title: '', body: '', type: 'info' });
    },
    onError: () => toast.error('Error al enviar comunicado'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('communications').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local-communications', branchId] });
      toast.success('Comunicado eliminado');
    },
  });

  const getTypeInfo = (type: string) => TYPES.find(t => t.value === type) || TYPES[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            Comunicados del Local
          </h1>
          <p className="text-muted-foreground">
            Mensajes para tu equipo en {branch?.name}
          </p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Mensaje
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Mensaje para el Equipo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Título del mensaje"
                />
              </div>

              <div className="space-y-2">
                <Label>Mensaje</Label>
                <Textarea
                  value={formData.body}
                  onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                  placeholder="Escribe el mensaje para tu equipo..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, type: v as typeof formData.type }))}
                >
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

              <Button 
                className="w-full" 
                onClick={() => createMutation.mutate()}
                disabled={!formData.title || !formData.body || createMutation.isPending}
              >
                <Send className="w-4 h-4 mr-2" />
                Enviar al Equipo
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : communications && communications.length > 0 ? (
        <div className="space-y-4">
          {communications.map(comm => {
            const typeInfo = getTypeInfo(comm.type);
            const TypeIcon = typeInfo.icon;
            const readCount = comm.communication_reads?.length || 0;

            return (
              <Card key={comm.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                      <TypeIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate mb-1">{comm.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{comm.body}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{format(new Date(comm.published_at), "d MMM yyyy HH:mm", { locale: es })}</span>
                        <span>👁 {readCount} lecturas</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(comm.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay mensajes para tu equipo</p>
            <p className="text-sm text-muted-foreground mt-1">
              Los comunicados que envíes solo serán visibles para el personal de esta sucursal
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
