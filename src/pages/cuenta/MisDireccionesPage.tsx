/**
 * MisDireccionesPage — CRUD for saved delivery addresses
 */
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Plus, Pencil, Trash2, Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Direccion {
  id: string;
  etiqueta: string;
  direccion: string;
  piso: string | null;
  referencia: string | null;
  ciudad: string | null;
  es_principal: boolean;
}

const ETIQUETAS = ['Casa', 'Trabajo', 'Otro'];

export default function MisDireccionesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [etiqueta, setEtiqueta] = useState('Casa');
  const [direccion, setDireccion] = useState('');
  const [piso, setPiso] = useState('');
  const [referencia, setReferencia] = useState('');
  const [ciudad, setCiudad] = useState('Córdoba');

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['my-addresses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cliente_direcciones')
        .select('*')
        .eq('user_id', user!.id)
        .order('es_principal', { ascending: false });
      if (error) throw error;
      return (data || []) as Direccion[];
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        user_id: user!.id,
        etiqueta,
        direccion: direccion.trim(),
        piso: piso.trim() || null,
        referencia: referencia.trim() || null,
        ciudad: ciudad.trim() || 'Córdoba',
      };
      if (editId) {
        const { error } = await supabase
          .from('cliente_direcciones')
          .update(payload)
          .eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cliente_direcciones')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-addresses'] });
      toast.success(editId ? 'Dirección actualizada' : 'Dirección guardada');
      closeForm();
    },
    onError: () => toast.error('Error al guardar'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cliente_direcciones').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-addresses'] });
      toast.success('Dirección eliminada');
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (id: string) => {
      // Unset all principal
      await supabase
        .from('cliente_direcciones')
        .update({ es_principal: false })
        .eq('user_id', user!.id);
      // Set new principal
      const { error } = await supabase
        .from('cliente_direcciones')
        .update({ es_principal: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-addresses'] });
      toast.success('Dirección principal actualizada');
    },
  });

  function openNew() {
    setEditId(null);
    setEtiqueta('Casa');
    setDireccion('');
    setPiso('');
    setReferencia('');
    setCiudad('Córdoba');
    setShowForm(true);
  }

  function openEdit(addr: Direccion) {
    setEditId(addr.id);
    setEtiqueta(addr.etiqueta);
    setDireccion(addr.direccion);
    setPiso(addr.piso || '');
    setReferencia(addr.referencia || '');
    setCiudad(addr.ciudad || 'Córdoba');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditId(null);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Mis Direcciones" subtitle="Direcciones guardadas para delivery" />

      <div className="space-y-3">
        {addresses.map(addr => (
          <Card key={addr.id} className={addr.es_principal ? 'border-primary/50' : ''}>
            <CardContent className="p-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{addr.etiqueta}</span>
                    {addr.es_principal && (
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{addr.direccion}</p>
                  {addr.piso && <p className="text-xs text-muted-foreground">Piso: {addr.piso}</p>}
                  {addr.referencia && <p className="text-xs text-muted-foreground">{addr.referencia}</p>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                {!addr.es_principal && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPrimaryMutation.mutate(addr.id)}>
                    <Star className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(addr)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(addr.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {addresses.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-lg font-medium">Sin direcciones guardadas</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Guardá tus direcciones para hacer pedidos más rápido.
              </p>
            </CardContent>
          </Card>
        )}

        <Button onClick={openNew} className="w-full gap-2">
          <Plus className="w-4 h-4" />
          Agregar dirección
        </Button>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar dirección' : 'Nueva dirección'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Etiqueta</Label>
              <Select value={etiqueta} onValueChange={setEtiqueta}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ETIQUETAS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dirección *</Label>
              <Input value={direccion} onChange={e => setDireccion(e.target.value)} placeholder="Av. Colón 1234" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Piso / Depto</Label>
                <Input value={piso} onChange={e => setPiso(e.target.value)} placeholder="2B" />
              </div>
              <div className="space-y-2">
                <Label>Ciudad</Label>
                <Input value={ciudad} onChange={e => setCiudad(e.target.value)} placeholder="Córdoba" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Referencia</Label>
              <Input value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="Frente a la plaza" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancelar</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!direccion.trim() || saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editId ? 'Guardar' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
